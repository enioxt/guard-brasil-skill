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
export declare const NER_RULES: readonly [{
    readonly id: "ner:A";
    readonly label: "Nome (campo explícito)";
    readonly pattern: RegExp;
}, {
    readonly id: "ner:B";
    readonly label: "Nome (honorífico)";
    readonly pattern: RegExp;
}, {
    readonly id: "ner:D";
    readonly label: "Nome (papel processual)";
    readonly pattern: RegExp;
}, {
    readonly id: "ner:E";
    readonly label: "Nome (assinatura)";
    readonly pattern: RegExp;
}, {
    readonly id: "ner:F";
    readonly label: "Nome (parentesco)";
    readonly pattern: RegExp;
}, {
    readonly id: "ner:G";
    readonly label: "Nome (parêntese após cargo)";
    readonly pattern: RegExp;
}, {
    readonly id: "ner:H";
    readonly label: "Nome (lista numerada)";
    readonly pattern: RegExp;
}, {
    readonly id: "ner:I";
    readonly label: "Nome (cargo policial)";
    readonly pattern: RegExp;
}, {
    readonly id: "ner:J";
    readonly label: "Nome (campo de parte)";
    readonly pattern: RegExp;
}];
/** Apply NER rules A–J to text and return PIIFindings (category = 'name'). */
export declare function applyNERRules(text: string): PIIFinding[];
//# sourceMappingURL=ner-rules.d.ts.map