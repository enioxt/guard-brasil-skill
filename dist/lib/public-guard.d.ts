/**
 * Public Guard — Safe output masking for Brazilian AI systems
 *
 * Masks sensitive public data references to comply with LGPD
 * and prevent inadvertent exposure of personal information
 * in AI-generated responses.
 */
import { type PIIFinding } from './pii-scanner.js';
import { type MaskMode, type CustomPIIPattern } from '../pii-patterns.js';
export type GuardAction = 'mask' | 'redact' | 'block' | 'warn';
export type SensitivityLevel = 'low' | 'medium' | 'high' | 'critical';
export interface PublicGuardConfig {
    /** Action when PII is found */
    piiAction?: GuardAction;
    /** Action for critical PII (CPF, MASP, REDS) */
    criticalPiiAction?: GuardAction;
    /** Threshold: score below this blocks the output */
    blockThreshold?: number;
    /** Add audit trail to each masking action */
    auditTrail?: boolean;
    /** Custom replacement templates */
    replacements?: Partial<Record<string, string>>;
    /**
     * Masking mode:
     * - 'full' (default): fully redact → [CPF REMOVIDO]
     * - 'partial': banking-style partial reveal → ***.456.789-**
     */
    maskMode?: MaskMode;
    /**
     * Custom PII patterns to merge with built-in patterns.
     * Each institution/state/situation defines their own identifiers.
     * These run AFTER built-in patterns — no conflicts.
     */
    customPatterns?: CustomPIIPattern[];
}
export interface MaskingResult {
    original: string;
    masked: string;
    findings: PIIFinding[];
    actionsApplied: MaskingAction[];
    safe: boolean;
    sensitivityLevel: SensitivityLevel;
}
export interface MaskingAction {
    category: string;
    action: GuardAction;
    count: number;
    positions: Array<{
        start: number;
        end: number;
    }>;
}
/**
 * Masks PII from a text according to Guard Brasil policy.
 * Returns the masked text plus a full audit of all actions taken.
 */
export declare function maskPublicOutput(text: string, config?: PublicGuardConfig): MaskingResult;
/**
 * Quick check: returns true if the text is safe to output publicly.
 */
export declare function isPublicSafe(text: string): boolean;
/**
 * Generates a LGPD-compliant disclosure note for masked outputs.
 */
export declare function buildLGPDDisclosure(result: MaskingResult): string;
//# sourceMappingURL=public-guard.d.ts.map