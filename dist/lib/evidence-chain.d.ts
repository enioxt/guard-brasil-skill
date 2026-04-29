/**
 * Evidence Chain — Traceable response discipline for AI systems
 *
 * Attaches structured provenance to AI-generated responses,
 * ensuring every claim can be traced back to a source, tool call,
 * or human-verified fact. Core component of EGOS Guard Brasil.
 */
export type EvidenceType = 'tool_call' | 'document' | 'calculation' | 'human_verified' | 'inference' | 'external_api';
export type ConfidenceLevel = 'certain' | 'high' | 'medium' | 'low' | 'speculative';
export interface EvidenceItem {
    id: string;
    type: EvidenceType;
    source: string;
    content: string;
    confidence: ConfidenceLevel;
    timestamp: string;
    metadata?: Record<string, unknown>;
}
export interface EvidenceChain {
    responseId: string;
    sessionId?: string;
    createdAt: string;
    claims: ClaimWithEvidence[];
    overallConfidence: ConfidenceLevel;
    auditHash: string;
}
export interface ClaimWithEvidence {
    claim: string;
    evidence: EvidenceItem[];
    confidence: ConfidenceLevel;
    verifiable: boolean;
}
export interface EvidenceChainOptions {
    sessionId?: string;
    requireEvidence?: boolean;
    minConfidence?: ConfidenceLevel;
}
/**
 * Creates a new evidence chain for an AI response.
 */
export declare function createEvidenceChain(options?: EvidenceChainOptions): EvidenceChainBuilder;
export declare class EvidenceChainBuilder {
    private claims;
    private sessionId?;
    private responseId;
    private createdAt;
    constructor(options: EvidenceChainOptions);
    /**
     * Adds a claim backed by evidence items.
     */
    addClaim(claim: string, evidence: EvidenceItem[], confidence?: ConfidenceLevel): this;
    /**
     * Convenience: add a tool-call backed claim.
     */
    addToolCallClaim(claim: string, toolName: string, result: string, confidence?: ConfidenceLevel): this;
    /**
     * Convenience: add a document-backed claim.
     */
    addDocumentClaim(claim: string, docRef: string, excerpt: string, confidence?: ConfidenceLevel): this;
    /**
     * Builds and seals the evidence chain.
     */
    build(): EvidenceChain;
}
/**
 * Formats an evidence chain into a human-readable citation block.
 */
export declare function formatEvidenceBlock(chain: EvidenceChain): string;
/**
 * Validates that a chain meets minimum confidence requirements.
 */
export declare function validateChain(chain: EvidenceChain, minConfidence?: ConfidenceLevel): boolean;
//# sourceMappingURL=evidence-chain.d.ts.map