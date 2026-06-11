#!/usr/bin/env bun
/**
 * HITL Runner — revisão inline dos padrões PCMG
 *
 * Uso:
 *   bun packages/guard-brasil/src/registry/hitl-runner.ts --profile pcmg
 *
 * Fluxo:
 *   1. Roda scanForPII com PCMG_PROFILE em cada frase do corpus
 *   2. Imprime cada match com contexto
 *   3. Aguarda input do revisor (s/n/p=parcial) via stdin
 *   4. Grava resultado em /tmp/hitl-session-<timestamp>.json
 *
 * O Prime aplica o JSON ao pcmg.ts e commita.
 * ZERO dado real — corpus 100% sintético.
 */
export {};
//# sourceMappingURL=hitl-runner.d.ts.map