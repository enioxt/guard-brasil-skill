/**
 * Corpus sintético PCMG — para validação HITL dos padrões do perfil PCMG.
 * ZERO dado real. Todos os números são fictícios (formato válido, conteúdo inventado).
 *
 * Estrutura: 5 positivos (deve detectar) + 2 negativos (não deve detectar) por padrão.
 * Total: 28 frases.
 */
export interface CorpusEntry {
    id: string;
    patternId: string;
    text: string;
    shouldMatch: boolean;
    note?: string;
}
export declare const PCMG_CORPUS: CorpusEntry[];
//# sourceMappingURL=pcmg-corpus.d.ts.map