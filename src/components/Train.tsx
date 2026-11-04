'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { engine } from '@/game/engine';
import { ASSET_META, Asset, BRAND } from '@/game/config';
import { liveryTexture, wagonLabelTexture, ledSignTexture } from '@/game/textures';

const TRAIN_X = -5.75;
const BASE_Y = -0.5;
const W = 2.7;
const H = 3.0;
const SLOTS = 10;

const paint = () => new THREE.MeshPhysicalMaterial({ color: BRAND.white, roughness: 0.22, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.08 });
const redPaint = () => new THREE.MeshPhysicalMaterial({ color: BRAND.red, roughness: 0.25, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.1 });
const navy = () => new THREE.MeshStandardMaterial({ color: BRAND.navy, roughness: 0.3, metalness: 0.3 });
const darkGlass = () => new THREE.MeshPhysicalMaterial({ color: '#0b1222', roughness: 0.04, metalness: 0.6, clearcoat: 1 });
const chrome = () => new THREE.MeshStandardMaterial({ color: '#dfe4ea', roughness: 0.15, metalness: 1 });

// Original aerodynamic semi-high-speed nose: long low "beak", raked windscreen, smooth roof blend.
function noseGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, 0.15);
  s.lineTo(5.4, 0.15);
  s.quadraticCurveTo(8.3, 0.15, 9.2, 0.5);
  s.lineTo(9.25, 0.72);
  s.bezierCurveTo(8.6, 1.15, 7.0, 2.35, 4.4, H);
  s.lineTo(0, H);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: W - 0.4, bevelEnabled: true, bevelSize: 0.2, bevelThickness: 0.2, bevelSegments: 6, curveSegments: 40 });
  g.rotateY(Math.PI / 2);
  g.translate(-(W - 0.4) / 2, 0, 0);
  g.computeVertexNormals();
  return g;
}

// Dark wraparound windscreen band, slightly wider than the body so it reads from the side.
function screenGeometry() {
  const s = new THREE.Shape();
  s.moveTo(4.9, 2.86);
  s.bezierCurveTo(6.4, 2.45, 7.6, 1.75, 8.35, 1.18);
  s.lineTo(7.9, 1.05);
  s.bezierCurveTo(7.0, 1.55, 5.9, 2.1, 4.6, 2.35);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: W + 0.02, bevelEnabled: false, curveSegments: 24 });
  g.rotateY(Math.PI / 2);
  g.translate(-(W + 0.02) / 2, 0, 0);
  return g;
}

function Bogie({ z }: { z: number }) {
  const ref = useRef<THREE.Group>(null);
  const m = useMemo(() => new THREE.MeshStandardMaterial({ color: '#23262b', metalness: 0.8, roughness: 0.35 }), []);
  useFrame((_, dt) => { ref.current?.children.forEach(c => { if (c.userData.wheel) c.rotation.x -= engine.speed * dt * 2; }); });
  return (
    <group ref={ref} position={[0, 0.32, z]}>
      <mesh material={m}><boxGeometry args={[W - 0.5, 0.25, 2]} /></mesh>
      {[-0.6, 0.6].flatMap(dz => [-1, 1].map(side => (
        <mesh key={`${dz}${side}`} material={m} position={[side * (W / 2 - 0.35), 0, dz]} rotation={[0, 0, Math.PI / 2]} userData={{ wheel: true }}>
          <cylinderGeometry args={[0.34, 0.34, 0.16, 16]} />
        </mesh>
      )))}
    </group>
  );
}

/** Cargo that visibly fills each wagon: bar charts for Equity, coin stacks for Debt, bullion for Gold. */
function Cargo({ asset, L }: { asset: Asset; L: number }) {
  const items = useRef<THREE.Group[]>([]);
  const meta = ASSET_META[asset];
  const mat = useMemo(() => asset === 'e'
    ? new THREE.MeshStandardMaterial({ color: meta.color, emissive: meta.color, emissiveIntensity: 1.6, toneMapped: false })
    : asset === 'd'
      ? new THREE.MeshStandardMaterial({ color: '#e4e9ef', metalness: 1, roughness: 0.18 })
      : new THREE.MeshStandardMaterial({ color: '#f3b21f', metalness: 1, roughness: 0.22, emissive: '#7a4b00', emissiveIntensity: 0.25 }), [asset, meta.color]);
  const slots = useMemo(() => Array.from({ length: SLOTS }, (_, i) => i), []);
  const step = (L - 1.2) / SLOTS;
  useFrame((_, dt) => {
    const ratio = engine.target[asset] ? engine.alloc[asset] / engine.target[asset] : 0;
    const shown = Math.round(ratio * SLOTS);
    items.current.forEach((g, i) => {
      if (!g) return;
      const want = i < shown ? 1 : 0;
      const s = g.scale.y + (want - g.scale.y) * Math.min(1, dt * 10);
      g.scale.set(Math.max(0.001, s), Math.max(0.001, s), Math.max(0.001, s));
      g.visible = s > 0.01;
    });
  });
  return (
    <group position={[W / 2 - 0.55, 0.95, 0]}>
      {slots.map(i => (
        <group key={i} ref={(g) => { if (g) items.current[i] = g; }} position={[0, 0, -L / 2 + 0.6 + step * (i + 0.5)]}>
          {asset === 'e' && <mesh material={mat} position={[0, (0.35 + i * 0.07) / 2, 0]}><boxGeometry args={[0.32, 0.35 + i * 0.07, step * 0.62]} /></mesh>}
          {asset === 'd' && [0, 1, 2, 3].slice(0, 2 + (i % 3)).map(k => <mesh key={k} material={mat} position={[0, 0.08 + k * 0.17, 0]}><cylinderGeometry args={[0.17, 0.17, 0.14, 20]} /></mesh>)}
          {asset === 'g' && [0, 1].map(k => <mesh key={k} material={mat} position={[k * 0.05, 0.12 + k * 0.22, 0]}><boxGeometry args={[0.36, 0.2, step * 0.75]} /></mesh>)}
        </group>
      ))}
    </group>
  );
}

function Wagon({ asset, z }: { asset: Asset; z: number }) {
  const label = useMemo(() => wagonLabelTexture(asset), [asset]);
  const glowRef = useRef<THREE.MeshStandardMaterial>(null);
  const mats = useMemo(() => ({ paint: paint(), red: redPaint(), navy: navy(), glass: darkGlass(), chrome: chrome() }), []);
  const meta = ASSET_META[asset];
  const L = 4.8;
  useFrame((state) => {
    const full = engine.target[asset] > 0 && engine.alloc[asset] >= engine.target[asset];
    if (glowRef.current) glowRef.current.emissiveIntensity = full ? 2.5 + Math.sin(state.clock.elapsedTime * 6) * 0.8 : 1.1;
  });
  return (
    <group position={[0, 0, z]}>
      <RoundedBox args={[W, H, L]} radius={0.32} smoothness={4} position={[0, 0.5 + H / 2, 0]} material={mats.paint} castShadow />
      <RoundedBox args={[W + 0.02, 0.85, L + 0.02]} radius={0.3} smoothness={3} position={[0, 0.9, 0]} material={mats.red} />
      <mesh material={mats.navy} position={[0, 1.36, 0]}><boxGeometry args={[W + 0.04, 0.06, L - 0.3]} /></mesh>
      {/* glass cargo hold facing the platform */}
      <mesh position={[W / 2 + 0.005, 2.05, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[L - 0.9, 1.25]} />
        <meshPhysicalMaterial color="#9fc4ff" transparent opacity={0.16} roughness={0.02} metalness={0} clearcoat={1} depthWrite={false} />
      </mesh>
      <mesh position={[W / 2 - 0.95, 2.05, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[L - 0.9, 1.25]} />
        <meshStandardMaterial color="#0d1730" roughness={0.6} />
      </mesh>
      {/* chrome window frame + glow strip in the asset colour */}
      <mesh material={mats.chrome} position={[W / 2 + 0.01, 2.72, 0]}><boxGeometry args={[0.04, 0.06, L - 0.8]} /></mesh>
      <mesh position={[W / 2 + 0.01, 1.4, 0]}>
        <boxGeometry args={[0.04, 0.05, L - 0.8]} />
        <meshStandardMaterial ref={glowRef} color={meta.color} emissive={meta.color} emissiveIntensity={1.1} toneMapped={false} />
      </mesh>
      <group position={[0, 0.45, 0]}><Cargo asset={asset} L={L} /></group>
      <mesh position={[W / 2 + 0.02, 3.08, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[2.3, 0.56]} /><meshBasicMaterial map={label} transparent toneMapped={false} />
      </mesh>
      <RoundedBox args={[1.4, 0.25, 2.2]} radius={0.08} position={[0, 0.5 + H + 0.1, 0]}><meshStandardMaterial color="#aab1ba" metalness={0.6} roughness={0.35} /></RoundedBox>
      <mesh position={[0, 1.6, L / 2 + 0.2]}><boxGeometry args={[W - 0.8, 2.2, 0.4]} /><meshStandardMaterial color="#1c1f25" roughness={0.9} /></mesh>
      <Bogie z={-L / 2 + 1} />
      <Bogie z={L / 2 - 1} />
    </group>
  );
}

function Locomotive() {
  const nose = useMemo(() => noseGeometry(), []);
  const screen = useMemo(() => screenGeometry(), []);
  const livery = useMemo(() => liveryTexture(), []);
  const led = useMemo(() => ledSignTexture(['KOTAK MULTI-ASSET', 'EXPRESS'], '#ffb547'), []);
  const head = useRef<THREE.MeshStandardMaterial>(null);
  const mats = useMemo(() => ({ paint: paint(), red: redPaint(), navy: navy(), glass: darkGlass(), chrome: chrome() }), []);
  useFrame((state) => {
    if (head.current) head.current.emissiveIntensity = engine.boostT > 0 ? 6 + Math.sin(state.clock.elapsedTime * 25) * 2 : 3;
  });
  return (
    <group position={[0, 0.5, -15.8]}>
      <mesh geometry={nose} material={mats.paint} castShadow />
      <RoundedBox args={[W + 0.04, 0.9, 5.6]} radius={0.3} smoothness={3} position={[0, 0.5, -2.6]} material={mats.red} />
      <mesh material={mats.navy} position={[0, 0.98, -2.6]}><boxGeometry args={[W + 0.06, 0.06, 5.3]} /></mesh>
      <mesh material={mats.glass} position={[W / 2 + 0.02, 2.15, -2.2]}><boxGeometry args={[0.04, 0.62, 4.2]} /></mesh>
      <mesh geometry={screen} material={mats.glass} />
      <mesh position={[0, 2.58, -5.5]} rotation={[-1.05, 0, 0]}><planeGeometry args={[1.5, 0.3]} /><meshStandardMaterial map={led} emissive="#ffffff" emissiveMap={led} emissiveIntensity={2} toneMapped={false} /></mesh>
      {/* lower beak cladding and coupler cover */}
      <mesh position={[0, 0.42, -8.9]}><boxGeometry args={[W - 0.9, 0.22, 0.6]} /><meshStandardMaterial color="#20242b" metalness={0.6} roughness={0.35} /></mesh>
      <mesh position={[W / 2 + 0.06, 1.55, -1.3]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[3.6, 0.9]} /><meshStandardMaterial map={livery} transparent roughness={0.3} />
      </mesh>
      {[-0.72, 0.72].map(x => (
        <mesh key={x} position={[x * 0.9, 0.86, -9.02]} rotation={[0.55, 0, 0]}>
          <boxGeometry args={[0.5, 0.12, 0.08]} />
          <meshStandardMaterial ref={x > 0 ? head : undefined} color="#ffffff" emissive="#fff7dd" emissiveIntensity={3} toneMapped={false} />
        </mesh>
      ))}
      <mesh material={mats.chrome} position={[0, 0.6, -9.28]}><boxGeometry args={[W - 1.0, 0.06, 0.08]} /></mesh>
      <Bogie z={-1.2} />
      <Bogie z={-5.2} />
    </group>
  );
}

export default function Train() {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    const boosting = engine.boostT > 0;
    group.current.position.y = BASE_Y + Math.sin(t * 13) * 0.01 * Math.min(1, engine.speed / 10);
    const targetZ = boosting ? -7 : 0; // the Express surges ahead on boost, then settles alongside
    group.current.position.z += (targetZ - group.current.position.z) * 0.035;
  });
  return (
    <group ref={group} position={[TRAIN_X, BASE_Y, 0]}>
      <Locomotive />
      <Wagon asset="e" z={-12.4} />
      <Wagon asset="d" z={-7.3} />
      <Wagon asset="g" z={-2.2} />
    </group>
  );
}
