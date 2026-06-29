#!/usr/bin/env bun
/**
 * build.ts — gera o bundle GLiNER (C2 nomes) de forma reprodutível.
 *
 *   cd tools/anonimizador-offline/c2-bundle && bun install && bun build.ts
 *
 * Produz ../vendor/gliner-bundle.mjs (gitignored, ~3MB, regenerável), que o
 * build.ts principal inlina no anonimizador-offline-pro.html.
 *
 * Alias OBRIGATÓRIO: '@xenova/transformers' → dist/transformers.js (build WEB).
 * O 'main' do pacote (src/transformers.js) importa fs/path reais → viram
 * undefined sob target browser → `isEmpty(undefined)` quebra. O dist web já
 * tem fs/path stubbados.
 */
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

const HERE = import.meta.dir;
const WEB_DIST = resolve(HERE, 'node_modules/@xenova/transformers/dist/transformers.js');
if (!existsSync(WEB_DIST)) {
  console.error('✗ node_modules ausente. Rode `bun install` primeiro nesta pasta.');
  process.exit(1);
}

const out = await Bun.build({
  entrypoints: [resolve(HERE, 'entry.mjs')],
  target: 'browser',
  format: 'esm',
  minify: false,
  plugins: [{
    name: 'alias-transformers-web',
    setup(build) {
      build.onResolve({ filter: /^@xenova\/transformers$/ }, () => ({ path: WEB_DIST }));
    },
  }],
});

if (!out.success) { for (const m of out.logs) console.error(m); process.exit(1); }
const code = await out.outputs[0].text();
const bare = (code.match(/^import .* from ['"](gliner|@xenova|onnxruntime|node:|fs|path|url)['"]/gm) || []);
if (bare.length) { console.error('✗ sobraram bare-imports (não auto-contido):', bare.slice(0, 5)); process.exit(1); }

const dest = resolve(HERE, '../vendor/gliner-bundle.mjs');
await Bun.write(dest, code);
console.log(`✓ ${dest} — ${(code.length / 1e6).toFixed(2)} MB (auto-contido, 0 bare-imports)`);
