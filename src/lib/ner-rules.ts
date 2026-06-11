/**
 * NER Rules for Guard Brasil — Brazilian police/legal document context (MG focus)
 *
 * 10 heuristic rules (A–J) for name detection in structured police documents.
 * Ported and expanded from Datavirtus anonymizer regras A–J (Python) to TypeScript.
 * All patterns are safe to clone (no lastIndex mutation) via clonePattern().
 *
 * Usage:
 *   import { NER_RULES, applyNERRules } from './ner-rules.js';
 *   const findings = applyNERRules(text);
 */

import type { PIIFinding } from './pii-scanner.js';

/** Capture group 1 = the name token in all patterns below */

const cloneRe = (re: RegExp) => new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');

// A — Explicit field labels: "Nome:", "Nome Completo:", "Nome do Suspeito:", etc.
const RULE_A = /(?:[Nn]ome(?:\s+[Cc]ompleto)?|[Nn]ome\s+d[oa]\s+(?:[Ss]uspeito|[Ii]nvestigado|[Pp]aciente|[Cc]onduzido|[Vv][íi]tima|[Cc]liente|[Uu]su[aá]rio|[Rr]espons[aá]vel))\s*:?\s+([A-ZÁÉÍÓÚÃÕÂÊÎÔÛÀÈÌÒÙÄËÏÖÜÇ][a-záéíóúãõâêîôûàèìòùäëïöüç]+(?:\s+(?:d[aeo]\s+)?[A-ZÁÉÍÓÚÃÕÂÊÎÔÛÀÈÌÒÙÄËÏÖÜÇ][a-záéíóúãõâêîôûàèìòùäëïöüç]+){1,5})/g;

// B — Honorifics: "Sr.", "Sra.", "Dr.", "Dra.", "Prof.", "Del."
const RULE_B = /\b(?:Sr\.|Sra\.|Srta\.|Dr\.|Dra\.|Prof\.?|Profa\.?|Del\.|Esc\.|Ag\.)\s+([A-ZÁÉÍÓÚÃÕÂÊÎÔÛÀÈÌÒÙÄËÏÖÜÇ][a-záéíóúãõâêîôûàèìòùäëïöüç]+(?:\s+(?:d[aeo]\s+)?[A-ZÁÉÍÓÚÃÕÂÊÎÔÛÀÈÌÒÙÄËÏÖÜÇ][a-záéíóúãõâêîôûàèìòùäëïöüç]+){1,5})\b/g;

// C — ALL-CAPS proper names (common in police headers: "FULANO DE TAL")
// Min 2 words, max 5, at least 2 chars each, ignores common ALL-CAPS non-names
const NER_C_STOP = new Set(['CPF', 'RG', 'CNH', 'MASP', 'REDS', 'IPL', 'BO', 'CEP', 'SUS', 'NIS', 'PIS', 'TJMG', 'PCMG', 'CBMMG', 'DETRAN', 'SESP', 'SJSP', 'MG', 'SP', 'RJ', 'DF', 'BR', 'SA', 'ME', 'EPP', 'LTDA', 'SS']);
const RULE_C_RAW = /\b([A-ZÁÉÍÓÚÃÕÂÊÎÔÛ]{2,}(?:\s+(?:D[AEO]\s+)?[A-ZÁÉÍÓÚÃÕÂÊÎÔÛ]{2,}){1,4})\b/g;

// D — Party roles in police/court docs
const RULE_D = /\b(?:[Tt]estemunha|[Vv][íi]tima|[Cc]onduzido|[Pp]reso|[Aa]utuado|[Ii]nvestigado|[Aa]cusado|[Dd]enunciado|[Ii]ndiciado|[Qq]uerente|[Qq]uerido|[Aa]utor|[Rr][eé]u|[Rr][eé]|[Ee]nvolvido|[Ss]uspeito)\s*[:\-–]\s*([A-ZÁÉÍÓÚÃÕÂÊÎÔÛÀÈÌÒÙÄËÏÖÜÇ][a-záéíóúãõâêîôûàèìòùäëïöüç]+(?:\s+(?:d[aeo]\s+)?[A-ZÁÉÍÓÚÃÕÂÊÎÔÛÀÈÌÒÙÄËÏÖÜÇ][a-záéíóúãõâêîôûàèìòùäëïöüç]+){1,5})\b/g;

// E — Signature blocks
const RULE_E = /(?:[Aa]ssinado\s+(?:por|digital(?:mente)?|eletronicamente)\s*:?\s*|[Aa]ssinatura\s*:?\s*|[Rr]espons[aá]vel\s+técnico\s*:?\s*)([A-ZÁÉÍÓÚÃÕÂÊÎÔÛÀÈÌÒÙÄËÏÖÜÇ][a-záéíóúãõâêîôûàèìòùäëïöüç]+(?:\s+(?:d[aeo]\s+)?[A-ZÁÉÍÓÚÃÕÂÊÎÔÛÀÈÌÒÙÄËÏÖÜÇ][a-záéíóúãõâêîôûàèìòùäëïöüç]+){1,5})/g;

// F — Kinship references: "filho de Fulano", "esposa de Fulana"
const RULE_F = /\b(?:[Ff]ilho|[Ff]ilha|[Cc][oô]njuge|[Ee]sposo|[Ee]sposa|[Gg]enitor|[Gg]enitora|[Nn]eto|[Nn]eta|[Ii]rm[aã]o?|[Pp]ai|[Mm][aã]e)\s+d[aeo]\s+([A-ZÁÉÍÓÚÃÕÂÊÎÔÛÀÈÌÒÙÄËÏÖÜÇ][a-záéíóúãõâêîôûàèìòùäëïöüç]+(?:\s+(?:d[aeo]\s+)?[A-ZÁÉÍÓÚÃÕÂÊÎÔÛÀÈÌÒÙÄËÏÖÜÇ][a-záéíóúãõâêîôûàèìòùäëïöüç]+){1,5})\b/gi;

// G — Names in parentheses after a role token
const RULE_G = /\b(?:delegad[oa]|escriv[aã]o?|comiss[aá]rio|perito|agente|servidor|investigador)\s+\(([A-ZÁÉÍÓÚÃÕÂÊÎÔÛÀÈÌÒÙÄËÏÖÜÇ][a-záéíóúãõâêîôûàèìòùäëïöüç]+(?:\s+(?:d[aeo]\s+)?[A-ZÁÉÍÓÚÃÕÂÊÎÔÛÀÈÌÒÙÄËÏÖÜÇ][a-záéíóúãõâêîôûàèìòùäëïöüç]+){1,5})\)/g;

// H — Numbered/bulleted witness/party lists (multiline)
const RULE_H = /^[ \t]*(?:\d+[.\):]|-|\*|•)\s+([A-ZÁÉÍÓÚÃÕÂÊÎÔÛÀÈÌÒÙÄËÏÖÜÇ][a-záéíóúãõâêîôûàèìòùäëïöüç]+(?:\s+(?:d[aeo]\s+)?[A-ZÁÉÍÓÚÃÕÂÊÎÔÛÀÈÌÒÙÄËÏÖÜÇ][a-záéíóúãõâêîôûàèìòùäëïöüç]+){1,5})[ \t]*$/gm;

// I — Police/law enforcement role prefixes (extends DEFAULT_NAME_PATTERN in pii-scanner)
const RULE_I = /\b(?:delegad[oa]|chefe|colega|servidor|investigador|escriv[aã]o?|comiss[aá]rio|perito|agente|policial|oficial|inspetor|subtenente|sargento|cabo|soldado)\s*:?\s+([A-ZÁÉÍÓÚÃÕÂÊÎÔÛÀÈÌÒÙÄËÏÖÜÇ][a-záéíóúãõâêîôûàèìòùäëïöüç]+(?:\s+(?:d[aeo]\s+)?[A-ZÁÉÍÓÚÃÕÂÊÎÔÛÀÈÌÒÙÄËÏÖÜÇ][a-záéíóúãõâêîôûàèìòùäëïöüç]+){1,5})\b/gi;

// J — "Paciente", "Requerente", "Requerido", "Titular", "Interessado" label fields
const RULE_J = /\b(?:[Pp]aciente|[Cc]liente|[Rr]espons[aá]vel|[Rr]equerente|[Rr]equerido|[Dd]etentor|[Pp]ortador|[Tt]itular|[Ii]nteressado|[Rr]epresentante\s+legal)\s*:?\s+([A-ZÁÉÍÓÚÃÕÂÊÎÔÛÀÈÌÒÙÄËÏÖÜÇ][a-záéíóúãõâêîôûàèìòùäëïöüç]+(?:\s+(?:d[aeo]\s+)?[A-ZÁÉÍÓÚÃÕÂÊÎÔÛÀÈÌÒÙÄËÏÖÜÇ][a-záéíóúãõâêîôûàèìòùäëïöüç]+){1,5})\b/g;

export const NER_RULES = [
  { id: 'ner:A', label: 'Nome (campo explícito)', pattern: RULE_A },
  { id: 'ner:B', label: 'Nome (honorífico)', pattern: RULE_B },
  { id: 'ner:D', label: 'Nome (papel processual)', pattern: RULE_D },
  { id: 'ner:E', label: 'Nome (assinatura)', pattern: RULE_E },
  { id: 'ner:F', label: 'Nome (parentesco)', pattern: RULE_F },
  { id: 'ner:G', label: 'Nome (parêntese após cargo)', pattern: RULE_G },
  { id: 'ner:H', label: 'Nome (lista numerada)', pattern: RULE_H },
  { id: 'ner:I', label: 'Nome (cargo policial)', pattern: RULE_I },
  { id: 'ner:J', label: 'Nome (campo de parte)', pattern: RULE_J },
] as const;

/** Apply NER rules A–J to text and return PIIFindings (category = 'name'). */
export function applyNERRules(text: string): PIIFinding[] {
  const findings: PIIFinding[] = [];

  for (const { id: _id, label, pattern } of NER_RULES) {
    const re = cloneRe(pattern);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const name = m[1];
      if (!name || name.length < 4) continue;
      const nameStart = m.index + m[0].indexOf(name);
      findings.push({
        category: 'name',
        label,
        matched: name,
        start: nameStart,
        end: nameStart + name.length,
        suggestion: '[NOME REMOVIDO]',
      });
    }
  }

  // Rule C: ALL-CAPS sequences, filtered against known acronyms
  const reC = cloneRe(RULE_C_RAW);
  let mC: RegExpExecArray | null;
  while ((mC = reC.exec(text)) !== null) {
    const candidate = mC[1];
    const words = candidate.split(/\s+/);
    // Must have ≥2 words, none of which are known acronyms
    if (words.length < 2 || words.some(w => NER_C_STOP.has(w))) continue;
    findings.push({
      category: 'name',
      label: 'Nome (maiúsculas)',
      matched: candidate,
      start: mC.index,
      end: mC.index + candidate.length,
      suggestion: '[NOME REMOVIDO]',
    });
  }

  return findings;
}
