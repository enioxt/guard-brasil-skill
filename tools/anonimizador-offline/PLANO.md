# PLANO — Anonimizador Offline Guard Brasil (jun/2026)

> Doc de trabalho AI⟷AI. Humano lê `GUIA.html`. SSOT do motor: `packages/guard-brasil/src/pii-patterns.ts`.
> Objetivo: ferramenta para anonimizar PII antes de enviar a IA pública, **offline + soberana**, para compartilhar (curso PCMG, comunidade).

## Arquitetura — 2 camadas

| Camada | O que é | Distribuição | Estado |
|---|---|---|---|
| **C1 — Motor regex BR** | `engine.js`: 15 tipos PII-BR + validação de dígito + tokenização reversível | **HTML único offline** (`dist/`), zero-dep | ✅ REAL + 44 testes |
| **C2 — NER de nomes** | GLiNER (Apache-2.0) via ONNX/transformers.js — fecha o gap de NOMES/ENDEREÇO | "modo-pro" file-input (corte Enio 2026-06-29) | ✅ DONE + PROVADO no produto (`anonimizador-offline-pro.html`) |

### C2 — prova live (jun/2026)
- Modelo `model_quantized.onnx` (349MB, Apache-2.0) carrega em onnxruntime-node (1.4s) e no **navegador** (Chromium, ~12s).
- Integração browser PROVADA: import-map resolve `gliner` + `onnxruntime-web` + `@xenova/transformers`; tokenizer do HF; wasm.
- **Detecção PT-BR (threshold 0.3, labels person/full name/address):**
  - "João da Silva Pereira" (person 0.33), "Rua das Flores, 123, Belo Horizonte" (location 0.38) — perdeu "Maria Santos".
  - "Ana Carolina de Souza" (0.45), "Dr. Carlos Eduardo Mendes Filho" (0.40) — ambos OK.
- Honesto: scores 0.3–0.45, com misses/falsos ocasionais → threshold tunável + revisão humana de nomes (já no GUIA).
- **✅ Offline TOTAL (2026-06-29) — PROVADO via net-log do Chromium headless (`--log-net-log`), zero requisição externa do app.** Tokenizer + modelo (349MB) + wasm (11MB) + libs TODOS de `localhost`. Verificado em `gliner-probe/browser-test-offline.html` + Node `test-tokenizer-local.mjs` (tokenizer local em 0.79s com `allowRemoteModels=false`).
- **Blocker era MISDIAGNÓSTICO** (handoff dizia "gliner bundla transformers, precisa v3"). Verdade (lendo `gliner/dist/index.mjs:678`): gliner importa `@xenova/transformers` como **bare specifier** (importmap → instância compartilhada), mas o **construtor `Gliner` RESETA `env.allowLocalModels = config.transformersSettings?.allowLocalModels ?? false`**. Sem passar `transformersSettings`, o flag voltava a `false` → tokenizer caía no HF CDN.
  - **FIX REAL (2 opções de config, SEM migrar p/ v3):**
    1. `transformersSettings:{ allowLocalModels:true, useBrowserCache:false }` no construtor `Gliner` → tokenizer carrega de `env.localModelPath`.
    2. `onnxSettings.wasmPaths` → dist local do `onnxruntime-web` (gliner usa a própria cópia de ort e puxa wasmPaths de `onnxSettings`; sem isso o `ort-wasm-simd-threaded.wasm/.mjs` vazava p/ jsdelivr CDN).
  - Layout local exigido: `local-models/<repo>/<id>/{tokenizer.json,tokenizer_config.json,config.json,onnx/model_quantized.onnx}` + ort dist com `ort-wasm-simd-threaded.{mjs,wasm}`.
- **✅ WIRING NO PRODUTO (2026-06-29, modo-pro — corte Enio):** `template.html` ganhou `<details>` "🔬 Modo avançado: detectar nomes" com directory-picker (`webkitdirectory`). `build.ts` agora emite **2 saídas**: `anonimizador-offline.html` (base C1, 2.63MB, leve) + `anonimizador-offline-pro.html` (C1+C2, 5.60MB, bundle GLiNER inline). O usuário aponta a pasta do modelo (~360MB, baixado 1×); arquivos lidos p/ memória → `customCache`(tokenizer) + `Uint8Array`(modelo) + blob URLs(wasm/mjs) → `Gliner` → spans com offsets → `engine.tokenize({extraMatches})`. Detecções de NOME/ENDEREÇO viram tokens reversíveis junto com a regex BR.
  - **Prova de produto (Chromium headless, console + net-log):** bundle inline OK (`window.__glinerBundle`), modelo carrega de File objects ("modelo pronto — 100% local"), `OUTPUT="Vítima: [NOME_0002], CPF [CPF_0001]. Investigador: [NOME_0001], telefone ([TEL_0001])"` (2 NOME GLiNER + 1 CPF + 1 TEL regex), **zero requisição externa**. 44/44 testes do engine seguem passando.
  - **Bundle:** gerado por `gliner-probe/bundle-spike/build-bundle.ts` (Bun.build, alias `@xenova/transformers`→web-dist p/ evitar `fs` undefined; 3.12MB, zero bare-import) → `vendor/gliner-bundle.mjs` (gitignored). ⚠️ **Reprodutibilidade:** `-pro` exige `vendor/gliner-bundle.mjs` presente; gerar a partir de `gliner-probe` (gitignored). Clone limpo builda só a base. Próximo passo de distribuição: empacotar o bundle de forma reprodutível OU versioná-lo.
  - **Ordering fix:** o bundle é `<script type="module">` (deferido); o init de modo-pro no script clássico faz poll de `window.__glinerBundle` (40×30ms) antes de ativar a seção — senão a checagem rodava antes do módulo.
- **✅ REPRODUTIBILIDADE (2026-06-29 sessão 2) — `c2-bundle/` (tracked):** receita versionada que não depende de `gliner-probe` (gitignored).
  - `cd c2-bundle && bun install && bun build.ts` → `vendor/gliner-bundle.mjs` (3.12MB, gitignored). Provado do ZERO (apaguei o bundle, regenerei, re-provei no produto — funcional; checksum varia entre installs mas 0 bare-imports + roda).
  - `cd c2-bundle && bun install && bun prepare-model.ts` → `dist/modelo-nomes/` (360MB, gitignored): 5 arquivos basename-único (`tokenizer.json`·`tokenizer_config.json`·`model_quantized.onnx`·`ort-wasm-simd-threaded.{wasm,mjs}`) + `LICENCAS.txt`. Reusa cache local se houver, senão baixa do HF (`onnx-community/gliner_multi_pii-v1`, Apache-2.0) + ort do npm (MIT). Provado: produto carrega a pasta montada e tokeniza (`[LOCAL_0001]`+`[CPF_0001]`).
  - `build.ts` principal agora aponta a receita quando o bundle falta.
- **✅ QUALIDADE NOME TUNADA (2026-06-29 sessão 2):** sweep empírico (set rotulado 5 frases forenses, headless) → **labels EN** (GLiNER-multi ignora PT: recall 6/9→0/9 vs EN 9/9), **threshold 0.2** viés-recall (correto p/ PII: miss=vazamento; over-redação é segura+humano revisa). Provas: "Dr. Carlos Eduardo Mendes Filho"=0.24 (pego em 0.2, perdido em 0.25); texto forense benigno = ZERO falso-positivo em 0.2. Produto final: frase com 2 nomes+endereço+CPF+telefone → TODOS tokenizados. Config: `NAME_LABELS=[person,full name,first name,organization,address,location]`, `NAME_THRESHOLD=0.2`. **Revisão humana de nomes segue recomendada** (GLiNER não é determinístico) mas recall agora é bom.
- **✅ FIX telefone `(DDD)` (engine.js):** `(?<!\d)` no lugar do `\b` inicial — o `\b` empurrava o início pra depois do `(` deixando-o solto. Agora `(34) 99999-1234`→`[TEL_0001]` (parêntese+`+55` capturados). 44/44 testes, sem regressão CPF/CNPJ.
- **Pendente p/ produção:** resolver tokenizer-local (acima), wiring opcional no HTML (modo-pro via file-input do modelo), decisão de formato de distribuição. Ambiente de prova: `gliner-probe/` (gitignored).

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
