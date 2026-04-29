/**
 * Internal barrel — re-exports all Guard Brasil modules.
 * These are inlined copies of @egos/shared modules for standalone distribution.
 */
export { createAtrianValidator } from './atrian.js';
export { scanForPII, sanitizeText, getPIISummary } from './pii-scanner.js';
export { maskPublicOutput, isPublicSafe, buildLGPDDisclosure } from './public-guard.js';
export { createEvidenceChain, EvidenceChainBuilder, formatEvidenceBlock, validateChain } from './evidence-chain.js';
export { buildAuditFields, canonicalRowJson, rawRowHash, sha256Text, sourceFingerprint } from './provenance.js';
//# sourceMappingURL=index.js.map