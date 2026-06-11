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
import type { CustomPIIPattern, PatternConfidence } from '../pii-patterns.js';
/**
 * Institution profile — a named bundle of custom PII patterns.
 *
 * Lifecycle:
 *   1. Create profile with patterns at confidence 'low'
 *   2. Run guard on anonymized/synthetic corpus → review in HITL UI
 *   3. Confirm/reject each match → confidence auto-upgrades
 *   4. Export as JSON for sharing across environments (no code change)
 *   5. Import in target environment: `GuardBrasil.create({ customPatterns: profile.patterns })`
 */
export interface InstitutionProfile {
    /** Unique namespace — use in pattern IDs: `<id>:<pattern_name>` */
    id: string;
    /** Human-readable name */
    name: string;
    /** State or federal scope */
    scope: 'federal' | 'state' | 'municipal' | 'court' | 'health' | 'education' | 'other';
    /** Brazilian state code (e.g. 'MG', 'SP') if state-scoped */
    state?: string;
    /** Custom patterns defined by this institution */
    patterns: CustomPIIPattern[];
    /** Profile version — bump when patterns change */
    version: string;
    /** When this profile was last updated */
    updatedAt: string;
    /** Contact or responsible team */
    maintainer?: string;
}
/**
 * Result of a HITL review session.
 * Each human-reviewed match updates the pattern's hitlStats.
 */
export interface HITLReviewResult {
    patternId: string;
    matchedText: string;
    isCorrect: boolean;
    reviewedBy: string;
    reviewedAt: string;
    note?: string;
}
/**
 * Thresholds for confidence auto-promotion via HITL.
 * After enough confirmations, the pattern earns more trust.
 */
export declare const HITL_CONFIDENCE_THRESHOLDS: Record<PatternConfidence, number>;
/**
 * Computes updated confidence after a HITL review batch.
 * Promotes when confirmations exceed threshold AND rejection rate < 20%.
 */
export declare function computeConfidenceFromHITL(stats: NonNullable<CustomPIIPattern['hitlStats']>, current: PatternConfidence): PatternConfidence;
//# sourceMappingURL=types.d.ts.map