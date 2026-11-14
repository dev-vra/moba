// Faction bases: AXIOM cryogenic Data Center (x<0) and EKOO Radio Tower (x>0)
import * as THREE from 'three';
import { M, glowC, CYAN, AMBER } from '../core/mats.js';
import { T } from '../core/tex.js';
import { BASE_X, SPAWN_X, lerp } from '../core/util.js';
import { B, C, beam, wire, silo, scrap, barrel, crate, tire, valve, drumFire, stringLights, axPylon, axWall, barricade, pole } from './props.js';

const PI = Math.PI;

export function axiomBase(b, g, scene, R, fx) {
  const W = 0xeef3f8, DK = 0x2b3644, MID = 0x9fb0c2, cy = (k = 2.2) => glowC(CYAN, k);
  b.push(-BASE_X, 0, 0);
  // plinth
  b.add(C(13.5, 14.2, 0.6, 8), M.axiom, [-2, 0.3, 0], [0, PI / 8, 0], 0xb9c6d4);
  b.add(C(13.7, 13.7, 0.1, 8, true), M.glow, [-2, 0.5, 0], [0, PI / 8, 0], cy(1.8));
  // main hall + tiers
  b.add(B(13, 7, 15), M.axiom, [-3, 4.1, 0], [0, 0, 0], W);
  b.add(B(13.15, 0.18, 15.15), M.glow, [-3, 6.4, 0], [0, 0, 0], cy(2));
  b.add(B(13.2, 0.35, 15.2), M.flat, [-3, 7.75, 0], [0, 0, 0], DK);
  b.add(B(9, 3, 10), M.axiom, [-4, 9.4, 0], [0, 0, 0], W);
  b.add(B(9.15, 0.14, 10.15), M.glow, [-4, 10.2, 0], [0, 0, 0], cy(2));
  b.add(B(3.2, 4.5, 3.2), M.axiom, [-4.5, 13.1, 0], [0, 0, 0], W);
  b.add(B(3.3, 0.14, 3.3), M.glow, [-4.5, 14.6, 0], [0, 0, 0], cy(2.4));
  b.add(C(0.07, 0.12, 7, 5), M.flat, [-4.5, 18.8, 0], [0, 0, 0], DK);
  b.add(new THREE.IcosahedronGeometry(0.22, 0), M.glow, [-4.5, 22.4, 0], [0, 0, 0], cy(3));
  for (const s of [-1, 1]) { b.add(C(0.05, 0.08, 4, 5), M.flat, [-6, 12.9, s * 3.6], [0, 0, 0], DK); b.add(C(0.05, 0.08, 3, 5), M.flat, [-1.2, 12.4, s * 4], [0, 0, 0], DK); }
  // hull detail: pilasters, panel ledges, roof units with grilles, corner caps
  for (const s of [-1, 1]) {
    for (let px = -8.6; px <= 2.6; px += 2.24) { b.add(B(0.55, 6.7, 0.3), M.axiom, [px, 4, s * 7.6], [0, 0, 0], W); b.add(B(0.3, 0.3, 0.34), M.flat, [px, 7.2, s * 7.62], [0, 0, 0], DK); }
    b.add(B(12.6, 0.3, 0.3), M.axiom, [-3, 2.2, s * 7.62], [0, 0, 0], MID);
    for (const cx of [-9.5, 3.5]) b.add(B(0.7, 7.3, 0.7), M.axiom, [cx, 4.1, s * 7.5], [0, 0, 0], MID);
    b.add(B(2.2, 0.9, 1.6), M.axiom, [-7.6, 8.35, s * 5.9], [0, 0, 0], MID);
    for (let k = 0; k < 4; k++) b.add(B(1.9, 0.06, 0.1), M.flat, [-7.6, 8.1 + k * 0.17, s * 5.9 + s * 0.82], [0, 0, 0], 0x1f2832);
    b.add(C(0.5, 0.5, 0.5, 10), M.flat, [0.6, 8.2, s * 6], [0, 0, 0], 0x3a4654); b.add(C(0.42, 0.42, 0.08, 10), M.glow, [0.6, 8.47, s * 6], [0, 0, 0], cy(1.4));
  }
  for (let pz = -6; pz <= 6; pz += 2.4) b.add(B(0.3, 6.7, 0.55), M.axiom, [-9.6, 4, pz], [0, 0, 0], W);
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) b.add(B(0.5, 3.3, 0.5), M.axiom, [-4 + sx * 4.5, 9.4, sz * 5], [0, 0, 0], MID);
  // front (faces +X, the lane): gate + slanted buttresses
  b.add(B(0.4, 4.4, 3.4), M.flat, [3.45, 2.8, 0], [0, 0, 0], 0x121a22);
  for (const s of [-1, 1]) b.add(B(0.2, 4.6, 0.16), M.glow, [3.7, 2.9, s * 1.8], [0, 0, 0], cy(2.6));
  b.add(B(0.2, 0.16, 3.76), M.glow, [3.7, 5.2, 0], [0, 0, 0], cy(2.6));
  for (const s of [-1, 1]) for (const k of [1, 2]) {
    const zz = s * (0.6 + k * 2.6);
    b.add(B(3.6, 6.4 - k * 0.9, 1.3), M.axiom, [4.4, 2.9 - k * 0.3, zz], [0, 0, 0.42], W);
    b.add(B(3.7, 0.14, 0.2), M.glow, [4.9, 3.3 - k * 0.3, zz + s * 0.66], [0, 0, 0.42 + PI / 2], cy(2.2));
    b.add(B(1.5, 0.3, 1.5), M.flat, [5.9, 0.75, zz], [0, 0, 0], DK);
  }
  // ramp
  b.add(B(5, 0.3, 4), M.axiom, [6.4, 0.42, 0], [0, 0, -0.1], MID);
  for (const s of [-1, 1]) b.add(B(5, 0.1, 0.14), M.glow, [6.4, 0.62, s * 2], [0, 0, -0.1], cy(2.2));
  // side server wings with louvers
  for (const s of [-1, 1]) {
    b.add(B(9, 4.6, 3.2), M.axiom, [-3, 2.9, s * 9.1], [0, 0, 0], 0xdfe7f0);
    b.add(B(9.1, 0.3, 3.3), M.flat, [-3, 5.3, s * 9.1], [0, 0, 0], DK);
    for (let i = 0; i < 6; i++) {
      b.add(B(1.0, 3.2, 0.12), M.flat, [-6.6 + i * 1.45, 2.7, s * 10.72], [0, 0, 0], 0x1f2832);
      for (let j = 0; j < 4; j++) b.add(B(0.7, 0.07, 0.1), M.glow, [-6.6 + i * 1.45, 1.6 + j * 0.7, s * 10.8], [0, 0, 0], cy(j % 2 ? 2.4 : 1.4));
    }
    // cryo tanks + pipes
    for (let i = 0; i < 2; i++) {
      const tx = 3.6 + i * 2.8, tz = s * 10.2;
      b.add(C(1.05, 1.05, 3.4, 12), M.axiom, [tx, 2.3, tz], [0, 0, 0], W);
      b.add(new THREE.SphereGeometry(1.05, 12, 6, 0, 6.283, 0, PI / 2), M.axiom, [tx, 4, tz], [0, 0, 0], W);
      b.add(C(1.08, 1.08, 0.16, 12, true), M.glow, [tx, 2.6, tz], [0, 0, 0], cy(2.2));
      b.add(C(1.2, 1.25, 0.5, 12), M.flat, [tx, 0.85, tz], [0, 0, 0], DK);
      fx.vents.push([-BASE_X + tx, 5, tz]);
    }
    b.add(C(0.18, 0.18, 6, 6), M.flat, [5, 1.2, s * 8.6], [0, 0, PI / 2], 0x5a6a7c);
  }
  // perimeter fins with light beams
  for (const [fxp, fz, lean] of [[9, -15, 0.12], [9, 15, -0.12], [-13, -15, 0.12], [-13, 15, -0.12]]) {
    b.add(C(0.9, 1.3, 0.8, 4), M.flat, [fxp, 0.9, fz], [0, PI / 4, 0], DK);
    b.add(C(0.3, 0.95, 13, 4), M.flat, [fxp, 7.3, fz], [lean, PI / 4, 0], 0x3a4858);
    b.add(B(0.12, 11, 0.5), M.glow, [fxp + 0.42, 7, fz - lean * 1.5], [lean, 0, -0.05], cy(2));
    fx.beams.push([-BASE_X + fxp, 13.5, fz - lean * 13]);
  }
  b.pop();
  // spawn pad
  b.add(C(4, 4.2, 0.16, 24), M.flat, [-SPAWN_X, 0.08, 0], [0, 0, 0], 0x26303c);
  b.add(new THREE.TorusGeometry(3.6, 0.09, 4, 40), M.glow, [-SPAWN_X, 0.2, 0], [PI / 2, 0, 0], cy(2.4));
  b.add(new THREE.TorusGeometry(2.2, 0.06, 4, 30), M.glow, [-SPAWN_X, 0.2, 0], [PI / 2, 0, 0], cy(1.8));
  // outer dressing: barrier walls and pylons guarding the lane mouth
  for (const s of [-1, 1]) {
    axWall(b, -57, s * 10.5, 0.25 * s, 5); axWall(b, -51.5, s * 9.2, 0.25 * s, 4); axWall(b, -63, s * 16, PI / 2, 5);
    axPylon(b, -54.5, s * 7.6, 5); axPylon(b, -46, s * 7.4, 4); axPylon(b, -70, s * 8, 5.5); axPylon(b, -62, s * 21, 4.5);
  }
}

export function ekooBase(b, g, scene, R, fx) {
  const RU = 0x8f5a3c, RD = 0x5e3a2a, IRON = 0x4a403a;
  b.push(BASE_X, 0, 0); g.push(BASE_X, 0, 0);
  // --- lattice mast ---
  const HT = 30, w = (y) => lerp(3.6, 0.7, y / HT);
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) beam(b, M.rustB, [sx * 3.6, 0, sz * 3.6], [sx * 0.7, HT, sz * 0.7], 0.34, RU);
  for (let y = 3, i = 0; y < HT; y += 3, i++) {
    const a = w(y), a0 = w(y - 3), d = i % 2 ? 1 : -1;
    for (const s of [-1, 1]) {
      b.add(B(a * 2, 0.16, 0.16), M.rustB, [0, y, s * a], [0, 0, 0], RD); b.add(B(0.16, 0.16, a * 2), M.rustB, [s * a, y, 0], [0, 0, 0], RD);
      for (const d2 of [-1, 1]) { b.add(B(0.62, 0.62, 0.07), M.rust, [d2 * (a - 0.2), y - 0.2, s * (a + 0.1)], [0, 0, 0], 0xb0a090); b.add(B(0.07, 0.62, 0.62), M.rust, [s * (a + 0.1), y - 0.2, d2 * (a - 0.2)], [0, 0, 0], 0xb0a090); }   // gusset plates
      beam(b, M.rust, [-d * a0, y - 3, s * a0], [d * a, y, s * a], 0.11, RU); beam(b, M.rust, [s * a0, y - 3, -d * a0], [s * a, y, d * a], 0.11, RU);
    }
  }
  b.add(C(0.06, 0.1, 5, 5), M.flat, [0, HT + 2.5, 0], [0, 0, 0], IRON);
  // concrete footing + shack skirt
  b.add(B(9, 0.7, 9), M.concrete, [0, 0.35, 0], [0, 0, 0], 0x8a8278);
  b.add(B(5.5, 3, 5.5), M.rust, [0, 2.2, 0], [0, 0.1, 0], 0x7a6a5c);
  b.add(B(1.2, 2, 0.2), M.flat, [-2.85, 1.7, 0.4], [0, 0.1 + PI / 2, 0], 0x241c1a);
  // valve deck: the heart of the Coro
  const dy = 7.2;
  b.add(B(9.5, 0.3, 9.5), M.grid, [0, dy, 0], [0, 0, 0], 0xc0b0a0);
  for (let k = -4; k <= 4; k += 2) for (const s of [-1, 1]) { b.add(B(0.08, 1, 0.08), M.flat, [k, dy + 0.5, s * 4.7], [0, 0, 0], IRON); b.add(B(0.08, 1, 0.08), M.flat, [s * 4.7, dy + 0.5, k], [0, 0, 0], IRON); }
  for (const s of [-1, 1]) { b.add(B(9.5, 0.1, 0.1), M.flat, [0, dy + 1, s * 4.7], [0, 0, 0], IRON); b.add(B(0.1, 0.1, 9.5), M.flat, [s * 4.7, dy + 1, 0], [0, 0, 0], IRON); }
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { b.add(B(0.12, 1, 0.12), M.flat, [sx * 4.7, dy + 0.5, sz * 4.7], [0, 0, 0], IRON); beam(b, M.rust, [sx * 4.5, dy, sz * 4.5], [sx * 2.6, dy - 3.2, sz * 2.6], 0.16, RD); }
  const vs = [[-3.6, -2.6, 1.25], [-3.9, 0.3, 1.5], [-3.5, 3, 1.2], [0.2, 3.6, 1.1], [0.4, -3.7, 1.1], [3.4, 0, 1.2]];
  for (const [vx, vz, s] of vs) { valve(b, g, vx, dy + 0.15, vz, s); beam(b, M.flat, [vx, dy + 0.2, vz], [0, dy + 2.5, 0], 0.1, 0x2a2220); }
  // dishes, yagi antennas, loudspeakers
  for (const [yy, a, s] of [[13, 2.4, 1.3], [16, 0.4, 1], [19.5, 4, 0.9], [22, 1.6, 0.7]]) {
    const r = w(yy) + 0.5, px = Math.cos(a) * r, pz = Math.sin(a) * r;
    b.add(new THREE.SphereGeometry(1.1, 10, 4, 0, 6.283, 0, 0.95), M.rust, [px, yy, pz], [PI / 2, 0, PI / 2 - a], 0xb8b0a2, [s, s * 0.5, s]);
  }
  for (const yy of [24, 26.5]) { b.add(B(0.07, 0.07, 4.4), M.flat, [0, yy, 0], [0, yy, 0], IRON); for (let k = -2; k <= 2; k++) b.add(B(1.2 - Math.abs(k) * 0.15, 0.05, 0.05), M.flat, [Math.sin(yy) * k * 0.9, yy, Math.cos(yy) * k * 0.9], [0, yy, 0], IRON); }
  b.add(new THREE.IcosahedronGeometry(0.25, 0), M.glow, [0, HT + 5.1, 0], [0, 0, 0], glowC(0xff3b2e, 3));
  // tarps (sagging cloth)
  const tarp = (p, ry, rx, wd, ln, col) => {
    const geo = new THREE.PlaneGeometry(wd, ln, 5, 5), a = geo.attributes.position;
    for (let i = 0; i < a.count; i++) { const u = a.getX(i) / wd, v = a.getY(i) / ln; a.setZ(i, -(0.25 - u * u) * 1.6 * (0.6 + (0.5 - v)) + Math.sin(v * 9 + u * 5) * 0.08); }
    geo.computeVertexNormals(); b.add(geo, M.tarp, p, [rx, ry, 0], col);
  };
  tarp([-5.4, 4.2, 0.4], -PI / 2, -0.95, 7, 7.5, 0xa9683f);
  tarp([0.8, 4, 5.6], 0, -0.9, 6.5, 7, 0x62867f);
  tarp([1, 4.4, -5.6], PI, -0.95, 6, 7.4, 0xa2603c);
  tarp([-2.6, 11.5, 1.8], -PI / 2 + 0.4, -0.35, 3.2, 5.5, 0x62867f);
  tarp([1.6, 15, -1.2], PI / 2 + 0.3, -0.25, 2.4, 4.6, 0xa2603c);
  // guy cables to poles, with rags
  const anchors = [[-17, -17], [-14, 19], [15, -19], [14, 18]];
  anchors.forEach(([ax, az], i) => {
    b.add(C(0.13, 0.19, 8, 6), M.wood, [ax, 4, az], [0, 0, (i % 2 ? 1 : -1) * 0.05], 0x5a4a3c);
    const top = [ax, 7.8, az], on = [Math.sign(ax) * w(17), 17, Math.sign(az) * w(17)];
    const cv = wire(b, on, top, 2.4, 0x181416, 0.05);
    wire(b, [Math.sign(ax) * w(11), 11, Math.sign(az) * w(11)], [ax, 6.8, az], 1.6, 0x181416, 0.04);
    for (const t of [0.35, 0.6]) { const p = cv.getPoint(t); b.add(new THREE.PlaneGeometry(0.9, 1.3), M.tarp, [p.x, p.y - 0.7, p.z], [0, R() * 3, 0.2], t < 0.5 ? 0x62867f : 0xa9683f); }
  });
  stringLights(b, [-17, 7.6, -17], [-3.6, dy + 1, -3.6], 1.6); stringLights(b, [-14, 7.6, 19], [-3.6, dy + 1, 3.6], 1.6);
  stringLights(b, [-17, 6.5, -17], [-20, 4.5, 0], 1); stringLights(b, [-20, 4.5, 0], [-14, 6.5, 19], 1);
  b.add(C(0.1, 0.14, 4.6, 6), M.wood, [-20, 2.3, 0], [0, 0, 0.04], 0x5a4a3c);
  // generators (yellow) with exhausts
  for (const [gx, gz, ry] of [[-9.5, 9.5, 0.3], [-8, -11, -0.25]]) {
    b.push(gx, 0, gz, ry);
    b.add(B(3.4, 1.9, 1.9), M.rust, [0, 1.45, 0], [0, 0, 0], 0xd6a12a);
    b.add(B(1.6, 1.1, 0.1), M.flat, [-0.5, 1.5, 0.96], [0, 0, 0], 0x2a2420);
    for (let k = 0; k < 5; k++) b.add(B(1.5, 0.06, 0.06), M.flat, [-0.5, 1.1 + k * 0.2, 1.02], [0, 0, 0], 0x6a5a40);
    b.add(B(0.5, 0.3, 0.1), M.glow, [1.05, 1.9, 0.97], [0, 0, 0], glowC(0x7dff6a, 1.6));
    for (const s of [-1, 1]) b.add(C(0.45, 0.45, 0.3, 10), M.flat, [s * 1.1, 0.45, 1], [PI / 2, 0, 0], 0x1e1d22);
    b.add(C(0.13, 0.13, 1.6, 6), M.flat, [1.3, 3, -0.5], [0, 0, 0], 0x3a302c);
    b.pop();
    const c = Math.cos(ry), s = Math.sin(ry);
    fx.smoke.push([BASE_X + gx + 1.3 * c - 0.5 * s, 3.9, gz - 1.3 * s - 0.5 * c]);
  }
  // container shacks
  b.add(B(6, 2.6, 2.6), M.rust, [7, 1.3, 12.5], [0, 0.2, 0], 0x5f837c);
  b.add(B(6.3, 0.12, 3), M.rust, [7, 2.72, 12.5], [0.06, 0.2, 0], 0x8a5236);
  b.add(B(5, 2.6, 2.6), M.rust, [9, 1.3, -13], [0, -0.3, 0], 0xa5633a);
  b.add(B(4.4, 2.2, 2.4), M.rust, [9.4, 3.7, -13.2], [0, -0.15, 0], 0x6b7a74);
  b.pop(); g.pop();
  // rusty silos behind
  silo(b, R, BASE_X + 13, -5.5, { r: 3, h: 10, tint: 0xc99f84 }); silo(b, R, BASE_X + 16.5, 2.5, { r: 3.4, h: 12.5, tint: 0xb98f78 });
  // yard clutter
  for (const [sx, sz, s] of [[-13, 14, 1.3], [-17, -9, 1.1], [-4, -19, 1.4], [2, 19, 1.2], [-21, 17, 1], [-22, -17, 1.2], [8, -21, 1.3], [10, 21, 1.1]]) scrap(b, R, BASE_X + sx, sz, s);
  for (let i = 0; i < 16; i++) { const a = R() * 6.28, d = 10 + R() * 10; barrel(b, R, BASE_X + Math.cos(a) * d, 0, Math.sin(a) * d * 0.9); }
  for (let i = 0; i < 10; i++) { const a = R() * 6.28, d = 9 + R() * 11; crate(b, R, BASE_X + Math.cos(a) * d, 0, Math.sin(a) * d * 0.9, 0.8 + R() * 0.5); }
  for (let i = 0; i < 5; i++) tire(b, R, BASE_X - 12.5, i * 0.38, -6.5);
  // spawn pad: scrap ring with valves
  b.add(C(4, 4.3, 0.2, 14), M.rust, [SPAWN_X, 0.1, 0], [0, 0, 0], 0x5a4034);
  b.add(new THREE.TorusGeometry(3.5, 0.1, 4, 28), M.glow, [SPAWN_X, 0.24, 0], [PI / 2, 0, 0], glowC(AMBER, 2.2));
  // lane mouth: barricades, drum fires, lights
  for (const s of [-1, 1]) {
    barricade(b, R, 57, s * 9.6, s > 0 ? PI + 0.25 : -0.25); barricade(b, R, 50.5, s * 8.6, s > 0 ? PI + 0.2 : -0.2);
    drumFire(b, 54, s * 7.4); fx.fires.push([54, 1.6, s * 7.4]);
    scrap(b, R, 61, s * 13, 1.1); scrap(b, R, 45, s * 9.5, 0.9);
    const [p1] = pole(b, 60, s * 8.2, 0, 6), [p2] = pole(b, 47, s * 7.9, 0, 6);
    stringLights(b, p1, p2, 1.3);
  }
  drumFire(b, 70, -7.5); fx.fires.push([70, 1.6, -7.5]);
}
