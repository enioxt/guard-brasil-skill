export type PIICategory = 'cpf' | 'rg' | 'masp' | 'phone' | 'email' | 'reds' | 'process_number' | 'name' | 'address' | 'plate' | 'date_of_birth' | 'cnpj' | 'cnh' | 'cep' | 'health_data';
export interface PIIFinding {
    category: PIICategory;
    label: string;
    matched: string;
    start: number;
    end: number;
    suggestion: string;
}
export interface PIIPatternDefinition {
    category: PIICategory;
    label: string;
    pattern: RegExp;
    suggestion: string;
}
/** Default PII patterns derived from the centralized pii-patterns.ts registry */
export declare const DEFAULT_PII_PATTERNS: PIIPatternDefinition[];
export declare function scanForPII(text: string, options?: {
    patterns?: PIIPatternDefinition[];
    extraPatterns?: PIIPatternDefinition[];
    namePattern?: RegExp;
    useNERRules?: boolean;
}): PIIFinding[];
export declare function sanitizeText(text: string, findings: PIIFinding[]): string;
export declare function getPIISummary(findings: PIIFinding[]): string;
//# sourceMappingURL=pii-scanner.d.ts.map