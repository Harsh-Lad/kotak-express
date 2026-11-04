'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { engine } from '@/game/engine';

// Any rigged glTF character can be dropped in here. The prototype hero is a CC0 stylised
// character recoloured to the Kotak hoodie palette (red hoodie, navy trousers, white sneakers).
// Map the production rig's clip names in CLIPS below.
export const RUNNER_URL = process.env.NEXT_PUBLIC_RUNNER_URL || './models/runner.glb';
const TARGET_HEIGHT = 1.85;

const CLIPS = {
  idle: 'Idle',
  wave: 'Cheer',
  run: 'Running_A',
  jump: 'Jump_Full_Short',
  hit: 'Hit_A',
  over: 'Death_A',
} as const;
type ClipKey = keyof typeof CLIPS;

// Props carried by the source pack that are not part of this hero.
const HIDDEN = ['Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 'Knife', 'Throwable', 'Rogue_Cape'];

export default function Runner() {
  const root = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const { scene, animations } = useGLTF(RUNNER_URL);
  const { actions } = useAnimations(animations, root);
  const current = useRef<ClipKey | null>(null);
  const lastHit = useRef(0);

  const scale = useMemo(() => {
    scene.traverse((o) => {
      if (HIDDEN.includes(o.name)) o.visible = false;
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        const mat = m.material as THREE.MeshStandardMaterial;
        if (mat) { mat.roughness = 0.55; mat.envMapIntensity = 0.6; }
      }
    });
    const box = new THREE.Box3().setFromObject(scene);
    return TARGET_HEIGHT / (box.max.y - box.min.y || 1);
  }, [scene]);

  const play = (key: ClipKey, fade = 0.15, once = false, speed = 1) => {
    const next = actions[CLIPS[key]];
    if (!next) return;
    next.timeScale = speed;
    if (current.current === key) return;
    const prev = current.current ? actions[CLIPS[current.current]] : null;
    next.reset();
    next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    next.clampWhenFinished = once;
    next.fadeIn(fade).play();
    if (prev && prev !== next) prev.fadeOut(fade);
    current.current = key;
  };

  useEffect(() => { play('idle'); /* eslint-disable-next-line */ }, [actions]);

  useFrame((state) => {
    const g = root.current;
    if (!g) return;
    g.position.x = engine.x;
    g.position.y = engine.y;
    g.rotation.z = engine.lean * 0.8;
    if (shadow.current) {
      shadow.current.position.set(engine.x, 0.02, 0);
      const s = 1 - Math.min(0.6, engine.y / 4);
      shadow.current.scale.set(s, s, s);
    }

    if (engine.phase === 'menu') {
      g.rotation.y += (0.5 - g.rotation.y) * 0.1;
      play(state.clock.elapsedTime % 7 < 2.2 ? 'wave' : 'idle', 0.4);
      return;
    }
    g.rotation.y += (Math.PI - g.rotation.y) * 0.18;
    if (engine.phase === 'over') { play('over', 0.2, true); return; }
    if (engine.phase === 'paused') { play('idle', 0.3); return; }
    if (engine.stumbleT > 0.45 && state.clock.elapsedTime - lastHit.current > 0.5) {
      lastHit.current = state.clock.elapsedTime;
      if (current.current) actions[CLIPS[current.current]]?.fadeOut(0.05);
      current.current = null;
      play('hit', 0.05, true, 1.6);
      return;
    }
    if (current.current === 'hit' && engine.stumbleT > 0) return;
    if (!engine.grounded) play('jump', 0.06, true, 1.25);
    else play('run', 0.12, false, 0.8 + engine.speed / 20);
  });

  return (
    <>
      <group ref={root} dispose={null}>
        <primitive object={scene} scale={scale} />
      </group>
      <mesh ref={shadow} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.55, 28]} />
        <meshBasicMaterial color="#000" transparent opacity={0.28} depthWrite={false} />
      </mesh>
    </>
  );
}

useGLTF.preload(RUNNER_URL);
