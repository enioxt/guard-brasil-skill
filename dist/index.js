/**
 * @egos/guard-brasil — Brazilian AI Safety Layer
 *
 * A compliance and trust layer for AI assistants operating in Brazilian
 * public-sector and enterprise contexts. Provides:
 *
 *   - ATRiAN ethical validation (absolute claims, false promises, fabricated data)
 *   - PII Scanner BR (CPF, RG, MASP, REDS, processo, placa, nome)
 *   - Public Guard — LGPD-compliant output masking
 *   - Evidence Chain — traceable response discipline
 *   - GuardBrasil facade — unified one-call API
 *
 * Compliance: Lei 13.709/2018 (LGPD)
 *
 * @example
 * ```ts
 * import { GuardBrasil } from '@egos/guard-brasil';
 *
 * const guard = GuardBrasil.create();
 * const result = await guard.inspect(llmResponse);
 * if (!result.safe) console.log(result.masked);
 * ```
 */
export { GuardBrasil, createGuardBrasil } from './guard.js';
// Re-export individual modules for fine-grained usage
export { createAtrianValidator } from './lib/index.js';
export { scanForPII, sanitizeText, getPIISummary } from './lib/index.js';
export { maskPublicOutput, isPublicSafe, buildLGPDDisclosure } from './lib/index.js';
export { createEvidenceChain, EvidenceChainBuilder, formatEvidenceBlock, validateChain } from './lib/index.js';
export { buildAuditFields, canonicalRowJson, rawRowHash, sha256Text, sourceFingerprint } from './lib/index.js';
// Centralized PII patterns — shared constants + detect/mask API
export { detectPII, maskPII, getPatternById, ALL_PII_PATTERNS } from './pii-patterns.js';
export { CPF_PATTERN, CNPJ_PATTERN, RG_PATTERN, CNH_PATTERN, MASP_PATTERN, REDS_PATTERN, PROCESSO_PATTERN, PLACA_ANTIGA_PATTERN, PLACA_MERCOSUL_PATTERN, TELEFONE_PATTERN, EMAIL_PATTERN, CEP_PATTERN, } from './pii-patterns.js';
// Reversible tokenized redaction — opaque hashes (EGOS-160)
export { tokenize, restore, hasTokens } from './lib/tokenizer.js';
// Reversible tokenized redaction — readable named placeholders (DataVirtus-compatible)
// Usage: namedTokenize(text) → [CPF_0001], [REDS_0001] → send to LLM → namedRestore(response, vault)
export { namedTokenize, namedRestore } from './lib/tokenizer.js';
// NER rules A–J: structured name detection for police/legal documents (MG context)
export { applyNERRules, NER_RULES } from './lib/ner-rules.js';
//# sourceMappingURL=index.js.map