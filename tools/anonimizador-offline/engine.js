/* ===================================================================
   engine.js — motor PII do Anonimizador Offline (JS puro, sem DOM).
   Fonte única: importado pelos testes E inlinado no HTML pelo build.ts.

   Base: apps/egos-landing/src/lib/guard-local.ts (SSOT pii-patterns.ts),
   estendido com validadores de dígito (CNH/PIS/CNS/Título) e
   tokenização reversível counter-based (estilo DataVirtus namedTokenize).
   =================================================================== */

// ─── Validadores de dígito ─────────────────────────────────────────
function onlyDigits(s) { return s.replace(/\D/g, ''); }

export function validateCPF(raw) {
  const d = onlyDigits(raw); if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;
  const calc = n => { let s = 0; for (let i = 0; i < n; i++) s += parseInt(d[i]) * (n + 1 - i); const r = (s * 10) % 11; return r === 10 || r === 11 ? 0 : r; };
  return calc(9) === parseInt(d[9]) && calc(10) === parseInt(d[10]);
}

export function validateCNPJ(raw) {
  const d = onlyDigits(raw); if (d.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(d)) return false;
  const calc = n => { const w = n === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2]; let s = 0; for (let i = 0; i < w.length; i++) s += parseInt(d[i]) * w[i]; const r = s % 11; return r < 2 ? 0 : 11 - r; };
  return calc(12) === parseInt(d[12]) && calc(13) === parseInt(d[13]);
}

// CNH — algoritmo oficial DENATRAN (2 dígitos verificadores)
export function validateCNH(raw) {
  const d = onlyDigits(raw); if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;
  let dsc = 0, v1 = 0, v2 = 0;
  for (let i = 0, j = 9; i < 9; i++, j--) v1 += parseInt(d[i]) * j;
  let dv1 = v1 % 11; if (dv1 >= 10) { dv1 = 0; dsc = 2; }
  for (let i = 0, j = 1; i < 9; i++, j++) v2 += parseInt(d[i]) * j;
  let dv2 = (v2 % 11) - dsc; if (dv2 < 0) dv2 += 11; if (dv2 >= 10) dv2 = 0;
  return dv1 === parseInt(d[9]) && dv2 === parseInt(d[10]);
}

// PIS/PASEP/NIS — peso [3,2,9,8,7,6,5,4,3,2], mod 11
export function validatePIS(raw) {
  const d = onlyDigits(raw); if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;
  const w = [3,2,9,8,7,6,5,4,3,2]; let s = 0;
  for (let i = 0; i < 10; i++) s += parseInt(d[i]) * w[i];
  let dv = 11 - (s % 11); if (dv >= 10) dv = 0;
  return dv === parseInt(d[10]);
}

// CNS (Cartão Nacional de Saúde) — soma ponderada *15..*1 múltiplo de 11
export function validateCNS(raw) {
  const d = onlyDigits(raw); if (d.length !== 15) return false;
  if (!/^[1-9]/.test(d)) return false;
  let s = 0; for (let i = 0; i < 15; i++) s += parseInt(d[i]) * (15 - i);
  return s % 11 === 0;
}

// Título de Eleitor — 12 dígitos, 2 DV (UF nas posições 9-10)
export function validateTituloEleitor(raw) {
  const d = onlyDigits(raw); if (d.length !== 12) return false;
  const uf = parseInt(d.slice(8, 10)); if (uf < 1 || uf > 28) return false;
  let s1 = 0; for (let i = 0; i < 8; i++) s1 += parseInt(d[i]) * (i + 2);
  let dv1 = s1 % 11; if (dv1 === 10) dv1 = 0;
  if (dv1 !== parseInt(d[10])) return false;
  let s2 = 0; for (let i = 8; i < 11; i++) s2 += parseInt(d[i]) * (i - 8 + 7);
  let dv2 = s2 % 11; if (dv2 === 10) dv2 = 0;
  return dv2 === parseInt(d[11]);
}

// ─── Definições de padrões ─────────────────────────────────────────
// Ordem importa: mais específico antes (processo antes de CPF/CNPJ etc.)
export const PATTERNS = [
  { id: 'processo', label: 'Processo Judicial', key: 'IPL',
    regex: /\b\d{7}[-.]?\d{2}[.]?\d{4}[.]?\d[.]?\d{2}[.]?\d{4}\b/g },
  { id: 'cnpj', label: 'CNPJ', key: 'CNPJ',
    regex: /\b\d{2}[.\s]?\d{3}[.\s]?\d{3}[/\s]?\d{4}[-.\s]?\d{2}\b/g, validate: validateCNPJ },
  { id: 'cpf', label: 'CPF', key: 'CPF',
    regex: /\b\d{3}[.\s-]?\d{3}[.\s-]?\d{3}[.\s/-]?\d{2}\b/g, validate: validateCPF },
  { id: 'cns', label: 'Cartão SUS', key: 'CNS',
    regex: /\b[1-9]\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\b/g, validate: validateCNS },
  { id: 'titulo', label: 'Título de Eleitor', key: 'TITULO',
    regex: /\b(?:(?:t[íi]tulo(?:\s+de\s+eleitor)?)[:\s]*)?\d{4}\s?\d{4}\s?\d{4}\b/gi, validate: validateTituloEleitor },
  { id: 'pis', label: 'PIS/NIS', key: 'PIS',
    regex: /\b\d{3}[.\s]?\d{5}[.\s]?\d{2}[.\s-]?\d\b/g, validate: validatePIS },
  { id: 'cnh', label: 'CNH', key: 'CNH',
    regex: /\b(?:CNH|cnh|Cnh|habilita[çc][ãa]o)[:\s nº°]*\d{11}\b/gi },
  { id: 'rg', label: 'RG', key: 'RG',
    regex: /(?:(?:RG|rg|Rg|Registro\s+Geral|registro\s+geral)[\s:nº°.]*(?:[A-Z]{2}[\s-]?)?\d{1,2}[.\s]?\d{3}[.\s]?\d{3}[.\s-]?\d?|\b\d{1,2}\.\d{3}\.\d{3}-\d\b)/gi },
  { id: 'email', label: 'E-mail', key: 'EMAIL',
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  { id: 'telefone', label: 'Telefone', key: 'TEL',
    // (?<!\d) em vez de \b: o \b empurrava o início pra depois do '(' em "(34) 9..."
    // deixando o parêntese solto. Lookbehind permite capturar o '(' e o +55.
    regex: /(?<!\d)(?:\+55\s?)?\(?\d{2}\)?\s?\d{4,5}[-.\s]?\d{4}(?!\d)/g },
  { id: 'masp', label: 'MASP', key: 'MASP',
    regex: /\b(?:MASP|masp|Masp)[:\s]*\d{1,3}[.\s]?\d{3,5}[.\s-]?\d{0,2}\b/gi },
  { id: 'reds', label: 'REDS', key: 'REDS',
    regex: /\b(?:REDS|reds|Reds)[:\s]*\d{4,}[-./]?\d{0,}\b/gi },
  { id: 'placa_mercosul', label: 'Placa Veicular', key: 'PLACA',
    regex: /\b[A-Z]{3}\d[A-Z]\d{2}\b/gi },
  { id: 'placa_antiga', label: 'Placa Veicular', key: 'PLACA',
    regex: /\b[A-Z]{3}[-\s]?\d{4}(?![-\d/])/gi },
  { id: 'cep', label: 'CEP', key: 'CEP',
    regex: /\b\d{5}[-.\s]?\d{3}\b/g },
];

// ─── Detecção ──────────────────────────────────────────────────────
function cloneRegex(re) { const f = re.flags.includes('g') ? re.flags : re.flags + 'g'; return new RegExp(re.source, f); }

export function detectPII(text) {
  const matches = [];
  for (const c of PATTERNS) {
    const re = cloneRegex(c.regex); let m;
    while ((m = re.exec(text)) !== null) {
      if (c.validate && !c.validate(m[0])) continue;
      matches.push({ patternId: c.id, label: c.label, key: c.key, matched: m[0], start: m.index, end: m.index + m[0].length });
    }
  }
  // dedup — primeiro a aparecer / mais longo vence
  const sorted = matches.slice().sort((a, b) => a.start - b.start || b.end - a.end);
  const out = []; let lastEnd = -1;
  for (const m of sorted) { if (m.start >= lastEnd) { out.push(m); lastEnd = m.end; } }
  return out;
}

// ─── Tokenização reversível (counter-based, sem crypto) ────────────
// Aceita matches externos (ex.: GLiNER para NOMES) via opts.extraMatches.
export function tokenize(text, opts = {}) {
  let matches = detectPII(text);
  if (opts.extraMatches && opts.extraMatches.length) {
    // funde matches externos respeitando dedup por posição (regex vence em sobreposição)
    const all = matches.concat(opts.extraMatches.map(e => ({
      patternId: e.patternId || 'ext', label: e.label || 'Externo', key: e.key || 'NOME',
      matched: text.slice(e.start, e.end), start: e.start, end: e.end,
    })));
    const sorted = all.slice().sort((a, b) => a.start - b.start || b.end - a.end);
    const dedup = []; let lastEnd = -1;
    for (const m of sorted) { if (m.start >= lastEnd) { dedup.push(m); lastEnd = m.end; } }
    matches = dedup;
  }
  const tokens = {}, reverse = {}, counters = {}, findings = [];
  if (matches.length === 0) return { tokenized: text, vault: { tokens: {}, meta: { count: 0 } }, findings: [] };
  const sorted = matches.slice().sort((a, b) => b.start - a.start);
  let out = text;
  for (const f of sorted) {
    const original = text.slice(f.start, f.end);
    let token;
    if (reverse[original]) { token = reverse[original]; }
    else {
      counters[f.key] = (counters[f.key] || 0) + 1;
      token = '[' + f.key + '_' + String(counters[f.key]).padStart(4, '0') + ']';
      tokens[token] = original; reverse[original] = token;
      findings.push({ token, label: f.label });
    }
    out = out.slice(0, f.start) + token + out.slice(f.end);
  }
  return { tokenized: out, vault: { tokens, meta: { count: Object.keys(tokens).length, createdAt: new Date().toISOString() } }, findings };
}

export function restore(text, vault) {
  let out = text; let n = 0;
  const keys = Object.keys(vault.tokens).sort((a, b) => b.length - a.length); // mais longo primeiro
  for (const t of keys) {
    const before = out; out = out.split(t).join(vault.tokens[t]);
    if (out !== before) n++;
  }
  return { text: out, replaced: n };
}
