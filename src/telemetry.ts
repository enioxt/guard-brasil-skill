/**
 * Guard Brasil Telemetry Recorder
 * Records API calls and inspection events to Supabase guard_brasil_events table
 * Fire-and-forget pattern: non-fatal if Supabase is unavailable
 */

let supabase: any = null;
let supabaseAvailable = false;

function loadSupabase(): boolean {
  if (supabaseAvailable !== null) return supabaseAvailable;
  try {
    const mod = require('@supabase/supabase-js');
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      console.warn('[guard-brasil-telemetry] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — telemetry disabled');
      supabaseAvailable = false;
      return false;
    }

    supabase = mod.createClient(url, key);
    supabaseAvailable = true;
    return true;
  } catch (e) {
    console.warn('[guard-brasil-telemetry] @supabase/supabase-js not available or Supabase init failed');
    supabaseAvailable = false;
    return false;
  }
}

export interface ApiCallMetadata {
  tenant_id?: string;
  input_hash?: string;
  duration_ms?: number;
  session_id?: string;
  api_version?: string;
  [key: string]: any;
}

/**
 * Record an API call/inspection event to guard_brasil_events table
 * @param result - GuardBrasilResult from guard.inspect()
 * @param meta - Additional metadata (duration, session, etc.)
 */
export async function recordApiCall(
  result: any,
  meta: ApiCallMetadata = {},
): Promise<void> {
  if (!loadSupabase()) {
    return; // Telemetry disabled, exit silently
  }

  try {
    const findings = Array.isArray(result?.masking?.findings) ? result.masking.findings : [];
    const piiTypes = [...new Set(findings.map((finding: any) => finding.category))];
    const event = {
      tenant_id: meta.tenant_id || 'default',
      event_type: 'pii_inspection',
      input_hash: meta.input_hash,
      pii_types: piiTypes,
      pii_count: findings.length,
      verdict: result?.safe ? 'safe' : 'blocked',
      model_id: meta.model_id || 'guard-brasil-v0.2.0',
      cost_usd: result?.cost?.usd || 0,
      duration_ms: meta.duration_ms || 0,
      atrian_score: result?.atrian?.score || null,
      atrian_violations: result?.atrian?.violations || [],
      pri_output: result?.pri?.output || null,
      pri_confidence: result?.pri?.confidence || null,
      pri_strategy: result?.pri?.strategy || null,
      policy_pack: result?.summary?.applicablePolicies?.[0] || null,
      status_code: 200,
      session_id: meta.session_id,
      api_version: meta.api_version || 'v1',
    };

    // Fire-and-forget: insert to Supabase
    await supabase
      .from('guard_brasil_events')
      .insert([event])
      .catch((err: any) => {
        console.warn('[guard-brasil-telemetry] Failed to insert event:', err.message);
        // Non-fatal — continue
      });
  } catch (e) {
    console.warn('[guard-brasil-telemetry] Error recording event:', e);
    // Non-fatal — continue
  }
}

/**
 * Record an API error
 */
export async function recordApiError(
  error: Error,
  meta: ApiCallMetadata = {},
): Promise<void> {
  if (!loadSupabase()) return;

  try {
    await supabase
      .from('guard_brasil_events')
      .insert([
        {
          tenant_id: meta.tenant_id || 'default',
          event_type: 'api_error',
          verdict: 'error',
          status_code: 500,
          error_message: error.message,
          session_id: meta.session_id,
          api_version: meta.api_version || 'v1',
        },
      ])
      .catch(() => {}); // Swallow errors
  } catch (e) {
    // Silent fail
  }
}

/**
 * Get recent events for dashboard
 */
export async function getRecentEvents(
  limit = 50,
  tenantId?: string,
): Promise<any[]> {
  if (!loadSupabase()) return [];

  try {
    let query = supabase
      .from('guard_brasil_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[guard-brasil-telemetry] Failed to fetch events:', error.message);
      return [];
    }

    return data || [];
  } catch (e) {
    console.warn('[guard-brasil-telemetry] Error fetching events:', e);
    return [];
  }
}
