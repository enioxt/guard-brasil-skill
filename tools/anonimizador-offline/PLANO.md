# PLANO — Anonimizador Offline Guard Brasil (jun/2026)

> Doc de trabalho AI⟷AI. Humano lê `GUIA.html`. SSOT do motor: `packages/guard-brasil/src/pii-patterns.ts`.
> Objetivo: ferramenta para anonimizar PII antes de enviar a IA pública, **offline + soberana**, para compartilhar (curso PCMG, comunidade).

## Arquitetura — 2 camadas

| Camada | O que é | Distribuição | Estado |
|---|---|---|---|
| **C1 — Motor regex BR** | `engine.js`: 15 tipos PII-BR + validação de dígito + tokenização reversível | **HTML único offline** (`dist/`), zero-dep | ✅ REAL + 44 testes |
| **C2 — NER de nomes** | GLiNER (Apache-2.0) via ONNX/transformers.js — fecha o gap de NOMES/ENDEREÇO | pasta com modelo OU "modo pro" | 🟢 PROVADO LIVE no navegador — falta wiring no tool |

### C2 — prova live (jun/2026)
- Modelo `model_quantized.onnx` (349MB, Apache-2.0) carrega em onnxruntime-node (1.4s) e no **navegador** (Chromium, ~12s).
- Integração browser PROVADA: import-map resolve `gliner` + `onnxruntime-web` + `@xenova/transformers`; tokenizer do HF; wasm.
- **Detecção PT-BR (threshold 0.3, labels person/full name/address):**
  - "João da Silva Pereira" (person 0.33), "Rua das Flores, 123, Belo Horizonte" (location 0.38) — perdeu "Maria Santos".
  - "Ana Carolina de Souza" (0.45), "Dr. Carlos Eduardo Mendes Filho" (0.40) — ambos OK.
- Honesto: scores 0.3–0.45, com misses/falsos ocasionais → threshold tunável + revisão humana de nomes (já no GUIA).
- **Pendente p/ produção:** wasm 100% local (no teste veio de CDN), modelo embutido/local (offline real), wiring opcional no HTML (modo-pro), decisão de formato de distribuição. Ambiente de prova: `gliner-probe/` (gitignored).

Princípio: **C1 é determinística, rápida, à prova de falhas** (o que todo policial recebe). **C2 é opcional/avançada** (nome exige modelo, ~280MB — não cabe inline). Híbrido: C1 (regex) + C2 (nomes) → mesma `tokenize()` reversível.

## Fonte única (testável)
- `engine.js` — motor puro (ESM). Importado pelos **testes** e inlinado no **HTML** pelo `build.ts` (strip `export`).
- `template.html` + `build.ts` → `dist/anonimizador-offline.html` (~2.6MB, gitignored).
- `test/engine.test.mjs` — 44 golden cases (validadores válido/inválido, detecção por tipo, round-trip, idempotência, merge GLiNER, overlap).

## C1 — tipos cobertos (com validação de dígito onde aplicável)
CPF✓ · CNPJ✓ · CNH✓ · PIS/NIS✓ · CNS✓ · Título✓ · Processo(CNJ) · RG · MASP · REDS · Placa(antiga+Mercosul) · Telefone · E-mail · CEP.
(✓ = rejeita número inválido por checksum, evitando falso-positivo.)

## Recon OSS (jun/2026) — decisões de adoção
61 ferramentas verificadas adversarialmente (licença confirmada na fonte). Resumo acionável:

### ADOTAR/CUSTOMIZAR (reforços)
1. **GLiNER** (`onnx-community/gliner_multi_pii-v1`, Apache-2.0) → **C2**, detecta NOMES no browser via transformers.js. ⚠️ não usar `nvidia/gliner-PII` (licença NVIDIA não-OSI).
2. **@huggingface/transformers** (Transformers.js v3, Apache-2.0) → runtime local da C2.
3. **validation-br / validabr** (MIT) → ampliar validadores BR (já fizemos CNH/PIS/CNS/Título inspirados).
4. **pii-vault / openredaction** (MIT, reversíveis) → endurecer nosso vault.
5. **dominguesm/legal-bert-ner-base-cased-ptbr** (CC-BY-4.0) + **BERTimbau** (MIT) → NER jurídico PT-BR (texto de processo).

### PULAR / armadilhas (não compartilhável)
- **piiranha** → `cc-by-nc-nd` (não-comercial + sem-derivados).
- **nvidia/gliner-PII** → licença NVIDIA (não-OSI).
- **spaCy pt models** → CC-BY-SA (copyleft viral).
- **Kong/Portkey/Cloudflare PII** → redação na camada paga/fechada.
- **LiteLLM/LLM-Guard/Presidio/scrubadub** → MIT mas Python-servidor (não roda no HTML offline) → SÓ-CONCEITO (aprender padrão deanonymizer).
- Repos BR sem LICENSE (`anonimizacao_dados`, `monilouise/ner_pt_br`, `LeNER-Br`) → direitos reservados de fato.
- **logus-lgpd** → AGPL (copyleft restritivo).

## Insight do Enio (crítico)
**OCR não resolve — reforça a regra:** se o usuário sobe o ARQUIVO pra IA, a IA lê tudo. A ferramenta só protege se o fluxo for **extrair texto → anonimizar texto → colar texto** (nunca o arquivo). Por isso PDF escaneado (imagem) está fora de escopo: extrair texto dele exigiria OCR, e o ganho é marginal vs. o risco de o usuário só subir o PDF.

## Contexto regulatório (jun/2026)
- **CNJ Res. 615/2025** (vigor jul/2025): exige anonimização/pseudonimização **na origem** antes de compartilhar dado do Judiciário (privacy by design/default).
- **MJSP Portaria 961/2025**: IA em investigação sob legalidade/necessidade/finalidade.
- **OpenAI Privacy Filter** (abr/2026, Apache-2.0, on-device): valida a abordagem; categorias genéricas (sem CPF/CNPJ) → complementar, não concorrente.
- ANPD intensificando fiscalização.

## Posicionamento honesto (sem absolutos)
Diferenciado: **PII-BR real + arquivo único 100% offline + reversível** — combinação não encontrada pronta no escopo pesquisado (busca limitada, não "único"). Dependemos de adotar OSS para **NOMES** (GLiNER) e descartamos **OCR** por decisão de produto.

## Gaps conhecidos / limites
- Nomes só com C2 (modelo). Telefone `(DDD)` deixa `(` solto (regex canônica). Sem log de auditoria persistente (LGPD Art. 46 — lógica de hash existe no guard-brasil, não exposta). Não substitui base legal.

## Distribuição
- **C1**: 1 arquivo `.html` por e-mail/pendrive. Windows, sem instalar, sem admin.
- **C2**: a decidir com Enio — (a) pasta `.zip` com modelo embutido (offline real) vs (b) "modo pro" que carrega modelo de pasta local. `THIRD_PARTY.md` com licenças (obrigatório p/ distribuir).

## Próximos passos
1. [em curso] Provar GLiNER (nomes) na máquina + medir qualidade PT-BR.
2. Decidir formato C2 (zip-com-modelo vs modo-pro) — Red Zone leve (Enio corta).
3. `THIRD_PARTY.md` (Apache/MIT creditados).
4. (futuro) Propagar validadores novos ao SSOT `pii-patterns.ts` (hoje só no `engine.js` da ferramenta).
5. HITL antes de qualquer distribuição (biografia/dado real nunca; só sintético em teste).
