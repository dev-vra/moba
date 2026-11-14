// Lane minions and jungle creatures, modelled in code after the GDD sheets (refs/minions-*.jpeg, refs/vessari.jpeg).
//   AXIOM: Unidade da Hoste (melee)  + Drone Sentinela (ranged)
//   EKOO : Saqueador (melee)         + Arqueiro de Enclave (ranged)
//   VESSARI (neutral jungle): Eco Menor — joins whoever clears its camp
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Bar } from './vfx.js';
import { clamp, laneFrame } from '../core/util.js';
import { inkHeavy } from '../render/ink.js';

const PI = Math.PI, _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
export const box = (w, h, d) => new THREE.BoxGeometry(w, h, d), cyl = (a, b, h, n = 8) => new THREE.CylinderGeometry(a, b, h, n), ico = (r, d = 1) => new THREE.IcosahedronGeometry(r, d), cone = (r, h, n = 6) => new THREE.ConeGeometry(r, h, n);

// character material: vertex colour albedo + per-vertex glow mask tinted by the faction colour, plus a rim light
export function unitMat(glow, rim = 0.3) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.25, envMapIntensity: 1.3 });
  const u = { uGlowCol: { value: new THREE.Color(glow) }, uGlow: { value: 2.3 }, uRim: { value: rim } };
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, u);
    s.vertexShader = 'attribute float aGlow; varying float vGlow;\n' + s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vGlow = aGlow;');
    s.fragmentShader = 'uniform float uGlow, uRim; uniform vec3 uGlowCol; varying float vGlow;\n' + s.fragmentShader.replace('#include <emissivemap_fragment>',
      'float fr = pow(1. - saturate(dot(normal, normalize(vViewPosition))), 2.6); totalEmissiveRadiance += uGlowCol * (vGlow * uGlow + fr * uRim);');
  };
  return m;
}
export const UMAT = { axiom: unitMat(0x2fe4ff), ekoo: unitMat(0xff9a2e), vessari: unitMat(0xa55cff, 0.5) };
const FLASH = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.95, 0.95, 0.95) });   // hit flash (kept under the bloom threshold)

export class Parts {
  l = [];
  add(geo, p, c, { r = [0, 0, 0], s = 1, g = 0 } = {}) {
    const x = geo.index ? geo.toNonIndexed() : geo;
    for (const k of Object.keys(x.attributes)) if (k !== 'position' && k !== 'normal') x.deleteAttribute(k);
    _m.compose(_p.fromArray(p), _q.setFromEuler(_e.set(r[0], r[1], r[2])), typeof s === 'number' ? _s.set(s, s, s) : _s.fromArray(s)); x.applyMatrix4(_m);
    const n = x.attributes.position.count, col = new Float32Array(n * 3); _c.set(c);
    for (let i = 0; i < n; i++) { col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
    x.setAttribute('color', new THREE.BufferAttribute(col, 3)); x.setAttribute('aGlow', new THREE.BufferAttribute(new Float32Array(n).fill(g), 1));
    this.l.push(x); return this;
  }
  mesh(mat, name, at) { const m = new THREE.Mesh(mergeGeometries(this.l), mat); m.castShadow = true; m.name = name; this.l = []; if (at) m.position.fromArray(at); return m; }
}
// humanoid rig: body + 2 arms + 2 legs hanging from pivots
export function rig(root, mat, P, { body, armR, armL, leg, sh, hip, scale = 1 }) {
  body(P); root.add(P.mesh(mat, 'body'));
  armR(P); root.add(P.mesh(mat, 'armR', [-sh[0], sh[1], 0])); armL(P); root.add(P.mesh(mat, 'armL', [sh[0], sh[1], 0]));
  leg(P); const l = P.mesh(mat, 'legR', [-hip[0], hip[1], 0]), l2 = l.clone(); l2.name = 'legL'; l2.position.x = hip[0]; root.add(l, l2);
  root.scale.setScalar(scale); return root;
}

const BUILD = {
  // --- Unidade da Hoste: white plated android, energy sword + hex shield
  hoste(mat) {
    const W = 0xf4f7fb, N = 0x16263c, D = 0x0c121c, S = 0x9fb2c8, G = 0xcdf4ff;
    const arm = (P) => P.add(box(0.17, 0.42, 0.17), [0, -0.22, 0], N).add(box(0.22, 0.4, 0.24), [0, -0.62, 0], W).add(box(0.15, 0.15, 0.15), [0, -0.9, 0], D);
    return rig(new THREE.Group(), mat, new Parts(), {
      sh: [0.52, 1.62], hip: [0.17, 0.95], scale: 1.12,
      body: (P) => P.add(box(0.5, 0.26, 0.32), [0, 0.95, 0], N).add(box(0.44, 0.32, 0.28), [0, 1.2, 0], N).add(box(0.8, 0.46, 0.44), [0, 1.52, 0], W).add(box(0.52, 0.22, 0.06), [0, 1.56, 0.24], S)
        .add(box(0.13, 0.15, 0.04), [0, 1.55, 0.28], G, { g: 1.4 }).add(box(0.3, 0.3, 0.32), [0, 1.93, 0], W).add(box(0.27, 0.08, 0.04), [0, 1.94, 0.165], G, { g: 1.7 })
        .add(box(0.08, 0.12, 0.38), [0, 2.1, -0.02], S).add(box(0.32, 0.2, 0.42), [0.52, 1.7, 0], W).add(box(0.32, 0.2, 0.42), [-0.52, 1.7, 0], W).add(box(0.34, 0.42, 0.16), [0, 1.5, -0.28], S)
        .add(box(0.82, 0.05, 0.46), [0, 1.3, 0], G, { g: 0.7 }),
      armR: (P) => arm(P).add(box(0.22, 0.07, 0.07), [0, -0.9, 0.12], D).add(box(0.08, 0.03, 1.05), [0, -0.9, 0.68], G, { g: 1.7 }),
      armL: (P) => arm(P).add(cyl(0.55, 0.55, 0.05, 6), [0.06, -0.58, 0.26], G, { r: [PI / 2, 0, 0], g: 0.42 }).add(cyl(0.2, 0.2, 0.07, 6), [0.06, -0.58, 0.28], W, { r: [PI / 2, 0, 0] }),
      leg: (P) => P.add(box(0.24, 0.46, 0.26), [0, -0.25, 0], W).add(box(0.22, 0.1, 0.24), [0, -0.47, 0.02], N).add(box(0.2, 0.44, 0.22), [0, -0.68, 0], W).add(box(0.22, 0.12, 0.36), [0, -0.89, 0.06], S),
    });
  },
  // --- Saqueador: hulking scrap armour, welding mask, glowing valve tank, rebar club
  saque(mat) {
    const R = 0xb05a2a, RD = 0x6b3320, I = 0x3a3432, CL = 0x66722f, G = 0xffe2b0, M2 = 0x968a80;
    const arm = (P) => P.add(box(0.25, 0.46, 0.25), [0, -0.22, 0], RD).add(box(0.32, 0.44, 0.32), [0, -0.64, 0], R).add(box(0.22, 0.2, 0.22), [0, -0.94, 0], I);
    return rig(new THREE.Group(), mat, new Parts(), {
      sh: [0.68, 1.72], hip: [0.22, 0.95], scale: 1.16,
      body: (P) => { P.add(box(0.62, 0.3, 0.42), [0, 0.95, 0], I).add(box(0.64, 0.34, 0.46), [0, 1.24, 0], RD).add(box(0.98, 0.56, 0.58), [0, 1.6, 0], R).add(box(0.52, 0.32, 0.08), [0, 1.62, 0.31], 0xc8743a)
        .add(box(0.36, 0.42, 0.36), [0, 2.06, 0], M2).add(box(0.25, 0.08, 0.04), [0, 2.09, 0.185], G, { g: 1.7 }).add(box(0.42, 0.28, 0.52), [0.68, 1.82, 0], R).add(box(0.42, 0.28, 0.52), [-0.68, 1.82, 0], RD)
        .add(cyl(0.16, 0.16, 0.56, 8), [0.22, 1.66, -0.4], G, { g: 0.95 }).add(cyl(0.1, 0.14, 0.2, 8), [0.22, 2.0, -0.4], I).add(cyl(0.13, 0.13, 0.42, 8), [-0.2, 1.6, -0.38], RD)
        .add(box(0.42, 0.62, 0.05), [0, 0.74, 0.23], CL).add(box(0.36, 0.5, 0.05), [0, 0.8, -0.23], CL);
        for (const sx of [-1, 1]) for (const sz of [-0.14, 0.14]) P.add(cone(0.07, 0.32), [sx * 0.72, 2.1, sz], I); },
      armR: (P) => { arm(P).add(cyl(0.06, 0.09, 1.3), [0, -0.94, 0.5], I, { r: [PI / 2, 0, 0] }).add(cyl(0.17, 0.13, 0.5, 7), [0, -0.94, 1.02], RD, { r: [PI / 2, 0, 0] });
        for (let i = 0; i < 4; i++) P.add(cone(0.05, 0.2), [Math.cos(i * 1.57) * 0.2, -0.94 + Math.sin(i * 1.57) * 0.2, 1.05], I, { r: [0, 0, i * 1.57 - PI / 2] }); },
      armL: (P) => arm(P).add(box(0.36, 0.5, 0.08), [0.14, -0.6, 0], 0xc8743a),
      leg: (P) => P.add(box(0.3, 0.46, 0.32), [0, -0.25, 0], RD).add(box(0.28, 0.46, 0.3), [0, -0.68, 0], R).add(box(0.3, 0.14, 0.44), [0, -0.88, 0.06], I),
    });
  },
  // --- Arqueiro de Enclave: hooded scout, amber goggles, quiver, recurve bow
  arq(mat) {
    const H = 0x64762e, L = 0x7a4c30, K = 0x2c2a28, R = 0xb05a2a, G = 0xffe2b0, SK = 0xc09a7a;
    const arm = (P) => P.add(box(0.13, 0.4, 0.13), [0, -0.2, 0], H).add(box(0.13, 0.4, 0.13), [0, -0.58, 0], L).add(box(0.1, 0.1, 0.1), [0, -0.82, 0], K);
    return rig(new THREE.Group(), mat, new Parts(), {
      sh: [0.34, 1.6], hip: [0.12, 0.95], scale: 1.08,
      body: (P) => { P.add(box(0.4, 0.24, 0.28), [0, 0.95, 0], K).add(box(0.5, 0.58, 0.3), [0, 1.36, 0], L).add(box(0.48, 0.14, 0.36), [0, 1.68, 0], H).add(ico(0.2), [0, 1.9, 0.02], SK)
        .add(ico(0.28), [0, 1.95, -0.05], H, { s: [1, 1.08, 1.12] }).add(box(0.1, 0.07, 0.06), [0.085, 1.92, 0.2], G, { g: 1.8 }).add(box(0.1, 0.07, 0.06), [-0.085, 1.92, 0.2], G, { g: 1.8 })
        .add(box(0.52, 0.85, 0.06), [0, 1.22, -0.21], H, { r: [0.12, 0, 0] }).add(cyl(0.1, 0.08, 0.6), [-0.16, 1.55, -0.3], L, { r: [0, 0, 0.4] }).add(box(0.24, 0.12, 0.28), [0.36, 1.68, 0], R);
        for (let i = 0; i < 3; i++) P.add(cyl(0.012, 0.012, 0.42, 4), [-0.3 + i * 0.05, 1.95, -0.3], K, { r: [0, 0, 0.4] }).add(box(0.05, 0.08, 0.02), [-0.37 + i * 0.05, 2.13, -0.3], G, { g: 1.1, r: [0, 0, 0.4] }); },
      armR: (P) => arm(P),
      armL: (P) => arm(P).add(new THREE.TorusGeometry(0.6, 0.028, 5, 14, PI), [0, -0.82, 0.02], L, { r: [0, PI / 2, PI / 2] }).add(cyl(0.008, 0.008, 1.2, 4), [0, -0.82, 0.02], G, { g: 0.6 }),
      leg: (P) => P.add(box(0.17, 0.46, 0.18), [0, -0.25, 0], K).add(box(0.16, 0.44, 0.17), [0, -0.68, 0], L).add(box(0.17, 0.11, 0.3), [0, -0.9, 0.05], K),
    });
  },
  // --- Drone Sentinela: swept-wing hover drone with a single cyan eye
  drone(mat) {
    const W = 0xf4f7fb, N = 0x16263c, S = 0x9fb2c8, G = 0xcdf4ff, P = new Parts(), root = new THREE.Group();
    P.add(box(0.5, 0.24, 0.9), [0, 0, 0], W).add(box(0.34, 0.18, 0.4), [0, -0.02, 0.6], W).add(box(0.06, 0.22, 0.5), [0, 0.2, -0.1], S).add(box(0.4, 0.06, 0.74), [0, -0.14, 0], N)
      .add(ico(0.13), [0, -0.02, 0.83], G, { g: 1.9 }).add(cyl(0.05, 0.05, 0.5, 6), [0, -0.2, 0.32], N, { r: [PI / 2, 0, 0] });
    for (const s of [-1, 1]) P.add(box(0.95, 0.05, 0.42), [s * 0.66, 0.02, -0.12], W, { r: [0, -s * 0.38, s * 0.1] }).add(box(0.3, 0.07, 0.5), [s * 1.12, 0.06, -0.3], S, { r: [0, -s * 0.38, s * 0.1] })
      .add(cyl(0.1, 0.13, 0.22, 8), [s * 0.2, 0, -0.52], G, { r: [PI / 2, 0, 0], g: 1.3 }).add(box(0.5, 0.02, 0.06), [s * 0.62, 0.05, 0.06], G, { r: [0, -s * 0.38, s * 0.1], g: 0.9 });
    const b = P.mesh(mat, 'body', [0, 2.1, 0]); root.add(b); root.scale.setScalar(1.25); return root;
  },
  // --- Eco Menor (Vessari): light-eating quadruped, tentacles of light, glitching eyes
  eco(mat) {
    const D = 0x17131d, D2 = 0x2a2036, G = 0xeedfff, P = new Parts(), root = new THREE.Group();
    P.add(ico(1), [0, 0.82, 0], D, { s: [0.5, 0.42, 0.95] }).add(ico(1), [0, 0.96, 0.45], D2, { s: [0.46, 0.4, 0.5] }).add(ico(1), [0, 0.78, 1.15], D, { s: [0.3, 0.26, 0.42] }).add(box(0.3, 0.08, 0.32), [0, 0.61, 1.2], D2)
      .add(cone(0.13, 0.95, 5), [0, 0.8, -1.25], D, { r: [-PI / 2, 0, 0] });
    for (const s of [-1, 1]) P.add(box(0.17, 0.05, 0.05), [s * 0.13, 0.85, 1.5], G, { r: [0, 0, s * 0.45], g: 2 }).add(box(0.03, 0.03, 1.3), [s * 0.4, 0.86, 0], G, { g: 1 }).add(cone(0.06, 0.26, 4), [s * 0.2, 1.02, 1.2], D2, { r: [0.5, 0, s * -0.5] });
    for (const z of [0.55, 0.15, -0.25, -0.65]) P.add(cone(0.08, 0.42, 4), [0, 1.3 - Math.abs(z) * 0.12, z], D2, { r: [-0.45, 0, 0] });
    root.add(P.mesh(mat, 'body'));
    P.add(box(0.17, 0.42, 0.2), [0, -0.2, 0], D).add(box(0.12, 0.4, 0.15), [0, -0.52, 0.05], D2).add(cone(0.07, 0.22, 4), [0, -0.7, 0.16], G, { r: [PI / 2, 0, 0], g: 0.6 });
    const leg = P.mesh(mat, 'leg');
    [[0.34, 0.55], [-0.34, 0.55], [0.34, -0.5], [-0.34, -0.5]].forEach(([x, z], i) => { const l = i ? leg.clone() : leg; l.name = 'leg' + i; l.position.set(x, 0.72, z); root.add(l); });
    const tg = cyl(0.015, 0.075, 1.5, 5); tg.translate(0, 0.75, 0); P.add(tg, [0, 0, 0], G, { g: 1.15 }); const ten = P.mesh(mat, 'ten');
    [[0.22, 0.5, 0.5], [-0.22, 0.5, -0.5], [0.26, -0.1, 0.8], [-0.26, -0.1, -0.8], [0, -0.55, 0.1]].forEach(([x, z, rz], i) => { const t = i ? ten.clone() : ten; t.name = 'ten' + i; t.position.set(x, 1.12, z); t.userData.rz = rz; t.castShadow = false; root.add(t); });
    root.scale.setScalar(1.3); return root;
  },
};
// --- Cão de Sucata: feral scrap hound twisted by the rifts (small farm camp)
BUILD.cao = (mat) => {
  const R = 0x9a4e28, I = 0x35302e, G = 0xeedfff, P = new Parts(), root = new THREE.Group();
  P.add(box(0.5, 0.42, 1.1), [0, 0.72, 0], R).add(box(0.56, 0.3, 0.5), [0, 0.86, 0.3], I).add(box(0.36, 0.34, 0.5), [0, 0.8, 0.82], I).add(box(0.26, 0.14, 0.3), [0, 0.68, 1.12], R)
    .add(cone(0.09, 0.7, 4), [0, 0.86, -0.85], I, { r: [-1.2, 0, 0] });
  for (const s of [-1, 1]) P.add(box(0.1, 0.05, 0.05), [s * 0.11, 0.86, 1.08], G, { g: 2 }).add(cone(0.06, 0.24, 4), [s * 0.14, 1.02, 0.7], I, { r: [-0.3, 0, s * 0.3] }).add(box(0.03, 0.03, 0.9), [s * 0.27, 0.74, 0], G, { g: 0.8 });
  for (const z of [0.3, -0.05, -0.4]) P.add(cone(0.07, 0.3, 4), [0, 1.06, z], I, { r: [-0.4, 0, 0] });
  root.add(P.mesh(mat, 'body'));
  P.add(box(0.13, 0.4, 0.15), [0, -0.2, 0], I).add(box(0.1, 0.34, 0.12), [0, -0.5, 0.04], R); const leg = P.mesh(mat, 'leg');
  [[0.24, 0.42], [-0.24, 0.42], [0.24, -0.42], [-0.24, -0.42]].forEach(([x, z], i) => { const l = i ? leg.clone() : leg; l.name = 'leg' + i; l.position.set(x, 0.64, z); root.add(l); });
  root.scale.setScalar(1.15); return root;
};
// --- Faísca da Fenda: floating shard-wisp (ranged)
BUILD.faisca = (mat) => {
  const D = 0x1c1626, G = 0xeedfff, P = new Parts(), root = new THREE.Group();
  P.add(ico(0.34), [0, 0, 0], G, { g: 1.7 }).add(ico(0.5, 0), [0, 0, 0], D, { s: [1, 1.25, 1] });
  for (let i = 0; i < 6; i++) { const a = i * 1.05; P.add(cone(0.1, 0.7, 4), [Math.cos(a) * 0.75, Math.sin(i * 2.1) * 0.3, Math.sin(a) * 0.75], i % 2 ? D : G, { r: [Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2], g: i % 2 ? 0 : 1.1 }); }
  root.add(P.mesh(mat, 'body', [0, 1.9, 0])); root.scale.setScalar(1.1); return root;
};
// --- Colosso Colheitadeira: a rogue AXIOM siege harvester, rift-corrupted (buff: Sobrecarga)
BUILD.colosso = (mat) => {
  const W = 0xc9d2dc, N = 0x1c2a3c, I = 0x2a2e34, G = 0xeedfff, P = new Parts(), root = new THREE.Group();
  P.add(box(1.5, 0.7, 2.2), [0, 1.0, 0], W).add(box(1.1, 0.6, 1.2), [0, 1.6, -0.3], W).add(box(1.56, 0.2, 2.3), [0, 0.62, 0], N).add(box(0.9, 0.16, 0.9), [0, 1.98, -0.3], N)
    .add(cyl(0.2, 0.26, 1.5, 8), [0.1, 1.75, 0.8], I, { r: [PI / 2 - 0.12, 0, 0] }).add(cyl(0.12, 0.12, 0.2, 8), [0.1, 1.84, 1.56], G, { r: [PI / 2 - 0.12, 0, 0], g: 1.6 })
    .add(box(0.5, 0.08, 0.06), [0, 1.3, 1.11], G, { g: 1.5 }).add(box(1.52, 0.06, 0.06), [0, 1.36, 0.6], G, { g: 0.9 });
  for (const s of [-1, 1]) { P.add(box(0.45, 0.62, 2.5), [s * 0.98, 0.42, 0], I).add(box(0.5, 0.1, 2.56), [s * 0.98, 0.75, 0], N);
    for (let i = 0; i < 5; i++) P.add(cyl(0.22, 0.22, 0.5, 8), [s * 0.98, 0.3, -1 + i * 0.5], N, { r: [0, 0, PI / 2] }); }
  root.add(P.mesh(mat, 'body'));
  P.add(box(0.2, 0.2, 1.1), [0, 0, 0.55], W).add(box(0.1, 0.5, 1.5), [0, -0.2, 1.7], W, { r: [0.25, 0, 0] }).add(box(0.05, 0.1, 1.3), [0, -0.5, 1.8], G, { r: [0.25, 0, 0], g: 1.2 }).add(cone(0.12, 0.5, 4), [0, -0.42, 2.5], W, { r: [PI / 2 + 0.25, 0, 0] });
  const claw = P.mesh(mat, 'armR', [-0.62, 0.95, 0.9]), c2 = claw.clone(); c2.name = 'armL'; c2.position.x = 0.62; root.add(claw, c2);
  root.scale.setScalar(1.35); return root;
};
BUILD.cerco = (mat) => { const r = BUILD.colosso(mat); r.scale.setScalar(0.82); return r; };              // Colheitadeira-Armada (AXIOM siege)
// --- Moto-Bomba (EKOO siege): scrap trike hauling a fuel drum mortar
BUILD.moto = (mat) => {
  const R = 0xb05a2a, RD = 0x6b3320, I = 0x2e2a28, G = 0xffe2b0, P = new Parts(), root = new THREE.Group();
  P.add(box(0.7, 0.35, 2.2), [0, 0.75, 0], RD).add(cyl(0.55, 0.55, 1.3, 10), [0, 1.45, -0.35], R, { r: [0.25, 0, 0] }).add(cyl(0.32, 0.4, 0.5, 10), [0, 2.1, -0.15], I, { r: [0.25, 0, 0] })
    .add(cyl(0.2, 0.2, 0.1, 10), [0, 2.36, -0.08], G, { r: [0.25, 0, 0], g: 1.6 }).add(box(0.9, 0.08, 0.5), [0, 1.0, 0.75], I).add(cyl(0.04, 0.04, 1.1, 5), [0, 1.2, 1.05], I, { r: [0, 0, PI / 2] })
    .add(ico(0.13), [0, 0.95, 1.25], G, { g: 1.8 }).add(cyl(0.07, 0.1, 1.1, 6), [0.42, 0.9, -0.9], I, { r: [PI / 2 - 0.3, 0, 0] }).add(box(0.2, 0.2, 0.02), [0, 1.45, 0.3], G, { g: 1.1 });
  for (const [x, z, r2] of [[0, 1.15, 0.5], [0.62, -0.7, 0.58], [-0.62, -0.7, 0.58]]) { P.add(cyl(r2, r2, 0.34, 10), [x, r2, z], I, { r: [0, 0, PI / 2] }).add(cyl(r2 * 0.4, r2 * 0.4, 0.38, 6), [x, r2, z], R, { r: [0, 0, PI / 2] }); for (let k = 0; k < 4; k++) P.add(cone(0.05, 0.22, 4), [x + (x > 0 ? 0.22 : x < 0 ? -0.22 : 0.22), r2 + Math.sin(k * 1.57) * r2 * 0.7, z + Math.cos(k * 1.57) * r2 * 0.7], I, { r: [0, 0, x >= 0 ? -PI / 2 : PI / 2] }); }
  root.add(P.mesh(mat, 'body')); root.scale.setScalar(1.2); return root;
};
BUILD.anciao = (mat) => { const r = BUILD.eco(mat); r.scale.setScalar(2.1); return r; };       // Eco Ancião (buff: Sinal Limpo)
const TEMPLATE = {};
const ALIAS = { lorde: ['anciao', 1.9], tita: ['colosso', 1.7] };   // épicos: modelos dos chefes de buff, ampliados
function model(kind, matKey) {
  const [base, sc] = ALIAS[kind] || [kind, 1], k = base + matKey;
  if (!TEMPLATE[k]) TEMPLATE[k] = BUILD[base](UMAT[matKey]);
  const m = TEMPLATE[k].clone(); if (sc !== 1) m.scale.multiplyScalar(sc); return m;
}

export const KINDS = {
  hoste: { hp: 520, atk: 44, cd: 1.0, wind: 0.28, range: 1.5, speed: 4.3, radius: 0.7, barY: 3.1, aggro: 8.5 },
  saque: { hp: 520, atk: 44, cd: 1.0, wind: 0.28, range: 1.5, speed: 4.3, radius: 0.75, barY: 3.3, aggro: 8.5 },
  drone: { hp: 300, atk: 50, cd: 1.4, wind: 0.3, range: 8.5, speed: 4.3, radius: 0.6, barY: 3.9, aggro: 10, ranged: true, fly: true },
  arq: { hp: 300, atk: 50, cd: 1.4, wind: 0.42, range: 8.5, speed: 4.3, radius: 0.6, barY: 3.0, aggro: 10, ranged: true },
  eco: { hp: 780, atk: 46, cd: 1.15, wind: 0.3, range: 1.7, speed: 5.2, radius: 0.95, barY: 2.6, aggro: 8.5, quad: true },
  cao: { hp: 430, atk: 30, cd: 0.9, wind: 0.22, range: 1.4, speed: 6, radius: 0.7, barY: 2.0, aggro: 7, quad: true },
  faisca: { hp: 280, atk: 36, cd: 1.5, wind: 0.35, range: 7.5, speed: 4.4, radius: 0.6, barY: 3.2, aggro: 8, ranged: true, fly: true, hover: 1.9 },
  colosso: { hp: 2700, atk: 95, cd: 1.5, wind: 0.5, range: 2.6, speed: 3.6, radius: 1.9, barY: 4.3, aggro: 8, big: true, mech: true },
  // siege units: slow, long range, wreck structures (every third wave)
  cerco: { hp: 950, atk: 62, cd: 1.9, wind: 0.5, range: 9.5, speed: 3.7, radius: 1.3, barY: 3.4, aggro: 11, ranged: true, mech: true, siege: 3 },
  moto: { hp: 950, atk: 62, cd: 1.9, wind: 0.5, range: 9.5, speed: 3.7, radius: 1.2, barY: 3.2, aggro: 11, ranged: true, mech: true, wheel: true, siege: 3 },
  lorde: { hp: 9000, atk: 210, cd: 1.6, wind: 0.5, range: 3.6, speed: 3.4, radius: 3.0, barY: 8.0, aggro: 10, quad: true, big: true, siege: 2 },
  tita: { hp: 7000, atk: 170, cd: 1.7, wind: 0.55, range: 3.4, speed: 3.2, radius: 3.2, barY: 7.6, aggro: 9, big: true, mech: true },
  anciao: { hp: 2500, atk: 85, cd: 1.3, wind: 0.4, range: 2.4, speed: 4.6, radius: 1.6, barY: 4.4, aggro: 8, quad: true, big: true },
};
const BAR_COL = { ally: 0x3fc8ff, enemy: 0xff5236, neutral: 0xb070ff };

export class Unit {
  constructor(game, kind, team, x, z, { lane = true, laneZ = 0, camp = null, look = team, boost = 1 } = {}) {
    const K = this.K = KINDS[kind]; Object.assign(this, { game, kind, team, lane: !!lane, laneId: typeof lane === 'string' ? lane : lane ? 'mid' : null, laneZ, camp, alive: true, isUnit: true, radius: K.radius });
    this.pos = new THREE.Vector3(x, 0, z); this.home = { x, z }; this.maxHp = this.hp = Math.round(K.hp * boost); this.atk = K.atk * boost;
    this.dir = team === 'axiom' ? 1 : -1; this.yaw = team === 'vessari' ? Math.atan2(-x, -(z - (camp?.c.z ?? 0))) : this.dir * PI / 2;
    this.cd = Math.random() * 0.5; this.atkT = -1; this.swing = 0; this.think = Math.random() * 0.3; this.phase = Math.random() * 6; this.seed = Math.random() * 10;
    this.markUntil = 0; this.slowUntil = 0; this.slowK = 1; this.flashT = 0; this.deadT = 0; this.spawnT = 0.5;
    const g = this.g = model(kind, look); this.p = {}; this.meshes = [];
    g.traverse((o) => { if (o.name) this.p[o.name] = o; if (o.isMesh) this.meshes.push(o); }); this.mat = this.meshes[0].material;
    g.position.copy(this.pos); g.rotation.y = this.yaw; game.scene.add(inkHeavy(g)); this.baseScale = g.scale.x;
    this.bar = new Bar(game.scene, K.big ? 3.2 : kind === 'eco' ? 1.9 : 1.5, BAR_COL[team === 'axiom' ? 'ally' : team === 'ekoo' ? 'enemy' : 'neutral'], 0.17);
  }
  hurt(dmg, src) { this.flashT = 0.07; for (const m of this.meshes) m.material = FLASH; if (this.camp) { this.aggro = src; this.camp.lastHit = src; } }
  die(src) { this.killer = src; this.bar.g.visible = false; if (this.camp) this.camp.lastHit = src; }
  pick(g) {
    if (this.camp) {
      const c = this.camp.c, a = this.aggro;
      if (a && a.alive && a.targetable !== false && Math.hypot(a.pos.x - c.x, a.pos.z - c.z) < c.r + 6) return a;
      this.aggro = null; const n = g.nearest(this.team, this.pos, 6); return n && Math.hypot(n.pos.x - c.x, n.pos.z - c.z) < c.r + 2 ? n : null;
    }
    return g.nearest(this.team, this.pos, this.K.aggro, (e) => !e.camp);   // minions de lane ignoram monstros da selva
  }
  // lane units flow around towers instead of grinding against them
  // segue a polilinha da lane (curvas suaves) e contorna torres no referencial local da lane
  laneMove(g) {
    const f = laneFrame(this.laneId, this.pos.x, this.pos.z, this.dir);
    let side = clamp((this.laneZ * (this.dir > 0 ? 1 : -1) - f.off) * 0.5, -0.7, 0.7);
    for (const tw of g.towers) {
      if (!tw.alive) continue;
      const dx = tw.pos.x - this.pos.x, dz = tw.pos.z - this.pos.z, along = dx * f.fx + dz * f.fz, perp = -(dx * f.nx + dz * f.nz), w = tw.radius + 1.9;
      if (along > -1.5 && along < 8 && Math.abs(perp) < w) { side = clamp(((perp >= 0 ? w + 0.4 : -w - 0.4) - perp) * 0.6, -1, 1); break; }
    }
    return [f.fx + f.nx * side, f.fz + f.nz * side];
  }
  update(dt, g) {
    const K = this.K, P = this.p, G = this.g;
    if (this.flashT > 0 && (this.flashT -= dt) <= 0) for (const m of this.meshes) m.material = this.mat;
    if (!this.alive) {                                             // collapse, sink, vanish
      const t = this.deadT += dt, k = Math.min(1, t * 2.4);
      if (K.fly) { G.position.y = -Math.min(1.9, t * t * 9); G.rotation.z += dt * 7; G.rotation.x = k * 0.6; }
      else if (K.quad) { G.scale.setScalar(this.baseScale * Math.max(0.01, 1 - t * 1.3)); G.position.y = t * 0.8; G.rotation.y += dt * 9; }
      else { G.rotation.x = -k * 1.5; G.position.y = -Math.max(0, t - 0.7) * 1.2 + k * 0.1; }
      if (t > 1.5) { g.scene.remove(G); g.scene.remove(this.bar.g); this.gone = true; }
      return;
    }
    if (g.over) return;
    if (g.t < (this.stunUntil || 0)) { G.position.set(this.pos.x, 0, this.pos.z); G.rotation.set(0, this.yaw + Math.sin(g.t * 30) * 0.06, 0); this.bar.set(this.pos, K.barY, this.hp / this.maxHp); return; }
    const slow = this.slowUntil > g.t ? this.slowK : 1;
    if ((this.think -= dt) <= 0) { this.think = 0.2 + Math.random() * 0.15; this.target = this.pick(g); }
    let tg = this.target; if (tg && (!tg.alive || tg.targetable === false)) tg = this.target = null;
    let mx = 0, mz = 0, moving = false; this.cd -= dt;
    if (tg) {
      const dx = tg.pos.x - this.pos.x, dz = tg.pos.z - this.pos.z, d = Math.hypot(dx, dz) || 1, reach = K.range + tg.radius + this.radius * 0.4;
      this.face(dx, dz, dt, 12);
      if (d > reach) { mx = dx / d; mz = dz / d; moving = true; } else if (this.cd <= 0 && this.atkT < 0) { this.atkT = K.wind; this.cd = K.cd; }
    } else if (this.lane) { [mx, mz] = this.laneMove(g); const l = Math.hypot(mx, mz) || 1; mx /= l; mz /= l; moving = true; this.face(mx, mz, dt, 6); }
    else {                                                         // camp creature: walk home, recover
      const dx = this.home.x - this.pos.x, dz = this.home.z - this.pos.z, d = Math.hypot(dx, dz);
      if (d > 0.6) { mx = dx / d; mz = dz / d; moving = true; this.face(mx, mz, dt, 8); this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.25 * dt); }
      else if (this.camp) this.face(this.camp.c.x - this.pos.x, this.camp.c.z - this.camp.c.side * 4 - this.pos.z, dt, 3);
    }
    if (this.atkT >= 0) {
      moving = false;
      if ((this.atkT -= dt) < 0) {
        this.swing = 1;
        if (tg && tg.alive) { if (K.ranged) g.shoot(this, tg, this.atk); else if (Math.hypot(tg.pos.x - this.pos.x, tg.pos.z - this.pos.z) < K.range + tg.radius + 1.6) g.damage(this, tg, this.atk); }
      }
    }
    if (moving) { const sp = K.speed * slow * dt; this.pos.x += mx * sp; this.pos.z += mz * sp; }
    this.spawnT = Math.max(0, this.spawnT - dt); this.swing = Math.max(0, this.swing - dt * 4);

    // ---- procedural animation ----
    const t = g.t + this.seed, wind = this.atkT >= 0 ? 1 - this.atkT / K.wind : 0, sw = this.swing;
    if (moving) this.phase += K.speed * slow * dt * 2.3; const st = moving ? Math.sin(this.phase) * 0.75 : 0;
    G.position.set(this.pos.x, 0, this.pos.z); G.rotation.set(0, this.yaw, 0); G.scale.setScalar(this.baseScale * (1 - this.spawnT * 1.2));
    if (K.fly) { P.body.position.y = (K.hover || 2.1) + Math.sin(t * 3) * 0.12; P.body.rotation.set((moving ? 0.2 : 0) - sw * 0.35, K.hover ? t * 1.4 : 0, Math.sin(t * 1.7) * 0.08); }
    else if (K.mech) { P.body.position.y = Math.sin(t * 9) * 0.015; if (P.armR) { P.armR.rotation.x = -wind * 0.9 + sw * 0.5; P.armL.rotation.x = -wind * 0.6 + sw * 0.5; } P.body.rotation.x = sw * 0.08 - (K.wheel && moving ? 0.06 : 0); }
    else if (K.quad) {
      for (let i = 0; i < 4; i++) P['leg' + i].rotation.x = (i === 0 || i === 3 ? st : -st);
      for (let i = 0; i < 5; i++) { const o = P['ten' + i]; if (!o) break; o.rotation.set(-0.5 + Math.sin(t * 2.1 + i * 1.3) * 0.3, 0, o.userData.rz + Math.sin(t * 1.6 + i * 2) * 0.28); }
      P.body.rotation.x = wind * -0.35 + sw * 0.4; P.body.position.set(0, Math.abs(st) * 0.06, sw * 0.5);
    } else {
      P.legL.rotation.x = st; P.legR.rotation.x = -st; P.body.position.y = Math.abs(st) * 0.05; P.body.rotation.x = wind * -0.12 + sw * 0.3;
      if (K.ranged) { const aim = tg ? 1 : 0; P.armL.rotation.x = -1.45 * aim - st * 0.5 * (1 - aim); P.armR.rotation.x = -1.1 * aim * (0.4 + wind * 0.6) + st * 0.5 * (1 - aim); }
      else { P.armL.rotation.x = -st * 0.5 - (tg ? 0.5 : 0); P.armR.rotation.x = st * 0.5 - wind * 2.5 - sw * 0.7; P.armR.rotation.z = wind * 0.3; }
    }
    this.bar.set(this.pos, K.barY, this.hp / this.maxHp);
  }
  face(dx, dz, dt, k) { let d = Math.atan2(dx, dz) - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); this.yaw += d * Math.min(1, dt * k); }
}
