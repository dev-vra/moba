// Code-built hero bodies (no rigged asset yet): ENXAME, DESPLUGADA, VÁLVULA — modelled after their GDD cards,
// animated procedurally (walk cycle, aim, attack wind-up, cast, death). Swap for real rigs by replacing build().
import * as THREE from 'three';
import { Parts, rig, unitMat, box, cyl, ico, cone } from './units.js';

const PI = Math.PI;
const HMAT = { axiom: unitMat(0x2fe4ff, 0.5), ekoo: unitMat(0xffa23a, 0.5) };

const MODELS = {
  enxame(mat) {       // hive-mind controller: plated android, tri-lens helmet, long cloak, holo palms
    const W = 0xf2f6fb, N = 0x14243a, D = 0x0b111a, S = 0x93a6bc, G = 0xcdf4ff;
    const arm = (P) => P.add(box(0.17, 0.42, 0.17), [0, -0.22, 0], N).add(box(0.21, 0.4, 0.23), [0, -0.62, 0], W).add(box(0.04, 0.3, 0.24), [0.11, -0.62, 0], G, { g: 1.1 }).add(box(0.14, 0.16, 0.14), [0, -0.9, 0], D).add(box(0.3, 0.02, 0.3), [0, -1.02, 0.06], G, { g: 1 });
    return rig(new THREE.Group(), mat, new Parts(), {
      sh: [0.5, 1.62], hip: [0.16, 0.95], scale: 1.55,
      body: (P) => { P.add(box(0.48, 0.26, 0.3), [0, 0.95, 0], N).add(box(0.42, 0.32, 0.27), [0, 1.2, 0], N).add(box(0.76, 0.46, 0.42), [0, 1.52, 0], W).add(box(0.14, 0.16, 0.04), [0, 1.55, 0.22], G, { g: 1.6 })
        .add(box(0.78, 0.05, 0.44), [0, 1.3, 0], G, { g: 0.8 }).add(ico(0.2), [0.5, 1.7, 0], W).add(ico(0.2), [-0.5, 1.7, 0], W).add(box(0.3, 0.95, 0.05), [0, 0.52, 0.2], N).add(box(0.06, 0.8, 0.06), [0, 0.55, 0.23], G, { g: 0.7 })
        .add(ico(0.21), [0, 1.95, 0.02], S).add(box(0.34, 0.1, 0.36), [0, 2.02, -0.02], D).add(box(1.0, 1.75, 0.06), [0, 0.98, -0.3], D, { r: [0.1, 0, 0] }).add(box(0.78, 0.26, 0.46), [0, 1.74, -0.12], D);
        for (const [x, y] of [[0, 1.99], [-0.09, 1.9], [0.09, 1.9]]) P.add(cyl(0.05, 0.05, 0.08, 8), [x, y, 0.2], G, { r: [PI / 2, 0, 0], g: 2 });
        for (const s of [-1, 1]) P.add(cyl(0.09, 0.09, 0.06, 8), [s * 0.2, 1.95, 0], S, { r: [0, 0, PI / 2] }).add(cyl(0.22, 0.22, 0.04, 10), [s * 0.5, 1.72, 0.19], G, { r: [PI / 2, 0, 0], g: 0.9 }); },
      armR: arm, armL: arm,
      leg: (P) => P.add(box(0.23, 0.46, 0.25), [0, -0.25, 0], W).add(box(0.21, 0.1, 0.23), [0, -0.47, 0.02], N).add(box(0.2, 0.44, 0.22), [0, -0.68, 0], W).add(box(0.04, 0.36, 0.23), [0.1, -0.68, 0], G, { g: 0.9 }).add(box(0.22, 0.12, 0.36), [0, -0.89, 0.06], S),
    });
  },
  desplugada(mat) {   // unplugged marksman: scrap recurve bow, copper arrows, patched leathers
    const SK = 0xc8926e, H = 0x4e3020, V = 0x6e7c38, L = 0x7a4a2c, PT = 0x4c4236, C = 0xdccba8, G = 0xffe2b0, I = 0x3a3432;
    const arm = (P) => P.add(box(0.14, 0.4, 0.14), [0, -0.2, 0], SK).add(box(0.15, 0.14, 0.15), [0, -0.3, 0], C).add(box(0.16, 0.4, 0.16), [0, -0.58, 0], L).add(box(0.11, 0.1, 0.11), [0, -0.82, 0], I);
    return rig(new THREE.Group(), mat, new Parts(), {
      sh: [0.35, 1.6], hip: [0.13, 0.95], scale: 1.5,
      body: (P) => { P.add(box(0.42, 0.24, 0.28), [0, 0.95, 0], PT).add(box(0.46, 0.14, 0.3), [0, 1.1, 0], L).add(box(0.5, 0.52, 0.3), [0, 1.4, 0], V).add(box(0.1, 0.64, 0.32), [0.06, 1.42, 0], L, { r: [0, 0, 0.6] })
        .add(box(0.05, 0.5, 0.33), [0.07, 1.42, 0], G, { r: [0, 0, 0.6], g: 0.8 }).add(box(0.44, 0.12, 0.34), [0, 1.69, 0], C).add(ico(0.2), [0, 1.9, 0.02], SK).add(ico(0.215), [0, 1.95, -0.04], H, { s: [1, 0.92, 1] })
        .add(ico(0.12), [0, 2.1, -0.14], H).add(cone(0.08, 0.5, 5), [0, 1.86, -0.3], H, { r: [-2.6, 0, 0] }).add(cyl(0.11, 0.09, 0.62), [-0.17, 1.52, -0.28], L, { r: [0, 0, 0.4] }).add(box(0.26, 0.12, 0.3), [0.36, 1.68, 0], L)
        .add(box(0.3, 0.5, 0.05), [0, 0.72, 0.17], V).add(box(0.14, 0.14, 0.1), [0.2, 1.0, 0.18], L);
        for (let i = 0; i < 4; i++) P.add(cyl(0.013, 0.013, 0.46, 4), [-0.33 + i * 0.045, 1.93, -0.28], I, { r: [0, 0, 0.4] }).add(cone(0.035, 0.1, 4), [-0.42 + i * 0.045, 2.15, -0.28], G, { r: [0, 0, 0.4], g: 1.2 }); },
      armR: arm,
      armL: (P) => arm(P).add(new THREE.TorusGeometry(0.78, 0.035, 5, 16, PI), [0, -0.82, 0.02], I, { r: [0, PI / 2, PI / 2] }).add(cyl(0.008, 0.008, 1.56, 4), [0, -0.82, 0.02], G, { g: 0.7 }).add(box(0.07, 0.07, 0.07), [0, -0.06, 0.02], G, { g: 1.5 }).add(box(0.07, 0.07, 0.07), [0, -1.58, 0.02], G, { g: 1.5 }),
      leg: (P) => P.add(box(0.18, 0.46, 0.19), [0, -0.25, 0], PT).add(box(0.19, 0.1, 0.2), [0, -0.46, 0], C).add(box(0.17, 0.44, 0.18), [0, -0.68, 0], L).add(box(0.18, 0.11, 0.3), [0, -0.9, 0.05], I),
    });
  },
  valvula(mat) {      // radio operator: goggles, headset, a field transmitter backpack studded with glowing valves
    const SK = 0xc8926e, H = 0x4e3020, J = 0x7c6a44, PT = 0x565a44, R = 0x8a5236, I = 0x34302e, G = 0xffe2b0, C = 0xcbb98f;
    const arm = (P) => P.add(box(0.15, 0.42, 0.15), [0, -0.2, 0], J).add(box(0.15, 0.38, 0.15), [0, -0.58, 0], C).add(box(0.12, 0.12, 0.12), [0, -0.82, 0], R);
    return rig(new THREE.Group(), mat, new Parts(), {
      sh: [0.36, 1.6], hip: [0.13, 0.95], scale: 1.48,
      body: (P) => { P.add(box(0.44, 0.26, 0.3), [0, 0.95, 0], PT).add(box(0.52, 0.56, 0.32), [0, 1.38, 0], J).add(box(0.2, 0.2, 0.34), [-0.12, 1.3, 0], C).add(box(0.46, 0.12, 0.34), [0, 1.69, 0], R)
        .add(ico(0.2), [0, 1.9, 0.02], SK).add(ico(0.215), [0, 1.95, -0.04], H, { s: [1, 0.92, 1] }).add(cone(0.09, 0.42, 5), [0, 1.86, -0.28], H, { r: [-2.5, 0, 0] })
        .add(box(0.32, 0.09, 0.08), [0, 2.03, 0.17], I).add(box(0.11, 0.07, 0.05), [0.08, 2.03, 0.21], G, { g: 1.6 }).add(box(0.11, 0.07, 0.05), [-0.08, 2.03, 0.21], G, { g: 1.6 })
        .add(cyl(0.1, 0.1, 0.08, 8), [0.21, 1.92, 0], I, { r: [0, 0, PI / 2] }).add(box(0.03, 0.03, 0.2), [0.2, 1.84, 0.1], I)
        .add(box(0.66, 0.78, 0.36), [0, 1.42, -0.36], R).add(box(0.5, 0.16, 0.04), [0, 1.3, -0.55], G, { g: 0.7 }).add(box(0.7, 0.1, 0.4), [0, 1.82, -0.36], I).add(box(0.16, 0.3, 0.3), [0.42, 1.2, -0.3], J);
        for (let i = 0; i < 4; i++) P.add(cyl(0.065, 0.065, 0.24, 8), [-0.22 + i * 0.15, 1.99, -0.36], G, { g: 1.5 }).add(cyl(0.075, 0.075, 0.05, 8), [-0.22 + i * 0.15, 1.88, -0.36], I);
        P.add(cyl(0.012, 0.016, 1.3, 4), [0.3, 2.4, -0.48], I, { r: [0.1, 0, -0.1] }).add(cyl(0.012, 0.016, 1.0, 4), [-0.3, 2.3, -0.48], I, { r: [0.1, 0, 0.15] }).add(ico(0.04), [0.36, 3.04, -0.42], G, { g: 2 }); },
      armR: (P) => arm(P).add(box(0.12, 0.3, 0.08), [0, -0.92, 0.08], I).add(cyl(0.01, 0.012, 0.5, 4), [0.03, -0.62, 0.08], I).add(box(0.07, 0.05, 0.02), [0, -0.86, 0.125], G, { g: 1.4 }),
      armL: arm,
      leg: (P) => P.add(box(0.19, 0.46, 0.2), [0, -0.25, 0], PT).add(box(0.2, 0.14, 0.22), [0.02, -0.2, 0.02], J).add(box(0.18, 0.44, 0.19), [0, -0.68, 0], PT).add(box(0.19, 0.12, 0.31), [0, -0.9, 0.05], I),
    });
  },
};

export class Puppet {
  constructor(kind, team, style = 'ranged') {
    this.root = MODELS[kind](HMAT[team]); this.p = {}; this.root.traverse((o) => { if (o.name) this.p[o.name] = o; }); this.scale = this.root.scale.x;
    this.phase = 0; this.wind = 0; this.windDur = 1; this.cast = 0; this.aim = 0; this.dead = -1; this.pop = 0; this.style = style; this.t = Math.random() * 9;
  }
  play(name, dur = 0.25) {
    if (name === 'attack') { this.wind = this.windDur = dur; this.aim = 1.6; } else if (name === 'cast') { this.cast = dur + 0.25; this.aim = 0.6; }
    else if (name === 'death') this.dead = 0; else if (name === 'idle') { this.dead = -1; this.root.rotation.x = 0; this.root.position.y = 0; }
  }
  flash() { this.pop = 0.1; }
  update(dt, { moving, speedK }) {
    const P = this.p, R = this.root; this.t += dt; this.pop = Math.max(0, this.pop - dt);
    if (this.dead >= 0) { this.dead += dt; const k = Math.min(1, this.dead * 2.2); R.rotation.x = -k * 1.5; R.position.y = k * 0.15; return; }
    if (moving) this.phase += speedK * dt * 13; const st = moving ? Math.sin(this.phase) * 0.8 : 0, br = Math.sin(this.t * 2) * 0.02;
    this.wind = Math.max(0, this.wind - dt); this.cast = Math.max(0, this.cast - dt); this.aim = Math.max(0, this.aim - dt);
    const w = this.wind > 0 ? 1 - this.wind / this.windDur : 0, aim = Math.min(1, this.aim * 3), c = Math.min(1, this.cast * 5);
    P.legL.rotation.x = st; P.legR.rotation.x = -st; P.body.position.y = Math.abs(st) * 0.05 + br; P.body.rotation.x = (moving ? 0.1 : 0) - c * 0.1;
    if (this.style === 'bow') { P.armL.rotation.x = -1.5 * aim - st * 0.5 * (1 - aim); P.armR.rotation.x = -1.2 * aim * (0.35 + w * 0.65) + st * 0.5 * (1 - aim); P.armR.rotation.z = 0; P.armL.rotation.z = 0; }
    else { P.armL.rotation.x = -(0.5 + aim * 0.5 + c * 1.5) - st * 0.3 * (1 - aim); P.armR.rotation.x = -(0.5 + aim * 1.0 * (0.4 + w * 0.6) + c * 1.5) + st * 0.3 * (1 - aim); P.armL.rotation.z = 0.35 + c * 0.5; P.armR.rotation.z = -0.35 - c * 0.5; }
    R.scale.setScalar(this.scale * (1 + this.pop * 0.8));
  }
}
