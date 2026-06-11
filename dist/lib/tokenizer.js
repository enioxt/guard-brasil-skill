/**
 * TokenizedRedaction — Reversible PII masking for Guard Brasil.
 *
 * Instead of destructive replacement ([CPF REMOVIDO]), replaces PII
 * with stable tokens ([PII:a1b2c3d4]) backed by an in-memory vault.
 * The vault allows restoring original values after AI processing.
 *
 * Usage:
 *   const { tokenized, vault } = tokenize(rawText);
 *   const aiResponse = await callAI(tokenized);   // safe to send
 *   const restored = restore(aiResponse, vault);  // original values back
 *
 * Security notes:
 *   - Vault is in-memory only — never persist it without encryption.
 *   - Token format: [PII:CATEGORY:8hexchars] — opaque to LLMs.
 *   - Same matched value always produces the same token (idempotent).
 */
import { createHash, randomBytes } from "crypto";
import { scanForPII } from "./pii-scanner.js";
/**
 * Generate a deterministic token for a given value + session seed.
 * Using HMAC-style: hash(seed || value) — same value same session = same token.
 */
function makeToken(category, value, seed) {
    const h = createHash("sha256")
        .update(seed)
        .update("|")
        .update(value)
        .digest("hex")
        .slice(0, 8);
    return `[PII:${category.toUpperCase()}:${h}]`;
}
/**
 * Tokenize PII in text. Returns tokenized text + vault needed for restoration.
 *
 * @param text   Input text that may contain PII
 * @param seed   Session seed for token generation (random per session by default)
 */
export function tokenize(text, seed) {
    const sessionSeed = seed ?? randomBytes(16).toString("hex");
    const findings = scanForPII(text);
    const vault = new TokenVault_();
    const result = { tokenized: text, vault: vault.toPlain(), findings: [] };
    if (findings.length === 0)
        return result;
    // Sort by position descending so we can replace without shifting indices
    const sorted = [...findings].sort((a, b) => b.start - a.start);
    let tokenized = text;
    const vaultMap = new Map();
    for (const f of sorted) {
        const original = text.slice(f.start, f.end);
        const token = makeToken(f.category, original, sessionSeed);
        vaultMap.set(token, original);
        tokenized = tokenized.slice(0, f.start) + token + tokenized.slice(f.end);
        result.findings.push({ token, category: f.category, label: f.label });
    }
    return {
        tokenized,
        vault: {
            tokens: vaultMap,
            createdAt: new Date().toISOString(),
            count: vaultMap.size,
        },
        findings: result.findings,
    };
}
/**
 * Restore original PII values from tokenized text using the vault.
 * Safe to call multiple times — non-destructive.
 *
 * @param text   Tokenized text (possibly with AI-modified surrounding text)
 * @param vault  The vault returned by tokenize()
 */
export function restore(text, vault) {
    let restored = text;
    for (const [token, original] of vault.tokens) {
        restored = restored.replaceAll(token, original);
    }
    return restored;
}
/**
 * Check if text contains any vault tokens (useful before calling restore).
 */
export function hasTokens(text, vault) {
    for (const token of vault.tokens.keys()) {
        if (text.includes(token))
            return true;
    }
    return false;
}
// Internal helper (avoids referencing the exported interface before it exists)
class TokenVault_ {
    toPlain() {
        return { tokens: new Map(), createdAt: new Date().toISOString(), count: 0 };
    }
}
/**
 * Readable reversible tokenization — DataVirtus-compatible format.
 *
 * Replaces each unique PII value with a numbered placeholder:
 *   "<cpf>"         → "[CPF_0001]"
 *   "<reds>"        → "[REDS_0001]"
 *
 * Same value always → same token (idempotent within a vault).
 * The vault maps tokens back to originals for restoration.
 *
 * Compatible with the Datavirtus anonymizer workflow:
 *   anon → send to LLM → restore with vault (offline, no API).
 */
export function namedTokenize(text) {
    const findings = scanForPII(text);
    const tokens = new Map();
    const reverse = new Map();
    const counters = {};
    const auditLog = [];
    if (findings.length === 0) {
        return { tokenized: text, vault: { tokens, reverse, createdAt: new Date().toISOString(), count: 0 }, findings: [] };
    }
    const sorted = [...findings].sort((a, b) => b.start - a.start);
    let tokenized = text;
    for (const f of sorted) {
        const original = text.slice(f.start, f.end);
        if (reverse.has(original)) {
            const existingToken = reverse.get(original);
            tokenized = tokenized.slice(0, f.start) + existingToken + tokenized.slice(f.end);
            continue;
        }
        const key = categoryToKey(f.category);
        counters[key] = (counters[key] ?? 0) + 1;
        const token = `[${key}_${String(counters[key]).padStart(4, '0')}]`;
        tokens.set(token, original);
        reverse.set(original, token);
        tokenized = tokenized.slice(0, f.start) + token + tokenized.slice(f.end);
        auditLog.push({ token, category: f.category, label: f.label });
    }
    return {
        tokenized,
        vault: { tokens, reverse, createdAt: new Date().toISOString(), count: tokens.size },
        findings: auditLog,
    };
}
/**
 * Restore original values from a namedTokenize vault.
 * Replaces all [KEY_NNNN] tokens with their original values.
 */
export function namedRestore(text, vault) {
    let restored = text;
    for (const [token, original] of vault.tokens) {
        restored = restored.replaceAll(token, original);
    }
    return restored;
}
const CATEGORY_KEY_MAP = {
    cpf: 'CPF',
    cnpj: 'CNPJ',
    rg: 'RG',
    cnh: 'CNH',
    masp: 'MASP',
    reds: 'REDS',
    process_number: 'IPL',
    plate: 'PLACA',
    phone: 'TEL',
    email: 'EMAIL',
    cep: 'CEP',
    health_data: 'SAUDE',
    name: 'NOME',
    date_of_birth: 'NASC',
    address: 'END',
};
function categoryToKey(category) {
    return CATEGORY_KEY_MAP[category] ?? category.toUpperCase().replace(/[^A-Z0-9]/g, '');
}
//# sourceMappingURL=tokenizer.js.map