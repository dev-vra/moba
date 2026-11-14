// Unified input: keyboard + mouse and touch (HUD joystick / buttons) feed the same state.
//   move      : screen-relative stick (x right, y up), |move| <= 1
//   aimPoint  : mouse position on the ground (desktop) or null
//   events    : queue of { skill, dir?: Vector3, mag?: number }   (dir = world-space aim, omitted => auto-aim)
//   aiming    : { skill, dir, mag } while a skill button is being dragged (touch) -> indicator preview
import * as THREE from 'three';

const KEYS = { KeyQ: 's1', KeyE: 's2', KeyR: 's3', KeyF: 'ult', Digit1: 's1', Digit2: 's2', Digit3: 's3', Digit4: 'ult' };

export class Input {
  constructor(dom, rig) {
    this.rig = rig; this.move = new THREE.Vector2(); this.stick = new THREE.Vector2(); this.aimPoint = null; this.moveTo = null;
    this.events = []; this.aiming = null; this.basicHeld = false; this.touch = matchMedia('(pointer:coarse)').matches;
    const keys = this.keys = new Set(), ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
    const ground = (e) => { ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, rig.camera); return ray.ray.intersectPlane(plane, hit) ? hit.clone() : null; };
    addEventListener('keydown', (e) => {
      if (e.repeat) return; keys.add(e.code);
      if (KEYS[e.code]) this.cast(KEYS[e.code], this.mouseDir()); if (e.code === 'Space' || e.code === 'KeyJ') this.keyBasic = true;
      if (e.code === 'KeyT') this.events.push({ skill: 'taunt' });
    });
    addEventListener('keyup', (e) => { keys.delete(e.code); if (e.code === 'Space' || e.code === 'KeyJ') this.keyBasic = false; });
    addEventListener('blur', () => { keys.clear(); this.keyBasic = this.mouseBasic = false; });
    dom.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') { this.aimPoint = ground(e); if (this.rmb) this.moveTo = this.aimPoint; } });
    dom.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return; this.aimPoint = ground(e);
      if (e.button === 0) this.mouseBasic = true; if (e.button === 2) { this.rmb = true; this.moveTo = this.aimPoint; }
    });
    addEventListener('pointerup', (e) => { if (e.button === 0) this.mouseBasic = false; if (e.button === 2) this.rmb = false; });
    dom.addEventListener('contextmenu', (e) => e.preventDefault());
    dom.addEventListener('wheel', (e) => { rig.distGoal = THREE.MathUtils.clamp(rig.distGoal + Math.sign(e.deltaY) * 3, 34, 66); }, { passive: true });
  }
  heroPos = null;
  mouseDir() { if (!this.aimPoint || !this.heroPos || this.touch) return null; const d = this.aimPoint.clone().sub(this.heroPos); d.y = 0; const m = d.length(); return m > 0.3 ? { dir: d.normalize(), mag: m } : null; }
  cast(skill, aim) { this.events.push({ skill, dir: aim?.dir ?? null, mag: aim?.mag ?? null }); }
  // screen-space drag (px, y down) -> world direction on the ground
  screenDir(dx, dy) { return new THREE.Vector3().addScaledVector(this.rig.right, dx).addScaledVector(this.rig.fwd, -dy).normalize(); }
  update() {
    const k = this.keys; let x = 0, y = 0;
    if (k.has('KeyW') || k.has('ArrowUp')) y += 1; if (k.has('KeyS') || k.has('ArrowDown')) y -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1; if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    if (x || y) { this.move.set(x, y).normalize(); this.moveTo = null; } else this.move.copy(this.stick);
    this.basicHeld = !!(this.keyBasic || this.mouseBasic || this.btnBasic);
  }
}
