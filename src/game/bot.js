// Bot brain: produces the same commands a player would (move / attack / cast / level / buy / recall), so any kit can be bot-driven.
import * as THREE from 'three';
import { ITEMS } from './items.js';
import { CAMPS, TOWER_X } from '../core/util.js';

const pct = (e) => e.hp / e.maxHp, d2 = (a, b) => Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z);

export class Bot {
  constructor(skill = 1) { this.cmds = []; this.attackHeld = false; this.aim = null; this.aimKey = null; this.keepTarget = true; this.tick = Math.random() * 0.3; this.skill = skill; this.jungleAt = 70 + Math.random() * 70; this.state = 'lane'; this.shopT = 0; }
  think(h, g, dt) {
    for (const k of ['r', 'q', 'w', 'e']) if (h.canLevel(k)) { this.cmds.push({ t: 'level', k }); break; }
    if ((this.shopT -= dt) <= 0) { this.shopT = 1; if (h.atBase) { const it = ITEMS.filter((i) => !h.canBuy(i)).sort((a, b) => b.cost - a.cost)[0]; if (it) this.cmds.push({ t: 'buy', item: it }); } }
    if ((this.tick -= dt) > 0 || h.busy) return; this.tick = 0.25;
    const s = h.team === 'axiom' ? -1 : 1, P = h.pos, foes = g.heroes.filter((e) => e.alive && e.team !== h.team && e.targetable !== false), foe = foes.sort((a, b) => d2(a, h) - d2(b, h))[0];
    const foeD = foe ? d2(foe, h) : 99, eTower = g.front(h.team === 'axiom' ? 'ekoo' : 'axiom'), myTower = g.front(h.team);
    const move = (x, z) => this.cmds.push({ t: 'move', x, z }), atk = (target) => this.cmds.push({ t: 'attack', target });
    const cast = (k, point) => { if (h.can(k) && Math.random() < 0.55 * this.skill) { this.cmds.push({ t: 'cast', k, point }); return true; } return false; };
    const byAi = (tag) => Object.keys(h.skills).filter((k) => h.skills[k].ai === tag);

    // ---- retreat / heal up ----
    if (this.state === 'retreat') { if (pct(h) > 0.85) this.state = 'lane'; else { if (foeD < 6) for (const k of byAi('escape')) cast(k, { x: P.x + s * 6, z: P.z }); if (!h.atBase && !h.recall) { if (foeD > 14 && g.t - h.combatAt > 2.5 && Math.abs(P.x - h.spawnPos.x) > 30) this.cmds.push({ t: 'recall' }); else move(h.spawnPos.x, h.spawnPos.z); } return; } }
    if (pct(h) < 0.3) { this.state = 'retreat'; for (const k of byAi('heal')) cast(k, null); return; }
    for (const k of byAi('heal')) if (pct(h) < 0.6 || g.heroes.some((a) => a.alive && a.team === h.team && pct(a) < 0.55 && d2(a, h) < 8)) cast(k, null);
    for (const k of byAi('healult')) if (g.heroes.filter((a) => a.alive && a.team === h.team && pct(a) < 0.5 && d2(a, h) < 9).length >= 1 && foeD < 14) cast(k, null);

    // ---- never dive a tower without minions ----
    const tD = Math.hypot(P.x - eTower.pos.x, P.z - eTower.pos.z), covered = g.alliesNear(h.team, eTower.pos, 10);
    if (eTower.alive && tD < eTower.range + 1.5 && !covered) { move(eTower.pos.x + s * (eTower.range + 4), P.z * 0.5); return; }

    // ---- occasional jungle trip: take a rift camp on our side of the map ----
    if (this.state === 'jungle') {
      const camp = this.camp, mobs = camp.units.filter((u) => u.alive);
      if (!mobs.length || pct(h) < 0.45 || (foe && foeD < 9)) { this.state = 'lane'; this.jungleAt = g.t + 100 + Math.random() * 60; }
      else { const m = mobs.sort((a, b) => a.hp - b.hp)[0]; if (d2(m, h) > h.range + 6) move(camp.c.x, camp.c.z - camp.c.side * 2); else { atk(m); for (const k of byAi('nuke').concat(byAi('aoe'))) cast(k, m.pos); } return; }
    } else if (g.t > this.jungleAt && h.level >= 3 && pct(h) > 0.75 && foeD > 16 && !g.heroes.some((a) => a !== h && a.team === h.team && a.ctrl.state === 'jungle')) {
      const c = g.camps.filter((c) => c.c.rift && c.units.some((u) => u.alive))[(Math.random() * 2) | 0]; if (c) { this.state = 'jungle'; this.camp = c; return; } this.jungleAt = g.t + 20;
    }

    // ---- fight ----
    const near = (team, r) => g.heroes.filter((e) => e.alive && e.team === team && d2(e, h) < r).length, odds = near(h.team, 13) - foes.filter((e) => d2(e, h) < 13).length;
    if (foe && foeD < 11 && (odds < 0 || pct(h) < 0.45) && pct(foe) > 0.3) { for (const k of byAi('escape')) cast(k, { x: P.x + s * 6, z: P.z }); move(P.x + s * 8, P.z * 0.6); return; }     // outnumbered or hurt: disengage
    if (foe && foeD < h.range + 5 && (pct(h) > pct(foe) * 0.6 || odds > 0)) {
      if (foeD < 4.5 && !h.kit.base.melee) for (const k of byAi('escape')) cast(k, { x: P.x + (P.x - foe.pos.x) * 2, z: P.z + (P.z - foe.pos.z) * 2 });
      for (const k of byAi('ult')) if (pct(foe) < 0.7 && foeD < h.skills[k].range) cast(k, foe.pos);
      for (const k of byAi('nuke').concat(byAi('aoe'))) if (foeD < h.skills[k].range) cast(k, foe.pos);
      for (const k of byAi('self')) cast(k, null);
      atk(foe); return;
    }
    const unit = g.nearest(h.team, P, h.range + 4, (e) => e.isUnit && (e.lane || e.aggro === h));
    if (unit) { atk(unit); if (h.energy > 55) for (const k of byAi('aoe').concat(byAi('nuke'))) if (!h.kit.base.melee || k !== 'q') cast(k, unit.pos); return; }
    if (eTower.alive && covered && !g.guarded(eTower) && tD < h.range + eTower.radius + 5) { atk(eTower); return; }
    // ---- follow the wave: stay just behind our front-most lane unit ----
    const front = g.ents.filter((e) => e.isUnit && e.alive && e.team === h.team && e.lane).reduce((m, e) => (s < 0 ? Math.max(m, e.pos.x) : Math.min(m, e.pos.x)), myTower.alive ? myTower.pos.x - s * 5 : s * 52);
    const gx = front + s * (h.kit.base.melee ? 1.5 : 4.5), gz = (this.z ??= (Math.random() - 0.5) * 6);
    if (Math.hypot(P.x - gx, P.z - gz) > 2.5) move(THREE.MathUtils.clamp(gx, -60, 60), gz);
  }
}
