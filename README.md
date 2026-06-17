# @egosbr/guard-brasil

**Camada de segurança para IA em contexto brasileiro** — mascaramento de dados pessoais (PII), validação ética e cadeia de evidências auditável antes de qualquer texto chegar ao usuário.

> **Status:** em uso ativo · **Licença:** MIT · parte do framework [EGOS](https://github.com/enioxt/egos)

---

## Para que serve

Sistemas de IA implantados no Brasil costumam falhar em dois pontos:

1. **Exposição acidental de dados pessoais** — CPF, CNPJ, RG, placa, número de processo e telefone vazam nas respostas do modelo, contrariando a Lei 13.709/2018 (LGPD).
2. **Afirmações sem evidência** — modelos fazem promessas absolutas, inventam fontes ou citam dados que não existem, especialmente em contextos sensíveis (saúde, jurídico, financeiro).

`@egosbr/guard-brasil` intercepta os dois problemas **na camada de saída**, antes que o texto chegue a quem lê.

**Honestidade importante:** mascarar dados pessoais **não** torna uma operação inteira conforme à LGPD. Conformidade plena envolve base legal, encarregado (DPO), avaliação de impacto e outras obrigações fora do escopo desta biblioteca. Consulte assessoria jurídica para ambientes de produção com dados sensíveis.

---

## O que faz

| Camada | O que verifica | Ação |
|---|---|---|
| **PII Scanner BR** | Dados pessoais brasileiros (tabela abaixo) | Mascarar ou bloquear |
| **Validação ética** | Afirmações absolutas, dados fabricados, promessas falsas, entidades bloqueadas | Pontuar (0–100) + sinalizar |
| **Public Guard** | Classificação de sensibilidade + aviso de divulgação LGPD | Redigir + nota de rodapé |
| **Cadeia de evidências** | Rastreabilidade de afirmações + hash de auditoria | Construir bloco de evidências |

---

## Dados pessoais detectados

| Categoria | Exemplo | Substituição |
|---|---|---|
| CPF | `123.456.789-09` | `[CPF REMOVIDO]` |
| CNPJ | `00.000.000/0001-00` | `[CNPJ REMOVIDO]` |
| RG | `RG: 12.345.678-9` | `[RG REMOVIDO]` |
| Processo | `0001234-56.2024.1.02.0001` | `[PROCESSO REMOVIDO]` |
| Placa | `ABC-1D23` | `[PLACA REMOVIDA]` |
| Telefone | `(31) 99999-0000` | `[TELEFONE REMOVIDO]` |
| E-mail | `contato@empresa.com.br` | `[EMAIL REMOVIDO]` |
| Nome (contextual) | `Maria Souza` | `[NOME REMOVIDO]` |
| Data de nasc. | `nascimento: 15/03/1985` | `[DATA REMOVIDA]` |

A detecção inclui validação de dígitos verificadores onde aplicável (CPF, CNPJ), reduzindo falsos positivos em relação a regex simples.

---

## Stack

- **Runtime:** Bun / Node.js (ESM)
- **Linguagem:** TypeScript (strict)
- **Empacotamento:** `dist/index.js` + tipos `dist/index.d.ts`

---

## Instalação

```bash
# npm
npm install @egosbr/guard-brasil

# Bun
bun add @egosbr/guard-brasil
```

---

## Quick start

```ts
import { GuardBrasil } from '@egosbr/guard-brasil';

const guard = GuardBrasil.create();

const result = guard.inspect(respostaDoLLM);

if (!result.safe) {
  console.log(result.output);          // texto já mascarado/limpo
  console.log(result.lgpdDisclosure);  // nota de rodapé LGPD
  console.log(result.summary);         // resumo legível das ocorrências
}
```

---

## Configuração

```ts
const guard = GuardBrasil.create({
  // Bloquear a saída inteira quando encontrar dado crítico (CPF, RG)
  blockOnCriticalPII: false,   // padrão: false (mascara em vez de bloquear)

  // Adicionar nota LGPD ao final de saídas mascaradas
  lgpdDisclosure: true,        // padrão: true

  // Validação ética
  atrian: {
    blockedEntities: ['TERMO_BLOQUEADO'],   // strings exatas → bloqueio imediato
    knownAcronyms: ['LGPD', 'SINESP'],     // suprimir falsos positivos de siglas
    onViolation: (result, text) => {
      logger.warn('Violação ética', result);
    },
  },
});
```

---

## Cadeia de evidências

Anexe afirmações rastreáveis para auditoria:

```ts
const result = guard.inspect(resposta, {
  sessionId: 'sessao-42',
  claims: [
    {
      claim: 'Registro encontrado no sistema',
      source: 'api-interna-v2',
      excerpt: 'Item #2024-0098765 — status: encerrado',
      confidence: 'high',
    },
  ],
});

console.log(result.evidenceBlock); // bloco de evidências com hash de auditoria
```

---

## Categorias de violação ética

| Categoria | Nível | Exemplo |
|---|---|---|
| `absolute_claim` | aviso | `"com certeza"`, `"sem dúvida"`, `"sempre"` |
| `fabricated_data` | erro | citar fonte/dado que não existe |
| `false_promise` | erro | `"vamos resolver"`, `"isso será encaminhado"` |
| `blocked_entity` | crítico | qualquer string listada em `blockedEntities` |
| `invented_acronym` | aviso | siglas em maiúsculas não reconhecidas |

---

## Testes e demo

```bash
bun test src/guard.test.ts   # 15 pass, 0 fail
bun run src/demo.ts          # demo interativa
```

---

## Limites e honestidade

- Opera **na camada de saída** — não verifica o que entra no modelo nem controla o comportamento dele.
- A detecção de nomes próprios é contextual e pode gerar falsos positivos ou negativos.
- Conformidade com a LGPD envolve dimensões legais, organizacionais e técnicas que vão além do mascaramento automatizado.

---

## English summary

`@egosbr/guard-brasil` is a TypeScript library that adds a Brazilian-context safety layer to LLM outputs. It masks Brazilian PII (CPF, CNPJ, RG, judicial process numbers, vehicle plates, etc.) with check-digit validation, scores outputs for ethical violations, and builds tamper-evident evidence chains for audit. Install via npm or Bun. The Portuguese sections above are canonical.

---

*Atualizado em 17 de junho de 2026 · MIT License · [egos.ia.br](https://egos.ia.br)*
