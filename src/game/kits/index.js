// Hero kits. ENXAME (AXIOM mage) is playable; DESPLUGADA (EKOO marksman) and VÁLVULA (EKOO support) are bot-driven for now.
import * as THREE from 'three';
import { clampWalk } from '../../core/util.js';
import { Puppet } from '../puppet.js';
import { Parts, UMAT, box, ico, cyl } from '../units.js';
import { C_WHITE } from '../vfx.js';
import { VETOR } from './vetor.js';

const R3 = (a, r) => a[r - 1], _a = new THREE.Vector3();
function rangedBasic(h, tg, { wind = 0.2, time = 0.85, speed = 30, size = 1.3, arrow = false } = {}) {
  const sp = 1 - h.haste * 0.4; h.lock = wind + 0.04; h.atkT = time * sp; h.body.play('attack', wind);
  const crit = Math.random() < h.crit; h.after(wind, () => { if (tg.alive) h.game.shoot(h, tg, h.atk, { speed, size, crit, arrow }); });
}
// short forced move (hops, knockbacks)
function hop(h, to, dur = 0.22) { h.busy = true; const from = h.pos.clone(); let t = 0; h.hopFn = (dt) => { t += dt; const p = Math.min(1, t / dur); h.pos.lerpVectors(from, to, 1 - (1 - p) ** 2); if (p >= 1) { h.busy = false; h.hopFn = null; } }; }

// ---------------------------------------------------------------- ENXAME — o Controlador da Colmeia (AXIOM, mago)
function miniDrone() {
  const P = new Parts(); P.add(box(0.5, 0.2, 0.7), [0, 0, 0], 0xf2f6fb).add(box(1.3, 0.05, 0.3), [0, 0.04, -0.05], 0x9fb2c8).add(ico(0.12), [0, -0.02, 0.4], 0xcdf4ff, { g: 2 });
  for (const s of [-1, 1]) P.add(cyl(0.2, 0.2, 0.04, 8), [s * 0.62, 0.1, -0.05], 0x16263c).add(cyl(0.07, 0.09, 0.16, 6), [s * 0.16, 0, -0.42], 0xcdf4ff, { r: [Math.PI / 2, 0, 0], g: 1.3 });
  const m = P.mesh(UMAT.axiom, 'drone'); m.scale.setScalar(0.62); return m;
}
const ENXAME = {
  id: 'enxame', name: 'ENXAME', title: 'O Controlador da Colmeia', role: 'MAGO', team: 'axiom', barY: 4.2,
  blurb: 'À distância. Controla área com drones: lentidão, escudo e uma tempestade devastadora.',
  passive: { name: 'MENTE COLMEIA', desc: 'Os três drones de escolta disparam sozinhos no inimigo mais próximo a cada 2,4s.' },
  base: { hp: 2050, atk: 88, speed: 6.9, range: 9.5, hpLvl: 140, atkLvl: 7 },
  build(h) { const b = new Puppet('enxame', 'axiom', 'mage'); h.drones = [0, 1, 2].map(() => { const d = miniDrone(); h.scene.add(d); return d; }); return b; },
  init(h) { h.zapT = 2; h.orbit = 0; },
  onDie(h) { h.hasteMul = 1; },
  basic(h, tg) { rangedBasic(h, tg, { wind: 0.2, time: 0.9 }); },
  update(h, dt) {
    const g = h.game; h.orbit += dt * (h.shield > 0 ? 4.5 : 1.6);
    h.drones.forEach((d, i) => { const a = h.orbit + i * 2.094, r = h.shield > 0 ? 1.6 : 2.3; d.visible = h.alive && h.seen !== false; d.position.set(h.pos.x + Math.cos(a) * r, 3 + Math.sin(h.t * 2 + i) * 0.25, h.pos.z + Math.sin(a) * r); d.rotation.y = -a; });
    if ((h.zapT -= dt) <= 0) { const e = g.nearest(h.team, h.pos, 7.5); h.zapT = e ? 2.4 : 0.4; if (e) { const d = h.drones[(Math.random() * 3) | 0]; g.shoot(h, e, h.atk * 0.32 + h.level * 4, { from: d.position.clone(), speed: 34, size: 0.8 }); } }
  },
  skills: {
    q: { name: 'RAJADA DE ENXAME', desc: 'Lança uma formação de drones em linha reta que atravessa e fere todos os inimigos; o primeiro atingido fica atordoado por 0,6s.', type: 'dir', ai: 'nuke', range: 13, width: 1.7, cd: [6.5, 5.8, 5], cost: 22,
      cast(h, a, r) { h.body.play('cast', 0.2); h.lock = 0.2; const y = Math.atan2(a.dir.x, a.dir.z); h.vfx.slash(h.pos, y, { r: 2.6, dur: 0.2, k: 2.6 });
        let first = true; h.game.lineShot(h, { dir: a.dir, range: 13, speed: 30, width: 1.7, size: 2.8, dmg: h.atk * R3([1.6, 2.0, 2.4], r), onHit: (e) => { if (first) { first = false; h.game.stun(e, 0.6); } } });
        for (const s of [-1, 1]) h.game.lineShot(h, { dir: a.dir, range: 13, speed: 30, width: 0.1, size: 1.5, dmg: 0, from: h.pos.clone().add(_a.set(Math.cos(y) * s * 1.1, 0, -Math.sin(y) * s * 1.1)) }); } },
    w: { name: 'MALHA DE VIGILÂNCIA', desc: 'Projeta um campo de sensores por 4s: fere e deixa lentos os inimigos dentro dele.', type: 'point', ai: 'aoe', range: 10, radius: 4.6, cd: [11, 10, 9], cost: 28,
      cast(h, a, r) { h.body.play('cast', 0.25); h.lock = 0.2; const g = h.game, d = h.atk * R3([0.34, 0.44, 0.54], r); g.zone(h, { pos: a.point, r: 4.6, dur: 4, tick: 0.5, fn: (e) => { g.damage(h, e, d); g.slow(e, 0.6, 0.8); } }); h.vfx.ring(a.point, { r0: 0.5, r1: 4.6, dur: 0.3, k: 3 }); } },
    e: { name: 'PROTOCOLO DE ESCOLTA', desc: 'Os drones formam um escudo por 3,5s e Enxame ganha +30% de velocidade.', type: 'self', ai: 'escape', keepMoving: true, keepTarget: true, cd: [14, 13, 12], cost: 25,
      cast(h, a, r) { h.shield = R3([300, 430, 560], r) + h.atk; h.shieldUntil = h.t + 3.5; h.hasteMul = 1.3; h.after(3.5, () => { h.hasteMul = 1; }); h.vfx.ring(h.pos, { r0: 3, r1: 1.4, dur: 0.35, k: 3 }); } },
    r: { name: 'TEMPESTADE DE DRONES', desc: 'Convoca a colmeia: por 5s, drones mergulham e explodem em sequência dentro da área.', type: 'point', ai: 'ult', range: 11, radius: 7, cd: [60, 52, 45], cost: 50,
      cast(h, a, r) {
        h.body.play('cast', 0.5); h.lock = 0.35; const g = h.game, v = h.vfx, c = a.point.clone(), d = h.atk * R3([0.8, 1.1, 1.4], r);
        g.zone(h, { pos: c, r: 7, dur: 5, tick: 0.5, fn: () => {} }); if (h.isPlayer) v.shake(0.4);
        for (let i = 0; i < 18; i++) h.after(0.3 + i * 0.27, () => {
          const ang = Math.random() * 6.283, rr = Math.sqrt(Math.random()) * 6, tgt = g.inRadius(h.team, c, 7)[0], p = i % 3 === 0 && tgt ? tgt.pos.clone() : new THREE.Vector3(c.x + Math.cos(ang) * rr, 0, c.z + Math.sin(ang) * rr);
          v.streak({ x: p.x - 2.5, z: p.z + 3.5 }, p, { width: 0.7, dur: 0.22, y: 2.5, k: 4 }); v.disc(p, { r: 2.6, dur: 0.3, k: 2.2 }); v.ring(p, { r1: 2.6, dur: 0.3, k: 3 }); v.sparks({ x: p.x, y: 0.6, z: p.z }, 14, { speed: 9, up: 7 }); v.flash(p, h.color, 40);
          for (const e of g.inRadius(h.team, p, 2.6)) g.damage(h, e, d);
        });
      } },
  },
};

// ---------------------------------------------------------------- DESPLUGADA — a Atiradora do Coro (EKOO, atiradora)
const DESPLUGADA = {
  id: 'desplugada', name: 'DESPLUGADA', title: 'A Atiradora do Coro', role: 'ATIRADORA', team: 'ekoo', barY: 3.9,
  blurb: 'Dano sustentado à distância com arco de sucata e flechas de cobre.',
  passive: { name: 'SEM SINAL', desc: 'Quem não tem sinal não pode ser desligado: imune a lentidão por 1s após saltar.' },
  base: { hp: 2100, atk: 98, speed: 7.0, range: 9.5, hpLvl: 140, atkLvl: 8 },
  build() { return new Puppet('desplugada', 'ekoo', 'bow'); },
  update(h, dt) { h.hopFn?.(dt); },
  basic(h, tg) { rangedBasic(h, tg, { wind: 0.24, time: 0.8, speed: 38, size: 1.6, arrow: true }); },
  skills: {
    q: { name: 'FLECHA DE COBRE', desc: 'Flecha perfurante em linha reta.', type: 'dir', ai: 'nuke', range: 14, width: 1.1, cd: [6, 5.5, 5], cost: 20,
      cast(h, a, r) { h.body.play('attack', 0.2); h.lock = 0.22; h.after(0.15, () => h.game.lineShot(h, { dir: a.dir, range: 14, speed: 40, width: 1.1, size: 2.4, arrow: true, dmg: h.atk * R3([1.5, 1.85, 2.2], r) })); } },
    w: { name: 'CHUVA DE SUCATA', desc: 'Dispara para o alto: estilhaços caem na área após um instante, ferindo e causando lentidão.', type: 'point', ai: 'aoe', range: 10, radius: 4, cd: [11, 10, 9], cost: 28,
      cast(h, a, r) { h.body.play('cast', 0.3); h.lock = 0.25; const g = h.game, v = h.vfx, c = a.point.clone(); v.ring(c, { r0: 4, r1: 3.9, dur: 0.75, k: 2.4, color: h.color });
        h.after(0.75, () => { v.disc(c, { r: 4, dur: 0.35, k: 2.4, color: h.color }); v.sparks({ x: c.x, y: 0.5, z: c.z }, 30, { color: h.color, speed: 10, up: 7 }); for (const e of g.inRadius(h.team, c, 4)) { g.damage(h, e, h.atk * R3([1.1, 1.4, 1.7], r)); g.slow(e, 0.6, 1.5); } }); } },
    e: { name: 'SALTO TÁTICO', desc: 'Salta para trás, afastando-se do perigo.', type: 'dir', ai: 'escape', range: 6.5, cd: [12, 11, 10], cost: 18,
      cast(h, a) { const to = clampWalk(h.pos.clone().addScaledVector(a.dir, 6.5)); h.vfx.streak(h.pos, to, { color: h.color, width: 1.2, dur: 0.3 }); hop(h, to); h.slowUntil = 0; } },
    r: { name: 'FLECHA SEM SINAL', desc: 'Flecha pesada de longo alcance: para no primeiro inimigo, causando dano massivo, atordoando por 0,9s e deixando lento.', type: 'dir', ai: 'ult', range: 24, width: 1.4, cd: [55, 48, 42], cost: 50,
      cast(h, a, r) { h.body.play('attack', 0.45); h.lock = 0.5; h.vfx.ring(h.pos, { r0: 3, r1: 1, dur: 0.45, color: h.color, k: 3 });
        h.after(0.45, () => h.game.lineShot(h, { dir: a.dir, range: 24, speed: 46, width: 1.4, size: 3.6, arrow: true, pierce: false, dmg: h.atk * R3([2.6, 3.3, 4.0], r), onHit: (e) => { h.game.stun(e, 0.9); h.game.slow(e, 0.45, 2.5); h.vfx.ring(e.pos, { r1: 4, dur: 0.4, color: h.color, k: 3.4 }); } })); } },
  },
};

// ---------------------------------------------------------------- VÁLVULA — a Rádio-Operadora do Coro (EKOO, suporte)
const VALVULA = {
  id: 'valvula', name: 'VÁLVULA', title: 'A Rádio-Operadora do Coro', role: 'SUPORTE', team: 'ekoo', barY: 4.2,
  blurb: 'Cura aliados e desorienta inimigos com ondas de rádio.',
  passive: { name: 'SINTONIA', desc: 'Curas de Válvula também restauram energia dos heróis aliados.' },
  base: { hp: 2300, atk: 72, speed: 6.8, range: 8.5, hpLvl: 150, atkLvl: 6 },
  build() { return new Puppet('valvula', 'ekoo', 'mage'); },
  basic(h, tg) { rangedBasic(h, tg, { wind: 0.22, time: 0.95, speed: 26 }); },
  update(h, dt) {
    if (h.choir && h.t < h.choir.until) { if ((h.choir.next -= dt) <= 0) { h.choir.next = 0.5; h.vfx.ring(h.pos, { r0: 1, r1: 9, dur: 0.5, color: h.color, k: 1.8 }); for (const e of h.game.allies(h.team)) if (e.pos.distanceTo(h.pos) < 9) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * h.choir.pct); } }
  },
  skills: {
    q: { name: 'ESTÁTICA', desc: 'Pulso de estática em linha: fere e causa lentidão.', type: 'dir', ai: 'nuke', range: 11, width: 1.3, cd: [7, 6.3, 5.6], cost: 20,
      cast(h, a, r) { h.body.play('cast', 0.2); h.lock = 0.2; h.game.lineShot(h, { dir: a.dir, range: 11, speed: 26, width: 1.3, size: 2.4, dmg: h.atk * R3([1.3, 1.65, 2.0], r), onHit: (e) => h.game.slow(e, 0.6, 1.6) }); } },
    w: { name: 'FREQUÊNCIA DE CURA', desc: 'Cura a si e aos aliados próximos.', type: 'self', ai: 'heal', keepMoving: true, keepTarget: true, radius: 8, cd: [12, 11, 10], cost: 30,
      cast(h, a, r) { h.body.play('cast', 0.25); const amt = R3([150, 220, 290], r) + h.atk * 0.8; h.vfx.ring(h.pos, { r0: 1, r1: 8, dur: 0.5, color: new THREE.Color(0x7dffa0), k: 2.4 });
        for (const e of h.game.allies(h.team)) if (e.pos.distanceTo(h.pos) < 8) { e.hp = Math.min(e.maxHp, e.hp + (e.isHero ? amt : amt * 0.5)); if (e.isHero) e.energy = Math.min(100, e.energy + 12); h.vfx.sparks({ x: e.pos.x, y: 1, z: e.pos.z }, 6, { color: new THREE.Color(0x7dffa0), speed: 2, up: 6, grav: 3, life: 0.6 }); } } },
    e: { name: 'INTERFERÊNCIA', desc: 'Zona de ruído por 3s: lentidão forte e dano leve.', type: 'point', ai: 'aoe', range: 9, radius: 4.2, cd: [13, 12, 11], cost: 26,
      cast(h, a, r) { h.body.play('cast', 0.25); h.lock = 0.2; const g = h.game, d = h.atk * R3([0.3, 0.38, 0.46], r); g.zone(h, { pos: a.point, r: 4.2, dur: 3, tick: 0.5, fn: (e) => { g.damage(h, e, d); g.slow(e, 0.5, 0.8); } }); for (const e of g.inRadius(h.team, a.point, 4.2)) g.stun(e, 0.5); } },
    r: { name: 'CORO DAS 3H17', desc: 'Transmite o Coro por 5s: aliados em volta regeneram vida continuamente.', type: 'self', ai: 'healult', keepMoving: true, keepTarget: true, radius: 9, cd: [70, 60, 50], cost: 50,
      cast(h, a, r) { h.body.play('cast', 0.5); h.choir = { until: h.t + 5, next: 0, pct: R3([0.03, 0.04, 0.05], r) }; h.vfx.ring(h.pos, { r0: 1, r1: 9, dur: 0.6, color: C_WHITE, k: 3 }); } },
  },
};

export const KITS = { vetor: VETOR, enxame: ENXAME, desplugada: DESPLUGADA, valvula: VALVULA };
export const PLAYABLE = ['vetor', 'enxame'];
