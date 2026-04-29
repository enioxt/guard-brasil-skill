import {
  ALL_PII_PATTERNS,
  type PIIPatternConfig,
} from '../pii-patterns.js';

export type PIICategory = 'cpf' | 'rg' | 'masp' | 'phone' | 'email' | 'reds' | 'process_number' | 'name' | 'address' | 'plate' | 'date_of_birth' | 'cnpj' | 'cnh' | 'cep' | 'health_data';
export interface PIIFinding { category: PIICategory; label: string; matched: string; start: number; end: number; suggestion: string; }
export interface PIIPatternDefinition { category: PIICategory; label: string; pattern: RegExp; suggestion: string; }

/**
 * Bridge from centralized PIIPatternConfig to legacy PIIPatternDefinition format.
 * Maps pii-patterns.ts IDs to the PIICategory values used by existing consumers.
 */
const PATTERN_ID_TO_CATEGORY: Record<string, PIICategory> = {
  cpf: 'cpf',
  cnpj: 'cnpj',
  rg: 'rg',
  cnh: 'cnh',
  masp: 'masp',
  reds: 'reds',
  processo: 'process_number',
  placa_antiga: 'plate',
  placa_mercosul: 'plate',
  telefone: 'phone',
  email: 'email',
  cep: 'cep',
  health_condition: 'health_data',
};

function toPIIPatternDefinition(config: PIIPatternConfig): PIIPatternDefinition {
  return {
    category: PATTERN_ID_TO_CATEGORY[config.id] ?? (config.id as PIICategory),
    label: config.label,
    pattern: config.regex,
    suggestion: config.maskFormat,
  };
}

/** Default PII patterns derived from the centralized pii-patterns.ts registry */
export const DEFAULT_PII_PATTERNS: PIIPatternDefinition[] = ALL_PII_PATTERNS.map(toPIIPatternDefinition);

/** Legacy date-of-birth pattern (kept for backward compatibility) */
const DATE_OF_BIRTH_PATTERN: PIIPatternDefinition = {
  category: 'date_of_birth',
  label: 'Data de Nascimento',
  pattern: /\b(?:nascido|nascimento|nasc\.?|DN|dn)[:\s]*\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/gi,
  suggestion: '[DATA REMOVIDA]',
};

// Append date-of-birth (not yet in centralized patterns — context-dependent)
DEFAULT_PII_PATTERNS.push(DATE_OF_BIRTH_PATTERN);

// Catches names preceded by role/title (law enforcement) OR explicit label fields (Nome:, Paciente:, etc.)
// Uses /g (not /gi) so character classes remain case-sensitive — prevents over-matching.
const DEFAULT_NAME_PATTERN = /\b(?:delegad[oa]|chefe|colega|servidor|investigador|escriv[aã]o?|comissário|perito|agente|[Nn]ome(?:\s+completo)?|[Pp]aciente|[Cc]liente|[Rr]esponsável|[Rr]equerente|[Rr]equerido|[Aa]utor|[Rr]éu|[Rr]é|[Dd]etentor|[Pp]ortador|[Tt]itular|[Ii]nteressado)\s*:?\s+([A-ZÁÉÍÓÚÃÕÂÊÎÔÛ][a-záéíóúãõâêîôû]+(?:\s+(?:d[aeo]\s+)?[A-ZÁÉÍÓÚÃÕÂÊÎÔÛ][a-záéíóúãõâêîôû]+){1,4})\b/g;
const clonePattern = (pattern: RegExp) => new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);

export function scanForPII(text: string, options?: { patterns?: PIIPatternDefinition[]; namePattern?: RegExp }): PIIFinding[] {
  const findings: PIIFinding[] = [];
  const patterns = options?.patterns ?? DEFAULT_PII_PATTERNS;
  for (const { category, label, suggestion, pattern } of patterns) {
    const activePattern = clonePattern(pattern);
    let match: RegExpExecArray | null;
    while ((match = activePattern.exec(text)) !== null) findings.push({ category, label, matched: match[0], start: match.index, end: match.index + match[0].length, suggestion });
  }
  const namePattern = clonePattern(options?.namePattern ?? DEFAULT_NAME_PATTERN);
  let nameMatch: RegExpExecArray | null;
  while ((nameMatch = namePattern.exec(text)) !== null) {
    const name = nameMatch[1];
    if (name && name.length > 3) findings.push({ category: 'name', label: 'Possível nome', matched: name, start: nameMatch.index + nameMatch[0].indexOf(name), end: nameMatch.index + nameMatch[0].indexOf(name) + name.length, suggestion: '[NOME REMOVIDO]' });
  }
  return deduplicateFindings(findings.sort((a, b) => a.start - b.start));
}

export function sanitizeText(text: string, findings: PIIFinding[]): string {
  let result = text;
  for (const finding of [...findings].sort((a, b) => b.start - a.start)) result = result.slice(0, finding.start) + finding.suggestion + result.slice(finding.end);
  return result;
}

export function getPIISummary(findings: PIIFinding[]): string {
  if (findings.length === 0) return 'Nenhum dado sensível detectado.';
  return `Detectamos ${findings.length} dado(s) sensível(is): ${[...new Set(findings.map((finding) => finding.label))].join(', ')}.`;
}

function deduplicateFindings(findings: PIIFinding[]) {
  const result: PIIFinding[] = [];
  let lastEnd = -1;
  for (const finding of findings) if (finding.start >= lastEnd) { result.push(finding); lastEnd = finding.end; }
  return result;
}
