// With a relative assetPrefix, Next writes font URLs relative to the page, but CSS
// resolves url() relative to the stylesheet. Point them at the sibling media folder.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const dir = 'out/_next/static/css';
for (const f of readdirSync(dir)) {
  if (!f.endsWith('.css')) continue;
  const p = join(dir, f);
  const s = readFileSync(p, 'utf8').replace(/url\((\.\/)?_next\/static\/media\//g, 'url(../media/');
  writeFileSync(p, s);
}
console.log('export paths fixed');
