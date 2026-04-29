/**
 * Guard Brasil — API Key Management (EGOS-MONETIZE-001)
 *
 * Customer API keys backed by guard_brasil_tenants in Supabase.
 * Keys stored as SHA-256 hashes — never plaintext.
 */
import { createHash, randomBytes } from 'crypto';
const KEY_PREFIX = 'gb_live_';
// Lazy Supabase (same pattern as telemetry.ts)
let _supabase = null;
function getSupabase() {
    if (_supabase)
        return _supabase;
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { createClient } = require('@supabase/supabase-js');
        const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key)
            return null;
        _supabase = createClient(url, key);
        return _supabase;
    }
    catch {
        return null;
    }
}
export function generateApiKey() {
    return KEY_PREFIX + randomBytes(24).toString('hex');
}
export function hashKey(key) {
    return createHash('sha256').update(key).digest('hex');
}
export async function validateKey(rawKey) {
    const sb = getSupabase();
    if (!sb)
        return null;
    const hash = hashKey(rawKey);
    const { data, error } = await sb
        .from('guard_brasil_tenants')
        .select('id, name, email, tier, quota_limit, calls_this_month, status')
        .eq('api_key_hash', hash)
        .eq('status', 'active')
        .single();
    if (error || !data)
        return null;
    return data;
}
export async function incrementUsage(tenantId) {
    const sb = getSupabase();
    if (!sb)
        return;
    await sb.rpc('increment_api_usage', { p_tenant_id: tenantId });
}
export async function createFreeTenant(name, email) {
    const sb = getSupabase();
    if (!sb)
        throw new Error('Database unavailable');
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
    if (error)
        throw new Error(error.message);
    return { key: rawKey, tenant: data };
}
//# sourceMappingURL=keys.js.map