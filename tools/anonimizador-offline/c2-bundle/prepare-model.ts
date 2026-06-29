#!/usr/bin/env bun
/**
 * prepare-model.ts — monta a PASTA DO MODELO (C2 nomes) que o usuário aponta
 * no "modo avançado" do anonimizador-offline-pro.html.
 *
 *   cd tools/anonimizador-offline/c2-bundle && bun install && bun prepare-model.ts
 *
 * Produz ../dist/modelo-nomes/ (gitignored, ~360MB) com 5 arquivos (basename
 * único — o picker indexa por basename):
 *   tokenizer.json · tokenizer_config.json · model_quantized.onnx
 *   ort-wasm-simd-threaded.wasm · ort-wasm-simd-threaded.mjs
 *
 * Fontes canônicas (licenças livres):
 *   - Modelo+tokenizer: HuggingFace `onnx-community/gliner_multi_pii-v1` (Apache-2.0)
 *   - WASM do runtime: pacote npm `onnxruntime-web` (instalado via gliner, MIT)
 *
 * Reaproveita cache local (gliner-probe/local-models, ../gliner-probe/model.onnx)
 * se existir — evita rebaixar 349MB. Senão baixa do HF.
 */
import { existsSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const HERE = import.meta.dir;
const OUT = resolve(HERE, '../dist/modelo-nomes');
const HF = 'https://huggingface.co/onnx-community/gliner_multi_pii-v1/resolve/main';
const PROBE = resolve(HERE, '../gliner-probe'); // cache local opcional (gitignored)
// ort do MESMO build que o bundle usa (gliner→onnxruntime-web@1.19.2). Pode estar
// hoisted no topo ou aninhado em gliner — tenta ambos.
const ORT_CANDS = [
  resolve(HERE, 'node_modules/onnxruntime-web/dist'),
  resolve(HERE, 'node_modules/gliner/node_modules/onnxruntime-web/dist'),
];
const ortFile = (n: string) => ORT_CANDS.map(d => join(d, n));

mkdirSync(OUT, { recursive: true });

// [destBasename, localCacheCandidate(s), remoteURL?]
const FILES: { name: string; local?: string[]; url?: string }[] = [
  { name: 'tokenizer.json',        local: [join(PROBE, 'local-models/onnx-community/gliner_multi_pii-v1/tokenizer.json')], url: `${HF}/tokenizer.json` },
  { name: 'tokenizer_config.json', local: [join(PROBE, 'local-models/onnx-community/gliner_multi_pii-v1/tokenizer_config.json')], url: `${HF}/tokenizer_config.json` },
  { name: 'model_quantized.onnx',  local: [join(PROBE, 'model.onnx'), join(PROBE, 'local-models/onnx-community/gliner_multi_pii-v1/onnx/model_quantized.onnx')], url: `${HF}/onnx/model_quantized.onnx` },
  { name: 'ort-wasm-simd-threaded.wasm', local: ortFile('ort-wasm-simd-threaded.wasm') },
  { name: 'ort-wasm-simd-threaded.mjs',  local: ortFile('ort-wasm-simd-threaded.mjs') },
];

for (const f of FILES) {
  const dest = join(OUT, f.name);
  const cached = (f.local || []).find(p => existsSync(p));
  if (cached) { copyFileSync(cached, dest); console.log(`↳ ${f.name}  (cache local)`); continue; }
  if (f.url) {
    console.log(`↳ baixando ${f.name}…`);
    const res = await fetch(f.url);
    if (!res.ok) throw new Error(`falha ao baixar ${f.name}: HTTP ${res.status}`);
    writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    continue;
  }
  throw new Error(`${f.name}: sem cache local nem URL. Rode 'bun install' (traz o onnxruntime-web).`);
}

// nota de licença junto à pasta (obrigatório p/ distribuir)
writeFileSync(join(OUT, 'LICENCAS.txt'),
  'Modelo gliner_multi_pii-v1 © onnx-community — Apache-2.0\n' +
  'onnxruntime-web © Microsoft — MIT\n' +
  'Distribua esta pasta junto com o anonimizador-offline-pro.html.\n');

console.log(`✓ pasta do modelo pronta: ${OUT}`);
console.log(`  Aponte-a no "modo avançado: nomes" do anonimizador-offline-pro.html.`);
