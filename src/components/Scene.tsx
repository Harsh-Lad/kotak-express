'use client';
import { Suspense, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { engine } from '@/game/engine';
import { useHud } from '@/game/store';
import { ASSET_META } from '@/game/config';
import World from './World';
import Train from './Train';
import Runner from './Runner';
import Entities from './Entities';
import Particles, { spawnBurst } from './Particles';
import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';

// Runs the simulation and forwards a throttled snapshot + events to the DOM HUD.
function Loop() {
  const acc = useRef(0);
  const shake = useRef(0);
  useFrame((_, dt) => {
    engine.update(dt);
    const hud = useHud.getState();
    for (const ev of engine.drainEvents()) {
      if (ev.kind === 'float') hud.addFloat(ev.text!, ev.color || '#fff');
      else if (ev.kind === 'zone') hud.showBanner({ kind: 'zone', text: ev.text!, sub: ev.sub, color: ev.color });
      else if (ev.kind === 'boost') hud.showBanner({ kind: 'boost', text: ev.text!, sub: ev.sub });
      else if (ev.kind === 'mission') setTimeout(() => useHud.getState().showBanner({ kind: 'mission', text: ev.text!, sub: ev.sub }), 2400);
      else if (ev.kind === 'stumble') shake.current = 0.35;
      else if (ev.kind === 'collect') spawnBurst(ev.x ?? engine.x, 1.0 + engine.y, ev.color || '#fff');
      else if (ev.kind === 'over') {
        let best = 0;
        try { best = Number(localStorage.getItem('kmae-best') || 0); } catch { /* storage unavailable */ }
        const score = Math.round(engine.score);
        const newBest = score > best;
        if (newBest) { best = score; try { localStorage.setItem('kmae-best', String(best)); } catch { /* ignore */ } }
        hud.set({ phase: 'over', result: { score, checkpoints: engine.checkpoint - 1, best, newBest, reason: ev.text || 'Time ran out' }, best });
      }
    }
    shake.current = Math.max(0, shake.current - dt);
    engine.shake = shake.current;
    acc.current += dt;
    if (acc.current > 0.1 && engine.phase !== 'menu') {
      acc.current = 0;
      hud.set({
        time: engine.time, score: Math.round(engine.score), checkpoint: engine.checkpoint,
        alloc: { ...engine.alloc }, target: { ...engine.target }, zone: engine.zone,
        magnet: engine.magnetT, boost: engine.boostT,
      });
    }
  });
  return null;
}

function CameraRig() {
  const { camera } = useThree();
  const look = useRef(new THREE.Vector3(0, 1, -8));
  useFrame((state, dt) => {
    const cam = camera as THREE.PerspectiveCamera;
    const k = Math.min(1, dt * 3);
    const menu = engine.phase === 'menu';
    const portrait = state.size.height > state.size.width;
    const pos = menu
      ? new THREE.Vector3(2.6, 1.9, 4.6)
      : new THREE.Vector3(engine.x * (portrait ? 0.85 : 0.55) - (portrait ? 0.7 : 0.6), portrait ? 3.7 : 3.6, portrait ? 6.0 : 6.2);
    const tgt = menu ? new THREE.Vector3(-1.6, 1.4, -2) : new THREE.Vector3(engine.x * (portrait ? 0.75 : 0.45) - (portrait ? 1.0 : 0.8), 1.3, -9);
    const s = engine.shake;
    if (s > 0) { pos.x += (Math.random() - 0.5) * s * 0.6; pos.y += (Math.random() - 0.5) * s * 0.6; }
    cam.position.lerp(pos, k);
    look.current.lerp(tgt, k);
    cam.lookAt(look.current);
    const baseFov = portrait ? 68 : 56;
    const fov = baseFov + (engine.boostT > 0 ? 12 : 0) + Math.min(6, engine.speed * 0.15);
    cam.fov += (fov - cam.fov) * Math.min(1, dt * 4);
    cam.updateProjectionMatrix();
  });
  return null;
}

function Lights() {
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const tint = useRef(new THREE.Color('#cfe0ff'));
  useFrame((_, dt) => {
    if (sun.current) {
      sun.current.position.set(engine.x + 9, 15, 9);
      sun.current.target.position.set(engine.x, 0, -4);
      sun.current.target.updateMatrixWorld();
    }
    const want = new THREE.Color(engine.zone === 'neutral' ? '#cfe0ff' : ASSET_META[engine.zone].glow).lerp(new THREE.Color('#cfe0ff'), 0.5);
    tint.current.lerp(want, Math.min(1, dt * 2));
    if (hemi.current) hemi.current.color.copy(tint.current);
  });
  return (
    <>
      <hemisphereLight ref={hemi} args={['#cfe0ff', '#b98d68', 0.85]} />
      <directionalLight ref={sun} intensity={2.7} color="#ffd29c" castShadow
        shadow-mapSize={[1024, 1024]} shadow-camera-left={-10} shadow-camera-right={10}
        shadow-camera-top={14} shadow-camera-bottom={-14} shadow-camera-near={1} shadow-camera-far={50} shadow-bias={-0.0005} />
    </>
  );
}

export default function Scene({ lite = false }: { lite?: boolean }) {
  return (
    <>
      <Lights />
      <World />
      <Train />
      <Entities />
      <Particles />
      <Suspense fallback={null}><Runner /></Suspense>
      <CameraRig />
      <Loop />
      {!lite && (
        <EffectComposer multisampling={2}>
          <Bloom mipmapBlur intensity={0.7} luminanceThreshold={1.1} luminanceSmoothing={0.25} radius={0.65} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          <Vignette offset={0.3} darkness={0.6} />
        </EffectComposer>
      )}
    </>
  );
}
