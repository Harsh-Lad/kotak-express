// Keeps only the animation clips the game uses and drops unused data from the hero GLB.
import { NodeIO } from '@gltf-transform/core';
import { prune, dedup, weld } from '@gltf-transform/functions';
const KEEP = ['Idle', 'Cheer', 'Running_A', 'Jump_Full_Short', 'Hit_A', 'Death_A'];
const [src, dst] = process.argv.slice(2);
const io = new NodeIO();
const doc = await io.read(src);
for (const a of doc.getRoot().listAnimations()) if (!KEEP.includes(a.getName())) a.dispose();
const DROP = ['Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 'Knife', 'Throwable', 'Rogue_Cape'];
for (const n of doc.getRoot().listNodes()) if (DROP.includes(n.getName())) n.dispose();
console.log('clips', doc.getRoot().listAnimations().map(a => a.getName()).join(', '));
await doc.transform(dedup(), weld(), prune());
await io.write(dst, doc);
console.log('slimmed', dst);
