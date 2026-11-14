// Player controller (PC MOBA scheme). Turns mouse / keyboard / touch into hero commands — nothing here touches game state directly.
//   Left click       move there · on an enemy: attack it (hold and drag to keep steering)     Mouse aims everything
//   Space (hold)     basic attack toward the cursor               Q W E R hold = aim preview, release = cast at the cursor
//   1 2 3 4          spend a skill point on Q W E R               B       recall to base      S  stop      C / P  shop
//   Touch            joystick moves, round buttons cast (drag a button to aim)
import * as THREE from 'three';

import { clampWalk } from '../core/util.js';
const GREEN = new THREE.Color(0x5dff7a), RED = new THREE.Color(0xff4a2a);
const SKILL = { KeyQ: 'q', KeyW: 'w', KeyE: 'e', KeyR: 'r' }, LEVEL = { Digit1: 'q', Digit2: 'w', Digit3: 'e', Digit4: 'r' };

export class Input {
  constructor(dom, rig, game) {
    Object.assign(this, { rig, game, cmds: [], attackHeld: false, aim: null, aimKey: null, keepTarget: true, hero: null });
    this.stick = new THREE.Vector2(); this.touch = matchMedia('(pointer:coarse)').matches;
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
    const ground = (e) => { ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, rig.camera); return ray.ray.intersectPlane(plane, hit) ? hit.clone() : null; };
    const order = (p, fresh) => {
      if (!p) return; const game = this.game, tg = game.nearest(game.playerTeam, p, 1.7);
      if (tg) { if (fresh) { this.cmds.push({ t: 'attack', target: tg }); game.vfx.click(tg.pos, RED, tg.radius + 0.6); } }
      else { this.cmds.push({ t: 'move', x: p.x, z: p.z }); if (fresh) game.vfx.click(clampWalk(p.clone()), GREEN, 1); }
    };
    let rmb = false, last = 0;
    dom.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; this.aim = ground(e); if (rmb && performance.now() - last > 140) { last = performance.now(); order(this.aim, false); } });
    dom.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; this.aim = ground(e); if (e.button === 0 || e.button === 2) { rmb = true; last = performance.now(); order(this.aim, true); } });
    addEventListener('pointerup', () => { rmb = false; });
    dom.addEventListener('contextmenu', (e) => e.preventDefault());
    dom.addEventListener('wheel', (e) => { rig.distGoal = THREE.MathUtils.clamp(rig.distGoal + Math.sign(e.deltaY) * 3, 34, 66); }, { passive: true });
    addEventListener('keydown', (e) => {
      if (e.repeat || e.ctrlKey || e.metaKey) return;
      if (e.code === 'Space') { e.preventDefault(); this.attackHeld = true; }
      else if (SKILL[e.code]) this.aimKey = SKILL[e.code];
      else if (LEVEL[e.code]) this.cmds.push({ t: 'level', k: LEVEL[e.code] });
      else if (e.code === 'KeyB') this.cmds.push({ t: 'recall' }); else if (e.code === 'KeyS') this.cmds.push({ t: 'stop' });
    });
    addEventListener('keyup', (e) => {
      if (e.code === 'Space') this.attackHeld = this.btnBasic || false;
      else if (SKILL[e.code] && this.aimKey === SKILL[e.code]) { this.cmds.push({ t: 'cast', k: this.aimKey, point: this.aim ? { x: this.aim.x, z: this.aim.z } : null }); this.aimKey = null; }
    });
    addEventListener('blur', () => { this.attackHeld = false; this.aimKey = null; rmb = false; });
  }
  // screen-space drag (px, y down) -> world direction on the ground (touch aiming)
  screenDir(dx, dy) { return new THREE.Vector3().addScaledVector(this.rig.right, dx).addScaledVector(this.rig.fwd, -dy).normalize(); }
  // touch buttons: cast toward a dragged direction (or auto-aim when just tapped)
  touchCast(k, dir, mag) { const h = this.hero; if (!h) return; const r = h.skills[k].range || 0; this.cmds.push({ t: 'cast', k, point: dir ? { x: h.pos.x + dir.x * r * mag, z: h.pos.z + dir.z * r * mag } : null }); }
}
