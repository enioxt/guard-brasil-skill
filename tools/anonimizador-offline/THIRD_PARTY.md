# Licenças de terceiros — Anonimizador Offline

Componentes OSS embutidos/avaliados. Todos permissivos (Apache-2.0 / MIT / BSD) — compatíveis com distribuição livre.

## Embutidos no HTML (C1)
| Componente | Uso | Licença |
|---|---|---|
| **mammoth.js** | extrair texto de `.docx` | BSD-2-Clause |
| **pdf.js** (Mozilla) | extrair texto de `.pdf` | Apache-2.0 |

## Motor (nosso)
| Componente | Origem | Licença |
|---|---|---|
| guard-brasil (pii-patterns) | EGOS — `packages/guard-brasil` | MIT |

## Avaliados para a C2 (NER de nomes) — adoção planejada
| Componente | Papel | Licença | Status |
|---|---|---|---|
| **GLiNER** (`onnx-community/gliner_multi_pii-v1`) | detectar NOMES/ENDEREÇO | Apache-2.0 | modelo baixado (154MB), integração pendente |
| **@huggingface/transformers** (Transformers.js) | runtime ONNX no browser | Apache-2.0 | candidato runtime C2 |
| validation-br / validabr | validação dígito BR | MIT | inspiração p/ validadores |
| pii-vault / openredaction | padrão de vault reversível | MIT | referência |

## NÃO adotados (incompatível com distribuição livre)
- `iiiorg/piiranha` → `cc-by-nc-nd` (não-comercial + sem-derivados).
- `nvidia/gliner-PII` → NVIDIA Open Model License (não-OSI).
- spaCy `pt_core_news_*` → CC-BY-SA (copyleft viral).
- `logus-lgpd` → AGPL-3.0 (copyleft restritivo).
- Kong/Portkey/Cloudflare PII → camada paga/fechada.

> Ao distribuir o `dist/anonimizador-offline.html`, incluir este arquivo (créditos mammoth + pdf.js).
