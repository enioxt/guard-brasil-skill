// Entry do bundle do navegador (gliner + transformers-web + onnxruntime-web).
// Vira um ÚNICO ESM sem bare-imports, inlinado em anonimizador-offline-pro.html.
// Expõe um global p/ o script clássico do template usar.
import { Gliner } from 'gliner';
import { env, AutoTokenizer } from '@xenova/transformers';
globalThis.__glinerBundle = { Gliner, env, AutoTokenizer };
