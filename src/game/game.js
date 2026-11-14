// Match simulation: entities, damage rules, queries, projectiles / zones, waves, jungle camps, scoring, win / lose.
// Everything here is driven by commands coming from controllers (player input or bot brains), never by the DOM —
// the same step function can later run on a server for online play.
//   entity = { team, pos:Vector3, radius, hp, maxHp, alive, targetable?, update(dt, game), hurt?(dmg, src), die?(src) }
import * as THREE from 'three';
import { Unit } from './units.js';
import { Tower } from './towers.js';
import { C_AMBER, C_CYAN, C_VIOLET, C_WHITE } from './vfx.js';
import { CAMPS, BLOCKERS, clamp, widen, inBrush, LANES, LANE_IDS, laneFrame } from '../core/util.js';
import { REWARD } from './items.js';

export const TEAM_COL = { axiom: C_CYAN, ekoo: C_AMBER, vessari: C_VIOLET };
const WAVE_EVERY = 25, MAX_UNITS = 160;
export const BUFFS = {
  power: { name: 'SOBRECARGA', desc: '+18% de dano causado', dur: 80, color: 0xff7a3c },
  signal: { name: 'SINAL LIMPO', desc: '−20% recarga, +energia', dur: 80, color: 0x8a6cff },
};

class Camp {
  constructor(game, c) { this.game = game; this.c = c; this.units = []; this.respawnAt = c.first || 0; this.lastHit = null; if (!c.first) this.spawn(); }
  spawn() {
    const c = this.c, n = c.kinds.length;
    this.units = c.kinds.map((k, i) => this.game.spawn(k, 'vessari', c.x + (i - (n - 1) / 2) * 2.9, c.z + c.side * (n > 1 ? 1.6 - Math.abs(i - (n - 1) / 2) * 1.5 : 0.8), { lane: false, camp: this }));
  }
  update(g) {
    if (this.units.length && this.units.every((u) => !u.alive)) { this.units = []; this.respawnAt = g.t + this.c.respawn; g.campTaken(this, this.lastHit); }
    else if (!this.units.length && this.respawnAt && g.t >= this.respawnAt) { this.respawnAt = 0; this.spawn(); if (this.c.epic) g.say(`${this.c.name} DESPERTOU`, 'vessari'); g.vfx.ring({ x: this.c.x, z: this.c.z }, { r1: this.c.r, color: C_VIOLET, dur: 0.7, k: 2.6 }); }
  }
}

export class Game {
  constructor(scene, vfx, hud) {
    this.scene = scene; this.vfx = vfx; this.hud = hud; this.ents = []; this.heroes = []; this.t = 0; this.timers = []; this.shots = []; this.lines = []; this.zones = []; this.over = null; this.wave = 0; this.nextWave = 3; this.nextEvent = 197; this.eventUntil = 0;
    this.score = { axiom: 0, ekoo: 0 };            // hero kills only
    this.campScore = { axiom: 0, ekoo: 0 };        // Vessari camps taken
    const sg = new THREE.OctahedronGeometry(0.22, 0); sg.scale(1, 1, 2.6);
    this.shotPool = Array.from({ length: 36 }, () => { const m = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ color: 0xffffff })); m.visible = false; m.layers.set(1); scene.add(m); return m; });
  }
  start() {
    this.towers = [...LANE_IDS.flatMap((l) => [this.add(new Tower(this, 'axiom', false, l)), this.add(new Tower(this, 'ekoo', false, l))]), this.add(new Tower(this, 'axiom', true)), this.add(new Tower(this, 'ekoo', true))];
    for (const tw of this.towers) BLOCKERS.push({ x: tw.pos.x, z: tw.pos.z, r: tw.radius, on: () => tw.alive });
    this.camps = CAMPS.map((c) => new Camp(this, c));
  }
  add(e) { this.ents.push(e); if (e.isHero) this.heroes.push(e); return e; }
  // a core cannot be hurt while its outer tower stands
  guarded(core) { return core.isCore && this.towers.filter((t) => !t.isCore && t.team === core.team).every((t) => t.alive); }   // basta derrubar a torre de UMA lane
  // the structure a team must attack next / defend first
  front(team, lane = 'mid') { return this.towers.find((t) => t.team === team && !t.isCore && t.lane === lane && t.alive) || this.towers.find((t) => t.team === team && t.isCore); }
  spawn(kind, team, x, z, o) { return this.add(new Unit(this, kind, team, x, z, o)); }
  after(delay, fn) { this.timers.push({ t: this.t + delay, fn }); }
  say(text, cls = '') { this.hud?.announce(text, cls); }

  // ---- queries ----
  enemies(team) { return this.ents.filter((e) => e.alive && e.team !== team && e.targetable !== false && !(e.isHero && e.hidden[team])); }
  inRadius(team, p, r) { return this.enemies(team).filter((e) => Math.hypot(e.pos.x - p.x, e.pos.z - p.z) <= r + e.radius); }
  nearest(team, p, r, f) { let best = null, bd = r; for (const e of this.enemies(team)) { if (f && !f(e)) continue; const d = Math.hypot(e.pos.x - p.x, e.pos.z - p.z) - e.radius; if (d < bd) { bd = d; best = e; } } return best; }
  inCone(team, p, dir, r, half) {
    return this.inRadius(team, p, r).filter((e) => { const dx = e.pos.x - p.x, dz = e.pos.z - p.z, d = Math.hypot(dx, dz); return d < e.radius + 0.6 || (dx * dir.x + dz * dir.z) / d >= Math.cos(half); });
  }
  inCapsule(team, a, b, w) {
    const abx = b.x - a.x, abz = b.z - a.z, l2 = abx * abx + abz * abz || 1;
    return this.enemies(team).filter((e) => { const t = clamp(((e.pos.x - a.x) * abx + (e.pos.z - a.z) * abz) / l2, 0, 1); return Math.hypot(e.pos.x - (a.x + abx * t), e.pos.z - (a.z + abz * t)) <= w + e.radius; });
  }
  alliesNear(team, p, r) { return this.ents.some((e) => e.alive && e.isUnit && e.team === team && Math.hypot(e.pos.x - p.x, e.pos.z - p.z) < r); }
  allies(team) { return this.ents.filter((e) => e.alive && e.team === team && (e.isUnit || e.isHero)); }

  // ---- combat ----
  damage(src, target, amount, { crit = false, heavy = false, color = null } = {}) {
    if (!target.alive || this.over) return 0;
    if (target.isHero && target.targetable === false) return 0;                 // ghost / ultimate: untouchable
    if (this.guarded(target)) { if (src === this.hero && Math.random() < 0.4) this.vfx.number(target.pos, 'NÚCLEO PROTEGIDO — derrube a torre primeiro', 'info'); return 0; }
    if (src.isHero) src.revealUntil = this.t + 1.4;                             // attacking gives your position away
    let dmg = amount, shielded = false; const col = color || TEAM_COL[src.team] || C_WHITE, P = this.hero;
    if (src.isHero && target.markUntil > this.t && src.kit?.id === 'vetor') dmg *= 1.25;
    if (src.isHero && src.buffs.power > this.t) dmg *= 1.18;
    if (crit) dmg *= 2;
    if (target.isHero) dmg *= (1 - (target.armor || 0)) * (src.isHero ? 0.6 : 1);          // heroes are plated against each other: fights last long enough to react
    if (target.isTower && src.K?.siege) dmg *= src.K.siege;
    if (target.isTower && src.isHero) { dmg *= 0.3 * (src.towerMul || 1); if (!this.alliesNear(src.team, target.pos, 11)) { dmg *= 0.35; shielded = true; } }   // plated structure; shrugs off a lone hero
    dmg = Math.round(dmg * (0.94 + Math.random() * 0.12));
    if (target.shield > 0) { const a = Math.min(target.shield, dmg); target.shield -= a; dmg -= a; if (target === P || src === P) this.vfx.number(target.pos, 'ESCUDO', 'info'); }
    target.hp -= dmg; target.hurt?.(dmg, src, heavy || crit);
    if (target.isHero && src.isHero) for (const u of this.ents) if (u.isUnit && u.alive && u.lane && u.team === target.team && Math.hypot(u.pos.x - src.pos.x, u.pos.z - src.pos.z) < 9) { u.target = src; u.think = 1.2; }   // minions defend their hero if (src.isHero) { src.stat.dmg += dmg; src.combatAt = this.t; }
    if (src.isHero && src.steal && !target.isTower) src.hp = Math.min(src.maxHp, src.hp + dmg * src.steal);
    if (src === P) {                                                             // full feedback only for the local player
      this.vfx.hit(target.pos, col, heavy || crit); if (dmg > 0) this.vfx.number(target.pos, (crit ? '✦ ' : '') + dmg, crit ? 'crit' : '');
      if (shielded && Math.random() < 0.35) this.vfx.number(target.pos, 'TORRE PROTEGIDA — traga minions', 'info');
    } else if (target === P) { this.vfx.sparks({ x: target.pos.x, y: 1.6, z: target.pos.z }, 8, { color: col, speed: 7 }); if (dmg > 0) this.vfx.number(target.pos, '-' + dmg, 'hurt'); this.vfx.shake(heavy ? 0.5 : 0.2); }
    else this.vfx.sparks({ x: target.pos.x, y: target.isTower ? 3 : 1.3, z: target.pos.z }, heavy ? 8 : 3, { color: col, speed: 5, life: 0.25, size: 0.4 });
    if (target.hp <= 0) { target.hp = 0; target.alive = false; target.die?.(src); this.onDeath(src, target); }
    return dmg;
  }
  onDeath(src, target) {
    const v = this.vfx, tc = TEAM_COL[target.team];
    if (target.isTower) { for (const h of this.heroes) if (h.team !== target.team) { h.gainGold(target.isCore ? 0 : 260, h === this.hero ? target.pos : null); h.gainXp(180); } return; }
    if (target.isUnit) {
      v.sparks({ x: target.pos.x, y: 1.2, z: target.pos.z }, 16, { color: tc, speed: 8, up: 6, life: 0.6 }); v.ring(target.pos, { r1: 2.2, color: tc, dur: 0.3, k: 1.6 });
      const rw = REWARD[target.kind]; if (!rw) return;
      for (const h of this.heroes) {                                           // xp for being nearby, gold for the last hit (a share otherwise)
        if (!h.alive || h.team === target.team || Math.hypot(h.pos.x - target.pos.x, h.pos.z - target.pos.z) > 16) continue;
        const gk = target.laneId === 'bot' ? 1.3 : 1;   // rota de ouro
        h.gainXp(rw[0]); h.gainGold(Math.round((src === h ? rw[1] : rw[1] * 0.3) * gk), src === h && h === this.hero ? target.pos : null); if (src === h) h.stat.cs++;
      }
    } else if (target.isHero) {
      const kt = target.team === 'axiom' ? 'ekoo' : 'axiom'; if (src.team === 'axiom' || src.team === 'ekoo') this.score[kt]++;
      const killer = src.isHero ? src : this.heroes.filter((h) => h.alive && h.team === kt).sort((a, b) => a.pos.distanceTo(target.pos) - b.pos.distanceTo(target.pos))[0];
      if (killer && killer.pos.distanceTo(target.pos) < 26) { killer.stat.kills++; killer.gainGold(180, killer === this.hero ? target.pos : null); killer.gainXp(150); }
      for (const h of this.heroes) if (h !== killer && h.alive && h.team === kt && h.pos.distanceTo(target.pos) < 18) { h.gainGold(80); h.gainXp(90); }
      this.say(`${killer ? killer.kit.name : src.isTower ? 'A TORRE' : 'OS MINIONS'} ABATEU ${target.kit.name}`, kt);
    }
  }
  campTaken(camp, killer) {
    const team = killer?.team, c = camp.c; if (team !== 'axiom' && team !== 'ekoo') return;
    this.campScore[team]++;
    const hero = killer.isHero ? killer : this.heroes.filter((h) => h.alive && h.team === team && Math.hypot(h.pos.x - c.x, h.pos.z - c.z) < 22)[0];
    if (c.reward === 'convert') this.after(0.9, () => this.convert(c, team));
    else if (c.reward === 'lord') {                 // Lorde: um Vessari colossal passa a empurrar a mid pelo time que o abateu
      const s = team === 'axiom' ? -1 : 1; this.after(1, () => { const u = this.spawn('lorde', team, s * 30, 0, { lane: 'mid', laneZ: 0, look: team, boost: 1 + this.wave * 0.04 }); this.vfx.ring(u.pos, { r1: 6, color: TEAM_COL[team], dur: 0.8, k: 3 }); });
      for (const h of this.heroes) if (h.team === team && h.alive) h.addBuff('power');
      this.say(`${team === 'axiom' ? 'AXIOM' : 'EKOO'} DOMOU O QUE ESCUTA — o Lorde marcha pela mid`, team);
    } else if (c.reward === 'team') {
      for (const h of this.heroes) if (h.team === team) { h.gainGold(150); if (h.alive) h.addBuff('signal'); }
      this.say(`${team === 'axiom' ? 'AXIOM' : 'EKOO'} ABATEU O COLOSSO DA FENDA — +150 ouro e SINAL LIMPO para o time`, team);
    }
    else if (BUFFS[c.reward] && hero) { hero.addBuff(c.reward); this.say(`${hero.kit.name} absorveu ${BUFFS[c.reward].name}`, team); }
  }
  stun(target, dur) { if (target.isTower || !target.alive) return; target.stunUntil = this.t + dur; this.vfx.sparks({ x: target.pos.x, y: 2.6, z: target.pos.z }, 10, { color: new THREE.Color(0xffe36a), speed: 3, up: 2, life: dur, size: 0.45, grav: 0.5 }); if (target === this.hero) this.vfx.number(target.pos, 'ATORDOADO', 'hurt'); }
  mark(target, dur) { if (!target.isTower) target.markUntil = this.t + dur; }
  slow(target, k, dur) { if (target.isTower) return; target.slowK = k; target.slowUntil = this.t + dur; }

  // homing bolt (basic attacks, towers)
  shoot(src, target, dmg, { from = null, speed = 20, size = 1, heavy = false, crit = false, arrow = false } = {}) {
    const m = this.shotPool.find((x) => !x.visible) || this.shotPool[0]; m.visible = true; if (arrow) m.scale.set(size * 0.4, size * 0.4, size * 2.2); else m.scale.setScalar(size);
    m.material.color.copy(TEAM_COL[src.team] || C_WHITE).multiplyScalar(3); if (from) m.position.copy(from); else m.position.set(src.pos.x, src.K?.fly ? (src.K.hover || 2.4) : 1.9, src.pos.z);
    this.shots.push({ m, src, target, dmg, speed, heavy, crit });
  }
  // straight skill-shot: hits everything it crosses once (or stops at the first if !pierce)
  lineShot(src, { dir, range, speed = 30, width = 1.2, dmg, pierce = true, size = 1.8, onHit = null, from = null, y = 1.5, arrow = false }) {
    const m = this.shotPool.find((x) => !x.visible) || this.shotPool[0]; m.visible = true; if (arrow) m.scale.set(size * 0.4, size * 0.4, size * 2.4); else m.scale.setScalar(size); m.material.color.copy(TEAM_COL[src.team]).multiplyScalar(3.4);
    const p = from ? from.clone() : src.pos.clone(); m.position.set(p.x, y, p.z); m.lookAt(p.x + dir.x, y, p.z + dir.z);
    this.lines.push({ m, src, dir: dir.clone(), left: range, speed, width, dmg, pierce, onHit, hit: new Set(), start: p.clone() });
  }
  // damage-over-time field
  zone(src, { pos, r, dur, tick = 0.5, fn, color = null }) { this.zones.push({ src, pos: pos.clone(), r, until: this.t + dur, tick, next: this.t, fn, color: color || TEAM_COL[src.team] }); }
  updateShots(dt) {
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i], t = s.target, ty = t.isTower ? 4 : t.K?.fly ? 2.4 : 1.4, dx = t.pos.x - s.m.position.x, dy = ty - s.m.position.y, dz = t.pos.z - s.m.position.z, d = Math.hypot(dx, dy, dz), step = s.speed * dt;
      if (d <= step + 0.4 || !t.alive) {
        if (t.alive) { this.damage(s.src, t, s.dmg, { heavy: s.heavy, crit: s.crit }); if (s.heavy) this.vfx.ring(t.pos, { r1: 2.4, color: TEAM_COL[s.src.team], dur: 0.25, k: 2 }); }
        s.m.visible = false; this.shots.splice(i, 1); continue;
      }
      s.m.position.x += dx / d * step; s.m.position.y += dy / d * step; s.m.position.z += dz / d * step; s.m.lookAt(t.pos.x, ty, t.pos.z);
    }
    for (let i = this.lines.length - 1; i >= 0; i--) {
      const s = this.lines[i], step = Math.min(s.left, s.speed * dt), prev = s.m.position.clone(); s.left -= step; s.m.position.x += s.dir.x * step; s.m.position.z += s.dir.z * step; let stop = s.left <= 0;
      for (const e of this.inCapsule(s.src.team, prev, s.m.position, s.width)) if (!s.hit.has(e)) { s.hit.add(e); this.damage(s.src, e, typeof s.dmg === 'function' ? s.dmg(e) : s.dmg, { heavy: !s.pierce }); s.onHit?.(e); if (!s.pierce) { stop = true; break; } }
      if (Math.random() < 0.6) this.vfx.sparks(s.m.position, 1, { color: TEAM_COL[s.src.team], speed: 2, up: 1, life: 0.25, size: 0.4, grav: 2 });
      if (stop) { this.vfx.streak(s.start, s.m.position, { color: TEAM_COL[s.src.team], width: s.width * 0.8, dur: 0.3, y: 1.3, k: 2.6 }); this.vfx.ring(s.m.position, { r1: 1.8, color: TEAM_COL[s.src.team], dur: 0.22 }); s.m.visible = false; this.lines.splice(i, 1); }
    }
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i]; if (this.t >= z.until) { this.zones.splice(i, 1); continue; }
      if (this.t >= z.next) { z.next = this.t + z.tick; this.vfx.ring(z.pos, { r0: z.r * 0.96, r1: z.r, color: z.color, dur: z.tick * 1.1, k: 1.6 }); this.vfx.disc(z.pos, { r: z.r, color: z.color, dur: z.tick, k: 0.35 }); for (const e of this.inRadius(z.src.team, z.pos, z.r)) z.fn(e); }
    }
  }

  // ---- match flow ----
  spawnWave() {
    const n = ++this.wave, count = this.ents.filter((e) => e.isUnit && e.alive).length; if (count > MAX_UNITS) return;
    for (const team of ['axiom', 'ekoo']) for (const lane of LANE_IDS) {
      const s = team === 'axiom' ? -1 : 1, P = LANES[lane], st = s < 0 ? P[0] : P[P.length - 1], x0 = st[0], z0 = st[1], boost = 1 + Math.max(0, n - 2) * 0.07, melee = team === 'axiom' ? 'hoste' : 'saque', ranged = team === 'axiom' ? 'drone' : 'arq';
      [-2.4, 0, 2.4].forEach((z, i) => this.spawn(melee, team, x0 - s * (i === 1 ? 1.2 : 0), z0 + z, { laneZ: z, lane, boost }));
      [-1.4, 1.4].forEach((z) => this.spawn(ranged, team, x0 + s * 3.5, z0 + z, { laneZ: z, lane, boost }));
      if (team === 'ekoo' && n >= 3 && n % 2 === 1) this.spawn(melee, team, x0 + s * 1.5, z0, { laneZ: 0, lane, boost });      // EKOO slowly out-scales the lane
      if (lane === 'top') [-1.2, 1.2].forEach((z) => this.spawn(melee, team, x0 + s * 2.5, z0 + z, { laneZ: z, lane, boost }));   // rota de XP: +2 minions
      if (n % 3 === 0) this.spawn(team === 'axiom' ? 'cerco' : 'moto', team, x0 + s * 6, z0, { laneZ: 0, lane, boost });       // siege unit every third wave
    }
  }
  convert(c, team) {                                  // cleared rift -> its Vessari are pulled into the lane on that team's side
    const s = team === 'axiom' ? -1 : 1, to = { x: s * 22, z: c.side * 3.5 }, v = this.vfx, col = TEAM_COL[team];
    v.streak({ x: c.x, z: c.z }, to, { color: C_VIOLET, width: 2.6, dur: 0.9, k: 3 }); v.streak({ x: c.x, z: c.z }, to, { color: col, width: 0.9, dur: 1.1, k: 4, y: 1.4 });
    v.ring({ x: c.x, z: c.z }, { r1: 8, color: C_VIOLET, dur: 0.7, k: 3 }); v.ring(to, { r1: 5, color: col, dur: 0.7, k: 3 }); v.sparks({ x: to.x, y: 1, z: to.z }, 40, { color: col, speed: 9, up: 8, life: 0.8 });
    [-1.6, 0, 1.6].forEach((dz, i) => this.spawn('eco', team, to.x - s * i * 1.4, to.z * 0.4 + dz, { laneZ: dz, look: team, boost: 1.1 + this.wave * 0.03 }));
    this.say(team === 'axiom' ? 'VESSARI CONVERTIDOS — reforço AXIOM na lane' : 'EKOO DOMINOU UMA FENDA — Vessari na lane inimiga', team);
  }
  // EVENTO 3h17: the signal cuts in. A rift tears open at mid lane and hostile Vessari pour out, attacking both sides.
  event317() {
    const v = this.vfx, c = { x: 0, z: 0 }; this.eventUntil = this.t + 30; this.say('⚠ EVENTO 3h17 ATIVO — SEM SINAL', 'event');
    v.ring(c, { r0: 1, r1: 16, color: C_VIOLET, dur: 1.2, k: 4 }); v.disc(c, { r: 9, color: C_VIOLET, dur: 1.4, k: 2.4 }); v.sparks({ x: 0, y: 1, z: 0 }, 70, { color: C_VIOLET, speed: 14, up: 12, life: 1.2 }); v.flash(c, C_VIOLET, 260); v.shake(0.9);
    const n = 3 + Math.min(3, Math.floor(this.t / 197 - 1) + 1);
    for (let i = 0; i < n; i++) this.after(0.4 + i * 0.35, () => { const a = i * 2.1, p = { x: Math.cos(a) * 2.5, z: Math.sin(a) * 3 }; v.ring(p, { r1: 3, color: C_VIOLET, dur: 0.4, k: 3 }); const u = this.spawn(i === 0 && this.t > 300 ? 'anciao' : 'eco', 'vessari', p.x, p.z, { lane: false, boost: 0.9 + this.wave * 0.04 }); u.event = true; });
  }
  finish(result) {
    if (this.over) return; this.over = result;
    this.after(0.8, () => this.hud?.end(result, { time: this.t, score: this.score, camps: this.campScore, heroes: this.heroes.map((h) => ({ name: h.kit.name, team: h.team, me: h === this.hero, level: h.level, ...h.stat })) }));
  }

  update(dt) {
    this.t += dt;
    for (let i = this.timers.length - 1; i >= 0; i--) if (this.t >= this.timers[i].t) this.timers.splice(i, 1)[0].fn();
    if (!this.over) { if (this.t >= this.nextWave) { this.nextWave += WAVE_EVERY; this.spawnWave(); } for (const c of this.camps) c.update(this); if (this.t >= this.nextEvent) { this.nextEvent += 197; this.event317(); } }
    // brush stealth: a hero in a corn patch is hidden from a team with nobody in that patch or within 3.5 of it
    for (const h of this.heroes) {
      const zi = h.alive ? inBrush(h.pos.x, h.pos.z) : -1; h.brush = zi;
      for (const T of ['axiom', 'ekoo']) h.hidden[T] = T !== h.team && zi >= 0 && this.t > (h.revealUntil || 0) && !this.ents.some((e) => e.alive && e.team === T && (e.isHero || e.isUnit) && (Math.hypot(e.pos.x - h.pos.x, e.pos.z - h.pos.z) < 3.5 || inBrush(e.pos.x, e.pos.z) === zi));
    }
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
      for (const tw of this.towers) if (tw.alive) { const dx = a.pos.x - tw.pos.x, dz = a.pos.z - tw.pos.z, d = Math.hypot(dx, dz) || 0.01, min = tw.radius + a.radius + 0.3; if (d < min) { a.pos.x += dx / d * (min - d); a.pos.z += dz / d * (min - d); } }
      if (a.lane) {
        if (a.laneId === 'mid' || !a.laneId) { const lim = 5.4 * widen(a.pos.x); a.pos.z = clamp(a.pos.z, -lim, lim); }
        else { const f = laneFrame(a.laneId, a.pos.x, a.pos.z, 1), lim = 5.2; if (Math.abs(f.off) > lim) { const k = f.off - Math.sign(f.off) * lim; a.pos.x -= f.nx * k; a.pos.z -= f.nz * k; } }
      }
    }
    if (this.ents.some((e) => e.gone)) this.ents = this.ents.filter((e) => !e.gone);
  }
}
