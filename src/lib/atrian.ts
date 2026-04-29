export type ViolationLevel = 'info' | 'warning' | 'error' | 'critical';
export interface AtrianViolation { level: ViolationLevel; category: string; message: string; matched: string; }
export interface AtrianResult { passed: boolean; violations: AtrianViolation[]; score: number; }
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

export const DEFAULT_ABSOLUTE_CLAIM_PATTERNS = [
  /\b(com certeza|sem dúvida|indubitavelmente|incontestável|inequivocamente)\b/gi,
  /\b(sempre|nunca|todos os|nenhum)\b|(?<!\d)100%/gi,
  /\b(comprovadamente|cientificamente provado|fato consumado)\b/gi,
];
export const DEFAULT_FABRICATED_DATA_PATTERNS = [/\b(segundo (dados|pesquisas|estudos|estatísticas) (da|do|de))\b/gi, /\b(de acordo com (relatórios|levantamentos|números) (da|do|de))\b/gi];
export const DEFAULT_FALSE_PROMISE_PATTERNS = [/\b(vamos (resolver|encaminhar|garantir|providenciar))\b/gi, /\b(isso será (encaminhado|resolvido|tratado) (pelo|pela|por))\b/gi, /\b(providências (serão|já foram) tomadas)\b/gi];

const DEFAULT_DEDUCTIONS: Record<ViolationLevel, number> = { info: 2, warning: 5, error: 15, critical: 30 };
const DEFAULT_PRIVACY_CONTEXT = /nome|processo|cpf|rg|masp|dado|privacidade|anonimat/i;
const DEFAULT_ACRONYM_DEFINITION = /(\($|— $)/;
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const clonePattern = (pattern: RegExp) => new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);

function collectPatternViolations(text: string, patterns: RegExp[], build: (matched: string) => AtrianViolation, skip?: (index: number, matched: string) => boolean) {
  const violations: AtrianViolation[] = [];
  for (const pattern of patterns.map(clonePattern)) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) if (!skip?.(match.index, match[0])) violations.push(build(match[0]));
  }
  return violations;
}

function detectInventedAcronyms(text: string, knownAcronyms: Set<string>, acronymDefinitionPattern: RegExp) {
  const violations: AtrianViolation[] = [];
  const pattern = /\b([A-Z]{2,5})\b/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const acronym = match[1];
    const before = text.slice(Math.max(0, match.index - 80), match.index).slice(-5);
    if (!knownAcronyms.has(acronym) && !acronymDefinitionPattern.test(before)) violations.push({ level: 'warning', category: 'invented_acronym', message: `Possible invented acronym: "${acronym}"`, matched: acronym });
  }
  return violations;
}

export function createAtrianValidator(config: AtrianConfig = {}) {
  const deductions = { ...DEFAULT_DEDUCTIONS, ...config.deductions };
  const blockedEntities = config.blockedEntities ?? [];
  const knownAcronyms = new Set(config.knownAcronyms ?? []);
  const criticalBlocklistRegex = blockedEntities.length ? new RegExp(blockedEntities.map(escapeRegex).join('|'), 'gi') : null;
  const absoluteClaimPatterns = config.absoluteClaimPatterns ?? DEFAULT_ABSOLUTE_CLAIM_PATTERNS;
  const fabricatedDataPatterns = config.fabricatedDataPatterns ?? DEFAULT_FABRICATED_DATA_PATTERNS;
  const falsePromisePatterns = config.falsePromisePatterns ?? DEFAULT_FALSE_PROMISE_PATTERNS;
  const privacyContextPattern = config.privacyContextPattern ?? DEFAULT_PRIVACY_CONTEXT;
  const acronymDefinitionPattern = config.acronymDefinitionPattern ?? DEFAULT_ACRONYM_DEFINITION;

  function validateResponse(text: string): AtrianResult {
    const violations: AtrianViolation[] = [];
    for (const entity of blockedEntities) for (const matched of text.match(new RegExp(escapeRegex(entity), 'gi')) ?? []) violations.push({ level: 'critical', category: 'blocked_entity', message: `Blocked entity mentioned: "${entity}"`, matched });
    violations.push(...detectInventedAcronyms(text, knownAcronyms, acronymDefinitionPattern));
    violations.push(...collectPatternViolations(text, absoluteClaimPatterns, (matched) => ({ level: 'warning', category: 'absolute_claim', message: `Absolute claim without hedging: "${matched}"`, matched }), (index, matched) => privacyContextPattern.test(text.slice(Math.max(0, index - 40), index + matched.length + 40))));
    violations.push(...collectPatternViolations(text, fabricatedDataPatterns, (matched) => ({ level: 'error', category: 'fabricated_data', message: `Possible fabricated data reference: "${matched}"`, matched })));
    violations.push(...collectPatternViolations(text, falsePromisePatterns, (matched) => ({ level: 'error', category: 'false_promise', message: `False promise of action: "${matched}"`, matched })));
    const score = Math.max(0, 100 - violations.reduce((total, violation) => total + deductions[violation.level], 0));
    return { passed: !violations.some((violation) => violation.level === 'critical' || violation.level === 'error'), violations, score };
  }

  function validateAndReport(text: string): AtrianResult {
    const result = validateResponse(text);
    if (result.violations.length > 0) config.onViolation?.(result, text);
    return result;
  }

  function filterChunk(chunk: string) { return criticalBlocklistRegex ? chunk.replace(criticalBlocklistRegex, '***') : chunk; }
  return { validateResponse, validateAndReport, filterChunk };
}
