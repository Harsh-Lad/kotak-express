# Kotak Multi-Asset Express (MVP prototype)

A 3D web runner built with Next.js, React Three Fiber and Three.js. It has no backend and no database. It builds to static files that can be hosted on any CDN.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # static export in ./out (host it anywhere)
node scripts/build-standalone.mjs --embed-model   # single-page bundle in ./standalone
```

## Controls

- Swipe left or right, or use the arrow keys or A/D, to change lane.
- Swipe up, tap, or use the up arrow, W or Space, to jump.
- P or Esc pauses the game.

## What is implemented

| Concept doc | Prototype |
|---|---|
| Station intro + Play Now | Title screen over the live 3D station; the character waves |
| Allocation mission | Mission card with an Equity / Debt / Gold mix totalling 100% |
| Run, collect, dodge | Three lanes, jump, tokens loading into matching wagons with live fill bars |
| Market obstacles | Barricade (jump it), cargo boxes (change lane), −10s time trap, delay zone (slows you down) |
| Power-ups | +5s Extra Time, 5s Asset Magnet |
| Market zones | Equity, Debt and Gold zones (2× own asset, other assets reduce it) and Neutral zones. Zones adapt to what is still needed, and a full asset is protected |
| Fill the train, boost | Allocation complete gives a train boost, a station checkpoint gate and a harder mission. Play continues without a break |
| Game over, play again | Results screen with Total Score, Checkpoints Crossed and Personal Best (stored on the device) |

## Project map

```
src/game/config.ts     all tuning numbers (speeds, timers, zone lengths, mission pool)
src/game/engine.ts     pure gameplay simulation (spawning, collisions, zones, scoring)
src/game/store.ts      HUD state (zustand)
src/game/textures.ts   procedural textures (replaced by artist textures later)
src/components/        Scene, World (station), Train, Runner (rigged GLB), Entities (pooled), Hud
public/models/         runner.glb, the rigged hero (red hoodie, navy trousers, white sneakers)
scripts/               standalone build, export path fix, character slimming
```

## Swapping in production art

- **Character:** replace `public/models/runner.glb` with the final rigged hero and map its clip names in `CLIPS` inside `Runner.tsx`. Height is normalised automatically. `scripts/slim-character.mjs` strips unused clips and meshes.
- **Train and station:** `Train.tsx` and `World.tsx` are built from primitives so the gameplay can be proven first. Each part maps to a glTF asset slot, loaded the same way as the runner.
- **Placeholder credit:** the hero is based on the KayKit Adventurers pack by Kay Lousberg (CC0, see `credits/`), recoloured to the Kotak palette with its props removed.

## Notes

- Visual stack: image-based reflections, soft shadows, bloom, ACES tone mapping and vignette. Phones that cannot hold the frame rate switch to a lighter mode automatically (or add `?lite` to the URL).
- Rendering is pooled and imperative, so React does not re-render during play, which keeps mobile frame rates stable.
- `window.__engine` is exposed for automated play-testing.
- The disclaimer from the concept doc is shown on the title screen.
