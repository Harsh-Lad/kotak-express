// Builds a framework-free static bundle in ./standalone: index.html + game.js + models.
// Usage: node scripts/build-standalone.mjs [--embed-model]  (embed converts the GLB to a .json glTF)
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';

const out = 'standalone';
mkdirSync(out + '/models', { recursive: true });
const embed = process.argv.includes('--embed-model');
const modelUrl = embed ? './models/runner.json' : './models/runner.glb';
const cityUrl = embed ? './models/city.json' : './models/city.glb';

await build({
  entryPoints: ['src/standalone.tsx'],
  bundle: true, minify: true, format: 'iife', target: 'es2020', charset: 'utf8',
  outfile: `${out}/game.js`, jsx: 'automatic',
  alias: { '@': './src' },
  define: { 'process.env.NODE_ENV': '"production"', 'process.env.NEXT_PUBLIC_RUNNER_URL': JSON.stringify(modelUrl), 'process.env.NEXT_PUBLIC_CITY_URL': JSON.stringify(cityUrl) },
  logLevel: 'warning',
});

// GLB -> glTF JSON with the binary buffer (and textures) embedded, for hosts that only serve web types.
function embedGlb(name) {
  const b = readFileSync(`public/models/${name}.glb`);
  const jl = b.readUInt32LE(12);
  const json = JSON.parse(b.subarray(20, 20 + jl).toString('utf8'));
  const off = 20 + jl; const bl = b.readUInt32LE(off);
  json.buffers[0].uri = 'data:application/octet-stream;base64,' + b.subarray(off + 8, off + 8 + bl).toString('base64');
  writeFileSync(`${out}/models/${name}.json`, JSON.stringify(json));
}
for (const name of ['runner', 'city']) {
  if (embed) embedGlb(name); else copyFileSync(`public/models/${name}.glb`, `${out}/models/${name}.glb`);
}

const css = readFileSync('app/globals.css', 'utf8').replace(/^@import .*$/gm, '');
const html = `<title>Kotak Multi-Asset Express</title>
<meta name="description" content="Different Assets. One Express.">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Lilita+One&display=swap">
<style>${css}</style>
<div id="kmae-root"></div>
<script src="game.js"></script>
`;
writeFileSync(`${out}/index.html`, html);
console.log('standalone build ready in ./' + out);
