/**
 * Guard Brasil — API Key Management (EGOS-MONETIZE-001)
 *
 * Customer API keys backed by guard_brasil_tenants in Supabase.
 * Keys stored as SHA-256 hashes — never plaintext.
 */
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
export declare function generateApiKey(): string;
export declare function hashKey(key: string): string;
export declare function validateKey(rawKey: string): Promise<Tenant | null>;
export declare function incrementUsage(tenantId: string): Promise<void>;
/**
 * PAP-002: Budget warning — send Telegram when tenant reaches 80%/100% of quota.
 * Called fire-and-forget after incrementUsage. Deduplicates via agent_events.
 */
export declare function checkBudgetWarning(tenant: Tenant): Promise<void>;
export declare function createFreeTenant(name: string, email: string): Promise<{
    key: string;
    tenant: Tenant;
}>;
//# sourceMappingURL=keys.d.ts.map