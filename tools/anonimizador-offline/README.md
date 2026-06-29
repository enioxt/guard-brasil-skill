# Anonimizador Offline — Guard Brasil

Ferramenta de **arquivo único** (`.html`) que anonimiza dados pessoais brasileiros
**100% no computador do usuário, sem internet**. Pensada para o fluxo do agente da lei:
anonimizar → enviar à IA externa (ChatGPT/Claude) → restaurar a resposta localmente.

## Por que assim

- **Soberania de dado (R-SEC-002):** nada sai da máquina. Todo o processamento roda no
  navegador via `file://`. Não há servidor, não há rede.
- **Windows-friendly:** um único `.html` que abre no Edge/Chrome com duplo-clique.
  Sem instalação, sem admin, sem antivírus reclamando de `.exe`.
- **Reversível (estilo DataVirtus):** os dados viram códigos `[CPF_0001]`. Um "mapa"
  (`.json`, fica só local) permite restaurar a resposta da IA.

## O que detecta

**C1 (regex BR, sempre):** CPF, CNPJ (ambos com validação de dígito), RG, MASP, REDS,
processo CNJ, placa (antiga + Mercosul), telefone, e-mail, CEP. Motor em `engine.js`
(fonte única — testes importam via ESM, o build inlina no HTML), inspirado no SSOT
`packages/guard-brasil/src/pii-patterns.ts`.

**C2 (nomes/endereços, modo-pro):** GLiNER (`onnx-community/gliner_multi_pii-v1`,
Apache-2.0) rodando **100% offline** no navegador (transformers.js + onnxruntime-web/wasm).
Detecções viram `extraMatches` na mesma `tokenize()` reversível. Labels EN + threshold
0.2 (viés-recall: num PII, um miss = vazamento). Nomes exigem revisão humana (não-determinístico).

## Formatos de arquivo

`.txt` · `.docx` (via mammoth) · `.pdf` (via pdf.js, worker embutido como blob) — tudo offline.

## Build

```bash
# básica (C1) — leve, sempre funciona em clone limpo
bun packages/guard-brasil/tools/anonimizador-offline/build.ts
# → dist/anonimizador-offline.html       (~2.6 MB, arquivo único)
# → dist/anonimizador-offline-pro.html   (~5.6 MB) — só se vendor/gliner-bundle.mjs existir

# -pro (C1+C2 nomes) — gera o bundle GLiNER + a pasta do modelo
cd packages/guard-brasil/tools/anonimizador-offline/c2-bundle
bun install
bun build.ts          # → ../vendor/gliner-bundle.mjs (3 MB, inlinado no -pro)
bun prepare-model.ts  # → ../dist/modelo-nomes/ (360 MB: tokenizer+modelo+wasm+LICENCAS)
```

`vendor/`, `dist/`, `gliner-probe/`, `c2-bundle/node_modules/` são gitignored (regeneráveis).
A receita reprodutível vive em `c2-bundle/` (tracked) — clone limpo builda a básica direto;
o `-pro` precisa rodar a receita acima. Distribuição:
- **básica:** 1 `.html` por e-mail/pendrive.
- **-pro:** `anonimizador-offline-pro.html` + a pasta `modelo-nomes/` (o usuário aponta a pasta no "modo avançado").

## Prova (FLOW VALIDATION)

- **C1:** Chromium real, console limpo — texto + `.docx` + `.pdf` anonimizados, round-trip OK.
  `engine.js`: 44/44 golden cases (`bun test/engine.test.mjs`), CPF/CNPJ inválidos rejeitados.
- **C2 offline-total:** Chromium headless + `--log-net-log` → tokenizer + modelo (349 MB) + wasm
  todos de `localhost`, **zero requisição externa**. Produto carregando a pasta `modelo-nomes/`:
  `[NOME]×2 + [ENDERECO] + [CPF] + [TEL]` tokenizados.
- **Tuning de nomes:** sweep empírico (set rotulado) → labels EN > PT (9/9 vs 0/9), thr 0.2 pega
  nome de score 0.24 sem falso-positivo em texto benigno.

## Limites conhecidos (honestos)

- Nomes (C2): GLiNER não é determinístico — revise o texto. Ajustado p/ grifar demais a errar de menos.
- PDF escaneado (imagem) não tem texto extraível — precisaria OCR (fora do escopo V1).
- Não há log de auditoria persistente (LGPD Art. 46 pede; a lógica de hash existe no
  guard-brasil, não exposta aqui ainda).
- NÃO substitui base legal/autorização para acesso a dado sensível — resolve só a parte técnica.
