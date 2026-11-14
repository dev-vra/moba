// Linha de frente: SENTINELA (AXIOM, lutador) e FERRO-VELHO (EKOO, tanque) — modelados em código a partir dos cards.
import * as THREE from 'three';
import { clampWalk } from '../../core/util.js';
import { Puppet, registerModel } from '../puppet.js';
import { Parts, rig, box, cyl, ico, cone } from '../units.js';

const PI = Math.PI, R3 = (a, r) => a[r - 1], _a = new THREE.Vector3();
const dist = (a, b) => Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z);

// ---------------------------------------------------------------- modelos
registerModel('sentinela', (mat) => {           // mecha modular: placas brancas, visor ciano, lâmina de plasma (dir.), escudo hexagonal (esq.)
  const W = 0xe8edf3, S = 0x9aa6b4, N = 0x1a2433, D = 0x0c121b, G = 0x7ff3ff;
  const armBase = (P) => P.add(ico(0.26), [0, 0, 0], W, { s: [1.2, 1, 1.1] }).add(box(0.24, 0.44, 0.24), [0, -0.3, 0], N).add(box(0.32, 0.46, 0.32), [0, -0.72, 0], W)
    .add(box(0.05, 0.36, 0.33), [0.15, -0.72, 0], G, { g: 1 }).add(box(0.26, 0.2, 0.26), [0, -1.02, 0], S);
  return rig(new THREE.Group(), mat, new Parts(), {
    sh: [0.62, 1.75], hip: [0.22, 1.0], scale: 1.7,
    body: (P) => {
      P.add(box(0.6, 0.3, 0.38), [0, 1.0, 0], N).add(box(0.52, 0.34, 0.34), [0, 1.26, 0], S).add(box(1.0, 0.56, 0.56), [0, 1.62, 0], W)
        .add(box(0.08, 0.5, 0.05), [0, 1.6, 0.29], G, { g: 1.4 }).add(box(0.36, 0.16, 0.05), [0, 1.42, 0.29], G, { g: 0.8 })
        .add(box(0.5, 0.5, 0.3), [0, 1.66, -0.38], S).add(box(0.12, 0.6, 0.12), [-0.18, 2.05, -0.42], N).add(box(0.12, 0.5, 0.12), [0.2, 2.0, -0.42], N)
        .add(box(0.34, 0.3, 0.34), [0, 2.08, 0.04], W).add(box(0.3, 0.07, 0.05), [0, 2.1, 0.22], G, { g: 2.4 }).add(cone(0.06, 0.24, 4), [0, 2.3, 0.02], S);
      for (const s of [-1, 1]) P.add(box(0.42, 0.24, 0.5), [s * 0.66, 1.92, 0], W, { r: [0, 0, s * -0.2] }).add(box(0.36, 0.05, 0.46), [s * 0.66, 1.8, 0], G, { g: 0.6 });
    },
    armR: (P) => armBase(P).add(box(0.06, 1.3, 0.22), [0, -1.75, 0.08], G, { g: 2.2 }).add(cone(0.11, 0.35, 4), [0, -2.55, 0.08], G, { r: [PI, 0, 0], g: 2.2 }),
    armL: (P) => armBase(P).add(box(0.12, 1.5, 1.0), [-0.24, -0.95, 0.2], G, { g: 0.9 }).add(box(0.14, 1.2, 0.7), [-0.2, -0.95, 0.2], S),
    leg: (P) => P.add(box(0.32, 0.5, 0.34), [0, -0.27, 0], W).add(ico(0.16), [0, -0.52, 0.08], S).add(box(0.28, 0.46, 0.3), [0, -0.76, 0], N)
      .add(box(0.05, 0.36, 0.31), [0.14, -0.76, 0], G, { g: 0.8 }).add(box(0.34, 0.14, 0.5), [0, -0.98, 0.06], W),
  });
});

registerModel('ferrovelho', (mat) => {          // brutamontes sucateiro: careca, latarias enferrujadas, porta de caminhão (esq.), corrente com gancho (dir.)
  const SK = 0xc08a68, R = 0x8a4e2e, RD = 0x5c3422, I = 0x3a3330, C = 0x6e665c, A = 0xffa040, P2 = 0x7a7466;
  const arm = (P) => P.add(ico(0.27), [0, 0, 0], R, { s: [1.3, 1, 1.2] }).add(box(0.24, 0.44, 0.24), [0, -0.3, 0], SK).add(box(0.3, 0.44, 0.3), [0, -0.72, 0], R)
    .add(cyl(0.06, 0.06, 0.32, 6), [0.17, -0.72, 0], A, { g: 1.3 }).add(box(0.2, 0.18, 0.22), [0, -1.0, 0], SK);
  return rig(new THREE.Group(), mat, new Parts(), {
    sh: [0.6, 1.68], hip: [0.2, 0.98], scale: 1.65,
    body: (P) => {
      P.add(box(0.62, 0.34, 0.4), [0, 1.0, 0], C).add(box(0.62, 0.1, 0.42), [0, 1.18, 0], RD).add(ico(0.1), [0, 1.18, 0.22], A, { g: 1.6 })
        .add(box(0.96, 0.62, 0.52), [0, 1.52, 0], R).add(box(0.5, 0.3, 0.05), [0, 1.55, 0.27], RD).add(box(0.9, 0.12, 0.5), [0, 1.84, 0], RD)
        .add(ico(0.22), [0, 2.06, 0.03], SK).add(box(0.2, 0.06, 0.08), [0, 2.06, 0.2], RD)
        .add(box(0.16, 0.12, 0.05), [0, 1.98, 0.22], SK).add(box(0.36, 0.22, 0.26), [0, 1.92, -0.02], RD);
      for (const s of [-1, 1]) P.add(cyl(0.07, 0.08, 0.7, 6), [s * 0.22, 2.1, -0.32], I).add(cyl(0.05, 0.05, 0.06, 6), [s * 0.22, 2.48, -0.32], A, { g: 1.8 });
      P.add(box(0.5, 0.8, 0.06), [0, 0.65, 0.22], P2, { r: [0.08, 0, 0] });
      for (let i = 0; i < 5; i++) P.add(new THREE.TorusGeometry(0.07, 0.022, 4, 8), [-0.3 + i * 0.13, 1.25 + Math.sin(i) * 0.04, 0.25], I, { r: [0, i % 2 ? PI / 2 : 0, 0] });
    },
    armL: (P) => arm(P).add(box(0.1, 1.7, 1.15), [-0.28, -0.85, 0.25], C).add(box(0.12, 0.55, 0.85), [-0.3, -0.35, 0.25], 0x9fb0b4).add(box(0.13, 0.08, 0.25), [-0.32, -0.95, 0.5], I),
    armR: (P) => {
      arm(P);
      for (let i = 0; i < 6; i++) P.add(new THREE.TorusGeometry(0.075, 0.025, 4, 8), [0.05, -1.12 - i * 0.12, 0.05], I, { r: [0, i % 2 ? PI / 2 : 0, 0] });
      P.add(new THREE.TorusGeometry(0.16, 0.04, 4, 10, PI * 1.3), [0.05, -1.95, 0.08], 0x8f8a82, { r: [0, 0, PI * 0.9] });
    },
    leg: (P) => P.add(box(0.3, 0.5, 0.32), [0, -0.27, 0], C).add(box(0.32, 0.18, 0.34), [0, -0.5, 0.02], R).add(box(0.28, 0.44, 0.3), [0, -0.76, 0], C).add(box(0.32, 0.16, 0.48), [0, -0.98, 0.07], I),
  });
});

// ---------------------------------------------------------------- comuns
function meleeBasic(h, tg, { wind = 0.3, time = 1.0, reach = 1.2 } = {}) {
  const sp = 1 - h.haste * 0.4; h.lock = wind * sp + 0.05; h.atkT = time * sp; h.body.play('attack', wind * sp);
  const crit = Math.random() < h.crit;
  h.after(wind * sp, () => {
    if (!tg || !tg.alive || dist(h, tg) > h.range + tg.radius + reach) return;
    h.game.damage(h, tg, h.atk * (crit ? 1.75 : 1)); h.vfx.sparks({ x: tg.pos.x, y: 1.3, z: tg.pos.z }, crit ? 12 : 6, { color: h.color, speed: 7 });
  });
}
function dash(h, to, dur = 0.25, onEnd) {
  h.busy = true; const from = h.pos.clone(); let t = 0;
  h.hopFn = (dt) => { t += dt; const p = Math.min(1, t / dur); h.pos.lerpVectors(from, to, 1 - (1 - p) ** 2); if (p >= 1) { h.hopFn = null; h.busy = false; onEnd?.(); } };
}
const shieldUp = (h, amt, dur) => { h.shield = Math.max(h.shield || 0, amt); h.shieldUntil = h.t + dur; };

// ---------------------------------------------------------------- SENTINELA
export const SENTINELA = {
  id: 'sentinela', name: 'SENTINELA', title: 'A Máquina de Reconfiguração', role: 'LUTADOR', team: 'axiom', barY: 4.6,
  blurb: 'Corpo a corpo. Alterna entre barreira e ofensiva: avança com a lâmina, atordoa em área e cai sobre o alvo.',
  passive: { name: 'RECONFIGURAÇÃO', desc: 'Cada habilidade usada gera um escudo de 6% da vida máxima por 2,5s.' },
  base: { hp: 2600, atk: 98, speed: 7.1, range: 2.6, hpLvl: 185, atkLvl: 7, melee: true, armor: 0.08 },
  build() { return new Puppet('sentinela', 'axiom', 'melee'); },
  update(h, dt) { h.hopFn?.(dt); },
  onCast(h) { shieldUp(h, h.maxHp * 0.06, 2.5); },
  basic(h, tg) { meleeBasic(h, tg, { wind: 0.28, time: 0.95 }); },
  skills: {
    q: { name: 'LÂMINA DE PLASMA', desc: 'Avança 6u com a lâmina: fere quem estiver no caminho e deixa lento por 1,5s.', type: 'dir', ai: 'nuke', range: 6, width: 1.6, cd: [7, 6.3, 5.6], cost: 22,
      cast(h, a, r) { SENTINELA.onCast(h); h.body.play('attack', 0.18); const to = clampWalk(h.pos.clone().addScaledVector(a.dir, 6)), from = h.pos.clone(), g = h.game, hit = new Set();
        h.vfx.streak(from, to, { color: h.color, width: 1.6, dur: 0.3, k: 3 });
        dash(h, to, 0.22, () => { for (const e of g.enemies(h.team)) { if (!e.alive || hit.has(e) || e.isTower) continue; const t = Math.max(0, Math.min(1, ((e.pos.x - from.x) * (to.x - from.x) + (e.pos.z - from.z) * (to.z - from.z)) / (from.distanceToSquared(to) || 1)));
          if (Math.hypot(e.pos.x - (from.x + (to.x - from.x) * t), e.pos.z - (from.z + (to.z - from.z) * t)) < 1.6 + e.radius) { hit.add(e); g.damage(h, e, h.atk * R3([1.4, 1.75, 2.1], r)); g.slow(e, 0.55, 1.5); } } }); } },
    w: { name: 'MODO BARREIRA', desc: 'Reconfigura em barreira por 3s: escudo grande e lentidão em inimigos colados.', type: 'self', ai: 'self', keepMoving: true, keepTarget: true, cd: [13, 12, 11], cost: 25,
      cast(h, a, r) { SENTINELA.onCast(h); shieldUp(h, R3([320, 460, 600], r) + h.maxHp * 0.06, 3); h.vfx.ring(h.pos, { r0: 3.5, r1: 1.5, dur: 0.35, k: 3, color: h.color });
        for (const e of h.game.inRadius(h.team, h.pos, 3.5)) h.game.slow(e, 0.6, 1.2); } },
    e: { name: 'PULSO DE CHOQUE', desc: 'Descarga em volta: fere e atordoa por 0,7s.', type: 'self', ai: 'aoe', radius: 3.6, cd: [11, 10, 9], cost: 26,
      cast(h, a, r) { SENTINELA.onCast(h); h.body.play('cast', 0.2); h.lock = 0.2; const g = h.game; h.vfx.ring(h.pos, { r0: 0.5, r1: 3.6, dur: 0.3, k: 3.4, color: h.color }); h.vfx.disc(h.pos, { r: 3.6, dur: 0.25, k: 2, color: h.color });
        for (const e of g.inRadius(h.team, h.pos, 3.6)) { g.damage(h, e, h.atk * R3([1.0, 1.3, 1.6], r)); g.stun(e, 0.7); } } },
    r: { name: 'PROTOCOLO BASTIÃO', desc: 'Salta sobre a área: impacto que fere, atordoa por 1s e concede escudo para cada inimigo atingido.', type: 'point', ai: 'ult', range: 9, radius: 4, cd: [60, 52, 45], cost: 50,
      cast(h, a, r) { SENTINELA.onCast(h); h.body.play('cast', 0.4); const to = clampWalk(a.point.clone()), g = h.game, v = h.vfx;
        v.ring(to, { r0: 4, r1: 3.9, dur: 0.4, k: 2.4, color: h.color });
        dash(h, to, 0.4, () => { v.disc(to, { r: 4, dur: 0.35, k: 2.6, color: h.color }); v.ring(to, { r1: 5, dur: 0.4, k: 3.4, color: h.color }); v.sparks({ x: to.x, y: 0.6, z: to.z }, 30, { color: h.color, speed: 11, up: 8 }); if (h.isPlayer) v.shake(0.6);
          const es = g.inRadius(h.team, to, 4); for (const e of es) { g.damage(h, e, h.atk * R3([2.0, 2.6, 3.2], r)); g.stun(e, 1.0); } shieldUp(h, h.maxHp * (0.06 + 0.05 * es.filter((e) => e.isHero).length), 4); }); } },
  },
};

// ---------------------------------------------------------------- FERRO-VELHO
export const FERROVELHO = {
  id: 'ferrovelho', name: 'FERRO-VELHO', title: 'O Tanque Sucateiro do Coro', role: 'TANQUE', team: 'ekoo', barY: 4.5,
  blurb: 'Muralha de sucata: puxa inimigos com a corrente, segura a linha com a porta de caminhão e atropela tudo.',
  passive: { name: 'LATARIA', desc: 'Blindagem de sucata: 15% de redução de dano permanente.' },
  base: { hp: 2950, atk: 92, speed: 6.9, range: 2.6, hpLvl: 210, atkLvl: 6, melee: true, armor: 0.15 },
  build() { return new Puppet('ferrovelho', 'ekoo', 'melee'); },
  update(h, dt) { h.hopFn?.(dt); },
  basic(h, tg) { meleeBasic(h, tg, { wind: 0.34, time: 1.05 }); },
  skills: {
    q: { name: 'GANCHO DE CORRENTE', desc: 'Arremessa a corrente: o primeiro inimigo atingido é puxado até Ferro-Velho e atordoado por 0,5s.', type: 'dir', ai: 'nuke', range: 11, width: 1.2, cd: [10, 9, 8], cost: 24,
      cast(h, a, r) { h.body.play('attack', 0.25); h.lock = 0.3; const g = h.game;
        h.after(0.2, () => g.lineShot(h, { dir: a.dir, range: 11, speed: 34, width: 1.2, size: 1.8, pierce: false, dmg: h.atk * R3([1.2, 1.5, 1.8], r), onHit: (e) => {
          if (e.isTower) return; const to = clampWalk(h.pos.clone().addScaledVector(_a.subVectors(e.pos, h.pos).setY(0).normalize(), 2.2));
          h.vfx.streak(e.pos.clone(), to, { color: h.color, width: 0.5, dur: 0.3, k: 3 }); e.pos.copy(to); g.stun(e, 0.5); } })); } },
    w: { name: 'PORTA DE CAMINHÃO', desc: 'Ergue a porta por 3,5s: escudo massivo e inimigos que o atacarem de perto ficam lentos.', type: 'self', ai: 'self', keepMoving: true, keepTarget: true, cd: [14, 13, 12], cost: 25,
      cast(h, a, r) { shieldUp(h, R3([380, 540, 700], r) + h.maxHp * 0.08, 3.5); h.vfx.ring(h.pos, { r0: 3, r1: 1.4, dur: 0.35, k: 3, color: h.color });
        const g = h.game; for (let i = 0; i < 7; i++) h.after(i * 0.5, () => { for (const e of g.inRadius(h.team, h.pos, 3)) g.slow(e, 0.65, 0.6); }); } },
    e: { name: 'PANCADA DE FERRO', desc: 'Golpeia o chão com a porta: fere em área e deixa lento por 2s.', type: 'self', ai: 'aoe', radius: 3.8, cd: [9, 8.2, 7.4], cost: 22,
      cast(h, a, r) { h.body.play('attack', 0.3); h.lock = 0.35; const g = h.game;
        h.after(0.3, () => { h.vfx.ring(h.pos, { r0: 0.5, r1: 3.8, dur: 0.3, k: 3, color: h.color }); h.vfx.sparks({ x: h.pos.x, y: 0.4, z: h.pos.z }, 24, { color: h.color, speed: 9, up: 5 }); if (h.isPlayer) h.vfx.shake(0.35);
          for (const e of g.inRadius(h.team, h.pos, 3.8)) { g.damage(h, e, h.atk * R3([1.1, 1.4, 1.7], r) + h.maxHp * 0.03); g.slow(e, 0.5, 2); } }); } },
    r: { name: 'MURALHA DO CORO', desc: 'Investida de 9u atropelando tudo: inimigos no caminho são feridos e atordoados por 1,2s.', type: 'dir', ai: 'ult', range: 9, width: 2.4, cd: [65, 56, 48], cost: 50,
      cast(h, a, r) { h.body.play('cast', 0.3); const from = h.pos.clone(), to = clampWalk(h.pos.clone().addScaledVector(a.dir, 9)), g = h.game, hit = new Set();
        h.vfx.streak(from, to, { color: h.color, width: 2.4, dur: 0.5, k: 3 });
        let t = 0; const step = () => { for (const e of g.inRadius(h.team, h.pos, 2.4)) if (!hit.has(e) && !e.isTower) { hit.add(e); g.damage(h, e, h.atk * R3([1.8, 2.3, 2.8], r) + h.maxHp * 0.04); g.stun(e, 1.2); h.vfx.sparks({ x: e.pos.x, y: 1, z: e.pos.z }, 12, { color: h.color, speed: 8 }); } };
        for (let i = 1; i <= 6; i++) h.after(i * 0.08, step);
        dash(h, to, 0.5, () => { step(); if (h.isPlayer) h.vfx.shake(0.5); }); t; } },
  },
};
