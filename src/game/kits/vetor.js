// VETOR — o Assassino Implantado (AXIOM, corpo a corpo). Twin cyan energy blades.
//   Passiva  Marca de Quarentena: habilidades marcam inimigos (4s); Vetor causa +25% a marcados e um básico em alvo marcado devolve energia.
import * as THREE from 'three';
import { clampWalk } from '../../core/util.js';
import { loadVetor, HERO_SCALE } from '../vetorModel.js';
import { C_CYAN, C_WHITE } from '../vfx.js';

const ATK = [  // clip, source window (s), playback duration, hit moment (0..1), damage x, reach, half-angle
  { clip: 'stab', t0: 0.34, t1: 1.1, dur: 0.36, hit: 0.42, mul: 1.0, r: 3.4, half: 0.9, dir: 1 },
  { clip: 'swipe', t0: 0.3, t1: 0.92, dur: 0.36, hit: 0.5, mul: 1.05, r: 3.5, half: 1.0, dir: -1 },
  { clip: 'swipe', t0: 0.86, t1: 1.62, dur: 0.5, hit: 0.42, mul: 1.6, r: 3.9, half: 3.2, dir: 1, heavy: true },
];
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), R3 = (a, r) => a[r - 1];

class VetorBody {
  constructor(V, h) {
    this.V = V; this.h = h; this.root = V.root; V.model.position.y = 0.2 * HERO_SCALE; const A = V.actions;
    A.idle = V.mixer.clipAction(THREE.AnimationUtils.subclip(V.clips.stab, 'guard', 0, 9, 30)); A.idle.setLoop(THREE.LoopPingPong).play(); A.idle.timeScale = 0.3;
    A.run.play(); A.run.setEffectiveWeight(0); this.act = null; this.runW = 0; this.actW = 0; this.trailK = 0; this.ghost = false; this.lean = 0;
    this.trails = V.blades.map(() => h.vfx.trail(C_CYAN));
  }
  clip(name, { t0 = 0, t1 = null, dur = null, fade = 0.06 } = {}) {
    const A = this.V.actions[name], len = (t1 ?? this.V.clips[name].duration) - t0, d = dur ?? len;
    if (this.act) this.act.action.fadeOut(fade);
    A.reset(); A.setLoop(THREE.LoopOnce); A.clampWhenFinished = true; A.time = t0; A.timeScale = len / d; A.setEffectiveWeight(1); A.fadeIn(fade).play();
    return (this.act = { action: A, t: 0, dur: d });
  }
  play(name) { if (name === 'death') this.clip('death', { fade: 0.1 }).hold = true; else if (name === 'idle' && this.act) { this.act.action.fadeOut(0.2); this.act = null; } }
  flash() { this.V.mat.userData.u.uFlash.value = 0.5; }
  setGhost(on) { this.ghost = on; this.V.mat.transparent = on; this.V.mat.needsUpdate = true; if (!on) this.V.mat.opacity = 1; }
  update(dt, { moving, speedK }) {
    const V = this.V, A = V.actions, U = V.mat.userData.u;
    if (this.act) { this.act.t += dt; if (this.act.t >= this.act.dur && !this.act.hold) { this.act.action.fadeOut(0.12); this.act = null; } }
    this.runW += ((moving ? 1 : 0) - this.runW) * Math.min(1, dt * 12); this.actW += ((this.act ? 1 : 0) - this.actW) * Math.min(1, dt * 24);
    const lw = 1 - this.actW * 0.97; A.run.setEffectiveWeight(this.runW * lw); A.idle.setEffectiveWeight((1 - this.runW) * lw + 0.001); A.run.timeScale = 1.2 * speedK;
    V.mixer.update(dt); V.model.rotation.x = this.lean; U.uFlash.value *= Math.exp(-dt * 12);
    if (V.mat.transparent) V.mat.opacity += ((this.ghost ? 0.38 : 1) - V.mat.opacity) * Math.min(1, dt * 10);
    U.uRim.value += ((this.ghost ? 2.2 : this.h.busy ? 1.6 : 0.55) - U.uRim.value) * Math.min(1, dt * 8);
    this.trailK = Math.max(0, this.trailK - dt * 2.6); const k = Math.min(1.5, this.trailK + (this.h.busy ? 1 : 0));
    V.root.updateMatrixWorld(true);
    V.blades.forEach((b, i) => { _a.copy(b.userData.base).applyMatrix4(b.matrixWorld); _b.copy(b.userData.tip).applyMatrix4(b.matrixWorld); this.trails[i].push(_a, _b, b.visible ? k : 0); });
  }
}

function strike(h, a) {
  const g = h.game, dir = h.dirV, v = h.vfx;
  v.slash(h.pos, h.yaw, { r: a.r, dir: a.dir, dur: a.heavy ? 0.3 : 0.2, tilt: a.heavy ? 0 : a.dir * 0.22, k: a.heavy ? 3.6 : 2.8, y: 1.35 });
  if (a.heavy) { v.slash(h.pos, h.yaw + Math.PI, { r: a.r, dir: a.dir, dur: 0.3, k: 3.2, y: 1.35 }); v.ring(h.pos, { r1: a.r, dur: 0.3, k: 1.4 }); }
  const hits = g.inCone(h.team, h.pos, dir, a.r, a.half);
  for (const e of hits) { const marked = e.markUntil > g.t; g.damage(h, e, h.atk * a.mul, { heavy: a.heavy, crit: Math.random() < h.crit }); if (marked) { h.energy = Math.min(100, h.energy + 8); e.markUntil = 0; } }
  if (hits.length) h.energy = Math.min(100, h.energy + 2);
}
function endGhost(h) { if (!h.ghostOn) return; h.ghostOn = false; h.body.setGhost(false); h.skills.e.lit = false; h.hasteMul = 1; if (!h.ult) h.targetable = true; }
// E follow-up: blink behind the target, guaranteed critical
function execute(h, tg) {
  const g = h.game, v = h.vfx, from = h.pos.clone(); _a.subVectors(tg.pos, h.pos).setY(0).normalize();
  h.pos.copy(tg.pos).addScaledVector(_a, tg.radius + 1.3); clampWalk(h.pos); h.face(_a.clone().negate());
  v.streak(from, h.pos, { width: 1.8, dur: 0.35, k: 3 }); v.ring(from, { r1: 2, dur: 0.25 });
  h.body.clip(ATK[2].clip, { ...ATK[2], dur: 0.34 }); h.lock = 0.3; h.atkT = 0.4; h.body.trailK = 1.4; endGhost(h);
  v.slash(h.pos, h.yaw, { r: 4, dur: 0.26, k: 4.2, tilt: 0.5 }); v.slash(h.pos, h.yaw, { r: 4, dur: 0.26, k: 4.2, tilt: -0.5, dir: -1 });
  g.damage(h, tg, h.atk * 1.7, { crit: true }); g.stun(tg, 0.6); if (h.isPlayer) v.number(tg.pos, 'EXECUÇÃO', 'info');
  for (const e of g.inRadius(h.team, tg.pos, 2.6)) if (e !== tg) g.damage(h, e, h.atk * 0.8);
}

export const VETOR = {
  id: 'vetor', name: 'VETOR', title: 'O Assassino Implantado', role: 'ASSASSINO', team: 'axiom', barY: 3.8,
  blurb: 'Corpo a corpo, alta mobilidade. Entra, marca e executa.',
  passive: { name: 'MARCA DE QUARENTENA', desc: 'Habilidades marcam inimigos por 4s. Vetor causa +25% de dano a marcados; um básico em alvo marcado devolve energia.' },
  base: { hp: 2350, atk: 104, speed: 7.4, range: 2.3, hpLvl: 165, atkLvl: 7, melee: true },
  async build(h) { return new VetorBody(await loadVetor(), h); },
  init(h) { h.combo = 0; h.comboUntil = 0; },
  onDie(h) { endGhost(h); h.ult = null; h.dash = null; h.body.lean = 0; },
  basic(h, tg, dir) {
    if (h.ghostOn && tg) return execute(h, tg);
    if (tg) { const d = _a.subVectors(tg.pos, h.pos).setY(0).length() - tg.radius; if (d > 1.6) { h.pos.addScaledVector(dir, Math.min(d - 1.4, 1.2)); clampWalk(h.pos); } }
    h.face(dir); if (h.t > h.comboUntil) h.combo = 0;
    const a = ATK[h.combo], sp = 1 - h.haste * 0.4; h.body.clip(a.clip, { ...a, dur: a.dur * sp }); h.lock = a.dur * sp * 0.8; h.atkT = a.dur * sp * 0.82; h.combo = (h.combo + 1) % 3; h.comboUntil = h.t + a.dur + 0.9; h.body.trailK = 1;
    h.after(a.dur * sp * a.hit, () => strike(h, a));
  },
  update(h, dt) {
    const g = h.game, v = h.vfx;
    if (h.ghostOn && h.t >= h.ghostUntil) endGhost(h);
    if (h.dash) {
      const d = h.dash; d.t += dt; const p = Math.min(1, d.t / d.dur), prev = h.pos.clone(); h.pos.lerpVectors(d.from, d.to, 1 - (1 - p) ** 2); h.body.lean = 0.45;
      for (const e of g.inCapsule(h.team, prev, h.pos, 1.7)) if (!d.hit.has(e)) { d.hit.add(e); g.damage(h, e, h.atk * d.mul); g.mark(e, 4); v.slash(e.pos, h.yaw + 1.2, { r: 2.4, dur: 0.18, tilt: 0.8, y: 1.3 }); }
      if (p >= 1) {
        v.streak(d.from, d.to, { width: 2.2, dur: 0.4, k: 3 }); v.streak(d.from, d.to, { width: 0.5, dur: 0.55, k: 5, y: 1.2 });
        if (d.hit.size) { const s = h.skills.q; s.ready = h.t + s.cdNow * 0.5; if (h.isPlayer) v.number(h.pos, 'RECARGA −50%', 'info'); }
        h.dash = null; h.busy = false; h.body.lean = 0;
      }
    }
    if (h.ult) {
      const u = h.ult, S = h.skills.r; u.next -= dt; if (u.next > 0) return;
      if (u.i < 6) {
        const pool = g.inRadius(h.team, u.c, S.radius), from = h.pos.clone(); let tp;
        if (pool.length) { const e = pool[(Math.random() * pool.length) | 0], a = Math.random() * 6.283; tp = e.pos.clone().add(_a.set(Math.cos(a), 0, Math.sin(a)).multiplyScalar(e.radius + 1.2)); h.face(_b.subVectors(e.pos, tp).setY(0).normalize()); }
        else { const a = u.i * 2.4, r = S.radius * 0.6; tp = u.c.clone().add(_a.set(Math.cos(a) * r, 0, Math.sin(a) * r)); h.face(_b.subVectors(u.c, tp).setY(0).normalize()); }
        clampWalk(tp); h.pos.copy(tp); v.streak(from, tp, { width: 1.3, dur: 0.3, k: 3.4, y: 1.2 }); v.slash(tp, h.yaw, { r: 3.6, dur: 0.2, k: 3.6, dir: u.i % 2 ? 1 : -1, tilt: (Math.random() - 0.5) * 1.2 });
        for (const e of g.inCone(h.team, tp, h.dirV, 3.8, 1.3)) { g.damage(h, e, h.atk * 0.8 * u.mul); g.mark(e, 4); }
        const a = ATK[u.i % 2 + 1]; h.body.clip(a.clip, { ...a, dur: 0.2, fade: 0.03 }); if (h.isPlayer) v.shake(0.3); u.i++; u.next = 0.12;
      } else if (u.i === 6) { const from = h.pos.clone(); h.pos.copy(u.c); v.streak(from, u.c, { width: 1.6, dur: 0.3, k: 3.4 }); h.body.clip('swipe', { ...ATK[2], dur: 0.5 }); u.i++; u.next = 0.2; }
      else {
        for (const e of g.inRadius(h.team, u.c, S.radius)) g.damage(h, e, h.atk * 2.0 * u.mul, { heavy: true });
        v.ring(u.c, { r0: 0.5, r1: S.radius * 1.15, dur: 0.5, k: 4 }); v.ring(u.c, { r0: 0.5, r1: S.radius * 0.7, dur: 0.6, color: C_WHITE, k: 2.6 }); v.disc(u.c, { r: S.radius, dur: 0.4, k: 2.6 });
        for (let k = 0; k < 6; k++) v.slash(u.c, k * 1.05, { r: S.radius, dur: 0.34, k: 3, tilt: k % 2 ? 0.2 : -0.2 });
        v.sparks({ x: u.c.x, y: 1, z: u.c.z }, 60, { speed: 16, up: 9, life: 0.8 }); if (h.isPlayer) { v.shake(1.1); v.stop(0.1); } v.flash(u.c, C_CYAN, 160);
        h.ult = null; h.busy = false; h.targetable = true; h.lock = 0.25;
      }
    }
  },
  skills: {
    q: { name: 'CORTE VETORIAL', desc: 'Avança cortando tudo no caminho e aplica Marca. Acertar devolve metade da recarga.', type: 'dir', ai: 'nuke', range: 9, width: 1.7, cd: [8, 7, 6], cost: 20,
      cast(h, a, r) { endGhost(h); h.dash = { from: h.pos.clone(), to: clampWalk(h.pos.clone().addScaledVector(a.dir, 9)), t: 0, dur: 0.17, hit: new Set(), mul: R3([1.4, 1.75, 2.1], r) }; h.busy = true; h.body.trailK = 1.6; h.body.clip('dash', { dur: 0.3 }); h.vfx.ring(h.pos, { r1: 2.6, dur: 0.25 }); } },
    w: { name: 'LÂMINAS GÊMEAS', desc: 'Arremessa as duas lâminas em V: perfuram, causam lentidão e aplicam Marca.', type: 'dir', ai: 'nuke', range: 13, width: 1, cd: [8, 7.2, 6.5], cost: 25,
      cast(h, a, r) {
        endGhost(h); h.body.clip('stab', { t0: 0.3, t1: 1.1, dur: 0.34 }); h.lock = 0.24;
        h.after(0.1, () => { const y = Math.atan2(a.dir.x, a.dir.z); for (const s of [-0.1, 0.1]) h.game.lineShot(h, { dir: new THREE.Vector3(Math.sin(y + s), 0, Math.cos(y + s)), range: 13, speed: 34, width: 0.95, size: 2.2, dmg: h.atk * R3([1.0, 1.25, 1.5], r), onHit: (e) => { h.game.mark(e, 4); h.game.slow(e, 0.65, 1.5); } });
          h.vfx.slash(h.pos, h.yaw, { r: 2.6, dur: 0.16, k: 2.6 }); h.V?.blades; h.body.V.blades.forEach((b) => { b.visible = false; }); h.after(0.5, () => h.body.V.blades.forEach((b) => { b.visible = true; })); });
      } },
    e: { name: 'MODO FANTASMA', desc: 'Camuflagem e +45% velocidade por 3s. O próximo básico teleporta às costas do alvo com crítico garantido e atordoa por 0,6s.', type: 'self', ai: 'self', keepMoving: true, keepTarget: true, cd: [14, 13, 12], cost: 30,
      cast(h) { h.ghostUntil = h.t + 3; h.ghostOn = true; h.skills.e.lit = true; h.body.setGhost(true); h.targetable = false; h.hasteMul = 1.45; h.vfx.ring(h.pos, { r1: 3, dur: 0.4, k: 2.6 }); if (h.isPlayer) h.vfx.number(h.pos, 'MODO FANTASMA', 'info'); } },
    r: { name: 'PROTOCOLO: ERRADICAÇÃO', desc: 'Fica inalvejável e desfere 6 cortes relâmpago na área, finalizando com uma onda de choque.', type: 'point', ai: 'ult', range: 9, radius: 6.5, cd: [48, 42, 36], cost: 50,
      cast(h, a, r) { endGhost(h); const S = h.skills.r; h.ult = { c: a.point.clone(), i: 0, next: 0.12, mul: R3([1, 1.3, 1.6], r) }; h.busy = true; h.targetable = false; h.body.trailK = 2;
        h.vfx.ring(a.point, { r0: S.radius, r1: S.radius * 0.98, dur: 1.1, k: 2.4 }); h.vfx.disc(a.point, { r: S.radius, dur: 1.1, k: 0.5 }); if (h.isPlayer) { h.vfx.stop(0.08); h.vfx.shake(0.4); } } },
  },
};
