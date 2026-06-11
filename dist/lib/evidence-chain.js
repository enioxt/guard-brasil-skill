/**
 * Evidence Chain — Traceable response discipline for AI systems
 *
 * Attaches structured provenance to AI-generated responses,
 * ensuring every claim can be traced back to a source, tool call,
 * or human-verified fact. Core component of EGOS Guard Brasil.
 */
import { sha256Text } from './provenance.js';
const CONFIDENCE_RANK = {
    certain: 5,
    high: 4,
    medium: 3,
    low: 2,
    speculative: 1,
};
function lowestConfidence(levels) {
    if (levels.length === 0)
        return 'speculative';
    return levels.reduce((min, cur) => CONFIDENCE_RANK[cur] < CONFIDENCE_RANK[min] ? cur : min);
}
function computeAuditHash(chain) {
    const payload = JSON.stringify({
        responseId: chain.responseId,
        createdAt: chain.createdAt,
        claims: chain.claims.map(c => ({ claim: c.claim, confidence: c.confidence })),
    });
    return `ev-${sha256Text(payload)}`;
}
let _responseCounter = 0;
/**
 * Creates a new evidence chain for an AI response.
 */
export function createEvidenceChain(options = {}) {
    return new EvidenceChainBuilder(options);
}
export class EvidenceChainBuilder {
    claims = [];
    sessionId;
    responseId;
    createdAt;
    constructor(options) {
        this.sessionId = options.sessionId;
        this.responseId = `resp-${Date.now()}-${++_responseCounter}`;
        this.createdAt = new Date().toISOString();
    }
    /**
     * Adds a claim backed by evidence items.
     */
    addClaim(claim, evidence, confidence) {
        const derivedConfidence = confidence ?? lowestConfidence(evidence.map(e => e.confidence));
        this.claims.push({
            claim,
            evidence,
            confidence: derivedConfidence,
            verifiable: evidence.some(e => e.type !== 'inference'),
        });
        return this;
    }
    /**
     * Convenience: add a tool-call backed claim.
     */
    addToolCallClaim(claim, toolName, result, confidence = 'high') {
        const ev = {
            id: `ev-${Date.now()}`,
            type: 'tool_call',
            source: toolName,
            content: result,
            confidence,
            timestamp: new Date().toISOString(),
        };
        return this.addClaim(claim, [ev], confidence);
    }
    /**
     * Convenience: add a document-backed claim.
     */
    addDocumentClaim(claim, docRef, excerpt, confidence = 'high') {
        const ev = {
            id: `ev-${Date.now()}`,
            type: 'document',
            source: docRef,
            content: excerpt,
            confidence,
            timestamp: new Date().toISOString(),
        };
        return this.addClaim(claim, [ev], confidence);
    }
    /**
     * Builds and seals the evidence chain.
     */
    build() {
        const overallConfidence = lowestConfidence(this.claims.map(c => c.confidence));
        const partial = {
            responseId: this.responseId,
            sessionId: this.sessionId,
            createdAt: this.createdAt,
            claims: this.claims,
            overallConfidence,
        };
        return { ...partial, auditHash: computeAuditHash(partial) };
    }
}
/**
 * Formats an evidence chain into a human-readable citation block.
 */
export function formatEvidenceBlock(chain) {
    const lines = [`[Evidências — ${chain.responseId}]`];
    for (const { claim, evidence, confidence } of chain.claims) {
        lines.push(`• ${claim} (confiança: ${confidence})`);
        for (const ev of evidence) {
            lines.push(`  ↳ [${ev.type}] ${ev.source}: "${ev.content.slice(0, 120)}..."`);
        }
    }
    lines.push(`Audit hash: ${chain.auditHash}`);
    return lines.join('\n');
}
/**
 * Validates that a chain meets minimum confidence requirements.
 */
export function validateChain(chain, minConfidence = 'low') {
    return CONFIDENCE_RANK[chain.overallConfidence] >= CONFIDENCE_RANK[minConfidence];
}
//# sourceMappingURL=evidence-chain.js.map