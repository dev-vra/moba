// Hero base: stats, progression (level / skill ranks / gold / items / buffs), orders, basic attacks, recall, death.
// A hero is driven only by commands from its controller (`ctrl`): the local player's Input or a bot brain.
//   ctrl.cmds      : [{t:'move',x,z} | {t:'attack',target} | {t:'stop'} | {t:'cast',k,point} | {t:'level',k} | {t:'recall'} | {t:'buy',item}]
//   ctrl.attackHeld: basic attack toward ctrl.aim (cursor on the ground) while held
//   ctrl.aimKey    : skill key being aimed (indicator preview)      ctrl.stick: touch joystick
// The kit (kits/*.js) supplies the body (model + animation) and the four skills.
import * as THREE from 'three';
import { clampWalk, findPath, clear, SPAWN_X } from '../core/util.js';
import { Bar, Indicator, C_WHITE } from './vfx.js';
import { MAX_LEVEL, SLOTS, xpNeed } from './items.js';
import { BUFFS, TEAM_COL } from './game.js';
import { inkHeavy } from '../render/ink.js';

export const KEYS = ['q', 'w', 'e', 'r'], RANK_MAX = 3, ULT_AT = [4, 8, 12];
const _a = new THREE.Vector3(), _b = new THREE.Vector3();

export class Hero {
  static async create(...a) { const h = new Hero(...a); await h.init(); return h; }
  constructor(game, scene, rig, vfx, kit, team, ctrl, isPlayer, slot = 0) {
    Object.assign(this, { game, scene, rig, vfx, kit, team, ctrl, isPlayer, isHero: true, radius: 0.8, alive: true, targetable: true });
    const s = team === 'axiom' ? -1 : 1; this.spawnPos = new THREE.Vector3(s * SPAWN_X, 0, (slot - 1) * 4); this.pos = this.spawnPos.clone(); this.yaw = -s * Math.PI / 2; this.color = TEAM_COL[team];
    this.t = 0; this.level = 1; this.xp = 0; this.gold = 300; this.items = []; this.points = 1; this.ranks = { q: 0, w: 0, e: 0, r: 0 }; this.buffs = { power: 0, signal: 0 }; this.shield = 0; this.energy = 100;
    this.stat = { kills: 0, deaths: 0, dmg: 0, cs: 0 }; this.skills = {}; for (const k of KEYS) this.skills[k] = { ...kit.skills[k], ready: 0, cdNow: 1 };
    this.path = []; this.target = null; this.atkT = 0; this.lock = 0; this.recall = null; this.timers = []; this.respawnAt = 0; this.combatAt = -99; this.repath = 0; this.markUntil = 0; this.slowUntil = 0; this.slowK = 1; this.hasteMul = 1; this.hidden = { axiom: false, ekoo: false }; this.brush = -1; this.revealUntil = 0; this.vel = 0; this.pull = 0;
    this.recalc();
  }
  async init() {
    this.body = await this.kit.build(this); this.root = this.body.root; this.scene.add(inkHeavy(this.root));
    const mine = this.team === this.game.playerTeam;
    this.bar = new Bar(this.scene, 2.6, this.isPlayer ? 0x49f07a : mine ? 0x3fc8ff : 0xff5236, 0.26);
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.12, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: (mine ? new THREE.Color(0x2fe4ff) : new THREE.Color(0xff5a2a)).multiplyScalar(1.6), transparent: true, opacity: this.isPlayer ? 0.9 : 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.ring.position.y = 0.07; this.ring.layers.set(1); this.scene.add(this.ring);
    if (this.isPlayer) this.ind = new Indicator(this.scene);
    this.kit.init?.(this); this.game.add(this); this.root.position.copy(this.pos);
  }
  after(sec, fn) { this.timers.push({ t: this.t + sec, fn }); }
  get dirV() { return new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)); }
  face(d) { this.yaw = Math.atan2(d.x, d.z); }
  get atBase() { return Math.hypot(this.pos.x - this.spawnPos.x, this.pos.z) < 8; }

  // ---------------- stats / progression ----------------
  recalc() {
    const B = this.kit.base, st = { atk: 0, hp: 0, speed: 0, armor: 0, crit: 0, steal: 0, haste: 0, eregen: 0, tower: 0 }, L = this.level - 1, sig = this.buffs.signal > this.t;
    for (const it of this.items) for (const k in it.stats) st[k] += it.stats[k];
    const pw = this.power || 1, old = this.maxHp || B.hp; this.maxHp = Math.round((B.hp + B.hpLvl * L) * pw + st.hp); this.hp = Math.min(this.maxHp, (this.hp ?? this.maxHp) + Math.max(0, this.maxHp - old));
    this.atk = (B.atk + B.atkLvl * L) * pw + st.atk; this.speed = B.speed * (1 + st.speed); this.eregen = 5 + st.eregen + (sig ? 4 : 0); this.range = B.range;
    this.armor = Math.min(0.6, st.armor + (B.armor || 0)); this.crit = st.crit; this.steal = st.steal; this.haste = Math.min(0.5, st.haste + (sig ? 0.2 : 0)); this.towerMul = 1 + st.tower;
  }
  gainXp(n) {
    if (this.level >= MAX_LEVEL) return; this.xp += n;
    while (this.level < MAX_LEVEL && this.xp >= xpNeed(this.level)) {
      this.xp -= xpNeed(this.level); this.level++; this.points++; this.recalc(); this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.2); this.leveledAt = this.t;
      this.vfx.ring(this.pos, { r1: 5, dur: 0.6, k: 3, color: this.color });
      if (this.isPlayer) { this.vfx.ring(this.pos, { r0: 0.4, r1: 2.6, dur: 0.9, color: C_WHITE, k: 2.4 }); this.vfx.sparks({ x: this.pos.x, y: 0.5, z: this.pos.z }, 40, { speed: 4, up: 13, life: 1, grav: 6 }); this.vfx.number(this.pos, 'NÍVEL ' + this.level + ' — escolha uma habilidade (1-4)', 'level'); }
    }
    if (this.level >= MAX_LEVEL) this.xp = 0;
  }
  gainGold(n, pos) { this.gold += n; if (pos) this.vfx.number(pos, '+' + n, 'gold'); }
  canLevel(k) { return this.points > 0 && this.ranks[k] < RANK_MAX && (k !== 'r' || this.level >= ULT_AT[this.ranks.r]); }
  levelSkill(k) { if (!this.canLevel(k)) return false; this.ranks[k]++; this.points--; if (this.isPlayer) this.vfx.ring(this.pos, { r1: 2.4, dur: 0.3, k: 2.4 }); return true; }
  canBuy(it) { return this.items.includes(it) ? 'owned' : this.items.length >= SLOTS ? 'full' : this.gold < it.cost ? 'gold' : !(this.atBase || !this.alive) ? 'base' : null; }
  buy(it) { if (this.canBuy(it)) return false; this.gold -= it.cost; this.items.push(it); this.recalc(); if (this.alive) this.vfx.ring(this.pos, { r1: 3, dur: 0.4, k: 2.4, color: this.color }); return true; }
  sell(it) { const i = this.items.indexOf(it); if (i < 0 || !(this.atBase || !this.alive)) return false; this.items.splice(i, 1); this.gold += Math.round(it.cost * 0.6); this.recalc(); return true; }
  addBuff(kind) { this.buffs[kind] = this.t + BUFFS[kind].dur; this.recalc(); this.vfx.ring(this.pos, { r1: 5, dur: 0.7, k: 3, color: new THREE.Color(BUFFS[kind].color) }); }

  // ---------------- skills ----------------
  rank(k) { return this.ranks[k]; }
  can(k) { const s = this.skills[k]; return this.alive && this.ranks[k] > 0 && this.lock <= 0.05 && !this.busy && this.t >= s.ready && this.energy >= s.cost; }
  spend(k) { const s = this.skills[k]; s.cdNow = s.cd[this.ranks[k] - 1] * (1 - this.haste); s.ready = this.t + s.cdNow; this.energy -= s.cost; }
  cast(k, point) {
    if (!this.can(k)) { if (this.isPlayer && this.ranks[k] === 0 && this.t > (this.warnT || 0)) { this.warnT = this.t + 1.2; this.vfx.number(this.pos, 'Habilidade sem nível — use 1-4', 'info'); } return false; }
    const s = this.skills[k]; let dir, dist = 0;
    if (point) { _a.set(point.x - this.pos.x, 0, point.z - this.pos.z); dist = _a.length(); dir = dist > 0.2 ? _a.clone().normalize() : this.dirV; }
    else { const e = this.game.nearest(this.team, this.pos, (s.range || 6) + 2); if (e) { _a.subVectors(e.pos, this.pos).setY(0); dist = _a.length(); dir = _a.clone().normalize(); } else { dir = this.dirV; dist = (s.range || 0) * 0.6; } }
    const d = Math.min(dist, s.range || 0), at = clampWalk(this.pos.clone().addScaledVector(dir, d)); at.y = 0;
    this.cancelRecall(); if (s.type !== 'self') this.face(dir); this.spend(k); this.ind?.hide(); this.path = s.keepMoving ? this.path : []; if (!s.keepTarget) this.target = null;
    s.cast(this, { dir, point: at, dist: d }, this.ranks[k]); return true;
  }

  // ---------------- orders ----------------
  moveTo(x, z) { this.target = null; this.path = findPath(this.pos, { x, z }); this.cancelRecall(); }
  stop() { this.path = []; this.target = null; this.amove = null; }
  startRecall() { if (!this.alive || this.busy || this.atBase) return; this.stop(); this.recall = { t: 0, dur: 3.6 }; }
  cancelRecall() { if (this.recall) { this.recall = null; if (this.isPlayer) this.vfx.number(this.pos, 'Retorno interrompido', 'info'); } }
  // enemy to basic-attack: the one under the cursor, else the closest one in the cursor's direction, else the closest
  pickTarget() {
    const g = this.game, aim = this.ctrl.aim, reach = this.range + 1.6;
    if (aim) {
      const near = g.nearest(this.team, aim, 2.6, (e) => Math.hypot(e.pos.x - this.pos.x, e.pos.z - this.pos.z) - e.radius < reach + 3); if (near) return near;
      _a.set(aim.x - this.pos.x, 0, aim.z - this.pos.z).normalize();
      return g.nearest(this.team, this.pos, reach, (e) => { const dx = e.pos.x - this.pos.x, dz = e.pos.z - this.pos.z, d = Math.hypot(dx, dz) || 1; return d < e.radius + 1 || (dx * _a.x + dz * _a.z) / d > 0.5; });
    }
    return g.nearest(this.team, this.pos, reach);
  }

  // ---------------- damage / death ----------------
  hurt(dmg, src) { this.body.flash?.(); this.cancelRecall(); this.combatAt = this.game.t; this.lastHitBy = src; }
  die() {
    this.stat.deaths++; this.kit.onDie?.(this); this.timers.length = 0; this.busy = false; this.path = []; this.target = null; this.recall = null; this.targetable = false; this.lock = 99; this.shield = 0; this.buffs.power = this.buffs.signal = 0; this.recalc();
    this.respawnAt = this.t + 6 + this.level * 0.7; this.ind?.hide(); this.body.play('death'); this.vfx.ring(this.pos, { r1: 4, dur: 0.5, color: this.color });
    if (this.isPlayer) { this.vfx.shake(0.8); this.vfx.stop(0.12); }
  }
  respawn() {
    this.pos.copy(this.spawnPos); this.hp = this.maxHp; this.energy = 100; this.alive = true; this.targetable = true; this.lock = 0.3; this.respawnAt = 0; this.body.play('idle');
    this.vfx.ring(this.pos, { r1: 5, dur: 0.6, k: 3, color: this.color }); if (this.isPlayer) this.rig.snap(this.pos.x, this.pos.z);
  }

  update(dt) {
    this.t += dt; const g = this.game, c = this.ctrl; this.lock -= dt; this.atkT -= dt;
    if (!this.alive || g.over) {
      this.body.update(dt, { moving: false, speedK: 0 }); this.root.position.copy(this.pos); this.root.rotation.y = this.yaw; this.bar.g.visible = false; this.ring.visible = false; this.ind?.hide();
      c.think?.(this, g, dt); for (const m of c.cmds.splice(0)) { if (m.t === 'buy' && !g.over) this.buy(m.item); else if (m.t === 'level') this.levelSkill(m.k); }
      if (!this.alive && !g.over && this.t >= this.respawnAt) this.respawn();
      if (this.isPlayer) this.rig.goal.set(this.pos.x, 0, this.pos.z); return;
    }
    c.think?.(this, g, dt);
    if (g.t < (this.stunUntil || 0)) { this.lock = Math.max(this.lock, 0.1); this.path = []; }      // stunned: no orders, no movement
    for (let i = this.timers.length - 1; i >= 0; i--) if (this.t >= this.timers[i].t) this.timers.splice(i, 1)[0].fn();
    for (const m of c.cmds.splice(0)) {
      if (m.t === 'level') this.levelSkill(m.k); else if (m.t === 'buy') this.buy(m.item); else if (m.t === 'sell') this.sell(m.item);
      else if (m.t === 'cast' && (this.busy || this.lock > 0.05)) this.queued = { k: m.k, point: m.point, until: this.t + 0.7 };      // buffer: fires as soon as the hero is free
      else if (this.busy) continue;
      else if (m.t === 'move') { this.amove = null; this.moveTo(m.x, m.z); } else if (m.t === 'amove') { this.moveTo(m.x, m.z); this.amove = { x: m.x, z: m.z }; }
      else if (m.t === 'attack') { this.amove = null; this.target = m.target; this.cancelRecall(); } else if (m.t === 'stop') this.stop();
      else if (m.t === 'cast') this.cast(m.k, m.point); else if (m.t === 'recall') this.startRecall();
    }
    if (this.queued && !this.busy && this.lock <= 0.05) { const qd = this.queued; this.queued = null; if (this.t <= qd.until) this.cast(qd.k, qd.point); }
    // buffs / regen
    if ((this.buffs.power && this.buffs.power <= this.t) || (this.buffs.signal && this.buffs.signal <= this.t)) { if (this.buffs.power <= this.t) this.buffs.power = 0; if (this.buffs.signal <= this.t) this.buffs.signal = 0; this.recalc(); }
    const base = this.atBase, calm = g.t - this.combatAt > 5;
    this.gold += 2 * dt; this.energy = Math.min(100, this.energy + (base ? 25 : this.eregen) * dt); this.hp = Math.min(this.maxHp, this.hp + (base ? this.maxHp * 0.16 : calm ? this.maxHp * 0.006 : 2) * dt);
    if (this.shieldUntil && this.t > this.shieldUntil) { this.shield = 0; this.shieldUntil = 0; }
    // recall channel
    if (this.recall) {
      const r = this.recall; r.t += dt; if (Math.floor(r.t * 3) !== Math.floor((r.t - dt) * 3)) this.vfx.ring(this.pos, { r0: 3.2 * (1 - r.t / r.dur) + 0.6, r1: 0.5, dur: 0.33, k: 2.4, color: this.color });
      if (r.t >= r.dur) { this.recall = null; this.vfx.ring(this.pos, { r1: 4, dur: 0.4, color: this.color }); this.pos.copy(this.spawnPos); this.vfx.ring(this.pos, { r1: 5, dur: 0.6, k: 3, color: this.color }); if (this.isPlayer) this.rig.snap(this.pos.x, this.pos.z); }
    }
    this.kit.update?.(this, dt);

    // ---- basic attacks ----
    if (c.attackHeld && !this.busy) { const tg = this.pickTarget(); if (tg) { this.target = tg; this.holdAttack = true; } else if (this.kit.base.melee && this.lock <= 0 && this.atkT <= 0 && c.aim) { _a.set(c.aim.x - this.pos.x, 0, c.aim.z - this.pos.z).normalize(); this.face(_a); this.path = []; this.kit.basic(this, null, _a.clone()); } }
    else if (this.holdAttack) { this.holdAttack = false; if (!c.keepTarget) this.target = null; }
    // attack-move: fight whatever comes into reach, then carry on to the destination
    if (this.amove && !this.busy && !this.target) {
      const e = g.nearest(this.team, this.pos, this.range + 3.5, (e) => !g.guarded(e) && (e.lane !== false || e.aggro));
      if (e) this.target = e; else if (!this.path.length) { if (Math.hypot(this.amove.x - this.pos.x, this.amove.z - this.pos.z) > 1.2) this.path = findPath(this.pos, this.amove); else this.amove = null; }
    }
    let tg = this.target; if (tg && (!tg.alive || tg.targetable === false)) tg = this.target = null;
    if (tg && !this.busy) {
      _a.subVectors(tg.pos, this.pos).setY(0); const d = _a.length() - tg.radius; _a.normalize();
      if (d <= this.range) { this.path = []; if (this.lock <= 0) this.face(_a); if (this.atkT <= 0 && this.lock <= 0) { this.cancelRecall(); this.kit.basic(this, tg, _a.clone()); } }
      else if (!this.holdAttack || d < this.range + 4) { if ((this.repath -= dt) <= 0) { this.repath = 0.3; this.path = findPath(this.pos, tg.pos); } }
      else this.target = null;
    }
    // ---- movement: joystick (touch) or path following ----
    let moving = false, sp = this.speed * (this.slowUntil > g.t ? this.slowK : 1) * this.hasteMul;
    if (this.lock <= 0 && !this.busy && !this.recall) {
      _b.set(0, 0, 0);
      if (c.stick && c.stick.lengthSq() > 0.01) { _b.addScaledVector(this.rig.right, c.stick.x).addScaledVector(this.rig.fwd, c.stick.y); sp *= Math.min(1, c.stick.length()); this.path = []; this.target = null; }
      else if (this.path.length) {
        if (this.path.length > 1 && (this.pull -= dt) <= 0) { this.pull = 0.12; const n = this.path[1]; if (clear(this.pos.x, this.pos.z, n.x, n.z)) this.path.shift(); }    // cut corners as soon as the next leg is visible
        const p = this.path[0]; _b.set(p.x - this.pos.x, 0, p.z - this.pos.z); if (_b.length() < Math.max(0.25, sp * dt)) { this.path.shift(); if (!this.path.length) _b.set(0, 0, 0); } }
      const l = _b.length();
      if (l > 0.01) { _b.divideScalar(l); this.vel += (sp - this.vel) * Math.min(1, dt * 18); this.pos.addScaledVector(_b, this.vel * dt); moving = true; let dy = Math.atan2(_b.x, _b.z) - this.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); this.yaw += dy * Math.min(1, dt * 22); }
      else this.vel = 0;
    }
    if (!this.busy) clampWalk(this.pos);
    for (const tw of g.towers) if (tw.alive) { const dx = this.pos.x - tw.pos.x, dz = this.pos.z - tw.pos.z, d = Math.hypot(dx, dz) || 0.01, min = tw.radius + 0.7; if (d < min) { this.pos.x += dx / d * (min - d); this.pos.z += dz / d * (min - d); } }

    // ---- presentation ----
    this.body.update(dt, { moving, speedK: sp / this.kit.base.speed }); this.root.position.copy(this.pos); this.root.rotation.y = this.yaw;
    const seen = this.team === g.playerTeam || !this.hidden[g.playerTeam]; this.root.visible = seen; this.seen = seen;
    this.bar.g.visible = seen && (this.targetable || this.isPlayer); this.bar.set(this.pos, this.kit.barY || 3.8, this.hp / this.maxHp); this.ring.visible = seen; this.ring.position.set(this.pos.x, 0.07, this.pos.z); this.ring.rotation.y -= dt * 0.8;
    if (this.isPlayer) {
      this.rig.goal.set(this.pos.x, 0, this.pos.z); const k = c.aimKey, s = k && this.skills[k];
      if (s && this.ranks[k] > 0 && c.aim && s.type !== 'self') {
        _a.set(c.aim.x - this.pos.x, 0, c.aim.z - this.pos.z); const d = Math.min(_a.length(), s.range), yaw = Math.atan2(_a.x, _a.z); _a.normalize();
        if (s.type === 'point') this.ind.area(this.pos, s.range, _b.copy(this.pos).addScaledVector(_a, d), s.radius); else this.ind.line(this.pos, yaw, s.range, (s.width || 1.2) * 2);
      } else this.ind.hide();
    }
  }
}
