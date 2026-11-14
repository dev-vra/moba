// Low-poly prop kit for the Cidade-Celeiro. Everything is added to a Batch (b = solid, g = glass/fx).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { M, glowC, CYAN, AMBER } from '../core/mats.js';

// bevelled box for anything chunky enough to catch a highlight
export const B = (w, h, d) => {
  const m = Math.min(w, h, d), g = m >= 0.28 ? new RoundedBoxGeometry(w, h, d, 2, Math.min(0.08, m * 0.16)) : new THREE.BoxGeometry(w, h, d);
  g.userData.box = true; return g;
};
export const C = (rt, rb, h, seg = 10, open = false) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);
const PI = Math.PI;
const _up = new THREE.Vector3(0, 1, 0), _d = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler();

// box beam between two points
export function beam(b, mat, p1, p2, t, c, t2 = t) {
  _d.set(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]); const L = _d.length();
  _q.setFromUnitVectors(_up, _d.normalize()); _e.setFromQuaternion(_q);
  b.add(B(t, L, t2), mat, [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, (p1[2] + p2[2]) / 2], [_e.x, _e.y, _e.z], c);
}
export function wire(b, p1, p2, sag = 1.2, c = 0x17161a, rad = 0.035) {
  const mid = new THREE.Vector3((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2 - sag, (p1[2] + p2[2]) / 2);
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(...p1), mid, new THREE.Vector3(...p2)]);
  b.add(new THREE.TubeGeometry(curve, 10, rad, 4), M.flat, [0, 0, 0], [0, 0, 0], c);
  return curve;
}

export function silo(b, R, x, z, { r = 3.2, h = 11, tint = 0xd9cfc2 } = {}) {
  b.push(x, 0, z, R() * 6.28);
  b.add(C(r * 1.1, r * 1.15, 0.5, 16), M.concrete, [0, 0.25, 0], [0, 0, 0], 0x8f8a80);
  b.add(C(r, r, h, 24), M.oldmetal, [0, 0.5 + h / 2, 0], [0, 0, 0], tint);
  b.add(C(0.5, r * 1.04, r * 0.55, 24), M.rustB, [0, 0.5 + h + r * 0.275, 0], [0, 0, 0], 0xc0b4a8);
  b.add(C(0.5, 0.6, 0.6, 8), M.flat, [0, 0.5 + h + r * 0.55 + 0.25, 0], [0, 0, 0], 0x4a3a32);
  for (let i = 1; i <= 3; i++) b.add(C(r * 1.025, r * 1.025, 0.22, 20, true), M.flat, [0, 0.5 + (h * i) / 3.4, 0], [0, 0, 0], 0x5b3d2e);
  for (let i = 0; i < 20; i++) { const a = (i / 20) * 6.283; b.add(new THREE.BoxGeometry(0.09, h, 0.09), M.oldmetal, [Math.cos(a) * (r + 0.03), 0.5 + h / 2, Math.sin(a) * (r + 0.03)], [0, -a, 0], 0xb9b4aa); }      // stiffener ribs
  for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.283 + 0.3; beam(b, M.flat, [Math.cos(a) * r * 1.03, 0.5 + h + 0.03, Math.sin(a) * r * 1.03], [Math.cos(a) * 0.5, 0.5 + h + r * 0.56, Math.sin(a) * 0.5], 0.07, 0x5a4e46); }   // roof seams
  for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.283; b.add(new THREE.BoxGeometry(0.05, 0.9, 0.05), M.flat, [Math.cos(a) * r * 0.98, 0.5 + h + 0.5, Math.sin(a) * r * 0.98], [0, 0, 0], 0x3a3634); }   // top guard rail
  b.add(new THREE.TorusGeometry(r * 0.98, 0.035, 4, 24), M.flat, [0, 0.5 + h + 0.95, 0], [PI / 2, 0, 0], 0x3a3634);
  b.add(C(r * 1.06, r * 1.06, 0.12, 20), M.rustB, [0, 0.5 + h, 0], [0, 0, 0], 0xa09080);
  // ladder
  for (const s of [-0.28, 0.28]) b.add(B(0.07, h, 0.07), M.flat, [s, 0.5 + h / 2, r + 0.14], [0, 0, 0], 0x33302e);
  for (let y = 1; y < h; y += 0.65) b.add(B(0.56, 0.05, 0.05), M.flat, [0, 0.5 + y, r + 0.14], [0, 0, 0], 0x33302e);
  // feed pipe
  b.add(C(0.24, 0.24, h * 0.85, 8), M.rust, [-r - 0.3, 0.5 + h * 0.425, 0.6], [0, 0, 0], 0x8f8478);
  b.add(B(0.6, 0.5, 0.5), M.rust, [-r - 0.1, 0.5 + h * 0.86, 0.6], [0, 0, 0], 0x7a5440);
  b.add(B(1.1, 1.8, 0.2), M.flat, [0.9, 1.4, -r + 0.02], [0, 0, 0], 0x3d3430);
  b.pop();
}

export function bush(b, R, x, y, z, s = 1, c = 0x4f7a3a) {
  const n = 2 + ((R() * 2) | 0);
  for (let i = 0; i < n; i++) {
    const col = new THREE.Color(c).offsetHSL((R() - 0.5) * 0.04, 0, (R() - 0.5) * 0.08);
    b.add(new THREE.IcosahedronGeometry(0.6, 1), M.flat, [x + (R() - 0.5) * s, y + 0.35 * s + R() * 0.3 * s, z + (R() - 0.5) * s],
      [R() * 3, R() * 3, 0], col, [s * (0.8 + R() * 0.6), s * (0.6 + R() * 0.4), s * (0.8 + R() * 0.6)]);
  }
}
export function rock(b, R, x, y, z, s = 1, c = 0x7a756c) {
  b.add(new THREE.DodecahedronGeometry(0.6, 1), M.rock, [x, y + 0.2 * s, z], [R() * 3, R() * 3, R() * 3], c, [s * (0.8 + R() * 0.7), s * (0.5 + R() * 0.4), s * (0.8 + R() * 0.7)]);
}
export function deadTree(b, R, x, y, z, s = 1) {
  b.push(x, y, z, R() * 6.28, s);
  const c = 0x4a3c33;
  b.add(C(0.14, 0.3, 3.2, 6), M.flat, [0, 1.6, 0], [0, 0, 0.06], c);
  for (let i = 0; i < 4; i++) {
    const a = R() * 6.28, t = 0.5 + R() * 0.5, yy = 1.6 + R() * 1.5;
    beam(b, M.flat, [0, yy, 0], [Math.cos(a) * 1.3, yy + 0.6 + t, Math.sin(a) * 1.3], 0.11, c);
    beam(b, M.flat, [Math.cos(a) * 1.3, yy + 0.6 + t, Math.sin(a) * 1.3], [Math.cos(a + 0.5) * 1.9, yy + 1.5 + t, Math.sin(a + 0.5) * 1.9], 0.07, c);
  }
  b.pop();
}

export function greenhouse(b, g, R, x, z, ry, { len = 14, wid = 6, wall = 2.4, roof = 1.7, ruined = false } = {}) {
  const gm = ruined ? M.glassB : M.glassA, fc = ruined ? 0x8f8676 : 0xa9b0a4, y0 = 0.35;
  b.push(x, 0, z, ry); g.push(x, 0, z, ry);
  b.add(B(len + 0.5, y0, wid + 0.5), M.concrete, [0, y0 / 2, 0], [0, 0, 0], 0x8a8d84);
  const n = Math.round(len / 2.3), sl = Math.hypot(wid / 2, roof), ang = Math.atan2(roof, wid / 2);
  for (let i = 0; i <= n; i++) {
    const px = -len / 2 + (i * len) / n;
    for (const s of [-1, 1]) {
      b.add(B(0.16, wall, 0.16), M.oldmetal, [px, y0 + wall / 2, (s * wid) / 2], [0, 0, 0], fc);
      if (ruined && R() < 0.3) continue;
      b.add(B(0.11, 0.11, sl), M.oldmetal, [px, y0 + wall + roof / 2, (s * wid) / 4], [s * ang, 0, 0], fc);
    }
  }
  for (const s of [-1, 1]) b.add(B(len, 0.14, 0.14), M.oldmetal, [0, y0 + wall, (s * wid) / 2], [0, 0, 0], fc);
  b.add(B(len, 0.14, 0.14), M.oldmetal, [0, y0 + wall + roof, 0], [0, 0, 0], fc);
  for (const s of [-1, 1]) {                         // gable frames
    b.add(B(0.14, 0.14, wid), M.oldmetal, [(s * len) / 2, y0 + wall, 0], [0, 0, 0], fc);
    b.add(B(0.12, roof, 0.12), M.oldmetal, [(s * len) / 2, y0 + wall + roof / 2, 0], [0, 0, 0], fc);
  }
  // glass
  const uvL = [len / 9.6, 1];
  for (const s of [-1, 1]) {
    g.add(new THREE.PlaneGeometry(len, wall), gm, [0, y0 + wall / 2, (s * wid) / 2], [0, 0, 0], 0xffffff, 1, uvL);
    if (!(ruined && s === 1)) g.add(new THREE.PlaneGeometry(len, sl), gm, [0, y0 + wall + roof / 2, (s * wid) / 4], [-s * (PI / 2 - ang), 0, 0], 0xffffff, 1, uvL);
    g.add(new THREE.PlaneGeometry(wid, wall), gm, [(s * len) / 2, y0 + wall / 2, 0], [0, PI / 2, 0], 0xffffff, 1, [wid / 9.6, 1]);
  }
  // planters + overgrowth
  for (const s of [-1, 1]) {
    b.add(B(len * 0.82, 0.55, 1.1), M.wood, [0, y0 + 0.27, (s * wid) / 4.2], [0, 0, 0], 0x6e5a48);
    for (let i = 0; i < len * 0.5; i++) {
      const px = (R() - 0.5) * len * 0.78;
      if (R() < 0.6) bush(b, R, px, y0 + 0.5, (s * wid) / 4.2, 0.55 + R() * 0.5, R() < 0.25 ? 0x4a4a22 : 0x24401f);
    }
  }
  b.pop(); g.pop();
}

export function fence(b, R, x1, z1, x2, z2) {
  const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz), n = Math.round(L / 2), ry = -Math.atan2(dz, dx);
  for (let i = 0; i <= n; i++) {
    const t = i / n, px = x1 + dx * t, pz = z1 + dz * t, tilt = (R() - 0.5) * 0.25;
    b.add(B(0.16, 1.3, 0.16), M.wood, [px, 0.65, pz], [tilt, ry, tilt], 0x7a6450);
    if (i < n && R() < 0.82) {
      const mx = px + dx / n / 2, mz = pz + dz / n / 2;
      b.add(B(L / n, 0.1, 0.06), M.wood, [mx, 1.05, mz], [0, ry, (R() - 0.5) * 0.12], 0x8a735c);
      if (R() < 0.75) b.add(B(L / n, 0.1, 0.06), M.wood, [mx, 0.6, mz], [0, ry, (R() - 0.5) * 0.2], 0x8a735c);
    }
  }
}

export function pole(b, x, z, ry = 0, h = 7.5) {
  b.push(x, 0, z, ry);
  b.add(C(0.11, 0.17, h, 6), M.wood, [0, h / 2, 0], [0, 0, 0.03], 0x5e4c3e);
  b.add(B(0.12, 0.12, 2), M.wood, [0, h - 0.7, 0], [0, 0, 0], 0x5e4c3e);
  for (const s of [-0.85, 0.85]) b.add(C(0.07, 0.09, 0.22, 6), M.flat, [0, h - 0.55, s], [0, 0, 0], 0x9fb0a8);
  b.pop();
  const c = Math.cos(ry), s = Math.sin(ry);
  return [[x + s * 0.85, h - 0.45, z + c * 0.85], [x - s * 0.85, h - 0.45, z - c * 0.85]];
}

export function barrel(b, R, x, y, z, c) {
  const cols = [0x5f8a84, 0xb0533a, 0xc9a23a, 0x8a6a54];
  const lay = R() < 0.2;
  b.add(C(0.42, 0.42, 1.1, 10), M.rust, [x, y + (lay ? 0.42 : 0.55), z], lay ? [PI / 2, R() * 3, 0] : [0, R() * 3, 0], c ?? cols[(R() * 4) | 0]);
}
export function crate(b, R, x, y, z, s = 1) {
  b.add(B(s, s, s), M.wood, [x, y + s / 2, z], [0, R() * 3, 0], 0x9a7f60);
}
export function tire(b, R, x, y, z, flat = true) {
  b.add(new THREE.TorusGeometry(0.42, 0.19, 6, 12), M.flat, [x, y + (flat ? 0.19 : 0.6), z], flat ? [PI / 2, 0, 0] : [0, R() * 3, 0], 0x1e1d22);
}
export function hay(b, R, x, y, z) {
  b.add(C(0.75, 0.75, 1.2, 12), M.wood, [x, y + 0.75, z], [PI / 2, 0, R() * 3], 0xd3ac52);
}
export function scrap(b, R, x, z, s = 1) {
  b.push(x, 0, z, R() * 6.28, s);
  const cols = [0x9a5a36, 0x7a4630, 0xb7774a, 0x5f7a76, 0x6b5a50];
  for (let i = 0; i < 9; i++) {
    const a = R() * 6.28, d = R() * 1.6, c = cols[(R() * cols.length) | 0];
    if (R() < 0.6) b.add(B(0.7 + R() * 1.6, 0.08, 0.6 + R() * 1.2), M.rust, [Math.cos(a) * d, 0.2 + R() * 0.9, Math.sin(a) * d], [(R() - 0.5) * 1.6, R() * 3, (R() - 0.5) * 1.6], c);
    else b.add(B(0.4 + R() * 0.8, 0.4 + R() * 0.7, 0.4 + R() * 0.8), M.rust, [Math.cos(a) * d, 0.3, Math.sin(a) * d], [R(), R() * 3, R()], c);
  }
  for (let i = 0; i < 3; i++) tire(b, R, (R() - 0.5) * 3, i * 0.08, (R() - 0.5) * 3, R() < 0.6);
  beam(b, M.flat, [0, 0, 0], [(R() - 0.5) * 2, 2 + R(), (R() - 0.5) * 2], 0.09, 0x3a3230);
  b.pop();
}

// farm wind-pump; returns the spinning wheel (separate, animated)
export function windmill(b, scene, x, y, z, ry = 0) {
  const h = 10, c = 0x8a8478;
  b.push(x, y, z, ry);
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) beam(b, M.oldmetal, [sx * 1.5, 0, sz * 1.5], [sx * 0.25, h, sz * 0.25], 0.14, c);
  for (let i = 1; i < 5; i++) {
    const yy = (h * i) / 5, w = 1.5 - (1.25 * i) / 5;
    for (const s of [-1, 1]) { b.add(B(w * 2, 0.08, 0.08), M.oldmetal, [0, yy, s * w], [0, 0, 0], c); b.add(B(0.08, 0.08, w * 2), M.oldmetal, [s * w, yy, 0], [0, 0, 0], c); }
  }
  b.add(B(0.8, 0.5, 0.8), M.rust, [0, h + 0.1, 0], [0, 0, 0], 0x7a5a46);
  b.add(B(2.4, 0.9, 0.05), M.rust, [-1.8, h + 0.2, 0], [0, 0, 0], 0xa56a48);
  b.pop();
  const wheel = new THREE.Group(), wb = new THREE.Group();
  const blade = new THREE.Mesh(B(0.5, 1.7, 0.04), M.rust);
  blade.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(72).fill(0.62), 3));
  for (let i = 0; i < 10; i++) {
    const m = blade.clone(), a = (i / 10) * 6.283; m.position.set(Math.cos(a) * 1.25, Math.sin(a) * 1.25, 0); m.rotation.set(0, 0.35, a - PI / 2);
    m.castShadow = true; wb.add(m);
  }
  wheel.add(wb); wheel.position.set(x + Math.sin(ry) * 0.55, y + h + 0.2, z + Math.cos(ry) * 0.55); wheel.rotation.y = ry; scene.add(wheel);
  return wb;
}

export function harvester(b, R, x, z, ry) {
  b.push(x, 0, z, ry, 1, 0, 0.07);
  const body = 0xa8a24e, dark = 0x2a2a2e;
  b.add(B(5, 2, 2.6), M.rust, [0, 1.9, 0], [0, 0, 0], body);
  b.add(B(2.2, 1.4, 2.2), M.rust, [0.6, 3.5, 0], [0, 0, 0], 0x8f8a44);
  b.add(B(1.7, 1.5, 2), M.flat, [2.2, 3.3, 0], [0, 0, 0], 0x33424a);                     // cab
  b.add(B(1.8, 0.12, 2.1), M.rust, [2.2, 4.1, 0], [0, 0, 0], body);
  b.add(C(0.16, 0.16, 2.6, 6), M.rust, [-1.6, 3.6, 0.8], [0, 0, 0.5], 0x6b5a4a);          // chute
  for (const s of [-1, 1]) {
    b.add(C(1.1, 1.1, 0.6, 12), M.flat, [1.4, 1.0, s * 1.5], [PI / 2, 0, 0], dark);
    b.add(C(0.5, 0.5, 0.64, 8), M.rust, [1.4, 1.0, s * 1.5], [PI / 2, 0, 0], 0x9a7a4a);
    b.add(C(0.6, 0.6, 0.45, 10), M.flat, [-1.8, 0.55, s * 1.3], [PI / 2, 0, 0], dark);
  }
  // header + reel
  b.add(B(1.4, 0.8, 5.4), M.rust, [3.9, 0.7, 0], [0, 0, 0], 0x8a5a3c);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.283; b.add(B(0.07, 0.07, 5.2), M.flat, [4.2 + Math.cos(a) * 0.6, 1.5 + Math.sin(a) * 0.6, 0], [0, 0, 0], 0x4a4038); }
  for (const s of [-1, 1]) b.add(C(0.62, 0.62, 0.08, 8), M.rust, [4.2, 1.5, s * 2.6], [PI / 2, 0, 0], 0x7a4a34);
  b.pop();
  for (let i = 0; i < 5; i++) bush(b, R, x + (R() - 0.5) * 6, 0, z + (R() - 0.5) * 4, 0.7, 0x2c3f1e);
}

export function waterTank(b, R, x, y, z) {
  b.push(x, y, z, R() * 6);
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) beam(b, M.oldmetal, [sx * 1.6, 0, sz * 1.6], [sx * 1.1, 5, sz * 1.1], 0.16, 0x7a7468);
  for (const s of [-1, 1]) { beam(b, M.oldmetal, [-1.5, 0.5, s * 1.5], [1.2, 4.6, s * 1.2], 0.08, 0x7a7468); beam(b, M.oldmetal, [s * 1.5, 0.5, 1.5], [s * 1.2, 4.6, -1.2], 0.08, 0x7a7468); }
  b.add(C(2, 2, 2.6, 18), M.oldmetal, [0, 6.3, 0], [0, 0, 0], 0xc8b8a8);
  b.add(C(0.2, 2.1, 0.9, 14), M.rust, [0, 8.05, 0], [0, 0, 0], 0x8a5e46);
  b.pop();
}

// ---------- faction dressing ----------
export function axWall(b, x, z, ry, len = 4) {
  b.push(x, 0, z, ry);
  b.add(B(len, 1.3, 0.55), M.axiom, [0, 0.65, 0], [0, 0, 0], 0xe6edf4);
  b.add(B(len + 0.1, 0.14, 0.62), M.flat, [0, 1.37, 0], [0, 0, 0], 0x2c3644);
  b.add(B(len * 0.86, 0.09, 0.58), M.glow, [0, 0.85, 0], [0, 0, 0], glowC(CYAN, 2));
  for (const s of [-1, 1]) b.add(B(0.3, 1.6, 0.7), M.flat, [(s * len) / 2, 0.8, 0], [0, 0, 0], 0x394656);
  b.pop();
}
export function axPylon(b, x, z, h = 5) {
  b.push(x, 0, z, PI / 4);
  b.add(C(0.45, 0.6, 0.4, 4), M.flat, [0, 0.2, 0], [0, 0, 0], 0x2c3644);
  b.add(C(0.16, 0.34, h, 4), M.axiom, [0, 0.4 + h / 2, 0], [0, 0, 0], 0xe6edf4);
  b.add(C(0.2, 0.2, 0.7, 4), M.glow, [0, 0.4 + h + 0.3, 0], [0, 0, 0], glowC(CYAN, 2.6));
  b.add(C(0.36, 0.36, 0.1, 4), M.glow, [0, 0.4 + h * 0.45, 0], [0, 0, 0], glowC(CYAN, 2));
  b.pop();
}
export function barricade(b, R, x, z, ry) {
  b.push(x, 0, z, ry);
  for (let i = -1; i <= 1; i++) {
    b.add(B(1.5, 1.5 + R() * 0.6, 0.09), M.rust, [i * 1.35, 0.85, (R() - 0.5) * 0.2], [-0.25 + R() * 0.1, (R() - 0.5) * 0.3, (R() - 0.5) * 0.15], [0x9a5a36, 0x6b7f7a, 0xb7774a][(i + 1)]);
    beam(b, M.wood, [i * 1.35, 0, 0.9], [i * 1.35, 1.6, -0.2], 0.13, 0x5e4c3e);
    b.add(C(0, 0.09, 0.9, 5), M.flat, [i * 1.35 + 0.4, 1.3, -0.5], [-1.1, 0, 0], 0x3a3230);
    b.add(C(0, 0.09, 0.9, 5), M.flat, [i * 1.35 - 0.4, 0.9, -0.5], [-1.3, 0, 0], 0x3a3230);
  }
  tire(b, R, 2.4, 0, 0.3); tire(b, R, 2.4, 0.38, 0.3);
  b.pop();
}
export function drumFire(b, x, z) {
  b.add(C(0.45, 0.4, 1.05, 10), M.rust, [x, 0.52, z], [0, 0, 0], 0x5a3a2e);
  b.add(C(0.02, 0.36, 0.9, 6), M.glow, [x, 1.35, z], [0, 0, 0], glowC(AMBER, 2.6));
  b.add(C(0.38, 0.38, 0.06, 10), M.glow, [x, 1.05, z], [0, 0, 0], glowC(0xff5a1e, 2));
}
export function stringLights(b, p1, p2, sag = 1) {
  const curve = wire(b, p1, p2, sag, 0x1a1616, 0.025);
  for (let i = 1; i < 8; i++) {
    const p = curve.getPoint(i / 8);
    b.add(new THREE.IcosahedronGeometry(0.13, 0), M.glow, [p.x, p.y - 0.16, p.z], [0, 0, 0], glowC(i % 3 ? AMBER : 0xffd27a, 2.4));
  }
}
// EKOO radio valve (glowing vacuum tube)
export function valve(b, g, x, y, z, s = 1) {
  b.push(x, y, z, 0, s); g.push(x, y, z, 0, s);
  b.add(C(0.75, 0.9, 0.6, 10), M.rust, [0, 0.3, 0], [0, 0, 0], 0x8a5a40);
  b.add(C(0.95, 0.95, 0.12, 10), M.flat, [0, 0.62, 0], [0, 0, 0], 0x3a2e2a);
  for (const o of [-0.22, 0, 0.22]) b.add(B(0.09, 1.7, 0.09), M.glow, [o, 1.55, 0], [0, 0, 0], glowC(0xffc45a, 3));
  b.add(B(0.7, 0.07, 0.3), M.glow, [0, 1.3, 0], [0, 0, 0], glowC(AMBER, 2.4));
  b.add(B(0.7, 0.07, 0.3), M.glow, [0, 1.9, 0], [0, 0, 0], glowC(AMBER, 2.4));
  g.add(new THREE.CapsuleGeometry(0.72, 1.5, 4, 12), M.glowSoft, [0, 1.75, 0], [0, 0, 0], glowC(AMBER, 1.5));
  b.add(C(0.2, 0.45, 0.35, 8), M.rust, [0, 3.35, 0], [0, 0, 0], 0x6b4634);
  for (const a of [0, PI / 2]) b.add(new THREE.TorusGeometry(0.76, 0.035, 4, 14), M.flat, [0, 1.75, 0], [0, a, 0], 0x3a2e2a, [1, 1.9, 1]);
  b.pop(); g.pop();
}
