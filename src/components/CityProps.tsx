'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { engine } from '@/game/engine';

// CC0 KayKit City Builder props, packed into one file by scripts/build-city-kit.mjs.
export const CITY_URL = process.env.NEXT_PUBLIC_CITY_URL || './models/city.glb';

const BUILDINGS = ['building_A', 'building_B', 'building_C', 'building_D', 'building_E', 'building_F', 'building_G', 'building_H'];

type Kit = Record<string, THREE.Object3D>;

function useKit(): Kit {
  const { scene } = useGLTF(CITY_URL);
  return useMemo(() => {
    const kit: Kit = {};
    scene.children.forEach((c) => {
      c.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          const mat = m.material as THREE.MeshStandardMaterial;
          mat.roughness = 0.7; mat.envMapIntensity = 0.5;
        }
      });
      kit[c.name] = c;
    });
    return kit;
  }, [scene]);
}

function clone(kit: Kit, name: string, scale: number, shadow = false) {
  const src = kit[name];
  if (!src) return new THREE.Group();
  const o = src.clone(true);
  o.position.set(0, 0, 0);
  o.rotation.set(0, 0, 0);
  o.scale.setScalar(scale);
  o.traverse((c) => { const m = c as THREE.Mesh; if (m.isMesh) { m.castShadow = shadow; m.receiveShadow = false; } });
  return o;
}

/** A recycled row of objects that streams past the runner. */
function Row({ count, spacing, build }: { count: number; spacing: number; build: (i: number) => THREE.Object3D }) {
  const items = useMemo(() => Array.from({ length: count }, (_, i) => build(i)), [count, build]);
  const groups = useRef<THREE.Group[]>([]);
  const loop = count * spacing;
  useFrame(() => {
    groups.current.forEach((g, i) => {
      if (!g) return;
      const o = ((i * spacing - engine.distance) % loop + loop) % loop;
      g.position.z = 18 - o;
    });
  });
  return (
    <>
      {items.map((obj, i) => (
        <group key={i} ref={(g) => { if (g) groups.current[i] = g; }}>
          <primitive object={obj} />
        </group>
      ))}
    </>
  );
}

export default function CityProps() {
  const kit = useKit();

  // City blocks lining both sides of the station, beyond the concourse and the far platform.
  const rightBlock = useMemo(() => (i: number) => {
    const g = new THREE.Group();
    const b = clone(kit, BUILDINGS[(i * 3) % BUILDINGS.length], 4.6);
    b.rotation.y = -Math.PI / 2;
    b.position.set(19.5, -0.02, 0);
    g.add(b);
    if (i % 3 === 0) { const w = clone(kit, 'watertower', 4); w.position.set(21, 13.5 + (i % 2) * 2, 2); g.add(w); }
    return g;
  }, [kit]);
  const leftBlock = useMemo(() => (i: number) => {
    const g = new THREE.Group();
    const b = clone(kit, BUILDINGS[(i * 5 + 2) % BUILDINGS.length], 4.6);
    b.rotation.y = Math.PI / 2;
    b.position.set(-20, -0.02, 0);
    g.add(b);
    return g;
  }, [kit]);

  // Concourse furniture between the platform columns.
  const concourse = useMemo(() => (i: number) => {
    const g = new THREE.Group();
    const pick = i % 4;
    if (pick === 0) {
      const bench = clone(kit, 'bench', 5.2, true); bench.rotation.y = Math.PI / 2; bench.position.set(7.2, 0, 0); g.add(bench);
      const bush = clone(kit, 'bush', 3.4, true); bush.position.set(7.4, 0, 2.6); g.add(bush);
    } else if (pick === 1) {
      const light = clone(kit, 'streetlight', 5.0, true); light.rotation.y = Math.PI; light.position.set(10.6, 0, 0); g.add(light);
      const bin = clone(kit, 'trash_A', 6, true); bin.position.set(9.8, 0, 1.4); g.add(bin);
    } else if (pick === 2) {
      const bush = clone(kit, 'bush', 3.6, true); bush.position.set(11.4, 0, -1); g.add(bush);
      const hyd = clone(kit, 'firehydrant', 5, true); hyd.position.set(6.6, 0, 1); g.add(hyd);
      const boxes = clone(kit, 'box_A', 5, true); boxes.position.set(12.2, 0, 2); boxes.rotation.y = 0.4; g.add(boxes);
    } else {
      const light = clone(kit, 'streetlight', 5.0, true); light.rotation.y = Math.PI; light.position.set(10.6, 0, 0); g.add(light);
      const bench = clone(kit, 'bench', 5.2, true); bench.rotation.y = -Math.PI / 2; bench.position.set(12.4, 0, 2); g.add(bench);
    }
    return g;
  }, [kit]);

  return (
    <group>
      <Row count={11} spacing={18} build={rightBlock} />
      <Row count={11} spacing={18} build={leftBlock} />
      <Row count={16} spacing={13} build={concourse} />
    </group>
  );
}

useGLTF.preload(CITY_URL);
