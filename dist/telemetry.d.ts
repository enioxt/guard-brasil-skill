/**
 * Guard Brasil Telemetry Recorder
 * Records API calls and inspection events to Supabase guard_brasil_events table
 * Fire-and-forget pattern: non-fatal if Supabase is unavailable
 */
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
export declare function recordApiCall(result: any, meta?: ApiCallMetadata): Promise<void>;
/**
 * Record an API error
 */
export declare function recordApiError(error: Error, meta?: ApiCallMetadata): Promise<void>;
/**
 * Get recent events for dashboard
 */
export declare function getRecentEvents(limit?: number, tenantId?: string): Promise<any[]>;
//# sourceMappingURL=telemetry.d.ts.map