// Lane towers, one per faction, styled after it. Prioritise minions; shoot the hero when it is alone in range.
import * as THREE from 'three';
import { Batch, M, glowC, CYAN, AMBER, ENV_GLOW } from '../core/mats.js';
import { B, C, beam, valve, tire } from '../world/props.js';
import { Bar, C_CYAN, C_AMBER } from './vfx.js';
import { TOWER_X, CORE_X } from '../core/util.js';

const PI = Math.PI, HOT = 1 / ENV_GLOW;        // towers are gameplay objects: full-strength glow

function axiomTower(g) {
  const b = new Batch(), W = 0xf2f6fa, DK = 0x2b3644, cy = (k) => glowC(CYAN, k * HOT);
  b.add(C(2.5, 2.9, 0.9, 8), M.axiom, [0, 0.75, 0], [0, PI / 8, 0], 0xdfe6ee); b.add(C(2.55, 2.55, 0.12, 8, true), M.glow, [0, 0.9, 0], [0, PI / 8, 0], cy(1.6));
  b.add(C(0.95, 1.7, 5.2, 4), M.axiom, [0, 3.8, 0], [0, PI / 4, 0], W); b.add(C(1.25, 1.25, 0.3, 8), M.flat, [0, 6.5, 0], [0, 0, 0], DK);
  for (let i = 0; i < 4; i++) {
    const a = i * PI / 2, c = Math.cos(a), s = Math.sin(a);
    b.add(B(0.45, 4.6, 1.3), M.axiom, [c * 1.55, 3.3, s * 1.55], [0, -a + PI / 2, 0.12], W);
    b.add(B(0.12, 3.6, 0.14), M.glow, [c * 1.84, 3.3, s * 1.84], [0, -a + PI / 2, 0.12], cy(1.8));
    beam(b, M.axiom, [c * 0.9, 6.6, s * 0.9], [c * 1.9, 8.9, s * 1.9], 0.34, W); beam(b, M.glow, [c * 1.05, 6.9, s * 1.05], [c * 1.78, 8.6, s * 1.78], 0.12, cy(2));
    b.add(B(0.5, 0.5, 0.5), M.flat, [c * 1.9, 9.0, s * 1.9], [0, a, 0], DK);
  }
  b.build(g);
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.85, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x35dcff).multiplyScalar(2.6) })); core.position.y = 8.2; g.add(core);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.06, 6, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x8ff0ff).multiplyScalar(1.8) })); ring.position.y = 8.2; g.add(ring);
  return { core, ring, muzzle: 8.2 };
}
function ekooTower(g) {
  const b = new Batch(), gl = new Batch(), RU = 0xb09080, RD = 0x8a6a58, I = 0x3a3230;
  b.add(B(4.6, 1, 4.6), M.concrete, [0, 0.75, 0], [0, 0.2, 0], 0xb0a898);
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { beam(b, M.rustB, [sx * 1.9, 1.2, sz * 1.9], [sx * 0.75, 6.6, sz * 0.75], 0.3, RU); b.add(B(0.7, 0.7, 0.1), M.rust, [sx * 1.9, 1.5, sz * 1.9], [0, PI / 4, 0], RD); }
  for (let y = 2.6, i = 0; y < 6.5; y += 1.9, i++) {
    const w = 1.9 - ((y - 1.2) / 5.4) * 1.15, w0 = 1.9 - ((y - 3.1) / 5.4) * 1.15, d = i % 2 ? 1 : -1;
    for (const s of [-1, 1]) { b.add(B(w * 2, 0.14, 0.14), M.rustB, [0, y, s * w], [0, 0, 0], RD); b.add(B(0.14, 0.14, w * 2), M.rustB, [s * w, y, 0], [0, 0, 0], RD);
      beam(b, M.rustB, [-d * w0, y - 1.9, s * w0], [d * w, y, s * w], 0.1, RU); beam(b, M.rustB, [s * w0, y - 1.9, -d * w0], [s * w, y, d * w], 0.1, RU); }
  }
  b.add(B(3, 0.24, 3), M.grid, [0, 6.7, 0], [0, 0.2, 0], 0xc0b0a0); for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) b.add(C(0, 0.12, 0.9, 5), M.flat, [sx * 1.5, 7.2, sz * 1.5], [sz * 0.5, 0, -sx * 0.5], I);
  valve(b, gl, 0, 6.8, 0, 1.25);
  b.add(new THREE.SphereGeometry(0.9, 10, 4, 0, 6.283, 0, 0.95), M.rust, [1.5, 5.2, 0.9], [PI / 2, 0, -0.9], 0xc8c0b4, [1, 0.5, 1]);
  const tarp = new THREE.PlaneGeometry(2.6, 3.4, 3, 3); b.add(tarp, M.tarp, [-1.5, 3.4, 1.3], [-0.5, -0.9, 0.1], 0xa9683f);
  for (let i = 0; i < 3; i++) { tire(b, Math.random, 2.6, i * 0.38 + 0.3, -1.6); tire(b, Math.random, -2.4, i * 0.38 + 0.3, 2); }
  for (let i = 0; i < 6; i++) { const a = i * 1.05; b.add(C(0, 0.14, 1.3, 5), M.flat, [Math.cos(a) * 2.7, 0.9, Math.sin(a) * 2.7], [Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9], I); }
  b.build(g); gl.build(g, 1);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffb04a).multiplyScalar(2.8) })); core.position.y = 9.2; g.add(core);
  return { core, ring: null, muzzle: 9.2 };
}

// Base cores: the win condition. AXIOM = cryogenic data core, EKOO = the Coro's transmitter.
function axiomCore(g) {
  const b = new Batch(), W = 0xf2f6fa, DK = 0x2b3644, cy = (k) => glowC(CYAN, k * HOT);
  b.add(C(3.3, 3.8, 1.0, 10), M.axiom, [0, 0.8, 0], [0, 0, 0], 0xdfe6ee); b.add(C(3.35, 3.35, 0.14, 10, true), M.glow, [0, 1.05, 0], [0, 0, 0], cy(1.8)); b.add(C(2.2, 2.6, 0.6, 10), M.flat, [0, 1.6, 0], [0, 0, 0], DK);
  for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.5, c = Math.cos(a), s = Math.sin(a);
    beam(b, M.axiom, [c * 2.7, 1.2, s * 2.7], [c * 3.1, 5.2, s * 3.1], 0.7, W); beam(b, M.axiom, [c * 3.1, 5.2, s * 3.1], [c * 1.5, 8.6, s * 1.5], 0.5, W);
    beam(b, M.glow, [c * 2.85, 1.6, s * 2.85], [c * 3.2, 5.0, s * 3.2], 0.16, cy(2)); b.add(B(0.6, 0.6, 0.6), M.flat, [c * 3.1, 5.25, s * 3.1], [0, -a, 0], DK); }
  b.build(g);
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x35dcff).multiplyScalar(2.6) })); core.position.y = 5.2; g.add(core);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.08, 6, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x8ff0ff).multiplyScalar(1.8) })); ring.position.y = 5.2; g.add(ring);
  return { core, ring, muzzle: 5.2 };
}
function ekooCore(g) {
  const b = new Batch(), gl = new Batch(), RU = 0xb09080, I = 0x3a3230;
  b.add(B(6.2, 1.2, 6.2), M.concrete, [0, 0.85, 0], [0, 0.4, 0], 0xb0a898); b.add(C(1.3, 1.7, 5.5, 8), M.rustB, [0, 4, 0], [0, 0, 0], RU); b.add(C(2.2, 2.2, 0.3, 10), M.grid, [0, 6.8, 0], [0, 0, 0], 0xc0b0a0);
  for (let i = 0; i < 4; i++) { const a = i * 1.571 + 0.4, c = Math.cos(a), s = Math.sin(a); valve(b, gl, c * 2.3, 1.45, s * 2.3, 1.15); beam(b, M.flat, [c * 2.3, 2.2, s * 2.3], [0, 6, 0], 0.12, I); b.add(C(0, 0.16, 1.5, 5), M.flat, [c * 3.4, 1.4, s * 3.4], [s * 0.9, 0, -c * 0.9], I); }
  b.add(new THREE.SphereGeometry(1.5, 12, 5, 0, 6.283, 0, 0.95), M.rust, [0, 7.4, 0.3], [0.5, 0, 0], 0xc8c0b4, [1, 0.5, 1]); for (let i = 0; i < 4; i++) tire(b, Math.random, 3.2 * Math.cos(i * 1.57), 0.5, 3.2 * Math.sin(i * 1.57));
  b.build(g); gl.build(g, 1);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.9, 14, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffb04a).multiplyScalar(2.8) })); core.position.y = 8.6; g.add(core);
  return { core, ring: null, muzzle: 8.6 };
}

export class Tower {
  constructor(game, team, core = false) {
    Object.assign(this, { game, team, isTower: true, isCore: core, alive: true, radius: core ? 3.4 : 2.7, range: core ? 10 : 11.5, atk: core ? 150 : 210, cdMax: 0.95, name: core ? (team === 'axiom' ? 'NÚCLEO AXIOM' : 'TRANSMISSOR EKOO') : (team === 'axiom' ? 'TORRE AXIOM' : 'TORRE EKOO') });
    this.pos = new THREE.Vector3((team === 'axiom' ? -1 : 1) * (core ? CORE_X : TOWER_X), 0, 0); this.maxHp = this.hp = core ? 9000 : 7500; this.cd = 1; this.think = 0; this.ramp = 0; this.markUntil = 0; this.slowUntil = 0; this.deadT = 0;
    const g = this.g = new THREE.Group(); g.position.copy(this.pos); game.scene.add(g);
    this.fx = core ? (team === 'axiom' ? axiomCore(g) : ekooCore(g)) : team === 'axiom' ? axiomTower(g) : ekooTower(g);
    if (core) { this.bubble = new THREE.Mesh(new THREE.SphereGeometry(4.6, 24, 12, 0, 6.283, 0, 1.75), new THREE.MeshBasicMaterial({ color: team === 'axiom' ? 0x35dcff : 0xffa23a, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); this.bubble.position.y = 4.2; this.bubble.layers.set(1); g.add(this.bubble); } this.color = team === 'axiom' ? C_CYAN : C_AMBER;
    this.bar = new Bar(game.scene, 4.4, team === 'axiom' ? 0x3fc8ff : 0xff5236, 0.34);
    const hostile = team !== 'axiom';
    this.zone = new THREE.Mesh(new THREE.RingGeometry(this.range - 0.12, this.range, 96).rotateX(-PI / 2), new THREE.MeshBasicMaterial({ color: hostile ? new THREE.Color(0xff4a2a).multiplyScalar(1.6) : new THREE.Color(0x3fc8ff), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.zone.position.set(this.pos.x, 0.1, 0); this.zone.layers.set(1); game.scene.add(this.zone);
    this.light = new THREE.PointLight(this.color, 12, 16, 1.6); this.light.position.set(0, 6, 0); g.add(this.light);
  }
  hurt() { this.hitT = 0.12; }
  die() {
    const v = this.game.vfx, p = this.pos; this.bar.g.visible = false; this.zone.visible = false; this.fx.core.visible = false; if (this.fx.ring) this.fx.ring.visible = false; this.light.intensity = 0;
    for (let i = 0; i < 5; i++) this.game.after(i * 0.22, () => { const q = { x: p.x + (Math.random() - 0.5) * 3, y: 2 + i * 1.5, z: p.z + (Math.random() - 0.5) * 3 }; v.sparks(q, 40, { color: this.color, speed: 15, up: 9, life: 0.9 }); v.ring(p, { r1: 7 + i * 1.5, color: this.color, dur: 0.6, k: 3 }); v.disc(p, { r: 6, color: this.color, dur: 0.4, k: 2.5 }); v.shake(1); v.flash(p, this.color, 200); });
    if (this.isCore) this.game.finish(this.team === this.game.playerTeam ? 'defeat' : 'victory');
    else this.game.say(`${this.name} DESTRUÍDA — o ${this.team === 'axiom' ? 'Núcleo AXIOM' : 'Transmissor EKOO'} está exposto`, this.team === 'axiom' ? 'ekoo' : 'axiom');
  }
  update(dt, g) {
    const f = this.fx, t = g.t;
    if (!this.alive) { const k = Math.min(1, (this.deadT += dt) / 1.6); this.g.rotation.z = k * 0.45 * (this.team === 'axiom' ? 1 : -1); this.g.rotation.x = k * 0.2; this.g.position.y = -k * k * 3.2; return; }
    if (this.hp < this.maxHp * 0.5 && Math.random() < dt * (this.hp < this.maxHp * 0.25 ? 9 : 4)) g.vfx.sparks({ x: this.pos.x + (Math.random() - 0.5) * 2, y: 2 + Math.random() * 5, z: this.pos.z + (Math.random() - 0.5) * 2 }, 5, { color: this.color, speed: 5, up: 4, life: 0.5 });   // failing structure
    f.core.rotation.y = t * 1.6; f.core.position.y = f.muzzle + Math.sin(t * 2) * 0.18; f.core.scale.setScalar(1 + Math.min(0.5, Math.max(0, 0.5 - this.cd)) * 0.7); if (f.ring) { f.ring.rotation.x = PI / 2 + Math.sin(t * 0.9) * 0.4; f.ring.rotation.y = t * 0.7; f.ring.position.y = f.core.position.y; }
    this.bar.set(this.pos, this.isCore ? 10.5 : 11.5, this.hp / this.maxHp);
    if (this.bubble) { const up = g.guarded(this); this.bubble.visible = up; this.bubble.scale.setScalar(1 + Math.sin(t * 2.4) * 0.02); this.bubble.rotation.y = t * 0.3; }
    const h = g.hero, hostile = h && this.team !== h.team, hd = h ? Math.hypot(h.pos.x - this.pos.x, h.pos.z - this.pos.z) : 99;
    this.zone.material.opacity += (((hostile && hd < this.range + 5 ? (this.target === h ? 0.75 + Math.sin(t * 12) * 0.25 : 0.4) : 0)) - this.zone.material.opacity) * Math.min(1, dt * 6);
    if (g.over) return;
    if ((this.think -= dt) <= 0) {
      this.think = 0.25; let best = null, bd = this.range;
      for (const e of g.enemies(this.team)) { if (e.isHero || e.team === 'vessari' && !e.lane) continue; const d = Math.hypot(e.pos.x - this.pos.x, e.pos.z - this.pos.z) - e.radius; if (d < bd) { bd = d; best = e; } }
      if (!best) best = g.nearest(this.team, this.pos, this.range, (e) => e.isHero);     // no minions in range: shoot heroes
      if (best !== this.target) this.ramp = 0; this.target = best;
    }
    this.cd = Math.max(0, this.cd - dt); const tg = this.target;
    if (tg && tg.alive && tg.targetable !== false && this.cd <= 0) {
      this.cd = this.cdMax; const dmg = this.atk * (tg.isHero ? 1 + Math.min(1.2, this.ramp * 0.3) : 1); this.ramp++;
      g.shoot(this, tg, dmg, { from: new THREE.Vector3(this.pos.x, f.core.position.y, this.pos.z), speed: 30, size: 1.9, heavy: true }); g.vfx.sparks({ x: this.pos.x, y: f.core.position.y, z: this.pos.z }, 8, { color: this.color, speed: 5, life: 0.3 });
    }
  }
}
