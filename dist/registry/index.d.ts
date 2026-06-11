/**
 * Institution Profile Registry — index
 *
 * Available profiles:
 *   - PCMG: Polícia Civil de Minas Gerais (v0.1.0 — HITL pending)
 *
 * Usage:
 *   import { PCMG_PROFILE } from '@egos/guard-brasil/registry';
 *   const guard = GuardBrasil.create({ customPatterns: PCMG_PROFILE.patterns });
 *
 * Contributing a new profile:
 *   1. Create `<institution>.ts` in this directory
 *   2. Export an `InstitutionProfile` following the type contract
 *   3. Add patterns with `confidence: 'low'`
 *   4. Run HITL validation: `bun packages/guard-brasil/src/registry/hitl-runner.ts --profile <id>`
 *   5. Export as JSON for sharing: profiles are self-contained and require no code change to use
 */
export { PCMG_PROFILE } from './pcmg.js';
export { computeConfidenceFromHITL, HITL_CONFIDENCE_THRESHOLDS } from './types.js';
export type { InstitutionProfile, HITLReviewResult } from './types.js';
//# sourceMappingURL=index.d.ts.map