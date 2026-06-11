/**
 * Institution Profile Registry — Guard Brasil extensibility layer
 *
 * Every state, court, health system or police force has identifiers
 * in formats that generic scanners don't know. This registry lets each
 * institution define its own PII patterns without touching Guard Brasil core.
 *
 * Design principle: Guard Brasil is format-agnostic.
 * The core knows CPF, CNPJ, MASP, REDS. Everything else comes through profiles.
 */
/**
 * Thresholds for confidence auto-promotion via HITL.
 * After enough confirmations, the pattern earns more trust.
 */
export const HITL_CONFIDENCE_THRESHOLDS = {
    low: 0,
    medium: 10,
    high: 30,
};
/**
 * Computes updated confidence after a HITL review batch.
 * Promotes when confirmations exceed threshold AND rejection rate < 20%.
 */
export function computeConfidenceFromHITL(stats, current) {
    const total = stats.confirmations + stats.rejections;
    if (total === 0)
        return current;
    const rejectionRate = stats.rejections / total;
    if (rejectionRate > 0.2)
        return 'low';
    if (stats.confirmations >= HITL_CONFIDENCE_THRESHOLDS.high)
        return 'high';
    if (stats.confirmations >= HITL_CONFIDENCE_THRESHOLDS.medium)
        return 'medium';
    return current;
}
//# sourceMappingURL=types.js.map