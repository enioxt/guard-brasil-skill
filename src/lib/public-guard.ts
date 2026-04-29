/**
 * Public Guard — Safe output masking for Brazilian AI systems
 *
 * Masks sensitive public data references to comply with LGPD
 * and prevent inadvertent exposure of personal information
 * in AI-generated responses.
 */

import { scanForPII, sanitizeText, type PIIFinding } from './pii-scanner.js';
import { maskPII, type MaskMode } from '../pii-patterns.js';

export type GuardAction = 'mask' | 'redact' | 'block' | 'warn';
export type SensitivityLevel = 'low' | 'medium' | 'high' | 'critical';

export interface PublicGuardConfig {
  /** Action when PII is found */
  piiAction?: GuardAction;
  /** Action for critical PII (CPF, MASP, REDS) */
  criticalPiiAction?: GuardAction;
  /** Threshold: score below this blocks the output */
  blockThreshold?: number;
  /** Add audit trail to each masking action */
  auditTrail?: boolean;
  /** Custom replacement templates */
  replacements?: Partial<Record<string, string>>;
  /**
   * Masking mode:
   * - 'full' (default): fully redact → [CPF REMOVIDO]
   * - 'partial': banking-style partial reveal → ***.456.789-**
   */
  maskMode?: MaskMode;
}

export interface MaskingResult {
  original: string;
  masked: string;
  findings: PIIFinding[];
  actionsApplied: MaskingAction[];
  safe: boolean;
  sensitivityLevel: SensitivityLevel;
}

export interface MaskingAction {
  category: string;
  action: GuardAction;
  count: number;
  positions: Array<{ start: number; end: number }>;
}

const CRITICAL_CATEGORIES = new Set(['cpf', 'masp', 'reds', 'rg']);
const HIGH_CATEGORIES = new Set(['process_number', 'date_of_birth']);

function computeSensitivity(findings: PIIFinding[]): SensitivityLevel {
  if (findings.some(f => CRITICAL_CATEGORIES.has(f.category))) return 'critical';
  if (findings.some(f => HIGH_CATEGORIES.has(f.category))) return 'high';
  if (findings.length > 3) return 'medium';
  if (findings.length > 0) return 'low';
  return 'low';
}

/**
 * Masks PII from a text according to Guard Brasil policy.
 * Returns the masked text plus a full audit of all actions taken.
 */
export function maskPublicOutput(text: string, config: PublicGuardConfig = {}): MaskingResult {
  const piiAction = config.piiAction ?? 'mask';
  const criticalPiiAction = config.criticalPiiAction ?? 'redact';

  const findings = scanForPII(text);
  const sensitivityLevel = computeSensitivity(findings);

  const actionsMap = new Map<string, MaskingAction>();

  for (const finding of findings) {
    const isCritical = CRITICAL_CATEGORIES.has(finding.category);
    const action = isCritical ? criticalPiiAction : piiAction;

    if (!actionsMap.has(finding.category)) {
      actionsMap.set(finding.category, {
        category: finding.category,
        action,
        count: 0,
        positions: [],
      });
    }
    const entry = actionsMap.get(finding.category)!;
    entry.count++;
    entry.positions.push({ start: finding.start, end: finding.end });
  }

  const blocked = sensitivityLevel === 'critical' && criticalPiiAction === 'block';
  let masked: string;
  if (blocked) {
    masked = '[CONTEÚDO BLOQUEADO — DADOS SENSÍVEIS DETECTADOS]';
  } else if (config.maskMode === 'partial') {
    masked = maskPII(text, undefined, 'partial');
  } else {
    masked = sanitizeText(text, findings);
  }

  return {
    original: text,
    masked,
    findings,
    actionsApplied: [...actionsMap.values()],
    safe: findings.length === 0,
    sensitivityLevel,
  };
}

/**
 * Quick check: returns true if the text is safe to output publicly.
 */
export function isPublicSafe(text: string): boolean {
  return scanForPII(text).length === 0;
}

/**
 * Generates a LGPD-compliant disclosure note for masked outputs.
 */
export function buildLGPDDisclosure(result: MaskingResult): string {
  if (result.safe) return '';
  const categories = [...new Set(result.findings.map(f => f.label))].join(', ');
  return `[LGPD] Dados pessoais detectados e mascarados nesta resposta: ${categories}. Conforme Lei 13.709/2018.`;
}
