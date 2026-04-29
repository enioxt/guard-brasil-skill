export type ViolationLevel = 'info' | 'warning' | 'error' | 'critical';
export interface AtrianViolation {
    level: ViolationLevel;
    category: string;
    message: string;
    matched: string;
}
export interface AtrianResult {
    passed: boolean;
    violations: AtrianViolation[];
    score: number;
}
export interface AtrianConfig {
    blockedEntities?: string[];
    knownAcronyms?: Iterable<string>;
    absoluteClaimPatterns?: RegExp[];
    fabricatedDataPatterns?: RegExp[];
    falsePromisePatterns?: RegExp[];
    privacyContextPattern?: RegExp;
    acronymDefinitionPattern?: RegExp;
    deductions?: Partial<Record<ViolationLevel, number>>;
    onViolation?: (result: AtrianResult, text: string) => void;
}
export declare const DEFAULT_ABSOLUTE_CLAIM_PATTERNS: RegExp[];
export declare const DEFAULT_FABRICATED_DATA_PATTERNS: RegExp[];
export declare const DEFAULT_FALSE_PROMISE_PATTERNS: RegExp[];
export declare function createAtrianValidator(config?: AtrianConfig): {
    validateResponse: (text: string) => AtrianResult;
    validateAndReport: (text: string) => AtrianResult;
    filterChunk: (chunk: string) => string;
};
//# sourceMappingURL=atrian.d.ts.map