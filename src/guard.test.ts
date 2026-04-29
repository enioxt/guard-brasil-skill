/**
 * @egos/guard-brasil — Tests
 *
 * Tests the GuardBrasil facade end-to-end with realistic inputs.
 */

import { describe, expect, it } from 'bun:test';
import { GuardBrasil } from './guard.js';
import { detectPII, INFRASTRUCTURE_SECRET_PATTERNS } from './pii-patterns.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeGuard(blockOnCriticalPII = false) {
  return GuardBrasil.create({ blockOnCriticalPII, lgpdDisclosure: true });
}

// ─── Clean output ─────────────────────────────────────────────────────────────

describe('GuardBrasil — clean output', () => {
  it('marks a clean response as safe', () => {
    const guard = makeGuard();
    const result = guard.inspect('O processo está em andamento. Aguarde contato.');
    expect(result.safe).toBe(true);
    expect(result.blocked).toBe(false);
    expect(result.masking.findings).toHaveLength(0);
    expect(result.atrian.passed).toBe(true);
    expect(result.lgpdDisclosure).toBe('');
  });
});

// ─── PII detection ────────────────────────────────────────────────────────────

describe('GuardBrasil — PII detection', () => {
  it('detects and masks CPF', () => {
    const guard = makeGuard();
    const result = guard.inspect('O CPF do solicitante é 123.456.789-09.');
    expect(result.masking.findings.some(f => f.category === 'cpf')).toBe(true);
    expect(result.output).not.toContain('123.456.789-09');
    expect(result.output).toContain('[CPF REMOVIDO]');
    expect(result.safe).toBe(false);
  });

  it('detects Registro Geral wording as RG', () => {
    const guard = makeGuard();
    const result = guard.inspect('Registro Geral 123456789 do paciente foi apresentado.');
    expect(result.masking.findings.some(f => f.category === 'rg')).toBe(true);
  });

  it('detects MASP', () => {
    const guard = makeGuard();
    const result = guard.inspect('Delegado MASP: 1234567 presente.');
    expect(result.masking.findings.some(f => f.category === 'masp')).toBe(true);
    expect(result.output).not.toContain('1234567');
  });

  it('detects REDS', () => {
    const guard = makeGuard();
    const result = guard.inspect('REDS 2024/0098765 foi registrado.');
    expect(result.masking.findings.some(f => f.category === 'reds')).toBe(true);
  });

  it('adds LGPD disclosure when PII found', () => {
    const guard = makeGuard();
    const result = guard.inspect('CPF: 111.222.333-44');
    expect(result.lgpdDisclosure).toContain('LGPD');
    expect(result.lgpdDisclosure).toContain('13.709/2018');
  });

  it('does NOT add LGPD disclosure for clean output', () => {
    const guard = makeGuard();
    const result = guard.inspect('Sem dados pessoais aqui.');
    expect(result.lgpdDisclosure).toBe('');
  });

  it('detects CEP without misclassifying it as phone', () => {
    const guard = makeGuard();
    const result = guard.inspect('CEP 01310100 informado para entrega.');
    expect(result.masking.findings.some(f => f.category === 'cep')).toBe(true);
    expect(result.masking.findings.some(f => f.category === 'phone')).toBe(false);
  });

  it('does not classify bare numeric codes as phone', () => {
    const guard = makeGuard();
    const result = guard.inspect('O código de barras é 789456123.');
    expect(result.masking.findings.some(f => f.category === 'phone')).toBe(false);
  });
});

// ─── ATRiAN validation ────────────────────────────────────────────────────────

describe('GuardBrasil — ATRiAN ethical validation', () => {
  it('flags absolute claim "com certeza"', () => {
    const guard = makeGuard();
    const result = guard.inspect('Com certeza o problema será resolvido.');
    expect(result.atrian.violations.some(v => v.category === 'absolute_claim')).toBe(true);
    // absolute claims are warnings, not errors — passes validation
    expect(result.atrian.score).toBeLessThan(100);
  });

  it('flags false promise', () => {
    const guard = makeGuard();
    const result = guard.inspect('Vamos resolver o caso imediatamente.');
    const hasFalsePromise = result.atrian.violations.some(v => v.category === 'false_promise');
    expect(hasFalsePromise).toBe(true);
    expect(result.atrian.passed).toBe(false);
  });

  it('flags fabricated data reference', () => {
    const guard = makeGuard();
    const result = guard.inspect('Segundo dados do Ministério da Justiça, 98% dos casos são resolvidos.');
    expect(result.atrian.violations.some(v => v.category === 'fabricated_data')).toBe(true);
    expect(result.atrian.passed).toBe(false);
  });

  it('blocks entity in blocklist', () => {
    const guard = GuardBrasil.create({ atrian: { blockedEntities: ['PROIBIDO'] } });
    const result = guard.inspect('Este sistema usa o módulo PROIBIDO para isso.');
    expect(result.atrian.violations.some(v => v.category === 'blocked_entity')).toBe(true);
    expect(result.atrian.passed).toBe(false);
    expect(result.output).toContain('***');
  });
});

// ─── blockOnCriticalPII ───────────────────────────────────────────────────────

describe('GuardBrasil — blockOnCriticalPII', () => {
  it('blocks output entirely when critical PII found and blockOnCriticalPII=true', () => {
    const guard = makeGuard(true);
    const result = guard.inspect('O CPF do agente é 999.888.777-66.');
    expect(result.blocked).toBe(true);
    expect(result.output).toContain('[CONTEÚDO BLOQUEADO');
  });

  it('masks (not blocks) critical PII by default', () => {
    const guard = makeGuard(false);
    const result = guard.inspect('CPF: 999.888.777-66');
    expect(result.blocked).toBe(false);
    expect(result.output).toContain('[CPF REMOVIDO]');
  });
});

// ─── Evidence chain ───────────────────────────────────────────────────────────

describe('GuardBrasil — evidence chain', () => {
  it('builds evidence chain when claims provided', () => {
    const guard = makeGuard();
    const result = guard.inspect('O suspeito foi identificado.', {
      sessionId: 'test-session',
      claims: [
        {
          claim: 'Suspeito identificado via sistema',
          source: 'boletim-interno',
          excerpt: 'registro #42',
          confidence: 'high',
        },
      ],
    });
    expect(result.evidenceChain).toBeDefined();
    expect(result.evidenceChain?.claims).toHaveLength(1);
    expect(result.evidenceChain?.auditHash).toMatch(/^ev-[0-9a-f]{64}$/);
    expect(result.evidenceBlock).toContain('[Evidências');
  });

  it('does not build evidence chain without claims', () => {
    const guard = makeGuard();
    const result = guard.inspect('Texto simples.');
    expect(result.evidenceChain).toBeUndefined();
    expect(result.evidenceBlock).toBeUndefined();
  });
});

describe('GuardBrasil — inspection receipt', () => {
  it('builds inspection hashes even without source provenance', () => {
    const guard = makeGuard();
    const result = guard.inspect('Texto simples.');
    expect(result.receipt.inputHash).toHaveLength(64);
    expect(result.receipt.outputHash).toHaveLength(64);
    expect(result.receipt.inspectionHash).toHaveLength(64);
    expect(result.receipt.provenanceLevel).toBe('inspection_only');
  });

  it('binds source provenance when source metadata is provided', () => {
    const guard = makeGuard();
    const result = guard.inspect('CPF 123.456.789-09', {
      provenance: {
        sourceUrl: 'https://dados.exemplo.gov.br/arquivo.csv',
        sourceMethod: 'api',
        rawRow: { id: 7, cpf: '123.456.789-09' },
        query: 'cpf=12345678909',
        recordId: 'row-7',
      },
    });
    expect(result.receipt.provenanceLevel).toBe('source_row_bound');
    expect(result.receipt.source?.source_fingerprint).toHaveLength(64);
    expect(result.receipt.source?.raw_line_hash).toHaveLength(64);
    expect(result.receipt.source?.queryHash).toHaveLength(64);
  });
});

// ─── Combined scenario ────────────────────────────────────────────────────────

describe('GuardBrasil — combined scenario', () => {
  it('handles text with PII + ATRiAN violations simultaneously', () => {
    const guard = makeGuard();
    const text = 'Com certeza o investigador de CPF 123.456.789-09 resolverá o caso. Vamos encaminhar isso agora.';
    const result = guard.inspect(text);

    expect(result.safe).toBe(false);
    expect(result.output).not.toContain('123.456.789-09');
    expect(result.atrian.violations.length).toBeGreaterThan(0);
    expect(result.summary).toContain('ATRiAN');
    expect(result.summary).toContain('PII');
    expect(result.lgpdDisclosure).toContain('LGPD');
  });
});

// ─── Missing PII patterns — full coverage ─────────────────────────────────────

describe('GuardBrasil — CNPJ detection', () => {
  it('detects and masks CNPJ formatted with dots and slash', () => {
    const guard = makeGuard();
    const result = guard.inspect('Empresa: 12.345.678/0001-90 solicitou acesso.');
    expect(result.safe).toBe(false);
    expect(result.output).not.toContain('12.345.678/0001-90');
    expect(result.output).toContain('[CNPJ REMOVIDO]');
  });

  it('detects CNPJ without separators', () => {
    const guard = makeGuard();
    const result = guard.inspect('CNPJ 12345678000190 do fornecedor.');
    expect(result.safe).toBe(false);
    expect(result.output).not.toContain('12345678000190');
  });
});

describe('GuardBrasil — CNH detection', () => {
  it('detects CNH preceded by keyword', () => {
    const guard = makeGuard();
    const result = guard.inspect('Habilitação: 12345678901 — condutor aprovado.');
    expect(result.safe).toBe(false);
    expect(result.output).not.toContain('12345678901');
    expect(result.output).toContain('[CNH REMOVIDO]');
  });

  it('detects CNH with keyword abbreviation', () => {
    const guard = makeGuard();
    const result = guard.inspect('CNH 98765432100 foi verificada.');
    expect(result.safe).toBe(false);
    expect(result.output).toContain('[CNH REMOVIDO]');
  });
});

describe('GuardBrasil — Phone detection', () => {
  it('detects mobile phone with DDD', () => {
    const guard = makeGuard();
    const result = guard.inspect('Contato: (31) 99999-8888 para mais informações.');
    expect(result.safe).toBe(false);
    expect(result.output).not.toContain('99999-8888');
    expect(result.output).toContain('[TELEFONE REMOVIDO]');
  });

  it('detects landline phone with +55 prefix', () => {
    const guard = makeGuard();
    const result = guard.inspect('Fone: +55 11 3333-4444');
    expect(result.safe).toBe(false);
    expect(result.output).toContain('[TELEFONE REMOVIDO]');
  });
});

describe('GuardBrasil — Email detection', () => {
  it('detects and masks email addresses', () => {
    const guard = makeGuard();
    const result = guard.inspect('Enviar para joao.silva@empresa.com.br urgente.');
    expect(result.safe).toBe(false);
    expect(result.output).not.toContain('joao.silva@empresa.com.br');
    expect(result.output).toContain('[EMAIL REMOVIDO]');
  });

  it('detects multiple emails in same text', () => {
    const guard = makeGuard();
    const result = guard.inspect('CC: a@b.com e c@d.org');
    expect(result.safe).toBe(false);
    const findings = result.output.match(/\[EMAIL REMOVIDO\]/g) ?? [];
    expect(findings.length).toBeGreaterThanOrEqual(2);
  });
});

describe('GuardBrasil — SUS detection', () => {
  it('detects Cartão Nacional de Saúde (15 digits)', () => {
    const guard = makeGuard();
    const result = guard.inspect('Cartão SUS do paciente: 100 0000 0000 0001.');
    expect(result.safe).toBe(false);
    expect(result.output).not.toContain('100 0000 0000 0001');
    expect(result.output).toContain('[SUS REMOVIDO]');
  });
});

describe('GuardBrasil — NIS/PIS detection', () => {
  it('detects NIS/PIS number', () => {
    const guard = makeGuard();
    const result = guard.inspect('NIS do beneficiário: 123.45678.90-1');
    expect(result.safe).toBe(false);
    expect(result.output).not.toContain('123.45678.90-1');
    expect(result.output).toContain('[NIS REMOVIDO]');
  });
});

describe('GuardBrasil — Processo Judicial detection', () => {
  it('detects CNJ process number', () => {
    const guard = makeGuard();
    const result = guard.inspect('Processo 1234567-89.2024.8.13.0001 em tramitação.');
    expect(result.safe).toBe(false);
    expect(result.output).not.toContain('1234567-89.2024.8.13.0001');
    expect(result.output).toContain('[PROCESSO REMOVIDO]');
  });
});

describe('GuardBrasil — Vehicle plate detection', () => {
  it('detects old Brazilian plate format (AAA-0000)', () => {
    const guard = makeGuard();
    const result = guard.inspect('Veículo placa ABC-1234 envolvido no incidente.');
    expect(result.safe).toBe(false);
    expect(result.output).not.toContain('ABC-1234');
    expect(result.output).toContain('[PLACA REMOVIDA]');
  });

  it('detects Mercosul plate format (AAA0A00)', () => {
    const guard = makeGuard();
    const result = guard.inspect('Placa Mercosul: BCD1E23 do suspeito.');
    expect(result.safe).toBe(false);
    expect(result.output).not.toContain('BCD1E23');
    expect(result.output).toContain('[PLACA REMOVIDA]');
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('GuardBrasil — edge cases', () => {
  it('handles empty string without throwing', () => {
    const guard = makeGuard();
    const result = guard.inspect('');
    expect(result.safe).toBe(true);
    expect(result.output).toBe('');
    expect(result.masking.findings).toHaveLength(0);
  });

  it('handles very long input (10k chars) without performance failure', () => {
    const guard = makeGuard();
    const clean = 'Lorem ipsum dolor sit amet. '.repeat(357); // ~10k chars
    const start = Date.now();
    const result = guard.inspect(clean);
    expect(Date.now() - start).toBeLessThan(500);
    expect(result.safe).toBe(true);
  });

  it('handles PII embedded in large text', () => {
    const guard = makeGuard();
    const prefix = 'a'.repeat(5000);
    const suffix = 'b'.repeat(5000);
    const result = guard.inspect(`${prefix} CPF 123.456.789-09 ${suffix}`);
    expect(result.safe).toBe(false);
    expect(result.output).not.toContain('123.456.789-09');
  });

  it('handles Unicode and accented characters without false positives', () => {
    const guard = makeGuard();
    const result = guard.inspect('Ação judicial — réu: João Ângelo Ávila Ção. Artigo 5º.');
    // This clean text with accents should not trigger PII
    expect(result.masking.findings.filter(f => f.category === 'cpf').length).toBe(0);
    expect(result.masking.findings.filter(f => f.category === 'cnpj').length).toBe(0);
  });

  it('does not mask numbers that are not PII (e.g. years, counts)', () => {
    const guard = makeGuard();
    const result = guard.inspect('Em 2024, foram registrados 1500 ocorrências no total.');
    expect(result.safe).toBe(true);
  });
});

describe('Infrastructure Secret Patterns — detectPII with INFRASTRUCTURE_SECRET_PATTERNS', () => {
  it('detects AWS Access Key', () => {
    const fakeAwsKey = 'AKIA' + 'IOSFODNN7EXAMPLE';
    const matches = detectPII(`key: ${fakeAwsKey}`, INFRASTRUCTURE_SECRET_PATTERNS);
    expect(matches.some(m => m.patternId === 'aws_key')).toBe(true);
    expect(matches[0].matched).toBe('AKIA' + 'IOSFODNN7EXAMPLE');
  });

  it('detects GitHub personal access token (ghp_)', () => {
    const fakeGhToken = 'ghp_' + 'aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890';
    const matches = detectPII(`token: ${fakeGhToken}`, INFRASTRUCTURE_SECRET_PATTERNS);
    expect(matches.some(m => m.patternId === 'github_token')).toBe(true);
  });

  it('detects Stripe live secret key', () => {
    const fakeStripe = ['sk', 'live', '51AbcDefGhIjKlMnOpQrStUv'].join('_');
    const matches = detectPII(`STRIPE_SECRET_KEY=${fakeStripe}`, INFRASTRUCTURE_SECRET_PATTERNS);
    expect(matches.some(m => m.patternId === 'stripe_key')).toBe(true);
  });

  it('detects PostgreSQL connection string with credentials', () => {
    // Dynamic construction to avoid GitGuardian false positives on literal credential strings
    const fakeDbUrl = ['postgres', '//admin', 's3cr3t@db.example.internal', '5432/app'].join(':');
    const matches = detectPII(fakeDbUrl, INFRASTRUCTURE_SECRET_PATTERNS);
    expect(matches.some(m => m.patternId === 'db_connection')).toBe(true);
  });

  it('detects api_key assignment in config', () => {
    const matches = detectPII("api_key = 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789'", INFRASTRUCTURE_SECRET_PATTERNS);
    expect(matches.some(m => m.patternId === 'api_key_assignment')).toBe(true);
  });

  it('detects PEM private key header', () => {
    const matches = detectPII('-----BEGIN RSA PRIVATE KEY-----', INFRASTRUCTURE_SECRET_PATTERNS);
    expect(matches.some(m => m.patternId === 'private_key')).toBe(true);
  });

  it('detects OpenSSH private key header', () => {
    const matches = detectPII('-----BEGIN OPENSSH PRIVATE KEY-----', INFRASTRUCTURE_SECRET_PATTERNS);
    expect(matches.some(m => m.patternId === 'private_key')).toBe(true);
  });

  it('does NOT flag normal text as a secret', () => {
    const matches = detectPII('O sistema está funcionando normalmente.', INFRASTRUCTURE_SECRET_PATTERNS);
    expect(matches).toHaveLength(0);
  });
});
