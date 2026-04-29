import { createHash } from 'node:crypto';
function normalize(value) {
    if (value === null || value === undefined)
        return null;
    if (value instanceof Date)
        return value.toISOString().replace('+00:00', 'Z');
    if (Array.isArray(value))
        return value.map(normalize);
    if (typeof value === 'object') {
        const obj = value;
        return Object.fromEntries(Object.entries(obj)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => [k, normalize(v)]));
    }
    return value;
}
export function canonicalRowJson(row) {
    return JSON.stringify(normalize(row), null, 0);
}
export function sha256Text(value) {
    return createHash('sha256').update(value, 'utf8').digest('hex');
}
export function rawRowHash(row) {
    return sha256Text(canonicalRowJson(row));
}
export function sourceFingerprint(sourceUrl, method, collectedAt) {
    return sha256Text(`${sourceUrl.trim()}|${method.trim()}|${collectedAt.trim()}`);
}
export function buildAuditFields(params) {
    const verifiedAt = params.collectedAt ?? new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    return {
        raw_line_hash: rawRowHash(params.rawRow),
        source_url: params.sourceUrl.trim(),
        source_method: params.method.trim() || 'unknown',
        verified_at: verifiedAt,
        audit_status: 'verified',
        source_fingerprint: sourceFingerprint(params.sourceUrl, params.method, verifiedAt),
    };
}
//# sourceMappingURL=provenance.js.map