/**
 * PII Patterns — Centralized Brazilian PII detection and masking
 *
 * Single source of truth for all Brazilian personally identifiable
 * information patterns used across Guard Brasil modules.
 *
 * Compliance: Lei 13.709/2018 (LGPD)
 */
/** Identifier for each PII pattern category */
export type PIIPatternId = 'cpf' | 'cnpj' | 'rg' | 'cnh' | 'sus' | 'titulo_eleitor' | 'nis_pis' | 'masp' | 'reds' | 'processo' | 'placa_antiga' | 'placa_mercosul' | 'telefone' | 'email' | 'cep' | 'health_condition';
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
/** CPF — Cadastro de Pessoas Físicas (11 digits) */
export declare const CPF_PATTERN: PIIPatternConfig;
/** CNPJ — Cadastro Nacional de Pessoas Jurídicas (14 digits) */
export declare const CNPJ_PATTERN: PIIPatternConfig;
/** RG — Registro Geral (with OR without "RG" keyword) */
export declare const RG_PATTERN: PIIPatternConfig;
/** CNH — Carteira Nacional de Habilitação (11 digits, preceded by keyword) */
export declare const CNH_PATTERN: PIIPatternConfig;
/** MASP — Matrícula de Servidor Público (Minas Gerais) */
export declare const MASP_PATTERN: PIIPatternConfig;
/** REDS — Registro de Eventos de Defesa Social (Minas Gerais) */
export declare const REDS_PATTERN: PIIPatternConfig;
/** Processo Judicial — CNJ numbering format (NNNNNNN-DD.AAAA.J.TR.OOOO) */
export declare const PROCESSO_PATTERN: PIIPatternConfig;
/** Placa Antiga — formato brasileiro antigo (AAA-0000) */
export declare const PLACA_ANTIGA_PATTERN: PIIPatternConfig;
/** Placa Mercosul — formato Mercosul (AAA0A00) */
export declare const PLACA_MERCOSUL_PATTERN: PIIPatternConfig;
/** Telefone — números brasileiros (com ou sem DDI/DDD) */
export declare const TELEFONE_PATTERN: PIIPatternConfig;
/** Email */
export declare const EMAIL_PATTERN: PIIPatternConfig;
/** Cartão SUS — Cartão Nacional de Saúde (15 digits) */
export declare const SUS_PATTERN: PIIPatternConfig;
/** Título de Eleitor — 12 digits with state/sequence check */
export declare const TITULO_ELEITOR_PATTERN: PIIPatternConfig;
/** NIS/PIS — Número de Identificação Social (11 digits, starts with specific ranges) */
export declare const NIS_PIS_PATTERN: PIIPatternConfig;
/** CEP — Código de Endereçamento Postal (8 digits) */
export declare const CEP_PATTERN: PIIPatternConfig;
/** HEALTH_CONDITION — Condição médica / dado de saúde sensível (LGPD art.11)
 * Matches: "HIV positivo", "portador de diabetes", "diagnóstico de câncer", "soropositivo"
 * Context-required to avoid false positives in clinical docs discussing conditions generally.
 */
export declare const HEALTH_CONDITION_PATTERN: PIIPatternConfig;
/**
 * All registered PII patterns, ordered by specificity (most specific first).
 * Order matters: more specific patterns (processo, CNPJ) should match
 * before less specific ones (CPF, CEP, telefone) to avoid partial overlaps.
 */
export declare const ALL_PII_PATTERNS: readonly PIIPatternConfig[];
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
export declare function detectPII(text: string, patterns?: readonly PIIPatternConfig[]): PIIMatch[];
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
export declare function maskPII(text: string, patternIds?: PIIPatternId[], mode?: MaskMode): string;
/**
 * Returns a pattern config by its ID, or undefined if not found.
 */
export declare function getPatternById(id: PIIPatternId): PIIPatternConfig | undefined;
//# sourceMappingURL=pii-patterns.d.ts.map