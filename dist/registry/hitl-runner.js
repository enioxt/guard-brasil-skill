#!/usr/bin/env bun
/**
 * HITL Runner — revisão inline dos padrões PCMG
 *
 * Uso:
 *   bun packages/guard-brasil/src/registry/hitl-runner.ts --profile pcmg
 *
 * Fluxo:
 *   1. Roda scanForPII com PCMG_PROFILE em cada frase do corpus
 *   2. Imprime cada match com contexto
 *   3. Aguarda input do revisor (s/n/p=parcial) via stdin
 *   4. Grava resultado em /tmp/hitl-session-<timestamp>.json
 *
 * O Prime aplica o JSON ao pcmg.ts e commita.
 * ZERO dado real — corpus 100% sintético.
 */
import { PCMG_CORPUS } from './pcmg-corpus.js';
import { PCMG_PROFILE } from './pcmg.js';
import { scanForPII } from '../lib/pii-scanner.js';
function patternToDefinition(p) {
    return {
        category: p.id,
        label: p.label,
        pattern: p.regex,
        suggestion: p.maskFormat,
    };
}
function highlight(text, matched) {
    return text.replace(matched, `>>>>${matched}<<<<`);
}
async function run() {
    const profile = PCMG_PROFILE;
    const extraPatterns = profile.patterns.map(patternToDefinition);
    const results = [];
    let matchCount = 0;
    let falsePositiveCount = 0;
    console.log(`\n═══════════════════════════════════════════════════════`);
    console.log(`  Guard Brasil HITL — Perfil: ${profile.name}`);
    console.log(`  Corpus: ${PCMG_CORPUS.length} frases | Padrões: ${profile.patterns.length}`);
    console.log(`  Resposta: s = correto (PII) | n = falso positivo | p = parcial`);
    console.log(`═══════════════════════════════════════════════════════\n`);
    for (const entry of PCMG_CORPUS) {
        const findings = scanForPII(entry.text, { extraPatterns });
        const relevant = findings.filter(f => String(f.category) === entry.patternId);
        if (relevant.length === 0) {
            if (entry.shouldMatch) {
                console.log(`⚠️  [FALSO NEGATIVO] ${entry.id} | Padrão: ${entry.patternId}`);
                console.log(`   Texto: "${entry.text}"`);
                console.log(`   Não detectado — regex pode precisar de ajuste.\n`);
                results.push({
                    patternId: entry.patternId,
                    corpusId: entry.id,
                    matchedText: '',
                    fullText: entry.text,
                    shouldMatch: true,
                    reviewerDecision: 'rejected',
                    note: 'FALSO NEGATIVO — regex não capturou',
                });
            }
            continue;
        }
        for (const finding of relevant) {
            matchCount++;
            const isExpected = entry.shouldMatch;
            console.log(`─── Match ${matchCount} ─────────────────────────────────────`);
            console.log(`  Padrão : ${entry.patternId}`);
            console.log(`  Corpus : ${entry.id}${entry.note ? ' (' + entry.note + ')' : ''}`);
            console.log(`  Texto  : ${highlight(entry.text, finding.matched)}`);
            console.log(`  Capturado: "${finding.matched}"`);
            console.log(`  Esperado: ${isExpected ? '✅ deve capturar' : '❌ NÃO deve capturar'}`);
            console.log(`  Este trecho é PII/identificador real? (s/n/p): `);
            const answer = await readLine();
            const decision = answer === 's' ? 'confirmed'
                : answer === 'p' ? 'partial'
                    : answer === 'n' ? 'rejected'
                        : 'skipped';
            if (decision === 'rejected' && isExpected)
                falsePositiveCount++;
            results.push({
                patternId: entry.patternId,
                corpusId: entry.id,
                matchedText: finding.matched,
                fullText: entry.text,
                shouldMatch: isExpected,
                reviewerDecision: decision,
                note: entry.note,
            });
            console.log(`  → Registrado: ${decision}\n`);
        }
    }
    const sessionFile = `/tmp/hitl-session-${Date.now()}.json`;
    const summary = {
        profile: profile.id,
        runAt: new Date().toISOString(),
        totalMatches: matchCount,
        confirmed: results.filter(r => r.reviewerDecision === 'confirmed').length,
        rejected: results.filter(r => r.reviewerDecision === 'rejected').length,
        partial: results.filter(r => r.reviewerDecision === 'partial').length,
        falsePositives: falsePositiveCount,
        results,
    };
    await Bun.write(sessionFile, JSON.stringify(summary, null, 2));
    console.log(`\n═══════════════════════════════════════════════════════`);
    console.log(`  Revisão concluída`);
    console.log(`  Total matches : ${matchCount}`);
    console.log(`  Confirmados   : ${summary.confirmed}`);
    console.log(`  Rejeitados    : ${summary.rejected}`);
    console.log(`  Parciais      : ${summary.partial}`);
    console.log(`  Falsos pos.   : ${falsePositiveCount}`);
    console.log(`  Sessão salva  : ${sessionFile}`);
    console.log(`═══════════════════════════════════════════════════════\n`);
    console.log(`Próximo passo: passar o JSON ao Prime para aplicar os hitlStats em pcmg.ts`);
}
function readLine() {
    return new Promise(resolve => {
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        let data = '';
        process.stdin.once('data', chunk => {
            data += chunk;
            process.stdin.pause();
            resolve(data.trim().toLowerCase() || 's');
        });
    });
}
run().catch(e => {
    console.error('HITL runner error:', e);
    process.exit(1);
});
//# sourceMappingURL=hitl-runner.js.map