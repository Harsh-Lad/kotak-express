'use client';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import CityProps from './CityProps';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { engine } from '@/game/engine';
import { ASSET_META } from '@/game/config';
import {
  floorTexture, tactileTexture, railBedTexture, bannerTexture, ledSignTexture, windowsTexture,
  facadeTexture, facadeEmissive, cloudTexture, glowTexture,
} from '@/game/textures';

const SEG = 12;          // station bay length
const SEGMENTS = 17;     // ~200 units of recycled station
const LOOP = SEG * SEGMENTS;
const FAR = -205;

const zoneColor = (z: string) => (z === 'neutral' ? '#fff3dc' : ASSET_META[z as 'e' | 'd' | 'g'].color);

// ---------- shared materials ----------
function useMaterials() {
  return useMemo(() => ({
    iron: new THREE.MeshStandardMaterial({ color: '#2c3a36', metalness: 0.65, roughness: 0.38 }),
    brass: new THREE.MeshStandardMaterial({ color: '#c9a14a', metalness: 0.9, roughness: 0.25 }),
    stone: new THREE.MeshStandardMaterial({ color: '#d9c7a6', roughness: 0.75 }),
    roof: new THREE.MeshStandardMaterial({ color: '#232a2c', metalness: 0.4, roughness: 0.55, side: THREE.DoubleSide }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#c9e4f2', metalness: 0, roughness: 0.08, transmission: 0, transparent: true, opacity: 0.28, side: THREE.DoubleSide }),
    lamp: new THREE.MeshStandardMaterial({ color: '#fff1c9', emissive: '#ffc46b', emissiveIntensity: 4, toneMapped: false }),
    wood: new THREE.MeshStandardMaterial({ color: '#7a4a28', roughness: 0.6 }),
    leaf: new THREE.MeshStandardMaterial({ color: '#3f7f3c', roughness: 0.8 }),
    pot: new THREE.MeshStandardMaterial({ color: '#59616b', roughness: 0.5, metalness: 0.4 }),
    sign: new THREE.MeshStandardMaterial({ color: '#15181f', metalness: 0.5, roughness: 0.4 }),
  }), []);
}

// ---------- sky ----------
function Sky() {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color('#3f6fb3') }, mid: { value: new THREE.Color('#9fc0e0') }, low: { value: new THREE.Color('#ffd1a1') }, horizon: { value: new THREE.Color('#ff9f6e') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 low; uniform vec3 horizon; varying vec3 vP;
      void main(){ float h = vP.y; vec3 c = mix(horizon, low, smoothstep(-0.02, 0.06, h)); c = mix(c, mid, smoothstep(0.06, 0.22, h)); c = mix(c, top, smoothstep(0.22, 0.7, h));
      float sun = pow(max(dot(normalize(vP), normalize(vec3(0.18, 0.06, -1.0))), 0.0), 220.0); float halo = pow(max(dot(normalize(vP), normalize(vec3(0.18, 0.06, -1.0))), 0.0), 9.0);
      c += vec3(1.0, 0.82, 0.55) * sun * 2.5 + vec3(1.0, 0.6, 0.35) * halo * 0.35; gl_FragColor = vec4(c, 1.0); }`,
  }), []);
  const cloud = useMemo(() => cloudTexture(), []);
  const clouds = useMemo(() => Array.from({ length: 9 }, (_, i) => ({ x: -140 + i * 34 + Math.random() * 12, y: 32 + Math.random() * 28, z: -250 - Math.random() * 40, s: 50 + Math.random() * 40 })), []);
  return (
    <group>
      <mesh material={mat} renderOrder={-10}><sphereGeometry args={[320, 32, 16]} /></mesh>
      {clouds.map((c, i) => (
        <mesh key={i} position={[c.x, c.y, c.z]}><planeGeometry args={[c.s, c.s / 2]} /><meshBasicMaterial map={cloud} transparent depthWrite={false} fog={false} opacity={0.85} /></mesh>
      ))}
    </group>
  );
}

// ---------- distant city + heritage terminus ----------
function City() {
  const win = useMemo(() => [windowsTexture(1, 0.3), windowsTexture(2, 0.45), windowsTexture(3, 0.2)], []);
  const towers = useMemo(() => {
    const a: { x: number; z: number; w: number; h: number; d: number; c: string; t: number }[] = [];
    for (let i = 0; i < 60; i++) {
      const side = i % 2 ? 1 : -1;
      const x = side * (18 + Math.random() * 90);
      a.push({ x, z: FAR + 10 - Math.random() * 60, w: 5 + Math.random() * 8, h: 12 + Math.random() * (Math.abs(x) < 50 ? 48 : 26), d: 6, c: ['#8f9db3', '#a7b0bf', '#7f8ea6', '#b3a9a1'][i % 4], t: i % 3 });
    }
    return a;
  }, []);
  const fac = useMemo(() => facadeTexture(), []);
  const facE = useMemo(() => facadeEmissive(), []);
  return (
    <group>
      {towers.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2 - 1, b.z]}>
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial color={b.c} roughness={0.6} metalness={0.2} emissive="#ffcf8a" emissiveMap={win[b.t]} emissiveIntensity={1.4} />
        </mesh>
      ))}
      {/* Heritage terminus at the end of the line (CST-inspired) */}
      <group position={[-1, -1, FAR]}>
        <mesh position={[0, 11, 0]}><boxGeometry args={[46, 22, 12]} /><meshStandardMaterial map={fac} emissive="#ffffff" emissiveMap={facE} emissiveIntensity={0.9} roughness={0.8} /></mesh>
        <mesh position={[0, 26, 0]}><boxGeometry args={[14, 10, 12]} /><meshStandardMaterial color="#d6bb92" roughness={0.8} /></mesh>
        <mesh position={[0, 31, 0]}><cylinderGeometry args={[6.5, 7, 3, 24]} /><meshStandardMaterial color="#c9ab7f" roughness={0.7} /></mesh>
        <mesh position={[0, 33, 0]}><sphereGeometry args={[6.4, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#b89262" roughness={0.45} metalness={0.25} /></mesh>
        <mesh position={[0, 41.5, 0]}><coneGeometry args={[0.9, 4, 12]} /><meshStandardMaterial color="#d8b05a" metalness={0.8} roughness={0.25} /></mesh>
        <mesh position={[0, 27, 6.1]}><circleGeometry args={[2.4, 32]} /><meshStandardMaterial color="#fff6de" emissive="#ffe2a8" emissiveIntensity={1.6} /></mesh>
        {[-20, -10, 10, 20].map(x => (
          <group key={x} position={[x, 22, 0]}>
            <mesh position={[0, 3, 0]}><boxGeometry args={[4, 6, 10]} /><meshStandardMaterial color="#cfb38a" roughness={0.8} /></mesh>
            <mesh position={[0, 9, 0]}><coneGeometry args={[2.6, 7, 8]} /><meshStandardMaterial color="#8a6a48" roughness={0.6} /></mesh>
          </group>
        ))}
        <mesh position={[0, 0.5, 8]}><boxGeometry args={[60, 1, 6]} /><meshStandardMaterial color="#a08f78" /></mesh>
      </group>
    </group>
  );
}

// ---------- one recycled station bay ----------
function Bay({ index, mats }: { index: number; mats: ReturnType<typeof useMaterials> }) {
  const ref = useRef<THREE.Group>(null);
  const banner = useMemo(() => bannerTexture(index % 2 ? ['INVEST', 'GROW'] : ['DIVERSIFY', 'ACHIEVE']), [index]);
  const led = useMemo(() => ledSignTexture(['MUMBAI      08:40', 'NEW DELHI   09:15', 'BENGALURU   10:05', 'A BRIGHTER TOMORROW']), []);
  const arch = useMemo(() => new THREE.TorusGeometry(4.2, 0.12, 8, 32, Math.PI), []);
  const archL = useMemo(() => new THREE.TorusGeometry(3.0, 0.12, 8, 28, Math.PI), []);
  useFrame(() => {
    if (!ref.current) return;
    const o = ((index * SEG - engine.distance) % LOOP + LOOP) % LOOP;
    ref.current.position.z = 16 - o;
  });
  const column = (x: number, h = 6.4) => (
    <group position={[x, 0, 0]}>
      <mesh material={mats.stone} position={[0, 0.25, 0]}><boxGeometry args={[0.7, 0.5, 0.7]} /></mesh>
      <mesh material={mats.iron} position={[0, h / 2, 0]} castShadow><cylinderGeometry args={[0.16, 0.2, h, 14]} /></mesh>
      <mesh material={mats.brass} position={[0, h - 0.2, 0]}><cylinderGeometry args={[0.36, 0.18, 0.4, 14]} /></mesh>
      <mesh material={mats.brass} position={[0, 1.2, 0]}><torusGeometry args={[0.2, 0.05, 6, 16]} /></mesh>
    </group>
  );
  return (
    <group ref={ref}>
      {/* right canopy: columns, arched truss, roof and glazing */}
      {column(4.5)}
      {column(12.5)}
      <mesh geometry={arch} material={mats.iron} position={[8.5, 6.4, 0]} />
      <mesh material={mats.roof} position={[8.5, 9.2, -SEG / 2]} rotation={[0, 0, -0.08]}><boxGeometry args={[10, 0.18, SEG]} /></mesh>
      <mesh material={mats.glass} position={[8.5, 9.05, -SEG / 2]} rotation={[-Math.PI / 2, 0, -0.08]}><planeGeometry args={[3, SEG - 1]} /></mesh>
      <mesh material={mats.iron} position={[4.5, 6.4, -SEG / 2]}><boxGeometry args={[0.22, 0.32, SEG]} /></mesh>
      {/* lantern hanging from the canopy edge */}
      <group position={[4.1, 5.0, -SEG / 2]}>
        <mesh material={mats.iron} position={[0, 0.7, 0]}><cylinderGeometry args={[0.015, 0.015, 1.4, 4]} /></mesh>
        <mesh material={mats.brass} position={[0, 0.02, 0]}><cylinderGeometry args={[0.18, 0.28, 0.12, 8]} /></mesh>
        <mesh material={mats.lamp} position={[0, -0.22, 0]}><sphereGeometry args={[0.2, 14, 12]} /></mesh>
      </group>
      {/* left canopy over the train */}
      {column(-9.2)}
      <mesh geometry={archL} material={mats.iron} position={[-6.2, 6.6, 0]} />
      <mesh material={mats.roof} position={[-6.2, 9.4, -SEG / 2]} rotation={[0, 0, 0.1]}><boxGeometry args={[7.2, 0.18, SEG]} /></mesh>
      <mesh material={mats.iron} position={[-3.2, 6.6, -SEG / 2]}><boxGeometry args={[0.2, 0.28, SEG]} /></mesh>
      <group position={[-3.4, 5.3, -SEG / 2]}>
        <mesh material={mats.iron} position={[0, 0.6, 0]}><cylinderGeometry args={[0.015, 0.015, 1.2, 4]} /></mesh>
        <mesh material={mats.lamp} position={[0, -0.1, 0]}><sphereGeometry args={[0.18, 14, 12]} /></mesh>
      </group>
      {/* Kotak banners hung on the platform columns */}
      <mesh position={[4.2, 3.6, 0]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[0.8, 3.2]} /><meshStandardMaterial map={banner} side={THREE.DoubleSide} roughness={0.7} /></mesh>
      {index % 2 === 1 && <mesh position={[-8.9, 3.6, 0]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[0.8, 3.2]} /><meshStandardMaterial map={banner} side={THREE.DoubleSide} /></mesh>}
      {/* departure board */}
      {index % 4 === 2 && (
        <group position={[6.6, 4.6, -6]} rotation={[0, -0.45, 0]}>
          <mesh material={mats.sign}><boxGeometry args={[3.6, 1.9, 0.2]} /></mesh>
          <mesh position={[0, 0, 0.11]}><planeGeometry args={[3.4, 1.7]} /><meshStandardMaterial map={led} emissive="#ffffff" emissiveMap={led} emissiveIntensity={1.6} toneMapped={false} /></mesh>
          <mesh material={mats.iron} position={[0, 2.2, 0]}><boxGeometry args={[0.06, 2.6, 0.06]} /></mesh>
        </group>
      )}
    </group>
  );
}

export default function World() {
  const { scene, gl } = useThree();
  const mats = useMaterials();
  const floor = useMemo(() => floorTexture(), []);
  const tactile = useMemo(() => tactileTexture(), []);
  const bed = useMemo(() => railBedTexture(), []);
  const laneMats = useRef<THREE.MeshStandardMaterial[]>([]);
  const tint = useMemo(() => new THREE.Color('#fff3dc'), []);
  const glow = useMemo(() => glowTexture(), []);
  const sunGlow = useRef<THREE.Mesh>(null);

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.38;
    scene.fog = new THREE.Fog('#e8b98f', 55, 330);
    return () => { env.dispose(); pmrem.dispose(); };
  }, [gl, scene]);

  useFrame((_, dt) => {
    floor.offset.y = engine.distance / (200 / 34);
    tactile.offset.y = engine.distance / (200 / 220);
    bed.offset.y = engine.distance / (200 / 60);
    tint.lerp(new THREE.Color(zoneColor(engine.zone)), Math.min(1, dt * 3));
    laneMats.current.forEach(m => { if (m) { m.color.copy(tint); m.emissive.copy(tint); } });
  });

  return (
    <group>
      <Sky />
      {/* soft sun bloom low over the terminus */}
      <mesh ref={sunGlow} position={[36, 22, -260]}><planeGeometry args={[90, 90]} /><meshBasicMaterial map={glow} color="#ffb070" transparent depthWrite={false} fog={false} opacity={0.6} blending={THREE.AdditiveBlending} /></mesh>
      <City />

      {/* player platform: polished stone */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -84]} receiveShadow>
        <planeGeometry args={[7.4, 200]} />
        <meshStandardMaterial map={floor} color="#c9b9a2" roughness={0.34} metalness={0.05} envMapIntensity={0.7} />
      </mesh>
      <mesh position={[-3.45, 0.012, -84]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.45, 200]} /><meshStandardMaterial map={tactile} roughness={0.6} /></mesh>
      <mesh position={[-3.76, -0.4, -84]}><boxGeometry args={[0.18, 0.8, 200]} /><meshStandardMaterial color="#c7b9a3" roughness={0.6} /></mesh>
      <mesh position={[-3.7, 0.02, -84]}><boxGeometry args={[0.1, 0.05, 200]} /><meshStandardMaterial color="#e8dcc6" /></mesh>
      {/* lane guides, tinted by the active market zone */}
      {[-1.1, 1.1].map((x, i) => (
        <mesh key={x} position={[x, 0.015, -84]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.07, 200]} />
          <meshStandardMaterial ref={(m) => { if (m) laneMats.current[i] = m; }} color="#fff3dc" emissive="#fff3dc" emissiveIntensity={2.2} toneMapped={false} />
        </mesh>
      ))}
      {/* right concourse + left platform */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[9, -0.01, -84]} receiveShadow><planeGeometry args={[11, 200]} /><meshStandardMaterial map={floor} color="#d6cbbb" roughness={0.35} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-12, -0.01, -84]}><planeGeometry args={[6, 200]} /><meshStandardMaterial map={floor} color="#cbbfae" roughness={0.4} /></mesh>
      <mesh position={[-9.0, -0.4, -84]}><boxGeometry args={[0.2, 0.8, 200]} /><meshStandardMaterial color="#c7b9a3" /></mesh>

      {/* rail bed, sleepers and rails */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-6.2, -0.75, -84]} receiveShadow><planeGeometry args={[5.4, 200]} /><meshStandardMaterial map={bed} roughness={0.95} /></mesh>
      {[-5.0, -6.5].map(x => (
        <mesh key={x} position={[x, -0.6, -84]}><boxGeometry args={[0.12, 0.18, 200]} /><meshStandardMaterial color="#d7dbe0" metalness={1} roughness={0.18} /></mesh>
      ))}

      {Array.from({ length: SEGMENTS }).map((_, i) => <Bay key={i} index={i} mats={mats} />)}
      <Suspense fallback={null}><CityProps /></Suspense>

      {/* warm fill light from the concourse lanterns */}
      <pointLight position={[3, 4.5, -4]} color="#ffbe73" intensity={8} distance={14} decay={2} />
    </group>
  );
}
