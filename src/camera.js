// Isometric-style MOBA camera rig (narrow FOV perspective, fixed yaw/pitch, smooth follow)
import * as THREE from 'three';
import { clamp } from './core/util.js';

const YAW = THREE.MathUtils.degToRad(35), PITCH = THREE.MathUtils.degToRad(50);

export class CameraRig {
  constructor(aspect) {
    this.camera = new THREE.PerspectiveCamera(30, aspect, 8, 320);
    this.target = new THREE.Vector3(); this.goal = new THREE.Vector3(); this.dist = 36; this.distGoal = 36; this.shake = 0;
    // ground-plane basis for screen-relative movement
    this.fwd = new THREE.Vector3(Math.sin(YAW), 0, -Math.cos(YAW));
    this.right = new THREE.Vector3(Math.cos(YAW), 0, Math.sin(YAW));
    this.off = new THREE.Vector3(-Math.sin(YAW) * Math.cos(PITCH), Math.sin(PITCH), Math.cos(YAW) * Math.cos(PITCH));
    this.apply();
  }
  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 1 ? 46 : 30;      // portrait phones: widen
    this.camera.updateProjectionMatrix();
  }
  snap(x, z) { this.goal.set(x, 0, z); this.target.copy(this.goal); this.apply(); }
  apply() {
    this.camera.position.copy(this.target).addScaledVector(this.off, this.dist); this.camera.lookAt(this.target);
    if (this.shake > 0.001) { const s = this.shake * 0.5; this.camera.position.x += (Math.random() - 0.5) * s; this.camera.position.y += (Math.random() - 0.5) * s; this.camera.position.z += (Math.random() - 0.5) * s; }
  }
  update(dt) {
    const k = 1 - Math.exp(-dt * 7);
    this.target.lerp(this.goal, k); this.dist += (this.distGoal - this.dist) * k; this.shake *= Math.exp(-dt * 9); this.apply();
  }
}

// Milestone-1 free camera (replaced by hero follow in milestone 2)
export function freeCam(rig, dom) {
  const keys = new Set(); let drag = null;
  addEventListener('keydown', (e) => {
    keys.add(e.code);
    if (e.code === 'Digit1') rig.goal.set(-66, 0, 0); if (e.code === 'Digit2') rig.goal.set(0, 0, 0); if (e.code === 'Digit3') rig.goal.set(66, 0, 0);
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  dom.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; dom.setPointerCapture(e.pointerId); });
  dom.addEventListener('pointermove', (e) => {
    if (!drag) return; const s = rig.dist / innerHeight * 0.75;
    rig.goal.addScaledVector(rig.right, -(e.clientX - drag.x) * s).addScaledVector(rig.fwd, (e.clientY - drag.y) * s * 1.3);
    drag = { x: e.clientX, y: e.clientY };
  });
  dom.addEventListener('pointerup', () => { drag = null; });
  dom.addEventListener('wheel', (e) => { rig.distGoal = clamp(rig.distGoal + Math.sign(e.deltaY) * 4, 40, 72); }, { passive: true });
  return (dt) => {
    const v = 26 * dt;
    if (keys.has('KeyW') || keys.has('ArrowUp')) rig.goal.addScaledVector(rig.fwd, v);
    if (keys.has('KeyS') || keys.has('ArrowDown')) rig.goal.addScaledVector(rig.fwd, -v);
    if (keys.has('KeyD') || keys.has('ArrowRight')) rig.goal.addScaledVector(rig.right, v);
    if (keys.has('KeyA') || keys.has('ArrowLeft')) rig.goal.addScaledVector(rig.right, -v);
    rig.goal.x = clamp(rig.goal.x, -76, 76); rig.goal.z = clamp(rig.goal.z, -12, 12);
  };
}
