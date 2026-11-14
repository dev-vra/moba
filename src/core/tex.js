// Procedural "painted comic" textures (canvas 2D). All are light-valued: tint comes from vertex colours.
import * as THREE from 'three';
import { rng } from './util.js';

export const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
export const fin = (c, rep = true) => {
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
};
export function blobs(x, R, w, h, n, cols, a, r0, r1) {
  for (let i = 0; i < n; i++) {
    x.globalAlpha = a * (0.5 + R() * 0.5); x.fillStyle = cols[(R() * cols.length) | 0];
    const r = r0 + R() * (r1 - r0);
    x.beginPath(); x.ellipse(R() * w, R() * h, r, r * (0.45 + R() * 0.5), R() * 3.14, 0, 6.283); x.fill();
  }
  x.globalAlpha = 1;
}
export function hatch(x, R, w, h, n, col, len, lw, a = 0.35) {
  x.strokeStyle = col; x.lineWidth = lw; x.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    x.globalAlpha = a * (0.4 + R() * 0.6);
    const px = R() * w, py = R() * h, an = -1.0 + R() * 0.5, l = len * (0.5 + R());
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(an) * l, py + Math.sin(an) * l); x.stroke();
  }
  x.globalAlpha = 1;
}

export const T = {};
// PBR sets baked by tools/bake_assets.py -> public/tex/<name>_{d,n,orm}.jpg
const loader = new THREE.TextureLoader(), cache = {};
export function pbr(name) {
  if (cache[name]) return cache[name];
  const load = (suffix, srgb) => {
    const t = loader.load(`${import.meta.env.BASE_URL}tex/${name}_${suffix}.jpg`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t;
  };
  return (cache[name] = { d: load('d', true), n: load('n', false), orm: load('orm', false) });
}

T.wood = (() => {
  const S = 256, [c, x] = mk(S, S), R = rng(41);
  x.fillStyle = '#b3a593'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 180; i++) {
    x.globalAlpha = 0.12 + R() * 0.25; x.fillStyle = R() < 0.6 ? '#7d5f44' : '#e4d2b6';
    x.fillRect(R() * S, R() * S, 2 + R() * 3, 30 + R() * 140);
  }
  x.globalAlpha = 0.8; x.fillStyle = '#3a2a20';
  for (let i = 0; i < 4; i++) x.fillRect(i * S / 4 - 2, 0, 4, S);
  x.globalAlpha = 1; return fin(c);
})();

T.tarp = (() => {
  const S = 256, [c, x] = mk(S, S), R = rng(53);
  x.fillStyle = '#d9d2c4'; x.fillRect(0, 0, S, S);
  blobs(x, R, S, S, 50, ['#efe9dc', '#b3a996', '#c4b9a4'], 0.35, 14, 60);
  x.strokeStyle = '#4a3b30'; x.lineWidth = 2;
  for (let i = 0; i < 5; i++) {           // patches with stitches
    const px = R() * 190, py = R() * 190, w = 26 + R() * 40, h = 22 + R() * 36;
    x.globalAlpha = 0.5; x.fillStyle = R() < 0.5 ? '#9c917f' : '#f3ecdd'; x.fillRect(px, py, w, h);
    x.globalAlpha = 0.8; x.setLineDash([5, 5]); x.strokeRect(px, py, w, h); x.setLineDash([]);
  }
  for (let i = 0; i < 14; i++) {          // fold lines
    x.globalAlpha = 0.25; x.beginPath(); const px = R() * S; x.moveTo(px, 0); x.bezierCurveTo(px + 30, 80, px - 30, 170, px + 10, S); x.stroke();
  }
  x.globalAlpha = 1; return fin(c);
})();

T.concrete = (() => {
  const S = 256, [c, x] = mk(S, S), R = rng(61);
  x.fillStyle = '#c9c8c0'; x.fillRect(0, 0, S, S);
  blobs(x, R, S, S, 70, ['#dddcd2', '#a9a9a2', '#b8b3a6'], 0.35, 12, 50);
  x.strokeStyle = '#3c3a38'; x.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    x.globalAlpha = 0.55; x.beginPath(); let px = R() * S, py = R() * S; x.moveTo(px, py);
    for (let k = 0; k < 5; k++) { px += (R() - 0.5) * 60; py += (R() - 0.3) * 50; x.lineTo(px, py); } x.stroke();
  }
  x.globalAlpha = 1; hatch(x, R, S, S, 60, '#3c3a38', 10, 2, 0.25); return fin(c);
})();

// greenhouse glass: 8x3 panes, frames painted in, panes missing / shattered (alpha holes)
function glass(seed, missing, cracked) {
  const W = 512, H = 256, [c, x] = mk(W, H), R = rng(seed), pw = W / 8, ph = H / 3;
  for (let i = 0; i < 8; i++) for (let j = 0; j < 3; j++) {
    const px = i * pw, py = j * ph, r = R();
    if (r < missing) {                      // only shards in the corners
      x.fillStyle = 'rgba(190,225,220,.55)';
      for (let k = 0; k < 2; k++) {
        const cx = px + (R() < 0.5 ? 0 : pw), cy = py + (R() < 0.5 ? 0 : ph);
        x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + (cx > px ? -1 : 1) * pw * (0.2 + R() * 0.4), cy);
        x.lineTo(cx, cy + (cy > py ? -1 : 1) * ph * (0.2 + R() * 0.5)); x.fill();
      }
      continue;
    }
    x.fillStyle = `rgba(${165 + R() * 30 | 0},${205 + R() * 25 | 0},${205 + R() * 20 | 0},${0.5 + R() * 0.2})`;
    x.fillRect(px, py, pw, ph);
    x.fillStyle = 'rgba(245,255,255,.35)';   // painted reflection streaks
    x.beginPath(); x.moveTo(px + pw * 0.15, py + ph); x.lineTo(px + pw * 0.45, py); x.lineTo(px + pw * 0.6, py); x.lineTo(px + pw * 0.3, py + ph); x.fill();
    x.fillStyle = 'rgba(70,80,60,.25)'; x.fillRect(px, py + ph * 0.75, pw, ph * 0.25); // grime
    if (r < missing + cracked) {
      const cx = px + pw * (0.3 + R() * 0.4), cy = py + ph * (0.3 + R() * 0.4), pts = [];
      for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283, rr = (k % 2 ? 0.16 : 0.4) * (0.6 + R() * 0.7); pts.push([cx + Math.cos(a) * pw * rr, cy + Math.sin(a) * ph * rr]); }
      x.globalCompositeOperation = 'destination-out'; x.fillStyle = '#000';
      x.beginPath(); pts.forEach((p, k) => k ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath(); x.fill();
      x.globalCompositeOperation = 'source-over';
      x.strokeStyle = 'rgba(20,30,30,.9)'; x.lineWidth = 2.5; x.stroke();
      x.strokeStyle = 'rgba(20,30,30,.7)'; x.lineWidth = 1.5;   // radiating cracks
      for (let k = 0; k < 4; k++) { const p = pts[(R() * 9) | 0]; x.beginPath(); x.moveTo(p[0], p[1]); x.lineTo(p[0] + (p[0] - cx) * 0.9, p[1] + (p[1] - cy) * 0.9); x.stroke(); }
    }
  }
  x.strokeStyle = '#56645f'; x.lineWidth = 7;
  for (let i = 0; i <= 8; i++) { x.beginPath(); x.moveTo(i * pw, 0); x.lineTo(i * pw, H); x.stroke(); }
  for (let j = 0; j <= 3; j++) { x.beginPath(); x.moveTo(0, j * ph); x.lineTo(W, j * ph); x.stroke(); }
  return fin(c);
}
T.glassA = glass(71, 0.16, 0.3);
T.glassB = glass(79, 0.42, 0.3);

T.soft = (() => {
  const [c, x] = mk(128, 128), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); return fin(c, false);
})();
T.beam = (() => {
  const [c, x] = mk(8, 128), g = x.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.6, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,1)');
  x.fillStyle = g; x.fillRect(0, 0, 8, 128); return fin(c, false);
})();
// Vessari rift: vertical lens, hot core
T.rift = (() => {
  const [c, x] = mk(128, 256); x.translate(64, 128); x.scale(1, 2);
  const g = x.createRadialGradient(0, 0, 0, 0, 0, 62); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.12, 'rgba(255,255,255,.95)'); g.addColorStop(0.35, 'rgba(255,255,255,.4)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(-64, -64, 128, 128); return fin(c, false);
})();
// gameplay VFX textures
T.streak = (() => {      // soft horizontal streak, bright core
  const [c, x] = mk(128, 32), g = x.createLinearGradient(0, 0, 128, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.75, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 32);
  const v = x.createLinearGradient(0, 0, 0, 32); v.addColorStop(0, 'rgba(0,0,0,1)'); v.addColorStop(0.5, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,1)');
  x.globalCompositeOperation = 'destination-out'; x.fillStyle = v; x.fillRect(0, 0, 128, 32); return fin(c, false);
})();
T.arrow = (() => {       // skill-shot indicator: soft lane with chevrons and a head (v=1 is the far end)
  const [c, x] = mk(64, 256); const g = x.createLinearGradient(0, 256, 0, 0);
  g.addColorStop(0, 'rgba(255,255,255,.05)'); g.addColorStop(1, 'rgba(255,255,255,.5)'); x.fillStyle = g; x.fillRect(6, 30, 52, 226);
  x.strokeStyle = 'rgba(255,255,255,.95)'; x.lineWidth = 4; x.strokeRect(6, 30, 52, 226);
  x.fillStyle = 'rgba(255,255,255,.95)'; x.beginPath(); x.moveTo(32, 0); x.lineTo(62, 32); x.lineTo(2, 32); x.fill();
  x.lineWidth = 5; for (let y = 80; y < 250; y += 46) { x.beginPath(); x.moveTo(16, y + 16); x.lineTo(32, y); x.lineTo(48, y + 16); x.stroke(); }
  return fin(c, false);
})();
