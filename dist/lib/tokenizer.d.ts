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
export interface TokenVault {
    /** token → original value */
    tokens: Map<string, string>;
    /** Created timestamp (ISO 8601) */
    createdAt: string;
    /** Number of unique values redacted */
    count: number;
}
export interface TokenizedResult {
    /** Text with PII replaced by tokens */
    tokenized: string;
    /** Vault for restoration — keep this in-memory, never log it */
    vault: TokenVault;
    /** Findings for audit trail (no original values included) */
    findings: Array<{
        token: string;
        category: string;
        label: string;
    }>;
}
/**
 * Tokenize PII in text. Returns tokenized text + vault needed for restoration.
 *
 * @param text   Input text that may contain PII
 * @param seed   Session seed for token generation (random per session by default)
 */
export declare function tokenize(text: string, seed?: string): TokenizedResult;
/**
 * Restore original PII values from tokenized text using the vault.
 * Safe to call multiple times — non-destructive.
 *
 * @param text   Tokenized text (possibly with AI-modified surrounding text)
 * @param vault  The vault returned by tokenize()
 */
export declare function restore(text: string, vault: TokenVault): string;
/**
 * Check if text contains any vault tokens (useful before calling restore).
 */
export declare function hasTokens(text: string, vault: TokenVault): boolean;
//# sourceMappingURL=tokenizer.d.ts.map