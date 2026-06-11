/**
 * Public Guard — Safe output masking for Brazilian AI systems
 *
 * Masks sensitive public data references to comply with LGPD
 * and prevent inadvertent exposure of personal information
 * in AI-generated responses.
 */
import { scanForPII, sanitizeText } from './pii-scanner.js';
import { maskPII } from '../pii-patterns.js';
const CRITICAL_CATEGORIES = new Set(['cpf', 'masp', 'reds', 'rg']);
const HIGH_CATEGORIES = new Set(['process_number', 'date_of_birth']);
function computeSensitivity(findings) {
    if (findings.some(f => CRITICAL_CATEGORIES.has(f.category)))
        return 'critical';
    if (findings.some(f => HIGH_CATEGORIES.has(f.category)))
        return 'high';
    if (findings.length > 3)
        return 'medium';
    if (findings.length > 0)
        return 'low';
    return 'low';
}
/**
 * Masks PII from a text according to Guard Brasil policy.
 * Returns the masked text plus a full audit of all actions taken.
 */
export function maskPublicOutput(text, config = {}) {
    const piiAction = config.piiAction ?? 'mask';
    const criticalPiiAction = config.criticalPiiAction ?? 'redact';
    const extraPatterns = (config.customPatterns ?? []).map(p => ({
        category: p.id,
        label: p.label,
        pattern: p.regex,
        suggestion: p.maskFormat,
    }));
    const findings = scanForPII(text, extraPatterns.length > 0 ? { extraPatterns } : undefined);
    const sensitivityLevel = computeSensitivity(findings);
    const actionsMap = new Map();
    for (const finding of findings) {
        const isCritical = CRITICAL_CATEGORIES.has(finding.category);
        const action = isCritical ? criticalPiiAction : piiAction;
        if (!actionsMap.has(finding.category)) {
            actionsMap.set(finding.category, {
                category: finding.category,
                action,
                count: 0,
                positions: [],
            });
        }
        const entry = actionsMap.get(finding.category);
        entry.count++;
        entry.positions.push({ start: finding.start, end: finding.end });
    }
    const blocked = sensitivityLevel === 'critical' && criticalPiiAction === 'block';
    let masked;
    if (blocked) {
        masked = '[CONTEÚDO BLOQUEADO — DADOS SENSÍVEIS DETECTADOS]';
    }
    else if (config.maskMode === 'partial') {
        masked = maskPII(text, undefined, 'partial');
    }
    else {
        masked = sanitizeText(text, findings);
    }
    return {
        original: text,
        masked,
        findings,
        actionsApplied: [...actionsMap.values()],
        safe: findings.length === 0,
        sensitivityLevel,
    };
}
/**
 * Quick check: returns true if the text is safe to output publicly.
 */
export function isPublicSafe(text) {
    return scanForPII(text).length === 0;
}
/**
 * Generates a LGPD-compliant disclosure note for masked outputs.
 */
export function buildLGPDDisclosure(result) {
    if (result.safe)
        return '';
    const categories = [...new Set(result.findings.map(f => f.label))].join(', ');
    return `[LGPD] Dados pessoais detectados e mascarados nesta resposta: ${categories}. Conforme Lei 13.709/2018.`;
}
//# sourceMappingURL=public-guard.js.map