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

export const PCMG_CORPUS: CorpusEntry[] = [
  // ─── pcmg:bo_numero ─────────────────────────────────────────────────────────
  {
    id: 'bo-pos-1',
    patternId: 'pcmg:bo_numero',
    text: 'O BO nº 2024/098765 foi registrado na delegacia da Savassi.',
    shouldMatch: true,
  },
  {
    id: 'bo-pos-2',
    patternId: 'pcmg:bo_numero',
    text: 'Conforme BO no. 2023/001234, o furto ocorreu na Av. Afonso Pena.',
    shouldMatch: true,
  },
  {
    id: 'bo-pos-3',
    patternId: 'pcmg:bo_numero',
    text: 'Favor anexar o BO n° 2025/567890 ao processo.',
    shouldMatch: true,
  },
  {
    id: 'bo-pos-4',
    patternId: 'pcmg:bo_numero',
    text: 'A vítima declarou que registrou BO 2022/000042 na 14ª DP.',
    shouldMatch: true,
  },
  {
    id: 'bo-pos-5',
    patternId: 'pcmg:bo_numero',
    text: 'Referenciado no BO nº 2024/112233, consta que o veículo foi encontrado.',
    shouldMatch: true,
  },
  {
    id: 'bo-neg-1',
    patternId: 'pcmg:bo_numero',
    text: 'O balanço patrimonial (BP) 2024 foi aprovado em assembleia.',
    shouldMatch: false,
    note: 'BP ≠ BO — não deve capturar',
  },
  {
    id: 'bo-neg-2',
    patternId: 'pcmg:bo_numero',
    text: 'Número do pedido: 2024/098765 — produto eletrônico.',
    shouldMatch: false,
    note: 'Número de pedido sem prefixo BO — não deve capturar',
  },

  // ─── pcmg:inquerito ─────────────────────────────────────────────────────────
  {
    id: 'ipl-pos-1',
    patternId: 'pcmg:inquerito',
    text: 'O IPL 1234/2024 está sob sigilo judicial.',
    shouldMatch: true,
  },
  {
    id: 'ipl-pos-2',
    patternId: 'pcmg:inquerito',
    text: 'Conforme IP-5678/2023, o suspeito foi identificado.',
    shouldMatch: true,
  },
  {
    id: 'ipl-pos-3',
    patternId: 'pcmg:inquerito',
    text: 'IPl 0099/2025 foi encaminhado ao MPMG.',
    shouldMatch: true,
  },
  {
    id: 'ipl-pos-4',
    patternId: 'pcmg:inquerito',
    text: 'A testemunha foi ouvida no inquérito IPL-2341/2022.',
    shouldMatch: true,
  },
  {
    id: 'ipl-pos-5',
    patternId: 'pcmg:inquerito',
    text: 'Cópia do IPL 00876/2024 juntada aos autos.',
    shouldMatch: true,
  },
  {
    id: 'ipl-neg-1',
    patternId: 'pcmg:inquerito',
    text: 'Placa do veículo: IPL-1234 (Mercosul, Belo Horizonte).',
    shouldMatch: false,
    note: 'FALSO POSITIVO CONHECIDO — IPL-1234 sem ano = placa Mercosul, não inquérito',
  },
  {
    id: 'ipl-neg-2',
    patternId: 'pcmg:inquerito',
    text: 'O Instituto de Pesquisas (IPl) publicou relatório trimestral.',
    shouldMatch: false,
    note: 'Sigla institucional sem número de processo — não deve capturar',
  },

  // ─── pcmg:reds_complemento ──────────────────────────────────────────────────
  {
    id: 'reds-pos-1',
    patternId: 'pcmg:reds_complemento',
    text: 'REDS-2024-001234567/123 foi lavrado no posto policial.',
    shouldMatch: true,
  },
  {
    id: 'reds-pos-2',
    patternId: 'pcmg:reds_complemento',
    text: 'Conforme REDS 2023/098765432-001, houve resistência.',
    shouldMatch: true,
  },
  {
    id: 'reds-pos-3',
    patternId: 'pcmg:reds_complemento',
    text: 'O REDS2025-111222333/456 registra o flagrante.',
    shouldMatch: true,
  },
  {
    id: 'reds-pos-4',
    patternId: 'pcmg:reds_complemento',
    text: 'Número REDS-2022-987654321-099 consta no histórico.',
    shouldMatch: true,
  },
  {
    id: 'reds-pos-5',
    patternId: 'pcmg:reds_complemento',
    text: 'REDS 2024/112233445/088 gerado automaticamente pelo sistema.',
    shouldMatch: true,
  },
  {
    id: 'reds-neg-1',
    patternId: 'pcmg:reds_complemento',
    text: 'REDS 2024/1234 sem dígito de delegacia — formato incompleto.',
    shouldMatch: false,
    note: 'REDS sem os 9-12 dígitos do número de registro — não deve capturar',
  },
  {
    id: 'reds-neg-2',
    patternId: 'pcmg:reds_complemento',
    text: 'O sistema REDS foi atualizado em 15/06/2024.',
    shouldMatch: false,
    note: 'Menção ao nome do sistema, não a um registro específico',
  },

  // ─── pcmg:termo_circunstanciado ─────────────────────────────────────────────
  {
    id: 'tc-pos-1',
    patternId: 'pcmg:termo_circunstanciado',
    text: 'O TC-1234/2024 foi lavrado por vias de fato.',
    shouldMatch: true,
  },
  {
    id: 'tc-pos-2',
    patternId: 'pcmg:termo_circunstanciado',
    text: 'Conforme TC 0567/2023, houve infração de menor potencial ofensivo.',
    shouldMatch: true,
  },
  {
    id: 'tc-pos-3',
    patternId: 'pcmg:termo_circunstanciado',
    text: 'TC-00099/2025 encaminhado ao JECRIM.',
    shouldMatch: true,
  },
  {
    id: 'tc-pos-4',
    patternId: 'pcmg:termo_circunstanciado',
    text: 'A parte apresentou TC 0042/2022 como documento.',
    shouldMatch: true,
  },
  {
    id: 'tc-pos-5',
    patternId: 'pcmg:termo_circunstanciado',
    text: 'Registrado no TC-123/2024 o ocorrido na praça pública.',
    shouldMatch: true,
  },
  {
    id: 'tc-neg-1',
    patternId: 'pcmg:termo_circunstanciado',
    text: 'O TC (Tribunal de Contas) publicou parecer sobre o contrato.',
    shouldMatch: false,
    note: 'TC como sigla sem número de processo — não deve capturar',
  },
  {
    id: 'tc-neg-2',
    patternId: 'pcmg:termo_circunstanciado',
    text: 'Temperatura controlada (TC): 37°C no momento da coleta.',
    shouldMatch: false,
    note: 'TC como abreviação científica — não deve capturar',
  },
];
