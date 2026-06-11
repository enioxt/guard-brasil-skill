/**
 * PCMG Institution Profile
 * Polícia Civil de Minas Gerais — identifiers specific to the MG state system.
 *
 * MASP and REDS are already in Guard Brasil core.
 * This profile adds the remaining MG-specific formats not covered by built-ins.
 *
 * Status: v0.2.0 — HITL validated (2026-06-10, inline session review)
 * - 12 confirmations across 4 patterns | 0 false positives
 * - Regex improved: bo_numero covers no./bare format; inquerito fixed global-flag bug;
 *   reds_complemento covers REDS YYYY/ and REDSYYYY- separators.
 */
import type { InstitutionProfile } from './types.js';
export declare const PCMG_PROFILE: InstitutionProfile;
//# sourceMappingURL=pcmg.d.ts.map