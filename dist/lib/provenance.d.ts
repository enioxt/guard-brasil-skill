export interface AuditFields {
    raw_line_hash: string;
    source_url: string;
    source_method: string;
    verified_at: string;
    audit_status: 'verified';
    source_fingerprint: string;
}
export declare function canonicalRowJson(row: Record<string, unknown>): string;
export declare function sha256Text(value: string): string;
export declare function rawRowHash(row: Record<string, unknown>): string;
export declare function sourceFingerprint(sourceUrl: string, method: string, collectedAt: string): string;
export declare function buildAuditFields(params: {
    rawRow: Record<string, unknown>;
    sourceUrl: string;
    method: string;
    collectedAt?: string;
}): AuditFields;
//# sourceMappingURL=provenance.d.ts.map