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

CPF, CNPJ (ambos com validação de dígito), RG, MASP, REDS, processo CNJ, placa
(antiga + Mercosul), telefone, e-mail, CEP. Motor portado **verbatim** do SSOT
`packages/guard-brasil/src/pii-patterns.ts` (via `apps/egos-landing/src/lib/guard-local.ts`).

## Formatos de arquivo

`.txt` · `.docx` (via mammoth) · `.pdf` (via pdf.js, worker embutido como blob) — tudo offline.

## Build

```bash
bun packages/guard-brasil/tools/anonimizador-offline/build.ts
# → dist/anonimizador-offline.html  (~2.6 MB, arquivo único)
```

O build baixa/copia as libs (`vendor/`) se faltarem e as embute em base64.
`vendor/` e `dist/` são gitignored (regeneráveis). Distribua o `dist/*.html` por
e-mail/pendrive — é o único arquivo que o usuário final precisa.

## Prova (FLOW VALIDATION)

Testado em Chromium real via `file://`, console limpo:
texto + `.docx` + `.pdf` anonimizados, mapa baixado, round-trip de restauração OK.
Motor puro testado com CPF/CNPJ inválidos corretamente rejeitados pela validação de dígito.

## Limites conhecidos (honestos)

- Telefone com `(DDD)` deixa o `(` solto (herdado da regex canônica) — dígitos são mascarados.
- PDF escaneado (imagem) não tem texto extraível — precisaria OCR (fora do escopo V1).
- Não há log de auditoria persistente (LGPD Art. 46 pede; a lógica de hash existe no
  guard-brasil, não exposta aqui ainda).
- NÃO substitui base legal/autorização para acesso a dado sensível — resolve só a parte técnica.
