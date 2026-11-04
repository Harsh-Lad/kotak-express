import * as THREE from 'three';
import { ASSET_META, Asset, BRAND } from './config';

// Procedural canvas textures keep the prototype asset-light. In production these are
// replaced by baked textures from the 3D artist, using the same material slots.

const cache = new Map<string, THREE.Texture>();

function canvasTex(key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, repeat?: [number, number], srgb = true) {
  if (cache.has(key)) return cache.get(key)!;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d')!;
  draw(ctx);
  const t = new THREE.CanvasTexture(cv);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  cache.set(key, t);
  return t;
}

const rnd = (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();

/** Polished stone platform: large slabs with subtle veining and grout lines. */
export function floorTexture() {
  return canvasTex('floor', 1024, 1024, (c) => {
    c.fillStyle = '#cfc6b8'; c.fillRect(0, 0, 1024, 1024);
    const n = 4, s = 1024 / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const v = 196 + Math.floor(rnd() * 26);
      const g = c.createLinearGradient(x * s, y * s, x * s + s, y * s + s);
      g.addColorStop(0, `rgb(${v + 8},${v},${v - 12})`);
      g.addColorStop(1, `rgb(${v - 10},${v - 16},${v - 26})`);
      c.fillStyle = g; c.fillRect(x * s + 3, y * s + 3, s - 6, s - 6);
      c.strokeStyle = 'rgba(120,105,90,0.18)'; c.lineWidth = 1.5;
      for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(x * s + rnd() * s, y * s); c.bezierCurveTo(x * s + rnd() * s, y * s + s * 0.3, x * s + rnd() * s, y * s + s * 0.7, x * s + rnd() * s, y * s + s); c.stroke(); }
    }
    c.fillStyle = 'rgba(90,78,66,0.55)';
    for (let i = 0; i <= n; i++) { c.fillRect(i * s - 3, 0, 6, 1024); c.fillRect(0, i * s - 3, 1024, 6); }
  }, [2, 34]);
}

export function tactileTexture() {
  return canvasTex('tactile', 64, 64, (c) => {
    c.fillStyle = '#f2c21b'; c.fillRect(0, 0, 64, 64);
    c.fillStyle = '#d9a90c';
    for (let y = 8; y < 64; y += 16) for (let x = 8; x < 64; x += 16) { c.beginPath(); c.arc(x, y, 4, 0, Math.PI * 2); c.fill(); }
  }, [1, 220]);
}

export function railBedTexture() {
  return canvasTex('railbed', 256, 256, (c) => {
    c.fillStyle = '#4a4541'; c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1400; i++) { const v = 70 + rnd() * 80; c.fillStyle = `rgba(${v},${v - 6},${v - 12},0.8)`; c.fillRect(rnd() * 256, rnd() * 256, 2 + rnd() * 3, 2 + rnd() * 3); }
    for (let y = 0; y < 256; y += 64) { c.fillStyle = '#3b3029'; c.fillRect(8, y + 18, 240, 26); c.fillStyle = 'rgba(255,255,255,0.06)'; c.fillRect(8, y + 18, 240, 4); }
  }, [1, 60]);
}

export function coinFaceTexture(a: Asset) {
  const m = ASSET_META[a];
  return canvasTex('coinface-' + a, 256, 256, (c) => {
    const g = c.createRadialGradient(100, 90, 8, 128, 128, 130);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.3, m.glow);
    g.addColorStop(1, m.color);
    c.fillStyle = g; c.beginPath(); c.arc(128, 128, 128, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 8; c.beginPath(); c.arc(128, 128, 104, 0, Math.PI * 2); c.stroke();
    c.save(); c.shadowColor = 'rgba(0,0,0,0.35)'; c.shadowBlur = 8; c.shadowOffsetY = 4;
    c.fillStyle = a === 'd' ? '#5b6676' : '#ffffff';
    if (a === 'e') {
      [[66, 150, 30, 40], [113, 118, 30, 72], [160, 84, 30, 106]].forEach(([x, y, w, h]) => { c.beginPath(); c.roundRect(x, y, w, h, 6); c.fill(); });
      c.strokeStyle = '#ffffff'; c.lineWidth = 9; c.lineCap = 'round'; c.beginPath(); c.moveTo(66, 118); c.lineTo(112, 92); c.lineTo(140, 104); c.lineTo(192, 64); c.stroke();
    } else if (a === 'd') {
      for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(128, 176 - i * 24, 54, 17, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#e8edf3'; c.lineWidth = 4; c.stroke(); }
    } else {
      c.fillStyle = '#fff6d0';
      c.beginPath(); c.moveTo(60, 172); c.lineTo(88, 104); c.lineTo(168, 104); c.lineTo(196, 172); c.closePath(); c.fill();
      c.fillStyle = 'rgba(190,130,10,0.55)'; c.beginPath(); c.moveTo(88, 104); c.lineTo(168, 104); c.lineTo(150, 124); c.lineTo(106, 124); c.closePath(); c.fill();
    }
    c.restore();
  });
}

export function glowTexture() {
  return canvasTex('glow', 128, 128, (c) => {
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 128, 128);
  });
}

export function cloudTexture() {
  return canvasTex('cloud', 512, 256, (c) => {
    for (let i = 0; i < 26; i++) {
      const x = 80 + rnd() * 350, y = 110 + rnd() * 60, r = 40 + rnd() * 70;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,240,228,0.55)'); g.addColorStop(1, 'rgba(255,240,228,0)');
      c.fillStyle = g; c.fillRect(0, 0, 512, 256);
    }
  });
}

export function stripeTexture() {
  return canvasTex('stripe', 256, 64, (c) => {
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, 256, 64);
    c.fillStyle = BRAND.red;
    for (let x = -64; x < 320; x += 64) { c.beginPath(); c.moveTo(x, 64); c.lineTo(x + 32, 0); c.lineTo(x + 64, 0); c.lineTo(x + 32, 64); c.closePath(); c.fill(); }
  });
}

export function crateTexture() {
  return canvasTex('crate', 512, 512, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, '#b07a45'); g.addColorStop(1, '#8a5b2f');
    c.fillStyle = g; c.fillRect(0, 0, 512, 512);
    c.fillStyle = 'rgba(0,0,0,0.13)'; for (let y = 0; y < 512; y += 64) c.fillRect(0, y, 512, 5);
    for (let i = 0; i < 300; i++) { c.fillStyle = `rgba(60,35,15,${rnd() * 0.15})`; c.fillRect(rnd() * 512, rnd() * 512, 30 + rnd() * 60, 2); }
    c.strokeStyle = '#5e3c1d'; c.lineWidth = 34; c.strokeRect(17, 17, 478, 478);
    c.lineWidth = 30; c.beginPath(); c.moveTo(34, 34); c.lineTo(478, 478); c.stroke();
    c.fillStyle = BRAND.navy; c.beginPath(); c.roundRect(130, 196, 252, 120, 14); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(186, 256, 30, 0, Math.PI * 2); c.fill();
    c.fillStyle = BRAND.red; c.beginPath(); c.arc(198, 256, 18, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffffff'; c.font = 'bold 50px Arial'; c.textAlign = 'left'; c.fillText('kotak', 228, 274);
  });
}

export function trapTexture() {
  return canvasTex('trap', 512, 512, (c) => {
    c.fillStyle = '#1a0507'; c.fillRect(0, 0, 512, 512);
    c.strokeStyle = '#ff3346'; c.lineWidth = 16; c.beginPath(); c.roundRect(16, 16, 480, 480, 40); c.stroke();
    c.strokeStyle = 'rgba(255,51,70,0.4)'; c.lineWidth = 6; c.beginPath(); c.roundRect(46, 46, 420, 420, 28); c.stroke();
    c.fillStyle = '#ff4a5a'; c.font = 'bold 150px Arial'; c.textAlign = 'center'; c.fillText('−10s', 256, 300);
  });
}

export function delayTexture() {
  return canvasTex('delay', 128, 512, (c) => {
    c.fillStyle = '#2a1e04'; c.fillRect(0, 0, 128, 512);
    c.fillStyle = '#ffb21a';
    for (let y = 0; y < 512; y += 64) { c.beginPath(); c.moveTo(0, y + 40); c.lineTo(64, y); c.lineTo(128, y + 40); c.lineTo(128, y + 58); c.lineTo(64, y + 18); c.lineTo(0, y + 58); c.closePath(); c.fill(); }
  });
}

export function liveryTexture() {
  return canvasTex('livery', 1024, 256, (c) => {
    c.clearRect(0, 0, 1024, 256);
    c.fillStyle = BRAND.navy; c.beginPath(); c.arc(110, 128, 78, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#ffffff'; c.lineWidth = 12; c.beginPath(); c.arc(110, 128, 72, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 15; c.strokeStyle = '#ffffff'; c.beginPath(); c.ellipse(86, 128, 28, 22, 0, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = BRAND.red; c.beginPath(); c.ellipse(134, 128, 28, 22, 0, 0, Math.PI * 2); c.stroke();
    c.fillStyle = BRAND.red; c.font = 'bold 110px Arial'; c.textAlign = 'left'; c.fillText('kotak', 210, 146);
    c.fillStyle = BRAND.navy; c.font = '600 44px Arial'; c.fillText('Multi-Asset Express', 214, 202);
  });
}

export function wagonLabelTexture(a: Asset) {
  const m = ASSET_META[a];
  return canvasTex('wagon-' + a, 512, 128, (c) => {
    c.fillStyle = 'rgba(8,12,28,0.9)'; c.beginPath(); c.roundRect(0, 0, 512, 128, 22); c.fill();
    c.fillStyle = m.color; c.fillRect(24, 106, 464, 8);
    c.fillStyle = '#ffffff'; c.font = 'bold 66px Arial'; c.textAlign = 'center'; c.fillText(m.name.toUpperCase(), 256, 82);
  });
}

export function ledSignTexture(lines: string[], color = '#ffb547') {
  return canvasTex('led-' + lines.join('|'), 512, 256, (c) => {
    c.fillStyle = '#0b0d12'; c.fillRect(0, 0, 512, 256);
    c.fillStyle = color; c.font = 'bold 46px "Courier New", monospace'; c.textAlign = 'left';
    lines.forEach((l, i) => c.fillText(l, 28, 70 + i * 58));
    c.fillStyle = 'rgba(0,0,0,0.35)'; for (let y = 0; y < 256; y += 4) c.fillRect(0, y, 512, 1);
  });
}

export function bannerTexture(words: string[]) {
  return canvasTex('banner-' + words.join('|'), 256, 1024, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 1024); g.addColorStop(0, '#e01f2a'); g.addColorStop(1, '#a7101a');
    c.fillStyle = g; c.fillRect(0, 0, 256, 1024);
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(128, 150, 72, 0, Math.PI * 2); c.fill();
    c.fillStyle = BRAND.navy; c.beginPath(); c.arc(128, 150, 62, 0, Math.PI * 2); c.fill();
    c.lineWidth = 11; c.strokeStyle = '#fff'; c.beginPath(); c.ellipse(108, 150, 22, 17, 0, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = BRAND.red; c.beginPath(); c.ellipse(148, 150, 22, 17, 0, 0, Math.PI * 2); c.stroke();
    c.fillStyle = '#ffffff'; c.font = 'bold 46px Arial'; c.textAlign = 'center';
    words.forEach((w, i) => c.fillText(w, 128, 340 + i * 82));
    c.fillRect(70, 340 + words.length * 82, 116, 6);
  });
}

export function windowsTexture(seed = 0, lit = 0.35) {
  return canvasTex('win-' + seed + '-' + lit, 128, 256, (c) => {
    c.fillStyle = '#000'; c.fillRect(0, 0, 128, 256);
    for (let y = 6; y < 256; y += 14) for (let x = 6; x < 128; x += 14) {
      if (rnd() < lit) { const w = 200 + rnd() * 55; c.fillStyle = `rgb(${w},${w * 0.82},${w * 0.55})`; c.fillRect(x, y, 8, 9); }
    }
  });
}

export function facadeTexture() {
  return canvasTex('facade', 512, 256, (c) => {
    c.fillStyle = '#d8bf98'; c.fillRect(0, 0, 512, 256);
    for (let x = 16; x < 512; x += 48) {
      c.fillStyle = '#6b4a2c';
      c.beginPath(); c.moveTo(x, 200); c.lineTo(x, 110); c.arc(x + 14, 110, 14, Math.PI, 0); c.lineTo(x + 28, 200); c.closePath(); c.fill();
      c.fillStyle = '#ffd99a';
      c.beginPath(); c.moveTo(x + 4, 196); c.lineTo(x + 4, 112); c.arc(x + 14, 112, 10, Math.PI, 0); c.lineTo(x + 24, 196); c.closePath(); c.fill();
    }
    c.fillStyle = '#b89668'; c.fillRect(0, 40, 512, 14); c.fillRect(0, 214, 512, 14);
  });
}

export function facadeEmissive() {
  return canvasTex('facade-e', 512, 256, (c) => {
    c.fillStyle = '#000'; c.fillRect(0, 0, 512, 256);
    for (let x = 16; x < 512; x += 48) {
      c.fillStyle = rnd() < 0.7 ? '#ffb85c' : '#3a2a18';
      c.beginPath(); c.moveTo(x + 4, 196); c.lineTo(x + 4, 112); c.arc(x + 14, 112, 10, Math.PI, 0); c.lineTo(x + 24, 196); c.closePath(); c.fill();
    }
  });
}

export function gateSignTexture() {
  return canvasTex('gate-sign', 1024, 256, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#e3222d'); g.addColorStop(1, '#a8101a');
    c.fillStyle = g; c.beginPath(); c.roundRect(0, 0, 1024, 256, 40); c.fill();
    c.strokeStyle = '#ffd36a'; c.lineWidth = 10; c.beginPath(); c.roundRect(14, 14, 996, 228, 32); c.stroke();
    c.fillStyle = '#fff'; c.font = 'bold 96px Arial'; c.textAlign = 'center'; c.fillText('STATION CHECKPOINT', 512, 160);
  });
}

export function plusFiveTexture() {
  return canvasTex('plus5', 256, 256, (c) => {
    const g = c.createRadialGradient(128, 110, 10, 128, 128, 128); g.addColorStop(0, '#d8ffe9'); g.addColorStop(1, '#20b56a');
    c.fillStyle = g; c.beginPath(); c.arc(128, 128, 120, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#0a3d24'; c.font = 'bold 92px Arial'; c.textAlign = 'center'; c.fillText('+5s', 128, 160);
  });
}
