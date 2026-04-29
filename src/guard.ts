/**
 * GuardBrasil — Unified facade for the Brazilian AI safety layer.
 *
 * Composes ATRiAN + PII Scanner + Public Guard + Evidence Chain
 * into a single call that validates, masks, and audits any LLM output.
 */

import {
  createAtrianValidator,
  maskPublicOutput,
  buildLGPDDisclosure,
  createEvidenceChain,
  formatEvidenceBlock,
  buildAuditFields,
  sha256Text,
  sourceFingerprint,
  type AtrianConfig,
  type AtrianResult,
  type MaskingResult,
  type EvidenceChain,
  type AuditFields,
  type EvidenceChainOptions,
  type ConfidenceLevel,
} from './lib/index.js';
import { type MaskMode } from './pii-patterns.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GuardBrasilConfig {
  /** ATRiAN configuration — ethical validation */
  atrian?: AtrianConfig;
  /** Block output entirely if critical PII found (default: false — masks instead) */
  blockOnCriticalPII?: boolean;
  /** Add LGPD disclosure footer to masked outputs (default: true) */
  lgpdDisclosure?: boolean;
  /** Default confidence level for unattributed claims (default: 'medium') */
  defaultConfidence?: ConfidenceLevel;
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

// Brazilian government acronyms that should never be flagged as invented
const BRAZILIAN_KNOWN_ACRONYMS = [
  // Identifiers
  'CPF', 'RG', 'MASP', 'REDS', 'BO', 'SINESP', 'LGPD', 'ANPD',
  'OAB', 'CNJ', 'CRM', 'PIX', 'INSS', 'SUS', 'STF', 'STJ',
  'PCMG', 'PMMG', 'TJMG', 'MPMG', 'CGU', 'TCU', 'AGU',
  // Brazilian states
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR',
  'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
  // Medical / health
  'HIV', 'AIDS', 'UTI', 'CTI', 'UPA', 'UBS', 'CID', 'SUS',
  'ANVISA', 'CFM', 'CFO', 'CFF', 'COREN',
  // Common BR abbreviations that are NOT invented
  'CEO', 'CTO', 'CFO', 'COO', 'API', 'URL', 'SQL', 'XML',
  'PDF', 'CPD', 'TI', 'RH', 'DP', 'PJ', 'PF', 'ME', 'MEI',
  'CNPJ', 'CEP', 'CNH', 'FGTS', 'CLT', 'PIS', 'NIS',
];
const GUARD_VERSION = '0.2.2';

function buildInspectionReceipt(
  text: string,
  output: string,
  evidenceChain: EvidenceChain | undefined,
  provenance: InspectProvenanceOptions | undefined,
): InspectionReceipt {
  const inspectedAt = new Date().toISOString();
  const inputHash = sha256Text(text);
  const outputHash = sha256Text(output);
  let provenanceLevel: ProvenanceLevel = 'inspection_only';
  let source: SourceReceipt | undefined;
  if (provenance?.sourceUrl && provenance?.sourceMethod) {
    const verifiedAt = provenance.collectedAt ?? inspectedAt;
    const audit = provenance.rawRow
      ? buildAuditFields({ rawRow: provenance.rawRow, sourceUrl: provenance.sourceUrl, method: provenance.sourceMethod, collectedAt: verifiedAt })
      : undefined;
    provenanceLevel = audit ? 'source_row_bound' : 'source_context';
    source = {
      ...audit,
      source_url: provenance.sourceUrl.trim(),
      source_method: provenance.sourceMethod.trim() || 'unknown',
      verified_at: audit?.verified_at ?? verifiedAt,
      source_fingerprint: audit?.source_fingerprint ?? sourceFingerprint(provenance.sourceUrl, provenance.sourceMethod, verifiedAt),
      ...(provenance.query ? { queryHash: sha256Text(provenance.query) } : {}),
      ...(provenance.recordId ? { recordId: provenance.recordId } : {}),
      provenanceLevel,
    };
  }
  const inspectionHash = sha256Text(JSON.stringify({ inputHash, outputHash, inspectedAt, evidenceHash: evidenceChain?.auditHash ?? null, sourceFingerprint: source?.source_fingerprint ?? null, guardVersion: GUARD_VERSION, provenanceLevel }));
  return { inspectedAt, inputHash, outputHash, inspectionHash, guardVersion: GUARD_VERSION, ...(evidenceChain ? { evidenceHash: evidenceChain.auditHash } : {}), ...(source ? { source } : {}), provenanceLevel };
}

// ─── GuardBrasil class ────────────────────────────────────────────────────────

export class GuardBrasil {
  private readonly atrian: ReturnType<typeof createAtrianValidator>;
  private readonly config: Required<GuardBrasilConfig>;

  private constructor(config: GuardBrasilConfig) {
    // Merge user-provided knownAcronyms with Brazilian defaults
    const mergedAcronyms = [
      ...BRAZILIAN_KNOWN_ACRONYMS,
      ...(config.atrian?.knownAcronyms ?? []),
    ];

    this.config = {
      atrian: { ...config.atrian, knownAcronyms: mergedAcronyms },
      blockOnCriticalPII: config.blockOnCriticalPII ?? false,
      lgpdDisclosure: config.lgpdDisclosure ?? true,
      defaultConfidence: config.defaultConfidence ?? 'medium',
    };
    this.atrian = createAtrianValidator(this.config.atrian);
  }

  /**
   * Creates a new GuardBrasil instance with the given configuration.
   */
  static create(config: GuardBrasilConfig = {}): GuardBrasil {
    return new GuardBrasil(config);
  }

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
  inspect(text: string, options: InspectOptions = {}): GuardBrasilResult {
    // Step 1 — Ethical validation (ATRiAN)
    const atrianResult = this.atrian.validateAndReport(text);

    // Step 2 — PII masking (Public Guard)
    const maskingResult = maskPublicOutput(text, {
      criticalPiiAction: this.config.blockOnCriticalPII ? 'block' : 'redact',
      maskMode: options.maskMode,
    });

    const blocked = maskingResult.masked.startsWith('[CONTEÚDO BLOQUEADO');

    // Step 3 — Apply ATRiAN filter on top of masked output
    const filteredOutput = blocked
      ? maskingResult.masked
      : this.atrian.filterChunk(maskingResult.masked);

    // Step 4 — Evidence chain (optional)
    let evidenceChain: EvidenceChain | undefined;
    let evidenceBlock: string | undefined;

    if (options.claims && options.claims.length > 0) {
      const builder = createEvidenceChain({ sessionId: options.sessionId });
      for (const { claim, source, excerpt, confidence } of options.claims) {
        builder.addDocumentClaim(claim, source, excerpt ?? claim, confidence ?? this.config.defaultConfidence);
      }
      evidenceChain = builder.build();
      evidenceBlock = formatEvidenceBlock(evidenceChain);
    }

    // Step 5 — LGPD disclosure
    const lgpdDisclosure = this.config.lgpdDisclosure
      ? buildLGPDDisclosure(maskingResult)
      : '';

    // Step 6 — Summary
    const issues: string[] = [];
    if (!atrianResult.passed) {
      const errors = atrianResult.violations.filter(v => v.level === 'error' || v.level === 'critical');
      if (errors.length > 0) issues.push(`ATRiAN: ${errors.length} violation(s) (${errors.map(v => v.category).join(', ')})`);
    }
    if (!maskingResult.safe) {
      issues.push(`PII: ${maskingResult.findings.length} finding(s) (${maskingResult.sensitivityLevel})`);
    }

    const safe = maskingResult.safe && atrianResult.passed;
    const summary = issues.length === 0
      ? 'Output is clean — no violations found.'
      : `Issues found: ${issues.join(' | ')}`;
    const receipt = buildInspectionReceipt(text, filteredOutput, evidenceChain, options.provenance);

    return {
      original: text,
      output: filteredOutput,
      safe,
      blocked,
      atrian: atrianResult,
      masking: maskingResult,
      evidenceChain,
      evidenceBlock,
      lgpdDisclosure,
      summary,
      receipt,
    };
  }
}

/**
 * Convenience factory — same as `GuardBrasil.create(config)`.
 */
export function createGuardBrasil(config: GuardBrasilConfig = {}): GuardBrasil {
  return GuardBrasil.create(config);
}
