'use client';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { PerformanceMonitor } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import Scene from './Scene';
import Hud from './Hud';
import { engine } from '@/game/engine';
import { useHud } from '@/game/store';

function useControls(ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) engine.moveLeft();
      else if (['ArrowRight', 'd', 'D'].includes(e.key)) engine.moveRight();
      else if (['ArrowUp', 'w', 'W', ' '].includes(e.key)) { e.preventDefault(); engine.jump(); }
      else if (e.key === 'Escape' || e.key === 'p') {
        if (engine.phase === 'playing') { engine.pause(); useHud.getState().set({ phase: 'paused' }); }
        else if (engine.phase === 'paused') { engine.resume(); useHud.getState().set({ phase: 'playing' }); }
      }
    };
    window.addEventListener('keydown', onKey);

    const el = ref.current;
    let sx = 0, sy = 0, st = 0, handled = false;
    const down = (e: PointerEvent) => { sx = e.clientX; sy = e.clientY; st = performance.now(); handled = false; };
    const move = (e: PointerEvent) => {
      if (handled || !st) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 28) return;
      handled = true;
      if (Math.abs(dx) > Math.abs(dy)) (dx < 0 ? engine.moveLeft() : engine.moveRight());
      else if (dy < 0) engine.jump();
    };
    const up = (e: PointerEvent) => {
      // A quick tap also jumps, which helps on desktop trackpads and small phones.
      if (!handled && st && performance.now() - st < 220 && Math.hypot(e.clientX - sx, e.clientY - sy) < 10) engine.jump();
      st = 0;
    };
    el?.addEventListener('pointerdown', down);
    el?.addEventListener('pointermove', move);
    el?.addEventListener('pointerup', up);
    const onHide = () => { if (document.hidden && engine.phase === 'playing') { engine.pause(); useHud.getState().set({ phase: 'paused' }); } };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('keydown', onKey);
      el?.removeEventListener('pointerdown', down);
      el?.removeEventListener('pointermove', move);
      el?.removeEventListener('pointerup', up);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [ref]);
}

function LiteToneMapping({ lite }: { lite: boolean }) {
  const { gl } = useThree();
  useEffect(() => { gl.toneMapping = lite ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping; }, [gl, lite]);
  return null;
}

export default function Game() {
  const touch = useRef<HTMLDivElement>(null);
  useControls(touch);
  // Quality adapts to the device: phones that cannot hold the frame rate drop to 1x pixels and no bloom.
  const [lite, setLite] = useState(() => typeof location !== 'undefined' && /[?&]lite/.test(location.search));
  return (
    <div className="game-root">
      <Canvas
        shadows
        dpr={lite ? 1 : [1, 1.75]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ fov: 62, near: 0.1, far: 400, position: [2.6, 1.9, 4.6] }}
        onCreated={({ gl }) => { gl.toneMappingExposure = 0.95; }}
        flat={!lite}
      >
        <PerformanceMonitor onDecline={() => setLite(true)} flipflops={2} />
        <LiteToneMapping lite={lite} />
        <Scene lite={lite} />
      </Canvas>
      <div ref={touch} className="touch-layer" />
      <Hud />
    </div>
  );
}
