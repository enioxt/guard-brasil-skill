/**
 * Guard Brasil — API Key Management (EGOS-MONETIZE-001)
 *
 * Customer API keys backed by guard_brasil_tenants in Supabase.
 * Keys stored as SHA-256 hashes — never plaintext.
 */

import { createHash, randomBytes } from 'crypto';

const KEY_PREFIX = 'gb_live_';

export interface Tenant {
  id: string;
  name: string;
  email: string | null;
  tier: string;
  quota_limit: number;
  calls_this_month: number;
  quota_reset_at?: string | null;
  status: string;
}

// Lazy Supabase (same pattern as telemetry.ts)
let _supabase: any = null;

function getSupabase(): any {
  if (_supabase) return _supabase;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createClient } = require('@supabase/supabase-js');
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    _supabase = createClient(url, key);
    return _supabase;
  } catch {
    return null;
  }
}

export function generateApiKey(): string {
  return KEY_PREFIX + randomBytes(24).toString('hex');
}

export function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export async function validateKey(rawKey: string): Promise<Tenant | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const hash = hashKey(rawKey);
  const { data, error } = await sb
    .from('guard_brasil_tenants')
    .select('id, name, email, tier, quota_limit, calls_this_month, status')
    .eq('api_key_hash', hash)
    .eq('status', 'active')
    .single();
  if (error || !data) return null;
  return data as Tenant;
}

export async function incrementUsage(tenantId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.rpc('increment_api_usage', { p_tenant_id: tenantId });
}


/**
 * PAP-002: Budget warning — send Telegram when tenant reaches 80%/100% of quota.
 * Called fire-and-forget after incrementUsage. Deduplicates via agent_events.
 */
export async function checkBudgetWarning(tenant: Tenant): Promise<void> {
  const usage = tenant.calls_this_month + 1;
  const cap = tenant.quota_limit;
  if (cap <= 0) return;
  const pct = usage / cap;
  if (pct < 0.8) return;

  const sb = getSupabase();
  if (!sb) return;

  const threshold = pct >= 1.0 ? '100pct' : '80pct';
  const sinceDate = new Date(Date.now() - 31 * 24 * 3600 * 1000).toISOString();
  const { count } = await sb
    .from('agent_events')
    .select('id', { count: 'exact', head: true })
    .eq('type', 'budget_' + threshold + '_warn')
    .eq('source', 'guard_brasil:' + tenant.id)
    .gte('created_at', sinceDate);

  if ((count ?? 0) > 0) return;

  await sb.from('agent_events').insert({
    type: 'budget_' + threshold + '_warn',
    source: 'guard_brasil:' + tenant.id,
    severity: pct >= 1.0 ? 'critical' : 'warn',
    payload: { tenant_id: tenant.id, tenant_name: tenant.name, usage, cap, pct: Math.round(pct * 100) },
  });

  const tgToken = process.env.TELEGRAM_BOT_TOKEN ?? process.env.TELEGRAM_BOT_TOKEN_AI_AGENTS;
  const tgChat = process.env.TELEGRAM_ADMIN_CHAT_ID ?? process.env.TELEGRAM_AUTHORIZED_USER_ID ?? '171767219';
  if (!tgToken) return;

  const pctLabel = pct >= 1.0 ? 'PAUSED (100%)' : 'WARNING (80%)';
  const msg = '[Guard Brasil] Budget ' + pctLabel + ' — Tenant: ' + tenant.name + ' | ' + usage + '/' + cap + ' calls';

  await fetch('https://api.telegram.org/bot' + tgToken + '/sendMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: tgChat, text: msg }),
  }).catch(() => {});
}

export async function createFreeTenant(
  name: string,
  email: string,
): Promise<{ key: string; tenant: Tenant }> {
  const sb = getSupabase();
  if (!sb) throw new Error('Database unavailable');

  const rawKey = generateApiKey();
  const hash = hashKey(rawKey);

  const { data, error } = await sb
    .from('guard_brasil_tenants')
    .insert({
      name,
      email,
      tier: 'free',
      api_key_hash: hash,
      quota_limit: 500,
      calls_this_month: 0,
    })
    .select('id, name, email, tier, quota_limit, calls_this_month, status')
    .single();

  if (error) throw new Error(error.message);
  return { key: rawKey, tenant: data as Tenant };
}
