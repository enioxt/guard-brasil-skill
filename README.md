# @egosbr/guard-brasil

**Brazilian AI Safety Layer** — LGPD-compliant PII masking, ATRiAN ethical validation, and traceable evidence discipline for AI assistants operating in Brazil.

> "We make Brazilian AI assistants safer to ship by adding LGPD-aware guardrails, masking, evidence discipline, and policy enforcement."

---

## Why this exists

AI assistants deployed in Brazilian public-sector and enterprise contexts face two distinct failure modes:

1. **Privacy exposure** — CPF, MASP, REDS, RG, phone, and process numbers leak into responses, violating Lei 13.709/2018 (LGPD).
2. **Hallucination and epistemic violations** — models make absolute claims, invent data sources, and issue false promises — especially in sensitive contexts like police, health, or legal systems.

`@egosbr/guard-brasil` intercepts both at the output layer, before any text reaches the user.

---

## What it does

| Layer | Checks | Action |
|---|---|---|
| **ATRiAN** | Absolute claims, fabricated data, false promises, blocked entities | Score (0–100) + flag |
| **PII Scanner BR** | CPF, RG, MASP, REDS, processo, placa, phone, email, nome | Mask or block |
| **Public Guard** | LGPD compliance, sensitivity classification | Redact + disclosure |
| **Evidence Chain** | Claim traceability, audit hash | Build + format |

---

## Install

```bash
# From monorepo (workspace)
bun add @egosbr/guard-brasil

# From npm
npm install @egosbr/guard-brasil
```

---

## Quick start

```ts
import { GuardBrasil } from '@egosbr/guard-brasil';

const guard = GuardBrasil.create();

const result = guard.inspect(llmResponse);

if (!result.safe) {
  // Use result.output — already masked/cleaned
  console.log(result.output);
  console.log(result.lgpdDisclosure); // LGPD footer
  console.log(result.summary);        // human-readable summary
}
```

---

## Configuration

```ts
const guard = GuardBrasil.create({
  // Block output entirely when critical PII found (CPF, MASP, REDS, RG)
  blockOnCriticalPII: false,   // default: false (masks instead)

  // Append LGPD disclosure note to masked outputs
  lgpdDisclosure: true,        // default: true

  // ATRiAN configuration
  atrian: {
    blockedEntities: ['MÓDULO_SECRETO'],   // exact string matches → blocked
    knownAcronyms: ['LGPD', 'SINESP'],    // suppress false positive acronym warnings
    onViolation: (result, text) => {       // callback on any violation
      logger.warn('ATRiAN violation', result);
    },
  },
});
```

---

## Evidence chain

Attach traceable claims to your response for audit compliance:

```ts
const result = guard.inspect(response, {
  sessionId: 'user-session-42',
  claims: [
    {
      claim: 'Registro encontrado no sistema BOPC',
      source: 'bopc-api-v2',
      excerpt: 'Evento #2024/0098765 — status: encerrado',
      confidence: 'high',
    },
  ],
});

// Returns a sealed evidence chain with audit hash
console.log(result.evidenceBlock);
// [Evidências — resp-1234567890-1]
// • Registro encontrado no sistema BOPC (confiança: high)
//   ↳ [document] bopc-api-v2: "Evento #2024/0098765 — status: encerrado..."
// Audit hash: ev-3f7a1b2c
```

---

## PII categories detected

| Category | Example | Replacement |
|---|---|---|
| CPF | `123.456.789-09` | `[CPF REMOVIDO]` |
| RG | `RG: 12.345.678-9` | `[RG REMOVIDO]` |
| MASP | `MASP: 1234567` | `[MASP REMOVIDO]` |
| REDS | `REDS 2024/0098765` | `[REDS REMOVIDO]` |
| Processo | `0001234-56.2024.1.02.0001` | `[PROCESSO REMOVIDO]` |
| Placa | `ABC-1D23` | `[PLACA REMOVIDA]` |
| Telefone | `(31) 99999-0000` | `[TELEFONE REMOVIDO]` |
| Email | `agente@pc.mg.gov.br` | `[EMAIL REMOVIDO]` |
| Nome | `delegado João Alves` | `[NOME REMOVIDO]` |
| Data nasc. | `nascimento: 15/03/1985` | `[DATA REMOVIDA]` |

---

## ATRiAN violation categories

| Category | Level | Example |
|---|---|---|
| `absolute_claim` | warning | `"com certeza"`, `"sem dúvida"`, `"sempre"` |
| `fabricated_data` | error | `"segundo dados do Ministério da Justiça"` |
| `false_promise` | error | `"vamos resolver"`, `"isso será encaminhado"` |
| `blocked_entity` | critical | any string in `blockedEntities` config |
| `invented_acronym` | warning | unknown all-caps abbreviations |

---

## Run the demo

```bash
cd packages/guard-brasil
bun run src/demo.ts
```

---

## Tests

```bash
bun test packages/guard-brasil/src/guard.test.ts
# 15 pass, 0 fail
```

---

## Legal

LGPD compliance disclaimer: This library assists in masking personal data but does not replace legal counsel or a full LGPD compliance program. Always consult a Data Protection Officer for production deployments handling sensitive Brazilian personal data.

---

## License

MIT — part of the [EGOS](https://github.com/enioxt/egos) framework.
