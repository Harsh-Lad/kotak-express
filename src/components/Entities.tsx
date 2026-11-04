'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { engine, EntityType } from '@/game/engine';
import { Asset, ASSET_META, BRAND } from '@/game/config';
import { coinFaceTexture, stripeTexture, crateTexture, trapTexture, delayTexture, glowTexture, gateSignTexture, plusFiveTexture } from '@/game/textures';

// Rendering is pooled and imperative: React mounts a fixed set of meshes once and the
// game loop repositions them every frame. No React re-renders happen during play.

const POOLS: Record<EntityType, number> = { token: 70, barricade: 16, crate: 16, trap: 10, delay: 8, clock: 6, magnet: 6, gate: 3 };
const ASSET_LIST: Asset[] = ['e', 'd', 'g'];

function useMats() {
  return useMemo(() => {
    const face = {} as Record<Asset, THREE.MeshStandardMaterial>;
    const rim = {} as Record<Asset, THREE.MeshStandardMaterial>;
    const halo = {} as Record<Asset, THREE.SpriteMaterial>;
    ASSET_LIST.forEach(a => {
      const t = coinFaceTexture(a);
      face[a] = new THREE.MeshStandardMaterial({ map: t, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.45, metalness: 0.35, roughness: 0.25 });
      rim[a] = new THREE.MeshStandardMaterial({ color: a === 'g' ? '#f7c443' : a === 'd' ? '#eef2f6' : '#4d8dff', metalness: 1, roughness: 0.16, emissive: ASSET_META[a].color, emissiveIntensity: 0.25 });
      halo[a] = new THREE.SpriteMaterial({ map: glowTexture(), color: ASSET_META[a].glow, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
    });
    const trapTex = trapTexture();
    const delayTex = delayTexture();
    const gateTex = gateSignTexture();
    const plus = plusFiveTexture();
    return {
      face, rim, halo,
      stripe: new THREE.MeshPhysicalMaterial({ map: stripeTexture(), roughness: 0.35, clearcoat: 0.6 }),
      metal: new THREE.MeshStandardMaterial({ color: '#3a3f47', metalness: 0.8, roughness: 0.3 }),
      beacon: new THREE.MeshStandardMaterial({ color: '#ff8a1f', emissive: '#ff6a00', emissiveIntensity: 3, toneMapped: false }),
      crate: new THREE.MeshStandardMaterial({ map: crateTexture(), roughness: 0.75 }),
      strap: new THREE.MeshStandardMaterial({ color: '#2b2f36', metalness: 0.7, roughness: 0.3 }),
      trap: new THREE.MeshStandardMaterial({ map: trapTex, emissive: '#ffffff', emissiveMap: trapTex, emissiveIntensity: 1.4, toneMapped: false, transparent: true }),
      trapRing: new THREE.MeshBasicMaterial({ color: '#ff2a3c', transparent: true, opacity: 0.55, toneMapped: false, depthWrite: false }),
      delay: new THREE.MeshStandardMaterial({ map: delayTex, emissive: '#ffffff', emissiveMap: delayTex, emissiveIntensity: 1, transparent: true, opacity: 0.9, toneMapped: false }),
      delayPost: new THREE.MeshStandardMaterial({ color: '#ffb21a', emissive: '#ff9900', emissiveIntensity: 1.5, toneMapped: false }),
      clock: new THREE.MeshStandardMaterial({ color: '#3be38f', metalness: 0.6, roughness: 0.2, emissive: '#1fbf6c', emissiveIntensity: 0.9 }),
      clockFace: new THREE.MeshStandardMaterial({ map: plus, emissive: '#ffffff', emissiveMap: plus, emissiveIntensity: 0.6 }),
      clockHalo: new THREE.SpriteMaterial({ map: glowTexture(), color: '#55e39b', transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }),
      magnet: new THREE.MeshPhysicalMaterial({ color: '#e5334b', metalness: 0.3, roughness: 0.2, clearcoat: 1 }),
      magnetTip: new THREE.MeshStandardMaterial({ color: '#eef2f6', metalness: 1, roughness: 0.15 }),
      magnetHalo: new THREE.SpriteMaterial({ map: glowTexture(), color: '#ff7bd1', transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }),
      gate: new THREE.MeshPhysicalMaterial({ color: '#f4f5f7', roughness: 0.25, clearcoat: 1 }),
      gateRed: new THREE.MeshPhysicalMaterial({ color: BRAND.red, roughness: 0.3, clearcoat: 1 }),
      gateSign: new THREE.MeshStandardMaterial({ map: gateTex, emissive: '#ffffff', emissiveMap: gateTex, emissiveIntensity: 0.9, toneMapped: false }),
      gateLight: new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#7ff0ff', emissiveIntensity: 3, toneMapped: false }),
    };
  }, []);
}

const geo = {
  coin: new THREE.CylinderGeometry(0.46, 0.46, 0.16, 40),
  board: new THREE.BoxGeometry(1.9, 0.34, 0.1),
  post: new THREE.CylinderGeometry(0.05, 0.05, 1.0, 10),
  foot: new THREE.BoxGeometry(0.5, 0.06, 0.5),
  beacon: new THREE.SphereGeometry(0.09, 12, 10),
  crate: new THREE.BoxGeometry(1.5, 1.1, 1.5),
  strap: new THREE.BoxGeometry(1.52, 0.08, 1.52),
  trap: new THREE.PlaneGeometry(1.9, 1.7),
  ring: new THREE.RingGeometry(0.85, 0.95, 40),
  delay: new THREE.PlaneGeometry(1.95, 1),
  delayPost: new THREE.CylinderGeometry(0.06, 0.06, 0.7, 8),
  clockRing: new THREE.TorusGeometry(0.42, 0.09, 14, 36),
  clockFace: new THREE.CircleGeometry(0.36, 32),
  clockBtn: new THREE.CylinderGeometry(0.07, 0.07, 0.14, 10),
  magnet: new THREE.TorusGeometry(0.34, 0.14, 14, 30, Math.PI),
  magnetTip: new THREE.CylinderGeometry(0.14, 0.14, 0.24, 14),
  gatePillar: new THREE.BoxGeometry(0.6, 5.6, 0.6),
  gateBeam: new THREE.BoxGeometry(8.2, 0.7, 0.7),
  gateSign: new THREE.PlaneGeometry(5.2, 1.3),
  gateStrip: new THREE.BoxGeometry(0.08, 5.0, 0.08),
};

export default function Entities() {
  const mats = useMats();
  const groups = useRef<Record<EntityType, THREE.Group[]>>({ token: [], barricade: [], crate: [], trap: [], delay: [], clock: [], magnet: [], gate: [] });

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const used: Record<EntityType, number> = { token: 0, barricade: 0, crate: 0, trap: 0, delay: 0, clock: 0, magnet: 0, gate: 0 };
    for (const e of engine.entities) {
      if (!e.active) continue;
      const g = groups.current[e.type][used[e.type]++];
      if (!g) continue;
      g.visible = true;
      const z = -(e.s - engine.distance);
      g.position.set(e.x, 0, z);
      if (e.type === 'token') {
        const coin = g.children[0] as THREE.Mesh;
        coin.material = [mats.rim[e.asset], mats.face[e.asset], mats.face[e.asset]];
        (g.children[1] as THREE.Sprite).material = mats.halo[e.asset];
        g.position.y = 0.95 + Math.sin(t * 3 + e.spin) * 0.08;
        coin.rotation.y = t * 2.4 + e.spin;
      } else if (e.type === 'clock' || e.type === 'magnet') {
        g.position.y = 1.0 + Math.sin(t * 3 + e.spin) * 0.1;
        g.children[0].rotation.y = t * 2;
      } else if (e.type === 'delay') {
        const plane = g.children[0] as THREE.Mesh;
        plane.scale.set(1, e.len, 1);
        plane.position.z = -e.len / 2;
        g.children[2].position.z = -e.len;
        g.children[4].position.z = -e.len;
      } else if (e.type === 'trap') {
        const ring = g.children[1] as THREE.Mesh;
        const k = 1 + ((t * 1.5 + e.spin) % 1) * 0.35;
        ring.scale.set(k, k, k);
      } else if (e.type === 'gate') {
        g.position.x = -0.2;
      }
    }
    mats.trap.emissiveIntensity = 1.1 + Math.sin(t * 8) * 0.5;
    mats.beacon.emissiveIntensity = (Math.sin(t * 10) > 0 ? 4 : 0.6);
    (Object.keys(groups.current) as EntityType[]).forEach(k => {
      const pool = groups.current[k];
      for (let i = used[k]; i < pool.length; i++) pool[i].visible = false;
    });
  });

  const reg = (type: EntityType) => (g: THREE.Group | null) => { if (g && !groups.current[type].includes(g)) groups.current[type].push(g); };
  const n = (type: EntityType) => Array.from({ length: POOLS[type] });

  return (
    <group>
      {n('token').map((_, i) => (
        <group key={'t' + i} ref={reg('token')} visible={false}>
          <group><mesh geometry={geo.coin} material={[mats.rim.e, mats.face.e, mats.face.e]} rotation={[Math.PI / 2, 0, 0]} castShadow /></group>
          <sprite material={mats.halo.e} scale={[1.7, 1.7, 1]} />
        </group>
      ))}
      {n('barricade').map((_, i) => (
        <group key={'b' + i} ref={reg('barricade')} visible={false}>
          <mesh geometry={geo.board} material={mats.stripe} position={[0, 0.88, 0]} castShadow />
          <mesh geometry={geo.board} material={mats.stripe} position={[0, 0.45, 0]} castShadow />
          {[-0.85, 0.85].map(x => (
            <group key={x} position={[x, 0, 0.08]}>
              <mesh geometry={geo.post} material={mats.metal} position={[0, 0.5, 0]} />
              <mesh geometry={geo.foot} material={mats.metal} position={[0, 0.03, 0]} />
              <mesh geometry={geo.beacon} material={mats.beacon} position={[0, 1.1, 0]} />
            </group>
          ))}
        </group>
      ))}
      {n('crate').map((_, i) => (
        <group key={'c' + i} ref={reg('crate')} visible={false}>
          <mesh geometry={geo.crate} material={mats.crate} position={[0, 0.55, 0]} castShadow />
          <mesh geometry={geo.strap} material={mats.strap} position={[0, 0.55, 0]} />
          <mesh geometry={geo.crate} material={mats.crate} position={[0.06, 1.65, 0.04]} rotation={[0, 0.18, 0]} castShadow />
          <mesh geometry={geo.strap} material={mats.strap} position={[0.06, 1.65, 0.04]} rotation={[0, 0.18, 0]} />
        </group>
      ))}
      {n('trap').map((_, i) => (
        <group key={'tr' + i} ref={reg('trap')} visible={false}>
          <mesh geometry={geo.trap} material={mats.trap} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} />
          <mesh geometry={geo.ring} material={mats.trapRing} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} />
        </group>
      ))}
      {n('delay').map((_, i) => (
        <group key={'d' + i} ref={reg('delay')} visible={false}>
          <mesh geometry={geo.delay} material={mats.delay} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} />
          <mesh geometry={geo.delayPost} material={mats.delayPost} position={[-0.95, 0.35, 0]} />
          <mesh geometry={geo.delayPost} material={mats.delayPost} position={[-0.95, 0.35, 0]} />
          <mesh geometry={geo.delayPost} material={mats.delayPost} position={[0.95, 0.35, 0]} />
          <mesh geometry={geo.delayPost} material={mats.delayPost} position={[0.95, 0.35, 0]} />
        </group>
      ))}
      {n('clock').map((_, i) => (
        <group key={'cl' + i} ref={reg('clock')} visible={false}>
          <group>
            <mesh geometry={geo.clockRing} material={mats.clock} />
            <mesh geometry={geo.clockFace} material={mats.clockFace} position={[0, 0, 0.02]} />
            <mesh geometry={geo.clockFace} material={mats.clockFace} position={[0, 0, -0.02]} rotation={[0, Math.PI, 0]} />
            <mesh geometry={geo.clockBtn} material={mats.clock} position={[0, 0.55, 0]} />
          </group>
          <sprite material={mats.clockHalo} scale={[1.8, 1.8, 1]} />
        </group>
      ))}
      {n('magnet').map((_, i) => (
        <group key={'m' + i} ref={reg('magnet')} visible={false}>
          <group>
            <mesh geometry={geo.magnet} material={mats.magnet} rotation={[0, 0, Math.PI]} />
            <mesh geometry={geo.magnetTip} material={mats.magnetTip} position={[-0.34, 0.1, 0]} />
            <mesh geometry={geo.magnetTip} material={mats.magnetTip} position={[0.34, 0.1, 0]} />
          </group>
          <sprite material={mats.magnetHalo} scale={[1.8, 1.8, 1]} />
        </group>
      ))}
      {n('gate').map((_, i) => (
        <group key={'g' + i} ref={reg('gate')} visible={false}>
          <mesh geometry={geo.gatePillar} material={mats.gate} position={[-3.9, 2.8, 0]} castShadow />
          <mesh geometry={geo.gatePillar} material={mats.gate} position={[3.9, 2.8, 0]} castShadow />
          <mesh geometry={geo.gateStrip} material={mats.gateLight} position={[-3.55, 2.7, 0.3]} />
          <mesh geometry={geo.gateStrip} material={mats.gateLight} position={[3.55, 2.7, 0.3]} />
          <mesh geometry={geo.gateBeam} material={mats.gateRed} position={[0, 5.6, 0]} />
          <mesh geometry={geo.gateSign} material={mats.gateSign} position={[0, 4.55, 0.32]} />
        </group>
      ))}
    </group>
  );
}
