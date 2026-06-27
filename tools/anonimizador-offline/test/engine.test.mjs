/* Suíte ampla do motor — roda com: node test/engine.test.mjs
   Sem framework: assert simples, conta passes/fails, exit 1 se falhar. */
import {
  detectPII, tokenize, restore,
  validateCPF, validateCNPJ, validateCNH, validatePIS, validateCNS, validateTituloEleitor,
} from '../engine.js';

let pass = 0, fail = 0;
const fails = [];
function ok(cond, msg) { if (cond) pass++; else { fail++; fails.push(msg); } }
function eq(a, b, msg) { ok(a === b, `${msg} — esperado ${JSON.stringify(b)}, veio ${JSON.stringify(a)}`); }

// fixtures válidos por dígito (sintéticos)
const CPF = '529.982.247-25';          // CPF de teste canônico válido
const CPF2 = '10000000280';
const CNPJ = '10.000.000/0010-36';     // 10000000001036 válido
const CNH = '10000000091';
const PIS = '100.00000.09-1';          // 10000000091 válido como PIS
const CNS = '100 0000 0000 0007';      // 100000000000007 válido
const TITULO = '1000 0000 0329';       // 100000000329 válido

// ── validadores: válidos passam, inválidos falham ──
ok(validateCPF(CPF), 'CPF válido passa');
ok(!validateCPF('111.111.111-11'), 'CPF repetido falha');
ok(!validateCPF('123.456.789-00'), 'CPF checksum errado falha');
ok(validateCNPJ(CNPJ), 'CNPJ válido passa');
ok(!validateCNPJ('11.111.111/1111-11'), 'CNPJ repetido falha');
ok(validateCNH(CNH), 'CNH válida passa');
ok(!validateCNH('11111111111'), 'CNH repetida falha');
ok(validatePIS(PIS.replace(/\D/g,'')), 'PIS válido passa');
ok(!validatePIS('12345678901'), 'PIS errado falha');
ok(validateCNS(CNS.replace(/\D/g,'')), 'CNS válido passa');
ok(!validateCNS('123456789012345'), 'CNS errado falha');
ok(validateTituloEleitor(TITULO.replace(/\D/g,'')), 'Título válido passa');
ok(!validateTituloEleitor('123456789012'), 'Título errado falha');

// ── detecção por tipo ──
function detectKeys(text) { return detectPII(text).map(m => m.key); }
ok(detectKeys(`CPF ${CPF}`).includes('CPF'), 'detecta CPF');
ok(detectKeys(`CNPJ ${CNPJ}`).includes('CNPJ'), 'detecta CNPJ');
ok(detectKeys(`CNH ${CNH}`).includes('CNH'), 'detecta CNH (com palavra-chave)');
ok(detectKeys(`título de eleitor ${TITULO}`).includes('TITULO'), 'detecta Título');
ok(detectKeys(`cartão sus ${CNS}`).includes('CNS'), 'detecta CNS');
ok(detectKeys(`MASP 123.456-7`).includes('MASP'), 'detecta MASP');
ok(detectKeys(`REDS: 2024-12345678`).includes('REDS'), 'detecta REDS');
ok(detectKeys(`Processo 0001234-56.2024.8.13.0024`).includes('IPL'), 'detecta Processo');
ok(detectKeys(`placa ABC1D23`).includes('PLACA'), 'detecta Placa Mercosul');
ok(detectKeys(`placa XYZ-4567`).includes('PLACA'), 'detecta Placa antiga');
ok(detectKeys(`email joao@exemplo.com`).includes('EMAIL'), 'detecta E-mail');
ok(detectKeys(`tel (31) 98765-4321`).includes('TEL'), 'detecta Telefone');
ok(detectKeys(`CEP 30130-100`).includes('CEP'), 'detecta CEP');
ok(detectKeys(`RG 12.345.678-9`).includes('RG'), 'detecta RG');

// ── não-falso-positivo: número inválido NÃO vira CPF/CNPJ ──
ok(!detectKeys(`pagamento de 111.111.111-11 reais`).includes('CPF'), 'CPF inválido não vira match');

// ── round-trip: anonimiza → restaura ──
{
  const src = `Vítima CPF ${CPF}, placa ABC1D23, REDS 2024-55667788, tel (31) 98765-4321.`;
  const { tokenized, vault } = tokenize(src);
  ok(!tokenized.includes(CPF), 'CPF não vaza no texto anonimizado');
  ok(tokenized.includes('[CPF_0001]'), 'CPF vira token');
  const aiResp = `Conclusão: o dono de [PLACA_0001] é [CPF_0001], contato [TEL_0001].`;
  const { text: restored, replaced } = restore(aiResp, vault);
  ok(restored.includes(CPF), 'restore recupera CPF');
  ok(restored.includes('ABC1D23'), 'restore recupera placa');
  ok(!restored.includes('[CPF_0001]'), 'nenhum token sobra após restore');
  eq(replaced, 3, 'restore conta 3 tokens substituídos');
}

// ── idempotência: mesmo valor → mesmo token, conta 1× ──
{
  const src = `${CPF} e de novo ${CPF} e ainda ${CPF}`;
  const { tokenized, vault } = tokenize(src);
  eq(vault.meta.count, 1, 'mesmo CPF 3× = 1 entrada no vault');
  eq((tokenized.match(/\[CPF_0001\]/g) || []).length, 3, 'mesmo token aplicado 3×');
}

// ── texto sem PII ──
{
  const { tokenized, vault } = tokenize('Relatório sem dados pessoais, apenas texto comum.');
  eq(vault.meta.count, 0, 'sem PII = vault vazio');
  eq(tokenized, 'Relatório sem dados pessoais, apenas texto comum.', 'texto inalterado sem PII');
}

// ── extraMatches (simula GLiNER detectando NOME) ──
{
  const src = `O suspeito João da Silva tem CPF ${CPF}.`;
  const nameStart = src.indexOf('João da Silva');
  const extra = [{ key: 'NOME', label: 'Nome', start: nameStart, end: nameStart + 'João da Silva'.length }];
  const { tokenized, vault } = tokenize(src, { extraMatches: extra });
  ok(tokenized.includes('[NOME_0001]'), 'NOME externo (GLiNER) vira token');
  ok(tokenized.includes('[CPF_0001]'), 'CPF do regex coexiste com NOME do GLiNER');
  ok(!tokenized.includes('João da Silva'), 'nome não vaza');
  const { text: restored } = restore(tokenized, vault);
  eq(restored, src, 'round-trip híbrido (regex+GLiNER) recupera original exato');
}

// ── overlap: processo não deve ser fatiado em CPF ──
{
  const src = `Processo 0001234-56.2024.8.13.0024 distribuído.`;
  const keys = detectKeys(src);
  ok(keys.includes('IPL'), 'processo detectado como IPL');
  ok(!keys.includes('CPF'), 'processo não é fatiado em CPF');
}

console.log(`\n${fail === 0 ? '✅' : '❌'} engine.test: ${pass} passaram, ${fail} falharam`);
if (fail) { console.log('FALHAS:'); fails.forEach(f => console.log('  - ' + f)); process.exit(1); }
