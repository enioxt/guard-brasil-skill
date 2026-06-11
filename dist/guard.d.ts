/**
 * GuardBrasil — Unified facade for the Brazilian AI safety layer.
 *
 * Composes ATRiAN + PII Scanner + Public Guard + Evidence Chain
 * into a single call that validates, masks, and audits any LLM output.
 */
import { type AtrianConfig, type AtrianResult, type MaskingResult, type EvidenceChain, type AuditFields, type ConfidenceLevel } from './lib/index.js';
import { type MaskMode, type CustomPIIPattern } from './pii-patterns.js';
export interface GuardBrasilConfig {
    /** ATRiAN configuration — ethical validation */
    atrian?: AtrianConfig;
    /** Block output entirely if critical PII found (default: false — masks instead) */
    blockOnCriticalPII?: boolean;
    /** Add LGPD disclosure footer to masked outputs (default: true) */
    lgpdDisclosure?: boolean;
    /** Default confidence level for unattributed claims (default: 'medium') */
    defaultConfidence?: ConfidenceLevel;
    /**
     * Institution-specific custom PII patterns.
     * Guard Brasil is format-agnostic — each state, court, health system, or
     * police force defines their own identifier formats here without touching core.
     *
     * Example — PCMG profile:
     *   customPatterns: PCMG_PROFILE.patterns
     *
     * Example — inline:
     *   customPatterns: [{
     *     id: 'tjmg:numero_externo',
     *     label: 'Número Externo TJMG',
     *     regex: /\bEXT-\d{4}-\d{6}\b/g,
     *     maskFormat: '[NR EXTERNO REMOVIDO]',
     *     confidence: 'medium',
     *   }]
     *
     * HITL training: start with confidence 'low', validate via HITL UI,
     * auto-promote to 'high' after N confirmations.
     */
    customPatterns?: CustomPIIPattern[];
}
export interface InspectOptions {
    /** Optional session ID for evidence chain tracing */
    sessionId?: string;
    /** Claims to attach to the evidence chain (human-readable) */
    claims?: Array<{
        claim: string;
        source: string;
        excerpt?: string;
        confidence?: ConfidenceLevel;
    }>;
    provenance?: InspectProvenanceOptions;
    /** Masking mode: 'full' (default) fully redacts, 'partial' reveals enough for user confirmation */
    maskMode?: MaskMode;
}
export type ProvenanceLevel = 'inspection_only' | 'source_context' | 'source_row_bound';
export interface InspectProvenanceOptions {
    sourceUrl?: string;
    sourceMethod?: string;
    collectedAt?: string;
    rawRow?: Record<string, unknown>;
    query?: string;
    recordId?: string;
}
export type SourceReceipt = Partial<AuditFields> & {
    queryHash?: string;
    recordId?: string;
    provenanceLevel: Exclude<ProvenanceLevel, 'inspection_only'>;
};
export interface InspectionReceipt {
    inspectedAt: string;
    inputHash: string;
    outputHash: string;
    inspectionHash: string;
    guardVersion: string;
    evidenceHash?: string;
    provenanceLevel: ProvenanceLevel;
    source?: SourceReceipt;
}
export interface GuardBrasilResult {
    /** Original (untouched) text */
    original: string;
    /** Processed text — masked or blocked */
    output: string;
    /** Whether output is safe to publish as-is */
    safe: boolean;
    /** Whether output was blocked entirely (not just masked) */
    blocked: boolean;
    /** ATRiAN ethical validation result */
    atrian: AtrianResult;
    /** PII masking result */
    masking: MaskingResult;
    /** Evidence chain (if claims were provided) */
    evidenceChain?: EvidenceChain;
    /** Evidence block formatted for inclusion in response */
    evidenceBlock?: string;
    /** LGPD disclosure note (empty if no PII found) */
    lgpdDisclosure: string;
    /** Human-readable summary of all issues found */
    summary: string;
    /** Inspection receipt with hashes and optional source provenance */
    receipt: InspectionReceipt;
}
export declare class GuardBrasil {
    private readonly atrian;
    private readonly config;
    private constructor();
    /**
     * Creates a new GuardBrasil instance with the given configuration.
     */
    static create(config?: GuardBrasilConfig): GuardBrasil;
    /**
     * Inspects a text through all guard layers.
     *
     * 1. ATRiAN — validates for absolute claims, false promises, fabricated data
     * 2. PII Scanner — detects Brazilian personal identifiers
     * 3. Public Guard — masks or blocks sensitive content
     * 4. Evidence Chain — builds audit trail for provided claims
     *
     * @param text — LLM output or any text to inspect
     * @param options — optional session ID and claims for evidence chain
     */
    inspect(text: string, options?: InspectOptions): GuardBrasilResult;
}
/**
 * Convenience factory — same as `GuardBrasil.create(config)`.
 */
export declare function createGuardBrasil(config?: GuardBrasilConfig): GuardBrasil;
//# sourceMappingURL=guard.d.ts.map