// Core combat state: entity list, damage, spatial queries. Milestone 3 plugs minions / towers into the same interface.
//   entity = { team, pos:Vector3, radius, hp, maxHp, alive, hurt(dmg, info), slowUntil, markUntil, targetable }
import * as THREE from 'three';
import { Batch, M, glowC, AMBER } from '../core/mats.js';
import { B, C, tire } from '../world/props.js';
import { Bar, C_AMBER, C_CYAN } from './vfx.js';
import { TOWER_X } from '../core/util.js';

export class Game {
  constructor(scene, vfx) { this.scene = scene; this.vfx = vfx; this.ents = []; this.t = 0; }
  add(e) { this.ents.push(e); return e; }
  enemies(team) { return this.ents.filter((e) => e.alive && e.team !== team && e.targetable !== false); }
  inRadius(team, p, r) { return this.enemies(team).filter((e) => Math.hypot(e.pos.x - p.x, e.pos.z - p.z) <= r + e.radius); }
  nearest(team, p, r) { let best = null, bd = r; for (const e of this.enemies(team)) { const d = Math.hypot(e.pos.x - p.x, e.pos.z - p.z) - e.radius; if (d < bd) { bd = d; best = e; } } return best; }
  // enemies inside a cone (half-angle) in front of p
  inCone(team, p, dir, r, half) {
    return this.inRadius(team, p, r).filter((e) => { const dx = e.pos.x - p.x, dz = e.pos.z - p.z, d = Math.hypot(dx, dz); return d < e.radius + 0.6 || (dx * dir.x + dz * dir.z) / d >= Math.cos(half); });
  }
  // enemies within `w` of segment a->b
  inCapsule(team, a, b, w) {
    const abx = b.x - a.x, abz = b.z - a.z, l2 = abx * abx + abz * abz || 1;
    return this.enemies(team).filter((e) => { const t = THREE.MathUtils.clamp(((e.pos.x - a.x) * abx + (e.pos.z - a.z) * abz) / l2, 0, 1); return Math.hypot(e.pos.x - (a.x + abx * t), e.pos.z - (a.z + abz * t)) <= w + e.radius; });
  }
  damage(src, target, amount, { crit = false, heavy = false, color = C_CYAN } = {}) {
    if (!target.alive) return 0;
    let dmg = amount; const marked = target.markUntil > this.t && src.isHero;
    if (marked) dmg *= 1.25; if (crit) dmg *= 2; dmg = Math.round(dmg * (0.94 + Math.random() * 0.12));
    target.hp -= dmg; target.hurt?.(dmg, src, heavy || crit);
    this.vfx.hit(target.pos, color, heavy || crit); this.vfx.number(target.pos, (crit ? '✦ ' : '') + dmg, crit ? 'crit' : '');
    if (target.hp <= 0) { target.hp = 0; target.alive = false; target.die?.(src); }
    return dmg;
  }
  mark(target, dur) { target.markUntil = this.t + dur; }
  slow(target, k, dur) { target.slowK = k; target.slowUntil = this.t + dur; }
  update(dt) { this.t += dt; for (const e of this.ents) e.update?.(dt, this); }
}

// ---- temporary sparring targets (EKOO scrap dummies) so skills can be reviewed before minions exist ----
class Dummy {
  constructor(game, x, z, hp = 600) {
    this.game = game; this.team = 'ekoo'; this.pos = new THREE.Vector3(x, 0, z); this.radius = 0.9; this.maxHp = this.hp = hp; this.alive = true; this.markUntil = 0; this.slowUntil = 0;
    const b = new Batch(), g = this.g = new THREE.Group(), body = this.body = new THREE.Group();
    b.add(B(1.3, 0.3, 1.3), M.concrete, [0, 0.15, 0]); b.build(g);
    b.add(C(0.12, 0.14, 2.6, 6), M.wood, [0, 1.3, 0], [0, 0, 0], 0x5e4c3e); b.add(B(1.9, 0.14, 0.14), M.wood, [0, 1.75, 0], [0, 0, 0], 0x5e4c3e);
    b.add(B(1.15, 1.25, 0.16), M.rust, [0, 1.5, 0.12], [0.05, 0, 0.04], 0xb07a54); b.add(B(0.55, 0.6, 0.5), M.rust, [0, 2.55, 0.02], [0, 0.2, 0], 0x9a8a78);
    b.add(B(0.4, 0.12, 0.06), M.glow, [0, 2.6, 0.29], [0, 0.2, 0], glowC(AMBER, 3)); tire(b, Math.random, 0.95, 1.3, 0, false);
    b.build(body); g.add(body); g.position.copy(this.pos); game.scene.add(g);
    this.bar = new Bar(game.scene, 2, 0xff6a3c); this.tilt = new THREE.Vector2(); this.tv = new THREE.Vector2(); this.dead = 0;
    this.ring = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.14, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x2fe4ff).multiplyScalar(2.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.ring.position.y = 0.36; this.ring.layers.set(1); g.add(this.ring);
  }
  hurt(dmg, src, heavy) { const dx = this.pos.x - src.pos.x, dz = this.pos.z - src.pos.z, d = Math.hypot(dx, dz) || 1, k = heavy ? 9 : 5; this.tv.x += (dz / d) * k; this.tv.y -= (dx / d) * k; }
  die() { this.dead = 4; this.game.vfx.sparks({ x: this.pos.x, y: 1.4, z: this.pos.z }, 26, { color: C_AMBER, speed: 11, life: 0.7 }); this.game.vfx.ring(this.pos, { r1: 3.4, color: C_AMBER }); }
  update(dt, game) {
    // damped spring wobble
    this.tv.x += (-this.tilt.x * 90 - this.tv.x * 9) * dt; this.tv.y += (-this.tilt.y * 90 - this.tv.y * 9) * dt; this.tilt.addScaledVector(this.tv, dt);
    if (!this.alive) {
      this.dead -= dt; const k = Math.min(1, (4 - this.dead) * 3); this.body.rotation.set(this.tilt.x - k * 1.45, 0, this.tilt.y); this.body.position.y = -k * 0.2; this.bar.g.visible = false; this.ring.visible = false;
      if (this.dead <= 0) { this.alive = true; this.hp = this.maxHp; this.markUntil = 0; this.body.position.y = 0; game.vfx.ring(this.pos, { r1: 2.2, color: C_AMBER, dur: 0.4 }); }
      return;
    }
    this.body.rotation.set(this.tilt.x, 0, this.tilt.y); this.bar.g.visible = true; this.bar.set(this.pos, 3.5, this.hp / this.maxHp);
    const m = this.markUntil > game.t; this.ring.visible = m; if (m) this.ring.rotation.y += dt * 2;
  }
}
export function spawnDummies(game) {
  const spots = [[-52, 0], [-48, 3.2], [-48, -3.2], [-44.5, 1.2], [-43, -4.2], [-41.5, 4.6], [-30, -2], [-27.5, 2.5], [-25, -1.5], [-TOWER_X + 16, 0]];
  return spots.map(([x, z], i) => game.add(new Dummy(game, x, z, i === 9 ? 2400 : 600)));
}
