// Player controller (PC MOBA scheme). Turns mouse / keyboard / touch into hero commands — nothing here touches game state directly.
//   Left click       move there · on an enemy: attack it (hold and drag to keep steering)     Mouse aims everything
//   Space (hold)     basic attack toward the cursor               Q W E R hold = aim preview, release = cast at the cursor
//   1 2 3 4          spend a skill point on Q W E R               B       recall to base      S  stop      C / P  shop
//   A                attack-move to the cursor                    Arrows  look around (camera springs back)
//   Touch            joystick moves, round buttons cast (drag a button to aim)
import * as THREE from 'three';

import { clampWalk } from '../core/util.js';
const GREEN = new THREE.Color(0x5dff7a), RED = new THREE.Color(0xff4a2a), ORANGE = new THREE.Color(0xffb02a);
const cur = (c) => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28'%3E%3Cpath d='M4 3l7 19 3-8 8-3z' fill='%23${c}' stroke='%23081018' stroke-width='2'/%3E%3C/svg%3E") 4 3, auto`;
const CUR = { idle: cur('35dcff'), foe: cur('ff4a2a') };
const SKILL = { KeyQ: 'q', KeyW: 'w', KeyE: 'e', KeyR: 'r' }, LEVEL = { Digit1: 'q', Digit2: 'w', Digit3: 'e', Digit4: 'r' };

export class Input {
  constructor(dom, rig, game) {
    Object.assign(this, { rig, game, cmds: [], attackHeld: false, aim: null, aimKey: null, keepTarget: true, hero: null, hover: null, dom });
    this.pan = new THREE.Vector2(); this.panGoal = new THREE.Vector2(); const arrows = new Set();
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
      else if (e.code === 'KeyA' && this.aim) { const p = clampWalk(this.aim.clone()); this.cmds.push({ t: 'amove', x: p.x, z: p.z }); this.game.vfx.click(p, ORANGE, 1); }
      else if (e.code.startsWith('Arrow')) { e.preventDefault(); arrows.add(e.code); setPan(); }
    });
    const setPan = () => this.panGoal.set((arrows.has('ArrowRight') ? 1 : 0) - (arrows.has('ArrowLeft') ? 1 : 0), (arrows.has('ArrowUp') ? 1 : 0) - (arrows.has('ArrowDown') ? 1 : 0)).multiplyScalar(16);
    addEventListener('keyup', (e) => {
      if (e.code.startsWith('Arrow')) { arrows.delete(e.code); setPan(); }
      if (e.code === 'Space') this.attackHeld = this.btnBasic || false;
      else if (SKILL[e.code] && this.aimKey === SKILL[e.code]) { this.cmds.push({ t: 'cast', k: this.aimKey, point: this.aim ? { x: this.aim.x, z: this.aim.z } : null }); this.aimKey = null; }
    });
    addEventListener('blur', () => { this.attackHeld = false; this.aimKey = null; rmb = false; arrows.clear(); setPan(); });
  }
  // per-frame: camera look-around offset + highlight of the enemy under the cursor
  tick(dt) {
    this.pan.lerp(this.panGoal, Math.min(1, dt * 7)); const g = this.game;
    if (!this.mark) { this.mark = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff4a2a).multiplyScalar(2.2), transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })); this.mark.layers.set(1); g.scene.add(this.mark); }
    const h = this.aim && !this.touch ? g.nearest(g.playerTeam, this.aim, 1.7) : null; this.hover = h; this.mark.visible = !!h;
    if (h) { this.mark.position.set(h.pos.x, 0.12, h.pos.z); this.mark.scale.setScalar(h.radius + 0.7 + Math.sin(g.t * 9) * 0.06); }
    const c = h ? CUR.foe : CUR.idle; if (c !== this.curNow) { this.curNow = c; this.dom.style.cursor = c; }
  }
  // screen-space drag (px, y down) -> world direction on the ground (touch aiming)
  screenDir(dx, dy) { return new THREE.Vector3().addScaledVector(this.rig.right, dx).addScaledVector(this.rig.fwd, -dy).normalize(); }
  // touch buttons: cast toward a dragged direction (or auto-aim when just tapped)
  touchCast(k, dir, mag) { const h = this.hero; if (!h) return; const r = h.skills[k].range || 0; this.cmds.push({ t: 'cast', k, point: dir ? { x: h.pos.x + dir.x * r * mag, z: h.pos.z + dir.z * r * mag } : null }); }
}
