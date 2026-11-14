// Match state: entities, damage rules, spatial queries, projectiles, minion waves, jungle camps, win / lose.
//   entity = { team, pos:Vector3, radius, hp, maxHp, alive, targetable?, update(dt, game), hurt?(dmg, src), die?(src) }
import * as THREE from 'three';
import { Unit, UMAT } from './units.js';
import { Tower } from './towers.js';
import { C_AMBER, C_CYAN, C_VIOLET, C_WHITE } from './vfx.js';
import { CAMPS, clamp, widen } from '../core/util.js';
import { REWARD } from './items.js';

const TEAM_COL = { axiom: C_CYAN, ekoo: C_AMBER, vessari: C_VIOLET };
const WAVE_EVERY = 25, CAMP_RESPAWN = 60, MAX_UNITS = 64;

class Camp {                                   // 3 Eco Menor guarding a rift; whoever clears it gets them as lane reinforcements
  constructor(game, c) { this.game = game; this.c = c; this.units = []; this.respawnAt = 0; this.lastHit = null; this.spawn(); }
  spawn() {
    const c = this.c; this.units = [-1, 0, 1].map((i) => this.game.spawn('eco', 'vessari', c.x + i * 2.8, c.z + c.side * (2.2 - Math.abs(i) * 1.4), { lane: false, camp: this }));
  }
  update(g) {
    if (this.units.length && this.units.every((u) => !u.alive)) {
      const team = this.lastHit?.team, c = this.c; this.units = []; this.respawnAt = g.t + CAMP_RESPAWN;
      if (team === 'axiom' || team === 'ekoo') g.after(0.9, () => g.convert(c, team));
    } else if (!this.units.length && this.respawnAt && g.t >= this.respawnAt) { this.respawnAt = 0; this.spawn(); g.vfx.ring({ x: this.c.x, z: this.c.z }, { r1: 7, color: C_VIOLET, dur: 0.7, k: 2.6 }); }
  }
}

export class Game {
  constructor(scene, vfx, hud) {
    this.scene = scene; this.vfx = vfx; this.hud = hud; this.ents = []; this.t = 0; this.timers = []; this.shots = []; this.over = null; this.wave = 0; this.nextWave = 3; this.kills = 0; this.score = [0, 0, 0];
    const sg = new THREE.OctahedronGeometry(0.22, 0); sg.scale(1, 1, 2.6);
    this.shotPool = Array.from({ length: 28 }, () => { const m = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ color: 0xffffff })); m.visible = false; m.layers.set(1); scene.add(m); return m; });
  }
  start() {
    this.towers = [this.add(new Tower(this, 'axiom')), this.add(new Tower(this, 'ekoo'))];
    this.camps = CAMPS.map((c) => new Camp(this, c));
  }
  add(e) { this.ents.push(e); return e; }
  spawn(kind, team, x, z, o) { return this.add(new Unit(this, kind, team, x, z, o)); }
  after(delay, fn) { this.timers.push({ t: this.t + delay, fn }); }

  // ---- queries ----
  enemies(team) { return this.ents.filter((e) => e.alive && e.team !== team && e.targetable !== false); }
  inRadius(team, p, r) { return this.enemies(team).filter((e) => Math.hypot(e.pos.x - p.x, e.pos.z - p.z) <= r + e.radius); }
  nearest(team, p, r) { let best = null, bd = r; for (const e of this.enemies(team)) { const d = Math.hypot(e.pos.x - p.x, e.pos.z - p.z) - e.radius; if (d < bd) { bd = d; best = e; } } return best; }
  inCone(team, p, dir, r, half) {
    return this.inRadius(team, p, r).filter((e) => { const dx = e.pos.x - p.x, dz = e.pos.z - p.z, d = Math.hypot(dx, dz); return d < e.radius + 0.6 || (dx * dir.x + dz * dir.z) / d >= Math.cos(half); });
  }
  inCapsule(team, a, b, w) {
    const abx = b.x - a.x, abz = b.z - a.z, l2 = abx * abx + abz * abz || 1;
    return this.enemies(team).filter((e) => { const t = clamp(((e.pos.x - a.x) * abx + (e.pos.z - a.z) * abz) / l2, 0, 1); return Math.hypot(e.pos.x - (a.x + abx * t), e.pos.z - (a.z + abz * t)) <= w + e.radius; });
  }
  alliesNear(team, p, r) { return this.ents.some((e) => e.alive && e.isUnit && e.team === team && Math.hypot(e.pos.x - p.x, e.pos.z - p.z) < r); }

  // ---- combat ----
  damage(src, target, amount, { crit = false, heavy = false, color = null } = {}) {
    if (!target.alive || this.over) return 0;
    if (target.isHero && target.targetable === false) return 0;                 // ghost / ultimate: untouchable
    let dmg = amount, shielded = false; const col = color || TEAM_COL[src.team] || C_WHITE;
    if (src.isHero && target.markUntil > this.t) dmg *= 1.25;
    if (crit) dmg *= 2;
    if (target.isHero) dmg *= 1 - (target.armor || 0);
    if (target.isTower && src.isHero) { dmg *= 0.38 * (src.towerMul || 1); if (!this.alliesNear(src.team, target.pos, 11)) { dmg *= 0.35; shielded = true; } }   // plated structure; shrugs off a lone hero
    dmg = Math.round(dmg * (0.94 + Math.random() * 0.12)); target.hp -= dmg; target.hurt?.(dmg, src, heavy || crit);
    if (src.isHero) {
      if (src.steal && !target.isTower) src.hp = Math.min(src.maxHp, src.hp + dmg * src.steal);
      this.vfx.hit(target.pos, col, heavy || crit); this.vfx.number(target.pos, (crit ? '✦ ' : '') + dmg, crit ? 'crit' : '');
      if (shielded && Math.random() < 0.35) this.vfx.number(target.pos, 'TORRE PROTEGIDA — traga minions', 'info');
    } else if (target.isHero) { this.vfx.sparks({ x: target.pos.x, y: 1.6, z: target.pos.z }, 8, { color: col, speed: 7 }); this.vfx.number(target.pos, '-' + dmg, 'hurt'); this.vfx.shake(heavy ? 0.5 : 0.2); }
    else this.vfx.sparks({ x: target.pos.x, y: target.isTower ? 3 : 1.3, z: target.pos.z }, heavy ? 8 : 3, { color: col, speed: 5, life: 0.25, size: 0.4 });
    if (target.hp <= 0) {
      target.hp = 0; target.alive = false; target.die?.(src);
      if (target.isUnit) { this.vfx.sparks({ x: target.pos.x, y: 1.2, z: target.pos.z }, 16, { color: TEAM_COL[target.team], speed: 8, up: 6, life: 0.6 }); this.vfx.ring(target.pos, { r1: 2.2, color: TEAM_COL[target.team], dur: 0.3, k: 1.6 }); if (src.isHero) { this.kills++; src.onKill?.(target); }
        this.score[src.team === 'axiom' ? 0 : src.team === 'ekoo' ? 1 : 2]++;
        const h = this.hero, rw = REWARD[target.kind];                         // xp for being nearby, gold for the last hit (a share otherwise)
        if (h && h.alive && rw && target.team !== h.team && Math.hypot(h.pos.x - target.pos.x, h.pos.z - target.pos.z) < 16) { h.gainXp(rw[0]); h.gainGold(src.isHero ? rw[1] : Math.round(rw[1] * 0.3), src.isHero ? target.pos : null); } }
    }
    return dmg;
  }
  mark(target, dur) { if (!target.isTower) target.markUntil = this.t + dur; }
  slow(target, k, dur) { target.slowK = k; target.slowUntil = this.t + dur; }
  shoot(src, target, dmg, { from = null, speed = 20, size = 1, heavy = false } = {}) {
    const m = this.shotPool.find((x) => !x.visible) || this.shotPool[0]; m.visible = true; m.scale.setScalar(size);
    m.material.color.copy(TEAM_COL[src.team] || C_WHITE).multiplyScalar(3); if (from) m.position.copy(from); else m.position.set(src.pos.x, src.K?.fly ? 2.4 : 1.7, src.pos.z);
    this.shots.push({ m, src, target, dmg, speed, heavy });
  }
  updateShots(dt) {
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i], t = s.target, ty = t.isTower ? 4 : t.K?.fly ? 2.4 : 1.4, dx = t.pos.x - s.m.position.x, dy = ty - s.m.position.y, dz = t.pos.z - s.m.position.z, d = Math.hypot(dx, dy, dz), step = s.speed * dt;
      if (d <= step + 0.4 || !t.alive) {
        if (t.alive) { this.damage(s.src, t, s.dmg, { heavy: s.heavy }); if (s.heavy) this.vfx.ring(t.pos, { r1: 2.4, color: TEAM_COL[s.src.team], dur: 0.25, k: 2 }); }
        s.m.visible = false; this.shots.splice(i, 1); continue;
      }
      s.m.position.x += dx / d * step; s.m.position.y += dy / d * step; s.m.position.z += dz / d * step; s.m.lookAt(t.pos.x, ty, t.pos.z);
    }
  }

  // ---- match flow ----
  spawnWave() {
    const n = ++this.wave, count = this.ents.filter((e) => e.isUnit && e.alive).length; if (count > MAX_UNITS) return;
    for (const team of ['axiom', 'ekoo']) {
      const s = team === 'axiom' ? -1 : 1, x0 = s * 57, boost = 1 + Math.max(0, n - 2) * 0.07, melee = team === 'axiom' ? 'hoste' : 'saque', ranged = team === 'axiom' ? 'drone' : 'arq';
      [-2.4, 0, 2.4].forEach((z, i) => this.spawn(melee, team, x0 - s * (i === 1 ? 1.2 : 0), z, { laneZ: z, boost }));
      [-1.4, 1.4].forEach((z) => this.spawn(ranged, team, x0 + s * 3.5, z, { laneZ: z, boost }));
      if (team === 'ekoo' && n >= 2) this.spawn(melee, team, x0 + s * 1.5, 0, { laneZ: 0 });            // EKOO out-scales the lane: an idle hero loses
      if (team === 'ekoo' && n >= 4 && n % 2 === 0) this.spawn(ranged, team, x0 + s * 5, 0, { laneZ: 0 });
    }
  }
  convert(c, team) {                                  // cleared camp -> Vessari are pulled into the lane on that team's side
    const s = team === 'axiom' ? -1 : 1, to = { x: s * 22, z: c.side * 3.5 }, v = this.vfx, col = TEAM_COL[team];
    v.streak({ x: c.x, z: c.z }, to, { color: C_VIOLET, width: 2.6, dur: 0.9, k: 3 }); v.streak({ x: c.x, z: c.z }, to, { color: col, width: 0.9, dur: 1.1, k: 4, y: 1.4 });
    v.ring({ x: c.x, z: c.z }, { r1: 8, color: C_VIOLET, dur: 0.7, k: 3 }); v.ring(to, { r1: 5, color: col, dur: 0.7, k: 3 }); v.sparks({ x: to.x, y: 1, z: to.z }, 40, { color: col, speed: 9, up: 8, life: 0.8 });
    [-1.6, 0, 1.6].forEach((dz, i) => this.spawn('eco', team, to.x - s * i * 1.4, to.z * 0.4 + dz, { laneZ: dz, look: team, boost: 1.1 }));
    if (this.hero) v.number(this.hero.pos, team === this.hero.team ? 'VESSARI CONVERTIDOS — reforço na lane!' : 'VESSARI TOMADOS PELO INIMIGO', 'info');
  }
  finish(result) { if (this.over) return; this.over = result; this.after(0.8, () => this.hud?.end(result, { time: this.t, kills: this.kills, deaths: this.hero?.deaths ?? 0, level: this.hero?.level ?? 1 })); }

  update(dt) {
    this.t += dt;
    for (let i = this.timers.length - 1; i >= 0; i--) if (this.t >= this.timers[i].t) this.timers.splice(i, 1)[0].fn();
    if (!this.over) { if (this.t >= this.nextWave) { this.nextWave += WAVE_EVERY; this.spawnWave(); } for (const c of this.camps) c.update(this); }
    for (const e of this.ents) e.update?.(dt, this);
    this.updateShots(dt);
    // soft separation between units; lane units stay inside the lane; nobody stands inside a tower
    const us = this.ents.filter((e) => e.isUnit && e.alive);
    for (let i = 0; i < us.length; i++) {
      const a = us[i];
      for (let j = i + 1; j < us.length; j++) {
        const b = us[j], dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, d = Math.hypot(dx, dz) || 0.01, min = a.radius + b.radius;
        if (d < min) { const k = (min - d) * 0.5 / d; a.pos.x -= dx * k; a.pos.z -= dz * k; b.pos.x += dx * k; b.pos.z += dz * k; }
      }
      for (const tw of this.towers) if (tw.alive) { const dx = a.pos.x - tw.pos.x, dz = a.pos.z - tw.pos.z, d = Math.hypot(dx, dz) || 0.01, min = tw.radius + a.radius; if (d < min) { a.pos.x += dx / d * (min - d); a.pos.z += dz / d * (min - d); } }
      if (a.lane) { const lim = 5.2 * widen(a.pos.x); a.pos.z = clamp(a.pos.z, -lim, lim); }
    }
    if (this.ents.some((e) => e.gone)) this.ents = this.ents.filter((e) => !e.gone);
  }
}
export { UMAT };
