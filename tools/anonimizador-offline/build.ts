#!/usr/bin/env bun
/**
 * build.ts — monta o anonimizador OFFLINE de arquivo único.
 *
 * Lê template.html + libs vendorizadas (mammoth/pdf.js) e emite
 * dist/anonimizador-offline.html totalmente auto-contido (~2MB), que roda
 * em qualquer navegador Chromium/Edge via file:// SEM internet.
 *
 * As libs são embutidas em base64 e injetadas em runtime:
 *  - mammoth  → leitura de .docx (window.mammoth)
 *  - pdf.js   → leitura de .pdf  (window.pdfjsLib)
 *  - pdf.worker → blob URL (roda em file://, sem arquivo externo)
 *
 * Uso:  bun packages/guard-brasil/tools/anonimizador-offline/build.ts
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const VENDOR = join(HERE, 'vendor');

// Libs vendorizadas (gitignored). Baixa/copia se faltarem — build reprodutível em clone limpo.
const SOURCES: Record<string, { url?: string; local?: string }> = {
  'mammoth.browser.min.js': { local: join(HERE, '../../../../node_modules/mammoth/mammoth.browser.min.js') },
  'pdf.min.js': { url: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js' },
  'pdf.worker.min.js': { url: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js' },
};
mkdirSync(VENDOR, { recursive: true });
for (const [name, src] of Object.entries(SOURCES)) {
  const dest = join(VENDOR, name);
  if (existsSync(dest)) continue;
  if (src.local && existsSync(src.local)) { copyFileSync(src.local, dest); console.log(`↳ copiado ${name}`); continue; }
  if (src.url) {
    console.log(`↳ baixando ${name}…`);
    const res = await fetch(src.url);
    if (!res.ok) throw new Error(`falha ao baixar ${name}: HTTP ${res.status}`);
    writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    continue;
  }
  throw new Error(`vendor ausente e sem fonte: ${name}`);
}

const b64 = (p: string) => readFileSync(join(VENDOR, p)).toString('base64');

const MAMMOTH_B64 = b64('mammoth.browser.min.js');
const PDFJS_B64 = b64('pdf.min.js');
const PDFWORKER_B64 = b64('pdf.worker.min.js');

const bootstrap = `
(function(){
  function b64ToText(s){
    var bin=atob(s);
    var bytes=new Uint8Array(bin.length);
    for(var i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
    return new TextDecoder('utf-8').decode(bytes);
  }
  function run(text){ var s=document.createElement('script'); s.textContent=text; document.head.appendChild(s); }
  try{
    // mammoth (.docx)
    run(b64ToText("${MAMMOTH_B64}"));
    // pdf.js (.pdf)
    run(b64ToText("${PDFJS_B64}"));
    // worker do pdf.js como blob URL (sem arquivo externo)
    var wsrc=b64ToText("${PDFWORKER_B64}");
    var wurl=URL.createObjectURL(new Blob([wsrc],{type:'application/javascript'}));
    if(window.pdfjsLib){ window.pdfjsLib.GlobalWorkerOptions.workerSrc=wurl; }
    var ok=[]; if(window.mammoth)ok.push('docx'); if(window.pdfjsLib)ok.push('pdf');
    var b=document.getElementById('engine-badge');
    if(b){ b.textContent='motor: pronto ('+['txt'].concat(ok).join(' · ')+')'; b.className='badge off'; }
  }catch(e){
    var b2=document.getElementById('engine-badge');
    if(b2){ b2.textContent='motor: erro ao carregar leitores ('+e.message+')'; }
    console.error('bootstrap erro',e);
  }
})();
`;

// motor PII: engine.js é a fonte única (testes importam via ESM; aqui vira global no browser)
const engineSrc = readFileSync(join(HERE, 'engine.js'), 'utf8').replace(/^export /gm, '');

const template = readFileSync(join(HERE, 'template.html'), 'utf8');
for (const marker of ['/*__VENDOR_BOOTSTRAP__*/', '/*__ENGINE__*/', '/*__GLINER_BUNDLE__*/']) {
  if (!template.includes(marker)) throw new Error(`marcador ${marker} não encontrado no template.html`);
}

const base = template
  .replace('/*__VENDOR_BOOTSTRAP__*/', bootstrap)
  .replace('/*__ENGINE__*/', engineSrc);

mkdirSync(join(HERE, 'dist'), { recursive: true });

// Build BASE (leve, só C1 regex). Marcador do bundle fica vazio → modo nomes oculto.
const baseOut = base.replace('/*__GLINER_BUNDLE__*/', '');
const basePath = join(HERE, 'dist', 'anonimizador-offline.html');
writeFileSync(basePath, baseOut, 'utf8');
console.log(`✓ base  ${basePath} — ${(baseOut.length / 1024 / 1024).toFixed(2)} MB (C1 regex, offline)`);

// Build PRO (C1 + C2 nomes via GLiNER inline). Requer vendor/gliner-bundle.mjs
// (gerar com: bun gliner-probe/bundle-spike/build-bundle.ts && cp out.mjs vendor/gliner-bundle.mjs).
const bundlePath = join(VENDOR, 'gliner-bundle.mjs');
if (existsSync(bundlePath)) {
  const bundle = readFileSync(bundlePath, 'utf8');
  const proOut = base.replace('/*__GLINER_BUNDLE__*/', () => bundle);
  const proPath = join(HERE, 'dist', 'anonimizador-offline-pro.html');
  writeFileSync(proPath, proOut, 'utf8');
  console.log(`✓ pro   ${proPath} — ${(proOut.length / 1024 / 1024).toFixed(2)} MB (C1+C2 nomes; modelo via pasta local)`);
} else {
  console.log(`↳ pro pulado: vendor/gliner-bundle.mjs ausente (build base ok)`);
}
