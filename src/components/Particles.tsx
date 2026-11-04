'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { engine } from '@/game/engine';
import { glowTexture } from '@/game/textures';

// Lightweight pooled sparkle bursts (collection feedback) and boost speed streaks.
const N = 240;
const queue: { x: number; y: number; color: string }[] = [];
export function spawnBurst(x: number, y: number, color: string) { queue.push({ x, y, color }); }

export default function Particles() {
  const points = useRef<THREE.Points>(null);
  const data = useMemo(() => ({
    pos: new Float32Array(N * 3), col: new Float32Array(N * 3), vel: new Float32Array(N * 3), life: new Float32Array(N), next: 0,
  }), []);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(data.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(data.col, 3));
    return g;
  }, [data]);
  const mat = useMemo(() => new THREE.PointsMaterial({ size: 0.16, map: glowTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }), []);
  const c = useMemo(() => new THREE.Color(), []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    while (queue.length) {
      const b = queue.shift()!;
      c.set(b.color);
      for (let k = 0; k < 12; k++) {
        const i = data.next; data.next = (data.next + 1) % N;
        data.pos[i * 3] = b.x; data.pos[i * 3 + 1] = b.y; data.pos[i * 3 + 2] = -0.2;
        const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 4;
        data.vel[i * 3] = Math.cos(a) * sp; data.vel[i * 3 + 1] = 2 + Math.random() * 4; data.vel[i * 3 + 2] = Math.sin(a) * sp * 0.6;
        data.life[i] = 0.5 + Math.random() * 0.35;
        data.col[i * 3] = c.r * 1.5; data.col[i * 3 + 1] = c.g * 1.5; data.col[i * 3 + 2] = c.b * 1.5;
      }
    }
    // boost streaks along the lanes
    if (engine.boostT > 0 && engine.phase === 'playing') {
      for (let k = 0; k < 3; k++) {
        const i = data.next; data.next = (data.next + 1) % N;
        data.pos[i * 3] = (Math.random() - 0.5) * 9; data.pos[i * 3 + 1] = 0.2 + Math.random() * 3.5; data.pos[i * 3 + 2] = -30 - Math.random() * 20;
        data.vel[i * 3] = 0; data.vel[i * 3 + 1] = 0; data.vel[i * 3 + 2] = 60;
        data.life[i] = 0.7; data.col[i * 3] = 1.4; data.col[i * 3 + 1] = 1.3; data.col[i * 3 + 2] = 1.0;
      }
    }
    for (let i = 0; i < N; i++) {
      if (data.life[i] <= 0) { data.pos[i * 3 + 1] = -50; continue; }
      data.life[i] -= dt;
      data.vel[i * 3 + 1] -= 9 * dt * (data.vel[i * 3 + 2] > 30 ? 0 : 1);
      data.pos[i * 3] += data.vel[i * 3] * dt;
      data.pos[i * 3 + 1] += data.vel[i * 3 + 1] * dt;
      data.pos[i * 3 + 2] += data.vel[i * 3 + 2] * dt;
      const f = Math.max(0, data.life[i] / 0.8);
      data.col[i * 3] *= 0.985; data.col[i * 3 + 1] *= 0.985; data.col[i * 3 + 2] *= 0.985;
      if (f <= 0) data.pos[i * 3 + 1] = -50;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  });

  return <points ref={points} geometry={geo} material={mat} frustumCulled={false} />;
}
