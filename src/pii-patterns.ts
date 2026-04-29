/**
 * PII Patterns — Centralized Brazilian PII detection and masking
 *
 * Single source of truth for all Brazilian personally identifiable
 * information patterns used across Guard Brasil modules.
 *
 * Compliance: Lei 13.709/2018 (LGPD)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Identifier for each PII pattern category */
export type PIIPatternId =
  | 'cpf'
  | 'cnpj'
  | 'rg'
  | 'cnh'
  | 'sus'
  | 'titulo_eleitor'
  | 'nis_pis'
  | 'masp'
  | 'reds'
  | 'processo'
  | 'placa_antiga'
  | 'placa_mercosul'
  | 'telefone'
  | 'email'
  | 'cep'
  | 'health_condition'
  // Infrastructure secrets (ported from egos-cortex privacy.ts)
  | 'aws_key'
  | 'github_token'
  | 'stripe_key'
  | 'db_connection'
  | 'api_key_assignment'
  | 'bearer_token'
  | 'private_key';

/** Confidence that a regex match is actually the claimed PII type */
export type PatternConfidence = 'high' | 'medium' | 'low';

/** Definition of a single PII pattern */
/** Whether to fully redact or partially reveal (banking-style) */
export type MaskMode = 'full' | 'partial';

export interface PIIPatternConfig {
  /** Unique identifier */
  id: PIIPatternId;
  /** Human-readable label (PT-BR) */
  label: string;
  /** Detection regex — MUST use the `g` flag */
  regex: RegExp;
  /** Mask format shown in redacted output (full mode) */
  maskFormat: string;
  /** How confident we are that a match is real (not a false positive) */
  confidence: PatternConfidence;
  /** Optional description for documentation / tooling */
  description?: string;
  /**
   * Partial mask — show enough digits for user confirmation (banking-style).
   * E.g. CPF 123.456.789-09 → ***.456.789-**
   * Falls back to maskFormat if undefined.
   */
  partialMaskFn?: (matched: string) => string;
}

/** A single PII match found in text */
export interface PIIMatch {
  /** Which pattern matched */
  patternId: PIIPatternId;
  /** PT-BR label */
  label: string;
  /** The matched substring */
  matched: string;
  /** Start index in the original text */
  start: number;
  /** End index in the original text */
  end: number;
  /** Confidence level */
  confidence: PatternConfidence;
  /** The mask string that would replace this match */
  maskFormat: string;
}

// ─── Pattern Definitions ──────────────────────────────────────────────────────

/** CPF — Cadastro de Pessoas Físicas (11 digits) */
export const CPF_PATTERN: PIIPatternConfig = {
  id: 'cpf',
  label: 'CPF',
  regex: /\b\d{3}[.\s-]?\d{3}[.\s-]?\d{3}[.\s/-]?\d{2}\b/g,
  maskFormat: '[CPF REMOVIDO]',
  confidence: 'high',
  description: 'Cadastro de Pessoas Físicas — 000.000.000-00',
  // Banking-style: ***.456.789-** (middle 6 digits visible)
  partialMaskFn: (matched) => {
    const d = matched.replace(/\D/g, '');
    if (d.length !== 11) return '[CPF REMOVIDO]';
    return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
  },
};

/** CNPJ — Cadastro Nacional de Pessoas Jurídicas (14 digits) */
export const CNPJ_PATTERN: PIIPatternConfig = {
  id: 'cnpj',
  label: 'CNPJ',
  regex: /\b\d{2}[.\s]?\d{3}[.\s]?\d{3}[/\s]?\d{4}[-.\s]?\d{2}\b/g,
  maskFormat: '[CNPJ REMOVIDO]',
  confidence: 'high',
  description: 'Cadastro Nacional de Pessoas Jurídicas — 00.000.000/0000-00',
  // **.333.000/****-** (show digits 3-8, hide qualifier + check)
  partialMaskFn: (matched) => {
    const d = matched.replace(/\D/g, '');
    if (d.length !== 14) return '[CNPJ REMOVIDO]';
    return `**.${d.slice(2, 5)}.${d.slice(5, 8)}/****-**`;
  },
};

/** RG — Registro Geral (with OR without "RG" keyword) */
export const RG_PATTERN: PIIPatternConfig = {
  id: 'rg',
  label: 'RG',
  // Matches with keyword: "RG 12.345.678-9", "Registro Geral 12.345.678-9"
  // Matches standalone canonical format (dots+dash required): "12.345.678-9"
  regex: /(?:(?:RG|rg|Rg|Registro\s+Geral|registro\s+geral)[\s:nº°.]*(?:[A-Z]{2}[\s-]?)?\d{1,2}[.\s]?\d{3}[.\s]?\d{3}[.\s-]?\d?|\b\d{1,2}\.\d{3}\.\d{3}-\d\b)/gi,
  maskFormat: '[RG REMOVIDO]',
  confidence: 'high',
  description: 'Registro Geral — RG 00.000.000-0',
};

/** CNH — Carteira Nacional de Habilitação (11 digits, preceded by keyword) */
export const CNH_PATTERN: PIIPatternConfig = {
  id: 'cnh',
  label: 'CNH',
  regex: /\b(?:CNH|cnh|Cnh|habilitação|habilitacao)[:\s]*\d{9,11}\b/gi,
  maskFormat: '[CNH REMOVIDO]',
  confidence: 'medium',
  description: 'Carteira Nacional de Habilitação — 00000000000',
};

/** MASP — Matrícula de Servidor Público (Minas Gerais) */
export const MASP_PATTERN: PIIPatternConfig = {
  id: 'masp',
  label: 'MASP',
  regex: /\b(?:MASP|masp|Masp)[:\s]*\d{1,3}[.\s]?\d{3,5}[.\s-]?\d{0,2}\b/gi,
  maskFormat: '[MASP REMOVIDO]',
  confidence: 'high',
  description: 'Matrícula de Servidor Público — MASP 0000000-0',
};

/** REDS — Registro de Eventos de Defesa Social (Minas Gerais) */
export const REDS_PATTERN: PIIPatternConfig = {
  id: 'reds',
  label: 'REDS',
  regex: /\b(?:REDS|reds|Reds)[:\s]*\d{4,}[-./]?\d{0,}\b/gi,
  maskFormat: '[REDS REMOVIDO]',
  confidence: 'high',
  description: 'Registro de Eventos de Defesa Social — REDS 0000000000',
};

/** Processo Judicial — CNJ numbering format (NNNNNNN-DD.AAAA.J.TR.OOOO) */
export const PROCESSO_PATTERN: PIIPatternConfig = {
  id: 'processo',
  label: 'Processo Judicial',
  regex: /\b\d{7}[-.]?\d{2}[.]?\d{4}[.]?\d[.]?\d{2}[.]?\d{4}\b/g,
  maskFormat: '[PROCESSO REMOVIDO]',
  confidence: 'high',
  description: 'Número de processo judicial CNJ — 0000000-00.0000.0.00.0000',
};

/** Placa Antiga — formato brasileiro antigo (AAA-0000) */
export const PLACA_ANTIGA_PATTERN: PIIPatternConfig = {
  id: 'placa_antiga',
  label: 'Placa Veicular',
  regex: /\b[A-Z]{3}[-\s]?\d{4}(?![-\d])/gi,
  maskFormat: '[PLACA REMOVIDA]',
  confidence: 'medium',
  description: 'Placa formato antigo — AAA-0000. Lookahead (?![-\\d]) prevents FP-001: ID patterns like INV-2024-001.',
};

/** Placa Mercosul — formato Mercosul (AAA0A00) */
export const PLACA_MERCOSUL_PATTERN: PIIPatternConfig = {
  id: 'placa_mercosul',
  label: 'Placa Veicular',
  regex: /\b[A-Z]{3}\d[A-Z]\d{2}\b/gi,
  maskFormat: '[PLACA REMOVIDA]',
  confidence: 'medium',
  description: 'Placa formato Mercosul — AAA0A00',
};

/** Telefone — números brasileiros (com ou sem DDI/DDD) */
export const TELEFONE_PATTERN: PIIPatternConfig = {
  id: 'telefone',
  label: 'Telefone',
  regex: /\b(?:\+55\s?)?(?:\(?\d{2}\)?\s?)\d{4,5}[-.\s]?\d{4}\b/g,
  maskFormat: '[TELEFONE REMOVIDO]',
  confidence: 'medium',
  description: 'Telefone brasileiro — +55 (00) 00000-0000',
  // (31) ****-5432 — keep area code + last 4 digits
  partialMaskFn: (matched) => {
    const d = matched.replace(/\D/g, '');
    if (d.length < 10) return '[TELEFONE REMOVIDO]';
    // last 4 digits always visible; first 2 = DDD
    const ddd = d.slice(0, 2);
    const last4 = d.slice(-4);
    return `(${ddd}) ****-${last4}`;
  },
};

/** Email */
export const EMAIL_PATTERN: PIIPatternConfig = {
  id: 'email',
  label: 'Email',
  regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  maskFormat: '[EMAIL REMOVIDO]',
  confidence: 'high',
  description: 'Endereço de email',
  // j***@e*****.com.br — first char of local + first char of domain + extension
  partialMaskFn: (matched) => {
    const [local, domain] = matched.split('@');
    if (!local || !domain) return '[EMAIL REMOVIDO]';
    const dotIdx = domain.lastIndexOf('.');
    const domainName = dotIdx > 0 ? domain.slice(0, dotIdx) : domain;
    const tld = dotIdx > 0 ? domain.slice(dotIdx) : '';
    const maskedLocal = local[0] + '***';
    const maskedDomain = domainName[0] + '*'.repeat(Math.max(1, domainName.length - 1));
    return `${maskedLocal}@${maskedDomain}${tld}`;
  },
};

/** Cartão SUS — Cartão Nacional de Saúde (15 digits) */
export const SUS_PATTERN: PIIPatternConfig = {
  id: 'sus',
  label: 'Cartão SUS',
  regex: /\b[1-9]\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\b/g,
  maskFormat: '[SUS REMOVIDO]',
  confidence: 'medium',
  description: 'Cartão Nacional de Saúde — 15 dígitos (xxx xxxx xxxx xxxx)',
};

/** Título de Eleitor — 12 digits with state/sequence check */
export const TITULO_ELEITOR_PATTERN: PIIPatternConfig = {
  id: 'titulo_eleitor',
  label: 'Título de Eleitor',
  regex: /\b\d{4}\s?\d{4}\s?\d{4}\b/g,
  maskFormat: '[TÍTULO REMOVIDO]',
  confidence: 'low',
  description: 'Título de Eleitor — 12 dígitos (xxxx xxxx xxxx)',
};

/** NIS/PIS — Número de Identificação Social (11 digits, starts with specific ranges) */
export const NIS_PIS_PATTERN: PIIPatternConfig = {
  id: 'nis_pis',
  label: 'NIS/PIS',
  regex: /\b[12]\d{2}\.?\d{5}\.?\d{2}-?\d\b/g,
  maskFormat: '[NIS REMOVIDO]',
  confidence: 'medium',
  description: 'NIS/PIS/PASEP — 11 dígitos (xxx.xxxxx.xx-x)',
};

/** CEP — Código de Endereçamento Postal (8 digits) */
export const CEP_PATTERN: PIIPatternConfig = {
  id: 'cep',
  label: 'CEP',
  regex: /\b\d{5}[-.\s]?\d{3}\b/g,
  maskFormat: '[CEP REMOVIDO]',
  confidence: 'low',
  description: 'Código de Endereçamento Postal — 00000-000',
};

/** HEALTH_CONDITION — Condição médica / dado de saúde sensível (LGPD art.11)
 * Matches: "HIV positivo", "portador de diabetes", "diagnóstico de câncer", "soropositivo"
 * Context-required to avoid false positives in clinical docs discussing conditions generally.
 */
export const HEALTH_CONDITION_PATTERN: PIIPatternConfig = {
  id: 'health_condition',
  label: 'Dado de Saúde',
  regex: /\b(?:portador[ae]?\s+de|diagnos(?:tic|e)ado[ae]?\s+(?:com|de)|soropositivo|HIV\s*\+|HIV\s+positivo|resultado\s+positivo\s+para|condição\s+médica[:\s]+|doença\s+(?:crônica|grave)[:\s]+)\s*([A-Za-záéíóúãõâêîôûàèìòùüçñ][A-Za-záéíóúãõâêîôûàèìòùüçñ\s]{2,40})/gi,
  maskFormat: '[DADO DE SAÚDE REMOVIDO]',
  confidence: 'medium',
  description: 'Condição médica ou dado de saúde sensível (LGPD art.11 §1º I)',
};

// ─── Registry ─────────────────────────────────────────────────────────────────

/**
 * All registered PII patterns, ordered by specificity (most specific first).
 * Order matters: more specific patterns (processo, CNPJ) should match
 * before less specific ones (CPF, CEP, telefone) to avoid partial overlaps.
 */
export const ALL_PII_PATTERNS: readonly PIIPatternConfig[] = [
  PROCESSO_PATTERN,
  CNPJ_PATTERN,
  CPF_PATTERN,
  RG_PATTERN,
  CNH_PATTERN,
  SUS_PATTERN,
  NIS_PIS_PATTERN,
  MASP_PATTERN,
  REDS_PATTERN,
  PLACA_MERCOSUL_PATTERN,
  PLACA_ANTIGA_PATTERN,
  EMAIL_PATTERN,
  TELEFONE_PATTERN,
  TITULO_ELEITOR_PATTERN,
  CEP_PATTERN,
  HEALTH_CONDITION_PATTERN,
] as const;

// ─── Infrastructure Secret Patterns ──────────────────────────────────────────
// Ported from egos-cortex/src/privacy.ts — complement Brazilian PII with
// infrastructure credential detection. NOT included in ALL_PII_PATTERNS to
// avoid false positives in general text. Use INFRASTRUCTURE_SECRET_PATTERNS
// explicitly when scanning source code or config files.

/** AWS Access Key ID — AKIA + 16 uppercase alphanumeric chars */
export const AWS_KEY_PATTERN: PIIPatternConfig = {
  id: 'aws_key',
  label: 'AWS Access Key',
  regex: /\bAKIA[0-9A-Z]{16}\b/g,
  maskFormat: '[AWS_KEY REMOVIDO]',
  confidence: 'high',
  description: 'AWS Access Key ID — AKIA****************',
};

/** GitHub Token — gh[pousr]_ prefix patterns */
export const GITHUB_TOKEN_PATTERN: PIIPatternConfig = {
  id: 'github_token',
  label: 'GitHub Token',
  regex: /\bgh[pousr]_[A-Za-z0-9_]{36,}\b/g,
  maskFormat: '[GITHUB_TOKEN REMOVIDO]',
  confidence: 'high',
  description: 'GitHub personal/oauth/app token — ghp_*, gho_*, ghu_*, ghs_*, ghr_*',
};

/** Stripe API Key — live or test sk_ keys */
export const STRIPE_KEY_PATTERN: PIIPatternConfig = {
  id: 'stripe_key',
  label: 'Stripe API Key',
  regex: /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/g,
  maskFormat: '[STRIPE_KEY REMOVIDO]',
  confidence: 'high',
  description: 'Stripe secret key — sk_live_* or sk_test_*',
};

/** Database Connection String — mongodb/postgres/mysql with embedded credentials */
export const DB_CONNECTION_PATTERN: PIIPatternConfig = {
  id: 'db_connection',
  label: 'DB Connection String',
  regex: /\b(?:mongodb|postgres|postgresql|mysql):\/\/[^:\s]+:[^@\s]+@[^\s"']+/gi,
  maskFormat: '[DB_CONNECTION REMOVIDA]',
  confidence: 'high',
  description: 'Database connection string with embedded credentials',
};

/** API Key assignment — api_key = "..." patterns in code/config */
export const API_KEY_ASSIGNMENT_PATTERN: PIIPatternConfig = {
  id: 'api_key_assignment',
  label: 'API Key (assignment)',
  regex: /\b(?:api[_-]?key|apikey|api_secret|access_token)\s*[:=]\s*['"][A-Za-z0-9_\-]{20,}['"]/gi,
  maskFormat: '[API_KEY REMOVIDA]',
  confidence: 'medium',
  description: 'Generic API key or secret assigned in code or config',
};

/** Bearer Token — Authorization header value */
export const BEARER_TOKEN_PATTERN: PIIPatternConfig = {
  id: 'bearer_token',
  label: 'Bearer Token',
  regex: /\bbearer\s+[A-Za-z0-9_\-.]{20,}\b/gi,
  maskFormat: '[BEARER_TOKEN REMOVIDO]',
  confidence: 'medium',
  description: 'HTTP Bearer token (Authorization header)',
};

/** PEM Private Key header — RSA, EC, OpenSSH, PGP */
export const PRIVATE_KEY_PATTERN: PIIPatternConfig = {
  id: 'private_key',
  label: 'Private Key (PEM)',
  regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/g,
  maskFormat: '[PRIVATE_KEY REMOVIDA]',
  confidence: 'high',
  description: 'PEM-encoded private key header',
};

/**
 * Infrastructure secret patterns (NOT in ALL_PII_PATTERNS).
 * Use explicitly for source code or config file scanning.
 */
export const INFRASTRUCTURE_SECRET_PATTERNS: readonly PIIPatternConfig[] = [
  AWS_KEY_PATTERN,
  GITHUB_TOKEN_PATTERN,
  STRIPE_KEY_PATTERN,
  DB_CONNECTION_PATTERN,
  API_KEY_ASSIGNMENT_PATTERN,
  BEARER_TOKEN_PATTERN,
  PRIVATE_KEY_PATTERN,
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Clone a RegExp to reset its lastIndex (safe for repeated exec calls) */
function cloneRegex(re: RegExp): RegExp {
  const flags = re.flags.includes('g') ? re.flags : `${re.flags}g`;
  return new RegExp(re.source, flags);
}

/**
 * Remove overlapping matches, keeping the first (longest/most-specific) match
 * when two matches overlap in position.
 */
function deduplicateMatches(matches: PIIMatch[]): PIIMatch[] {
  const sorted = matches.slice().sort((a, b) => a.start - b.start || b.end - a.end);
  const result: PIIMatch[] = [];
  let lastEnd = -1;
  for (const match of sorted) {
    if (match.start >= lastEnd) {
      result.push(match);
      lastEnd = match.end;
    }
  }
  return result;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Scans text for all Brazilian PII patterns and returns every match found.
 *
 * @param text — The text to scan
 * @param patterns — Optional subset of patterns to scan for (defaults to all)
 * @returns Array of PIIMatch sorted by position, deduplicated
 *
 * @example
 * ```ts
 * const matches = detectPII('CPF do titular: 123.456.789-00');
 * // [{ patternId: 'cpf', matched: '123.456.789-00', ... }]
 * ```
 */
export function detectPII(
  text: string,
  patterns: readonly PIIPatternConfig[] = ALL_PII_PATTERNS,
): PIIMatch[] {
  const matches: PIIMatch[] = [];

  for (const config of patterns) {
    const re = cloneRegex(config.regex);
    let execResult: RegExpExecArray | null;

    while ((execResult = re.exec(text)) !== null) {
      matches.push({
        patternId: config.id,
        label: config.label,
        matched: execResult[0],
        start: execResult.index,
        end: execResult.index + execResult[0].length,
        confidence: config.confidence,
        maskFormat: config.maskFormat,
      });
    }
  }

  return deduplicateMatches(matches);
}

/**
 * Masks all detected PII in the text, replacing matches with their mask format.
 *
 * @param text — The text to mask
 * @param patternIds — Optional list of pattern IDs to mask (defaults to all).
 *                     Pass e.g. `['cpf', 'cnpj']` to only mask those types.
 * @returns The masked text with PII replaced by mask labels
 *
 * @example
 * ```ts
 * maskPII('CPF: 123.456.789-00, email: fulano@email.com');
 * // 'CPF: [CPF REMOVIDO], email: [EMAIL REMOVIDO]'
 *
 * maskPII('CPF: 123.456.789-00, email: fulano@email.com', ['cpf']);
 * // 'CPF: [CPF REMOVIDO], email: fulano@email.com'
 * ```
 */
export function maskPII(text: string, patternIds?: PIIPatternId[], mode: MaskMode = 'full'): string {
  const patterns = patternIds
    ? ALL_PII_PATTERNS.filter(p => patternIds.includes(p.id))
    : ALL_PII_PATTERNS;

  const matches = detectPII(text, patterns);

  if (matches.length === 0) return text;

  // Replace from end to start so indices stay valid
  let result = text;
  const reversed = matches.slice().sort((a, b) => b.start - a.start);
  for (const match of reversed) {
    let replacement: string;
    if (mode === 'partial') {
      const config = ALL_PII_PATTERNS.find(p => p.id === match.patternId);
      replacement = config?.partialMaskFn?.(match.matched) ?? match.maskFormat;
    } else {
      replacement = match.maskFormat;
    }
    result = result.slice(0, match.start) + replacement + result.slice(match.end);
  }

  return result;
}

/**
 * Returns a pattern config by its ID, or undefined if not found.
 */
export function getPatternById(id: PIIPatternId): PIIPatternConfig | undefined {
  return ALL_PII_PATTERNS.find(p => p.id === id);
}
