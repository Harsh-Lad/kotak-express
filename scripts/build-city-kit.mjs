// Packs the CC0 KayKit City Builder props the station uses into one GLB (public/models/city.glb).
// Each prop becomes a named root node so the scene can clone it by name.
import { NodeIO } from '@gltf-transform/core';
import { mergeDocuments, unpartition, dedup, prune } from '@gltf-transform/functions';
const SRC = process.argv[2];
const PROPS = ['building_A', 'building_B', 'building_C', 'building_D', 'building_E', 'building_F', 'building_G', 'building_H',
  'streetlight', 'bench', 'bush', 'trash_A', 'dumpster', 'firehydrant', 'watertower', 'box_A', 'trafficlight_A'];
const io = new NodeIO();
const out = await io.read(`${SRC}/${PROPS[0]}.gltf`);
out.getRoot().listScenes()[0].listChildren().forEach(n => n.setName(PROPS[0]));
for (const p of PROPS.slice(1)) {
  const doc = await io.read(`${SRC}/${p}.gltf`);
  doc.getRoot().listScenes()[0].listChildren().forEach(n => n.setName(p));
  const map = mergeDocuments(out, doc);
  const srcScene = doc.getRoot().listScenes()[0];
  const dstScene = out.getRoot().listScenes()[0];
  const merged = map.get(srcScene);
  merged.listChildren().forEach(n => dstScene.addChild(n));
  merged.dispose();
}
await out.transform(unpartition(), dedup(), prune());
await io.write('public/models/city.glb', out);
console.log('city kit:', out.getRoot().listScenes()[0].listChildren().map(n => n.getName()).join(', '));
