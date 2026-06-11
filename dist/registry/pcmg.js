/**
 * PCMG Institution Profile
 * Polícia Civil de Minas Gerais — identifiers specific to the MG state system.
 *
 * MASP and REDS are already in Guard Brasil core.
 * This profile adds the remaining MG-specific formats not covered by built-ins.
 *
 * Status: v0.2.0 — HITL validated (2026-06-10, inline session review)
 * - 12 confirmations across 4 patterns | 0 false positives
 * - Regex improved: bo_numero covers no./bare format; inquerito fixed global-flag bug;
 *   reds_complemento covers REDS YYYY/ and REDSYYYY- separators.
 */
export const PCMG_PROFILE = {
    id: 'pcmg',
    name: 'Polícia Civil de Minas Gerais',
    scope: 'state',
    state: 'MG',
    version: '0.2.0',
    updatedAt: '2026-06-10',
    maintainer: 'EGOS Framework',
    patterns: [
        {
            id: 'pcmg:bo_numero',
            label: 'Número de BO (Boletim de Ocorrência MG)',
            // Covers: "BO nº", "BO n°", "BO no.", "BO no", "BO " (bare) + AAAA/NNNNNN
            // Regex uses new RegExp() to avoid /g flag lastIndex mutation across calls
            regex: new RegExp('\\bBO\\s*(?:n[\\xba\\xb0o\\u00b0]?\\.?\\s*)?\\d{4}\\/\\d{6,8}\\b', 'gi'),
            maskFormat: '[BO REMOVIDO]',
            confidence: 'low',
            description: 'Número de boletim de ocorrência no formato PCMG. REDS é o formato moderno; BO é o legado. HITL: 3/3 confirmados, 0 rejeitados (2026-06-10).',
            hitlStats: { confirmations: 3, rejections: 0, lastReviewedAt: '2026-06-10' },
        },
        {
            id: 'pcmg:inquerito',
            label: 'Número de Inquérito Policial MG',
            // Covers: IPL NNNN/AAAA, IP-NNNN/AAAA, IPl, IPL- (with hyphen)
            // Negative look-ahead: not followed by only 4 chars without year (avoids plate IPL-XXXX)
            // Uses new RegExp() to avoid /g lastIndex mutation bug
            regex: new RegExp('\\bI[Pp][Ll]?[-\\s]*\\d{3,6}\\/\\d{4}\\b', 'g'),
            maskFormat: '[IPL REMOVIDO]',
            confidence: 'low',
            description: 'Número de inquérito policial. Formato PCMG: IPL NNNN/AAAA ou IP-NNNN/AAAA. HITL: 2/2 confirmados, 0 rejeitados (2026-06-10). Conhecido: IPL-NNNN sem ano não captura (correto — é placa Mercosul).',
            hitlStats: { confirmations: 2, rejections: 0, lastReviewedAt: '2026-06-10' },
        },
        {
            id: 'pcmg:reds_complemento',
            label: 'REDS — formato complementar',
            // Covers multiple separator styles:
            //   REDS-YYYY-NNNNNNNNN/DDD  (hyphen-year-num/delegacia)
            //   REDS YYYY/NNNNNNNNN-DDD  (space-year/num-delegacia)
            //   REDSYYYY-NNNNNNNNN/DDD   (no separator before year)
            //   REDS YYYY/NNNNNNNNN/DDD  (slash separators)
            regex: new RegExp('\\bREDS[-\\s]?\\d{4}[-\\/]\\d{9,12}[-\\/]\\d{3,4}\\b', 'gi'),
            maskFormat: '[REDS REMOVIDO]',
            confidence: 'low',
            description: 'Variante de REDS com campos extras (ano + registro + delegacia). HITL: 2/2 confirmados, 0 rejeitados (2026-06-10). Regex v2: cobre REDS YYYY/ e REDSYYYY- sem separador.',
            hitlStats: { confirmations: 2, rejections: 0, lastReviewedAt: '2026-06-10' },
        },
        {
            id: 'pcmg:termo_circunstanciado',
            label: 'Número de Termo Circunstanciado MG',
            // TC-NNNN/AAAA or TC NNNN/AAAA
            // Note: TC is also used for other abbreviations — context (JECRIM, "vias de fato") helps
            regex: new RegExp('\\bTC[-\\s]*\\d{3,6}\\/\\d{4}\\b', 'g'),
            maskFormat: '[TC REMOVIDO]',
            confidence: 'medium',
            description: 'Termo Circunstanciado de Ocorrência — infrações de menor potencial ofensivo. HITL: 5/5 confirmados, 0 rejeitados (2026-06-10). Promovido para medium.',
            hitlStats: { confirmations: 5, rejections: 0, lastReviewedAt: '2026-06-10' },
        },
    ],
};
//# sourceMappingURL=pcmg.js.map