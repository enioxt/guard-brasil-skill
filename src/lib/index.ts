/**
 * Internal barrel — re-exports all Guard Brasil modules.
 * These are inlined copies of @egos/shared modules for standalone distribution.
 */

export { createAtrianValidator } from './atrian.js';
export type { AtrianConfig, AtrianResult, AtrianViolation, ViolationLevel } from './atrian.js';

export { scanForPII, sanitizeText, getPIISummary } from './pii-scanner.js';
export type { PIICategory, PIIFinding, PIIPatternDefinition } from './pii-scanner.js';

export { maskPublicOutput, isPublicSafe, buildLGPDDisclosure } from './public-guard.js';
export type { PublicGuardConfig, MaskingResult, MaskingAction, GuardAction, SensitivityLevel } from './public-guard.js';

export { createEvidenceChain, EvidenceChainBuilder, formatEvidenceBlock, validateChain } from './evidence-chain.js';
export type { EvidenceChain, EvidenceItem, ClaimWithEvidence, EvidenceType, ConfidenceLevel, EvidenceChainOptions } from './evidence-chain.js';

export { buildAuditFields, canonicalRowJson, rawRowHash, sha256Text, sourceFingerprint } from './provenance.js';
export type { AuditFields } from './provenance.js';
