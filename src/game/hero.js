// VETOR — o Assassino Implantado (AXIOM). Twin cyan energy blades.
//   Passive  Marca de Quarentena: skills mark enemies (4s). Vetor deals +25% to marked targets; a basic hit on a mark refunds energy.
//   Básico   Corte Duplo: 3-hit blade combo, the third is a wide spinning cut.
//   S1       Corte Vetorial: dash through enemies, damaging and marking them. Hitting anything refunds half the cooldown.
//   S2       Lâminas Gêmeas: throw both blades in a narrow V; they pierce, slow and mark.
//   S3       Modo Fantasma: cloak + haste for 3s; the next basic blinks behind the target for a guaranteed critical "Execução".
//   ULT      Protocolo: Erradicação: untargetable flurry of 6 blinks-and-cuts inside an area, ending in a shockwave.
import * as THREE from 'three';
import { clampWalk, SPAWN_X } from '../core/util.js';
import { loadVetor, HERO_SCALE } from './vetorModel.js';
import { Bar, Indicator, C_CYAN, C_WHITE } from './vfx.js';

export const SKILLS = {
  basic: { name: 'CORTE DUPLO', desc: 'Combo de 3 golpes; o terceiro é um corte giratório em área.', cd: 0 },
  s1: { name: 'CORTE VETORIAL', desc: 'Avança cortando tudo no caminho e aplica Marca. Acertar devolve metade da recarga.', cd: 7, cost: 20, range: 9 },
  s2: { name: 'LÂMINAS GÊMEAS', desc: 'Arremessa as duas lâminas: perfuram, causam lentidão e aplicam Marca.', cd: 8, cost: 25, range: 13 },
  s3: { name: 'MODO FANTASMA', desc: 'Camuflagem e velocidade por 3s. O próximo básico teleporta às costas do alvo com crítico garantido.', cd: 14, cost: 30 },
  ult: { name: 'PROTOCOLO: ERRADICAÇÃO', desc: 'Fica inalvejável e desfere 6 cortes relâmpago na área, finalizando com uma onda de choque.', cd: 40, cost: 50, range: 9, radius: 6.5 },
};
const ATK = [  // clip, window inside the source clip (s), playback duration, hit moment (0..1), damage x, reach, half-angle
  { clip: 'stab', t0: 0.34, t1: 1.1, dur: 0.36, hit: 0.42, mul: 1.0, r: 3.3, half: 0.95, dir: 1 },
  { clip: 'swipe', t0: 0.3, t1: 0.92, dur: 0.36, hit: 0.5, mul: 1.05, r: 3.4, half: 1.05, dir: -1 },
  { clip: 'swipe', t0: 0.86, t1: 1.62, dur: 0.5, hit: 0.42, mul: 1.6, r: 3.9, half: 3.2, dir: 1, heavy: true },
];
const v3 = () => new THREE.Vector3(), _a = v3(), _b = v3(), _d = v3();

export class Hero {
  static async create(game, scene, rig, input, vfx) { const h = new Hero(); await h.init(game, scene, rig, input, vfx); return h; }
  async init(game, scene, rig, input, vfx) {
    Object.assign(this, { game, scene, rig, input, vfx, isHero: true, team: 'axiom', radius: 0.8, alive: true, targetable: true });
    this.pos = new THREE.Vector3(-SPAWN_X, 0, 0); this.yaw = Math.PI / 2; this.maxHp = this.hp = 2200; this.energy = 100; this.atk = 118; this.speed = 7.4; this.t = 0; this.marksApplied = 0;
    this.skills = {}; for (const k in SKILLS) this.skills[k] = { ...SKILLS[k], ready: 0 };
    const V = this.v = await loadVetor(); this.root = V.root; V.model.position.y = 0.2 * HERO_SCALE; scene.add(this.root);
    // locomotion
    const A = V.actions; this.loco = 'idle';
    A.idle = V.mixer.clipAction(THREE.AnimationUtils.subclip(V.clips.stab, 'guard', 0, 9, 30)); A.idle.setLoop(THREE.LoopPingPong).play(); A.idle.timeScale = 0.3;
    A.run.play(); A.run.setEffectiveWeight(0); A.run.timeScale = 1.2; this.ghostOn = false;
    this.act = null; this.runW = 0; this.actW = 0;      // current one-shot { action, t, dur, ... }
    this.combo = 0; this.comboUntil = 0; this.lock = 0; this.ghostUntil = 0; this.ult = null; this.dash = null; this.shots = [];
    this.trails = V.blades.map(() => vfx.trail(C_CYAN)); this.trailK = 0;
    this.ind = new Indicator(scene); this.bar = new Bar(scene, 2.4, 0x49f07a, 0.24);
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x2fe4ff).multiplyScalar(1.6), transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.ring.position.y = 0.07; this.ring.layers.set(1); this.root.add(this.ring);
    this.glow = new THREE.PointLight(0x4fdcff, 7, 7, 1.6); this.glow.position.set(0, 1.8, 0); this.root.add(this.glow);
    // spare blade meshes for projectiles
    this.proj = [0, 1].map(() => { const m = V.blades[0].clone(); m.scale.multiplyScalar(HERO_SCALE * 1.5); m.visible = false; scene.add(m); return m; });
    game.add(this);
  }
  get dirV() { return _d.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)).clone(); }
  face(dir) { this.yaw = Math.atan2(dir.x, dir.z); }
  can(id) { const s = this.skills[id]; return this.alive && !this.ult && this.t >= s.ready && this.energy >= (s.cost || 0); }
  spend(id) { const s = this.skills[id]; s.ready = this.t + s.cd; this.energy -= s.cost || 0; }

  // one-shot animation on top of locomotion
  play(name, { t0 = 0, t1 = null, dur = null, fade = 0.06 } = {}) {
    const A = this.v.actions[name], len = (t1 ?? this.v.clips[name].duration) - t0, d = dur ?? len;
    if (this.act) this.act.action.fadeOut(fade);
    A.reset(); A.setLoop(THREE.LoopOnce); A.clampWhenFinished = true; A.time = t0; A.timeScale = len / d; A.setEffectiveWeight(1); A.fadeIn(fade).play();
    this.act = { action: A, t: 0, dur: d, name }; return this.act;
  }

  // ---------------- basic attack ----------------
  basic() {
    if (this.lock > 0 || this.ult || this.dash) return;
    const g = this.game, ghost = this.ghostUntil > this.t;
    let target = g.nearest(this.team, this.pos, ghost ? 8 : 4.6);
    const aim = this.input.mouseDir();
    if (ghost && target) return this.execute(target);
    if (target) { _a.subVectors(target.pos, this.pos).setY(0); const d = _a.length(); this.face(_a.normalize()); if (d > 2.9) this.step = { dir: _a.clone(), left: Math.min(d - 2.4, 1.8) }; }
    else if (aim) this.face(aim.dir);
    if (this.t > this.comboUntil) this.combo = 0;
    const a = ATK[this.combo], act = this.play(a.clip, a); act.atk = a; act.done = false;
    this.lock = a.dur * 0.82; this.combo = (this.combo + 1) % 3; this.comboUntil = this.t + a.dur + 0.9; this.trailK = 1;
  }
  strike(a) {
    const g = this.game, dir = this.dirV, hits = g.inCone(this.team, this.pos, dir, a.r, a.half);
    this.vfx.slash(this.pos, this.yaw, { r: a.r, dir: a.dir, dur: a.heavy ? 0.3 : 0.2, tilt: a.heavy ? 0 : a.dir * 0.22, k: a.heavy ? 3.6 : 2.8, y: 1.35 });
    if (a.heavy) { this.vfx.slash(this.pos, this.yaw + Math.PI, { r: a.r, dir: a.dir, dur: 0.3, k: 3.2, y: 1.35 }); this.vfx.ring(this.pos, { r1: a.r, dur: 0.3, k: 1.4 }); }
    for (const e of hits) {
      const marked = e.markUntil > g.t; g.damage(this, e, this.atk * a.mul, { heavy: a.heavy });
      if (marked) { this.energy = Math.min(100, this.energy + 8); e.markUntil = 0; }
    }
    if (hits.length) this.energy = Math.min(100, this.energy + 2);
  }
  // S3 follow-up: blink behind the target, guaranteed crit
  execute(target) {
    const g = this.game; _a.subVectors(target.pos, this.pos).setY(0).normalize(); const from = this.pos.clone();
    this.pos.copy(target.pos).addScaledVector(_a, target.radius + 1.3); clampWalk(this.pos); this.face(_a.clone().negate());
    this.vfx.streak(from, this.pos, { width: 1.8, dur: 0.35, k: 3 }); this.vfx.ring(from, { r1: 2, dur: 0.25 }); this.vfx.sparks({ x: from.x, y: 1.2, z: from.z }, 14, { speed: 6, up: 5 });
    const a = ATK[2], act = this.play(a.clip, { ...a, dur: 0.34 }); act.done = true; this.lock = 0.3; this.trailK = 1.4; this.endGhost();
    this.vfx.slash(this.pos, this.yaw, { r: 4, dur: 0.26, k: 4.2, tilt: 0.5 }); this.vfx.slash(this.pos, this.yaw, { r: 4, dur: 0.26, k: 4.2, tilt: -0.5, dir: -1 });
    g.damage(this, target, this.atk * 1.7, { crit: true }); this.vfx.number(target.pos, 'EXECUÇÃO', 'info');
    for (const e of g.inRadius(this.team, target.pos, 2.6)) if (e !== target) g.damage(this, e, this.atk * 0.8);
  }

  // ---------------- skills ----------------
  aimDir(ev, range) {            // explicit aim > nearest enemy > facing
    if (ev.dir) return ev.dir.clone();
    const t = this.game.nearest(this.team, this.pos, range + 2); if (t) return _a.subVectors(t.pos, this.pos).setY(0).normalize().clone();
    return this.dirV;
  }
  cast(ev) {
    const id = ev.skill; if (id === 'taunt') { if (!this.act && this.lock <= 0) { this.play('taunt', { fade: 0.15 }); this.lock = 0.4; } return; }
    if (!this.skills[id] || !this.can(id) || this.dash) return;
    this.ind.hide();
    if (id === 's1') {
      const dir = this.aimDir(ev, SKILLS.s1.range), from = this.pos.clone(), to = clampWalk(from.clone().addScaledVector(dir, SKILLS.s1.range));
      this.spend(id); this.face(dir); this.dash = { from, to, t: 0, dur: 0.17, hit: new Set() }; this.lock = 0.24; this.trailK = 1.6; this.endGhost(true);
      this.play('dash', { dur: 0.3 }); this.vfx.ring(from, { r1: 2.6, dur: 0.25 }); this.vfx.shake(0.25);
    } else if (id === 's2') {
      const dir = this.aimDir(ev, SKILLS.s2.range); this.spend(id); this.face(dir); this.play('stab', { t0: 0.3, t1: 1.1, dur: 0.34 }); this.lock = 0.24; this.endGhost(true);
      this.throwAt = { t: 0.1, dir };
    } else if (id === 's3') {
      this.spend(id); this.ghostUntil = this.t + 3; this.ghostOn = true; this.skills.basic.lit = true; this.v.mat.transparent = true; this.v.mat.needsUpdate = true; this.targetable = false;
      this.vfx.ring(this.pos, { r1: 3, dur: 0.4, k: 2.6 }); this.vfx.sparks({ x: this.pos.x, y: 1.2, z: this.pos.z }, 24, { speed: 5, up: 7, life: 0.7, grav: 4 }); this.vfx.number(this.pos, 'MODO FANTASMA', 'info');
    } else if (id === 'ult') {
      const S = SKILLS.ult; let c;
      if (ev.dir) c = this.pos.clone().addScaledVector(ev.dir, Math.min(S.range, ev.touchAim ? ev.mag * S.range : (ev.mag ?? S.range)));
      else { const t = this.game.nearest(this.team, this.pos, S.range + S.radius); c = t ? t.pos.clone() : this.pos.clone().addScaledVector(this.dirV, 5); }
      c.y = 0; clampWalk(c); this.spend(id); this.endGhost(true);
      this.ult = { c, i: 0, next: 0.12, home: this.pos.clone() }; this.targetable = false; this.lock = 9; this.trailK = 2;
      this.vfx.ring(c, { r0: S.radius, r1: S.radius * 0.98, dur: 1.1, k: 2.4 }); this.vfx.disc(c, { r: S.radius, dur: 1.1, k: 0.5 }); this.vfx.stop(0.08); this.vfx.shake(0.4);
      this.vfx.number(this.pos, 'ERRADICAÇÃO', 'info');
    }
  }
  endGhost() { if (!this.ghostOn) return; this.ghostOn = false; this.ghostUntil = 0; this.skills.basic.lit = false; this.v.mat.transparent = false; this.v.mat.opacity = 1; this.v.mat.needsUpdate = true; if (!this.ult) this.targetable = true; }

  updateDash(dt) {
    const d = this.dash, g = this.game; d.t += dt; const p = Math.min(1, d.t / d.dur), prev = this.pos.clone();
    this.pos.lerpVectors(d.from, d.to, 1 - (1 - p) ** 2);
    for (const e of g.inCapsule(this.team, prev, this.pos, 1.7)) if (!d.hit.has(e)) { d.hit.add(e); g.damage(this, e, this.atk * 1.5); g.mark(e, 4); this.marksApplied++; this.vfx.slash(e.pos, this.yaw + 1.2, { r: 2.4, dur: 0.18, tilt: 0.8, y: 1.3 }); }
    this.vfx.sparks({ x: this.pos.x, y: 0.4, z: this.pos.z }, 3, { speed: 3, up: 2, life: 0.3, size: 0.35 });
    if (p >= 1) {
      this.vfx.streak(d.from, d.to, { width: 2.2, dur: 0.4, k: 3 }); this.vfx.streak(d.from, d.to, { width: 0.5, dur: 0.55, k: 5, y: 1.2 });
      if (d.hit.size) { const s = this.skills.s1; s.ready = this.t + s.cd * 0.5; this.vfx.number(this.pos, 'RECARGA −50%', 'info'); }
      this.dash = null;
    }
  }
  throwBlades(dir) {
    const S = SKILLS.s2;
    [-1, 1].forEach((s, i) => {
      const a = Math.atan2(dir.x, dir.z) + s * 0.1, d = new THREE.Vector3(Math.sin(a), 0, Math.cos(a)), m = this.proj[i];
      m.visible = true; m.position.set(this.pos.x, 1.35, this.pos.z).addScaledVector(d, 1);
      this.shots.push({ m, d, from: this.pos.clone(), left: S.range, hit: new Set(), spin: s });
    });
    this.vfx.slash(this.pos, this.yaw, { r: 2.6, dur: 0.16, k: 2.6 }); this.v.blades.forEach((b) => { b.visible = false; }); this.bladesBack = this.t + 0.55;
  }
  updateShots(dt) {
    const g = this.game;
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i], step = Math.min(s.left, 34 * dt), prev = s.m.position.clone(); s.left -= step;
      s.m.position.addScaledVector(s.d, step); s.m.rotation.set(Math.PI / 2, 0, s.m.rotation.z + dt * 38 * s.spin);
      for (const e of g.inCapsule(this.team, prev, s.m.position, 0.95)) if (!s.hit.has(e)) { s.hit.add(e); g.damage(this, e, this.atk * 1.1); g.mark(e, 4); g.slow(e, 0.65, 1.5); this.marksApplied++; }
      this.vfx.sparks(s.m.position, 2, { speed: 2.5, up: 1, life: 0.28, size: 0.4, grav: 2 });
      if (s.left <= 0) { this.vfx.streak(s.from, s.m.position, { width: 0.7, dur: 0.3, y: 1.3, k: 3 }); this.vfx.ring(s.m.position, { r1: 1.8, dur: 0.22 }); this.vfx.sparks(s.m.position, 10, { speed: 6 }); s.m.visible = false; this.shots.splice(i, 1); }
    }
    if (this.bladesBack && this.t >= this.bladesBack) { this.bladesBack = 0; this.v.blades.forEach((b) => { b.visible = true; }); this.vfx.sparks({ x: this.pos.x, y: 1.3, z: this.pos.z }, 8, { speed: 3, up: 2 }); }
  }
  updateUlt(dt) {
    const u = this.ult, g = this.game, S = SKILLS.ult; u.next -= dt; if (u.next > 0) return;
    if (u.i < 6) {
      const pool = g.inRadius(this.team, u.c, S.radius), from = this.pos.clone(); let tp;
      if (pool.length) { const e = pool[(Math.random() * pool.length) | 0], a = Math.random() * 6.283; tp = e.pos.clone().add(_a.set(Math.cos(a), 0, Math.sin(a)).multiplyScalar(e.radius + 1.2)); this.face(_b.subVectors(e.pos, tp).setY(0).normalize()); }
      else { const a = u.i * 2.4, r = S.radius * 0.6; tp = u.c.clone().add(_a.set(Math.cos(a) * r, 0, Math.sin(a) * r)); this.face(_b.subVectors(u.c, tp).setY(0).normalize()); }
      clampWalk(tp); this.pos.copy(tp);
      this.vfx.streak(from, tp, { width: 1.3, dur: 0.3, k: 3.4, y: 1.2 }); this.vfx.slash(tp, this.yaw, { r: 3.6, dur: 0.2, k: 3.6, dir: u.i % 2 ? 1 : -1, tilt: (Math.random() - 0.5) * 1.2 });
      for (const e of g.inCone(this.team, tp, this.dirV, 3.8, 1.3)) { g.damage(this, e, this.atk * 0.9); g.mark(e, 4); }
      const a = ATK[u.i % 2 + 1]; this.play(a.clip, { ...a, dur: 0.2, fade: 0.03 }); this.vfx.shake(0.3); u.i++; u.next = 0.12;
    } else if (u.i === 6) {
      const from = this.pos.clone(); this.pos.copy(u.c); this.vfx.streak(from, u.c, { width: 1.6, dur: 0.3, k: 3.4 }); this.play('swipe', { ...ATK[2], dur: 0.5 });
      u.i++; u.next = 0.2;
    } else {
      for (const e of g.inRadius(this.team, u.c, S.radius)) g.damage(this, e, this.atk * 2.2, { heavy: true });
      this.vfx.ring(u.c, { r0: 0.5, r1: S.radius * 1.15, dur: 0.5, k: 4 }); this.vfx.ring(u.c, { r0: 0.5, r1: S.radius * 0.7, dur: 0.6, color: C_WHITE, k: 2.6 }); this.vfx.disc(u.c, { r: S.radius, dur: 0.4, k: 2.6 });
      for (let k = 0; k < 6; k++) this.vfx.slash(u.c, k * 1.05, { r: S.radius, dur: 0.34, k: 3, tilt: (k % 2 ? 0.2 : -0.2) });
      this.vfx.sparks({ x: u.c.x, y: 1, z: u.c.z }, 60, { speed: 16, up: 9, life: 0.8 }); this.vfx.shake(1.1); this.vfx.stop(0.1); this.vfx.flash(u.c, C_CYAN, 160);
      this.ult = null; this.targetable = true; this.lock = 0.25;
    }
  }

  update(dt) {
    this.t += dt; const inp = this.input, g = this.game, A = this.v.actions;
    inp.heroPos = this.pos; this.lock -= dt; this.energy = Math.min(100, this.energy + 5 * dt);
    for (const ev of inp.events.splice(0)) this.cast(ev);
    if (this.ghostOn && this.ghostUntil <= this.t) this.endGhost();
    // touch aim preview
    const aim = inp.aiming;
    if (aim && aim.dir && this.can(aim.skill)) {
      const yaw = Math.atan2(aim.dir.x, aim.dir.z);
      if (aim.skill === 's1') this.ind.line(this.pos, yaw, SKILLS.s1.range, 3.2); else if (aim.skill === 's2') this.ind.line(this.pos, yaw, SKILLS.s2.range, 2.6);
      else if (aim.skill === 'ult') this.ind.area(this.pos, SKILLS.ult.range, _a.copy(this.pos).addScaledVector(aim.dir, aim.mag * SKILLS.ult.range), SKILLS.ult.radius); else this.ind.hide();
    } else this.ind.hide();

    if (this.throwAt && (this.throwAt.t -= dt) <= 0) { this.throwBlades(this.throwAt.dir); this.throwAt = null; }
    if (this.ult) this.updateUlt(dt); else if (this.dash) this.updateDash(dt);
    this.updateShots(dt);
    if (inp.basicHeld && this.alive) this.basic();

    // one-shot action bookkeeping
    if (this.act) {
      const a = this.act; a.t += dt;
      if (a.atk && !a.done && a.t >= a.dur * a.atk.hit) { a.done = true; this.strike(a.atk); }
      if (a.t >= a.dur) { a.action.fadeOut(0.12); this.act = null; }
    }
    // movement
    let moving = false;
    if (this.step && !this.dash && !this.ult) { const s = Math.min(this.step.left, 22 * dt); this.pos.addScaledVector(this.step.dir, s); this.step.left -= s; if (this.step.left <= 0) this.step = null; }
    if (this.lock <= 0 && !this.dash && !this.ult && this.alive) {
      const m = inp.move; _a.set(0, 0, 0);
      if (m.lengthSq() > 0.01) _a.addScaledVector(this.rig.right, m.x).addScaledVector(this.rig.fwd, m.y);
      else if (inp.moveTo) { _a.subVectors(inp.moveTo, this.pos).setY(0); if (_a.length() < 0.25) { inp.moveTo = null; _a.set(0, 0, 0); } }
      const l = _a.length();
      if (l > 0.01) {
        _a.divideScalar(l); const sp = this.speed * (this.ghostUntil > this.t ? 1.45 : 1) * Math.min(1, inp.moveTo ? 1 : inp.move.length());
        this.pos.addScaledVector(_a, sp * dt); moving = true;
        const want = Math.atan2(_a.x, _a.z); let dy = want - this.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); this.yaw += dy * Math.min(1, dt * 16);
        A.run.timeScale = 1.2 * sp / this.speed;
      }
    }
    clampWalk(this.pos);
    // blend idle <-> run
    this.runW += ((moving ? 1 : 0) - this.runW) * Math.min(1, dt * 12); this.actW += ((this.act ? 1 : 0) - this.actW) * Math.min(1, dt * 24);
    const lw = 1 - this.actW * 0.97;                      // one-shots take over from locomotion (the mixer normalises weights)
    A.run.setEffectiveWeight(this.runW * lw); A.idle.setEffectiveWeight((1 - this.runW) * lw + 0.001);
    this.v.mixer.update(dt);
    this.root.position.copy(this.pos); this.root.rotation.y = this.yaw;
    this.v.model.rotation.x = this.dash ? 0.45 : 0;

    // presentation: ghost fade, rim, blade trails, bars
    const ghost = this.ghostUntil > this.t, u = this.v.mat.userData.u;
    if (this.v.mat.transparent) this.v.mat.opacity += ((ghost ? 0.38 : 1) - this.v.mat.opacity) * Math.min(1, dt * 10);
    u.uRim.value += ((ghost ? 2.2 : this.ult ? 1.6 : 0.55) - u.uRim.value) * Math.min(1, dt * 8);
    this.trailK = Math.max(0, this.trailK - dt * 2.6); const k = Math.min(1, this.trailK + (this.dash || this.ult ? 1 : 0));
    this.v.blades.forEach((b, i) => { b.updateWorldMatrix(true, false); _a.copy(b.userData.base).applyMatrix4(b.matrixWorld); _b.copy(b.userData.tip).applyMatrix4(b.matrixWorld); this.trails[i].push(_a, _b, b.visible ? k : 0); });
    this.bar.g.visible = !this.ult; this.bar.set(this.pos, 3.7, this.hp / this.maxHp);
    this.ring.rotation.y -= dt * 0.8; this.glow.intensity = ghost ? 16 : 7;
    this.rig.goal.set(this.pos.x, 0, this.pos.z);
  }
}
