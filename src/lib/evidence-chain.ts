/**
 * Evidence Chain — Traceable response discipline for AI systems
 *
 * Attaches structured provenance to AI-generated responses,
 * ensuring every claim can be traced back to a source, tool call,
 * or human-verified fact. Core component of EGOS Guard Brasil.
 */

import { sha256Text } from './provenance.js';

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

const CONFIDENCE_RANK: Record<ConfidenceLevel, number> = {
  certain: 5,
  high: 4,
  medium: 3,
  low: 2,
  speculative: 1,
};

function lowestConfidence(levels: ConfidenceLevel[]): ConfidenceLevel {
  if (levels.length === 0) return 'speculative';
  return levels.reduce((min, cur) =>
    CONFIDENCE_RANK[cur] < CONFIDENCE_RANK[min] ? cur : min
  );
}

function computeAuditHash(chain: Omit<EvidenceChain, 'auditHash'>): string {
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
export function createEvidenceChain(options: EvidenceChainOptions = {}): EvidenceChainBuilder {
  return new EvidenceChainBuilder(options);
}

export class EvidenceChainBuilder {
  private claims: ClaimWithEvidence[] = [];
  private sessionId?: string;
  private responseId: string;
  private createdAt: string;

  constructor(options: EvidenceChainOptions) {
    this.sessionId = options.sessionId;
    this.responseId = `resp-${Date.now()}-${++_responseCounter}`;
    this.createdAt = new Date().toISOString();
  }

  /**
   * Adds a claim backed by evidence items.
   */
  addClaim(claim: string, evidence: EvidenceItem[], confidence?: ConfidenceLevel): this {
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
  addToolCallClaim(claim: string, toolName: string, result: string, confidence: ConfidenceLevel = 'high'): this {
    const ev: EvidenceItem = {
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
  addDocumentClaim(claim: string, docRef: string, excerpt: string, confidence: ConfidenceLevel = 'high'): this {
    const ev: EvidenceItem = {
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
  build(): EvidenceChain {
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
export function formatEvidenceBlock(chain: EvidenceChain): string {
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
export function validateChain(chain: EvidenceChain, minConfidence: ConfidenceLevel = 'low'): boolean {
  return CONFIDENCE_RANK[chain.overallConfidence] >= CONFIDENCE_RANK[minConfidence];
}
