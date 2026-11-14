// Gameplay VFX (pooled, additive, HDR so they bloom). Characters / skills own the saturated range.
import * as THREE from 'three';
import { T } from '../core/tex.js';

const ADD = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide };
export const C_CYAN = new THREE.Color(0x12d8ff), C_WHITE = new THREE.Color(0xffffff), C_AMBER = new THREE.Color(0xffa23a), C_VIOLET = new THREE.Color(0x9a6bff);

// sector strip on the XZ plane, centred on +Z; attributes: q = (along arc 0..1, radial 0..1)
function arcGeo(arc = 2.4, seg = 40, inner = 0.42) {
  const pos = [], q = [], idx = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg, a = (t - 0.5) * arc, s = Math.sin(a), c = Math.cos(a);
    pos.push(s * inner, 0, c * inner, s, 0, c); q.push(t, 0, t, 1);
    if (i < seg) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('q', new THREE.Float32BufferAttribute(q, 2)); g.setIndex(idx); return g;
}
const slashMat = () => new THREE.ShaderMaterial({
  ...ADD, uniforms: { uP: { value: 0 }, uCol: { value: new THREE.Color() }, uDir: { value: 1 }, uK: { value: 3 } },
  vertexShader: 'attribute vec2 q; varying vec2 vq; void main(){ vq=q; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: /* glsl */`uniform float uP,uDir,uK; uniform vec3 uCol; varying vec2 vq;
    void main(){ float t = uDir>0. ? vq.x : 1.-vq.x; float d = uP*1.5 - t;
      float a = smoothstep(0.,.03,d)*exp(-d*4.2);                       // sharp leading edge, fading wake
      float ry = clamp(vq.y,0.,1.);                                      // pow() of a slightly negative interpolant is NaN -> black bloom
      a *= pow(ry,1.6)*(1.-smoothstep(.93,1.,ry))*(1.-smoothstep(.78,1.,uP));
      vec3 c = mix(uCol, vec3(1.), clamp(pow(ry,9.)*.45+(1.-smoothstep(0.,.07,d))*.25,0.,1.));
      gl_FragColor = vec4(c*uK*a, a); }`,
});

class Trail {                                   // ribbon behind a blade
  constructor(scene, color, n = 16) {
    this.n = n; this.pos = new Float32Array(n * 6); this.al = new Float32Array(n * 2); this.k = 0;
    const idx = []; for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('al', new THREE.BufferAttribute(this.al, 1)); g.setIndex(idx);
    this.mesh = new THREE.Mesh(g, new THREE.ShaderMaterial({ ...ADD, uniforms: { uCol: { value: color.clone().multiplyScalar(2.6) } },
      vertexShader: 'attribute float al; varying float va; void main(){ va=al; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: 'uniform vec3 uCol; varying float va; void main(){ float a=clamp(va,0.,2.); gl_FragColor=vec4(uCol*a,min(a,1.)); }' }));
    this.mesh.frustumCulled = false; this.mesh.layers.set(1); scene.add(this.mesh); this.first = true;
  }
  push(a, b, intensity) {
    const { pos, al, n } = this;
    if (this.first) { for (let i = 0; i < n; i++) { pos.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6); } this.first = false; }
    pos.copyWithin(6, 0, (n - 1) * 6); al.copyWithin(2, 0, (n - 1) * 2);
    pos.set([a.x, a.y, a.z, b.x, b.y, b.z], 0); al[0] = 0; al[1] = intensity;
    for (let i = 1; i < n; i++) { al[i * 2] *= 0.8; al[i * 2 + 1] *= 0.8; }
    this.mesh.geometry.attributes.position.needsUpdate = true; this.mesh.geometry.attributes.al.needsUpdate = true;
  }
}

export class VFX {
  constructor(scene, rig, layerEl) {
    this.scene = scene; this.rig = rig; this.cam = rig.camera; this.el = layerEl; this.live = [];
    const mk = (n, f) => Array.from({ length: n }, f);
    const g = arcGeo();
    this.slashes = mk(12, () => { const m = new THREE.Mesh(g, slashMat()); m.visible = false; m.layers.set(1); m.frustumCulled = false; scene.add(m); return m; });
    const rg = new THREE.RingGeometry(0.88, 1, 64); rg.rotateX(-Math.PI / 2);
    this.rings = mk(10, () => { const m = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ ...ADD, color: 0xffffff })); m.visible = false; m.layers.set(1); scene.add(m); return m; });
    const pg = new THREE.PlaneGeometry(1, 1); pg.rotateX(-Math.PI / 2);
    this.streaks = mk(8, () => { const m = new THREE.Mesh(pg, new THREE.MeshBasicMaterial({ ...ADD, map: T.streak })); m.visible = false; m.layers.set(1); scene.add(m); return m; });
    this.discs = mk(6, () => { const m = new THREE.Mesh(pg, new THREE.MeshBasicMaterial({ ...ADD, map: T.soft })); m.visible = false; m.layers.set(1); scene.add(m); return m; });
    // spark particles
    const N = this.N = 700; this.pp = new Float32Array(N * 3); this.pv = new Float32Array(N * 3); this.pc = new Float32Array(N * 3); this.pl = new Float32Array(N * 2); this.ps = new Float32Array(N); this.pg = new Float32Array(N); this.pi = 0;
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(this.pp, 3)); sg.setAttribute('color', new THREE.BufferAttribute(this.pc, 3)); sg.setAttribute('life', new THREE.BufferAttribute(this.pl, 2)); sg.setAttribute('size', new THREE.BufferAttribute(this.ps, 1));
    this.sparkPts = new THREE.Points(sg, new THREE.ShaderMaterial({ ...ADD, uniforms: { tMap: { value: T.soft } },
      vertexShader: 'attribute vec3 color; attribute vec2 life; attribute float size; varying vec3 vc; varying float va; void main(){ vc=color; va=clamp(life.x/life.y,0.,1.); vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=life.x>0.?size*(.4+.6*va)*(300./-mv.z):0.; }',
      fragmentShader: 'uniform sampler2D tMap; varying vec3 vc; varying float va; void main(){ float a=texture2D(tMap,gl_PointCoord).a*va; gl_FragColor=vec4(vc*a*2.4,a); }' }));
    this.sparkPts.frustumCulled = false; this.sparkPts.layers.set(1); scene.add(this.sparkPts);
    this.light = new THREE.PointLight(0x2fe4ff, 0, 14, 1.6); scene.add(this.light); this.lightK = 0;
    this.nums = mk(24, () => { const d = document.createElement('div'); d.className = 'dmg'; layerEl.appendChild(d); return { d, t: 0 }; });
    this.trails = []; this.hitstop = 0;
  }
  trail(color) { const t = new Trail(this.scene, color); this.trails.push(t); return t; }
  _take(pool) { return pool.find((m) => !m.visible) || pool[0]; }
  _run(dur, fn, end) { this.live.push({ t: 0, dur, fn, end }); }

  slash(pos, yaw, { r = 3.2, color = C_CYAN, dur = 0.22, y = 1.3, dir = 1, tilt = 0, roll = 0, k = 3 } = {}) {
    const m = this._take(this.slashes); m.visible = true; m.position.set(pos.x, y, pos.z); m.rotation.set(tilt, yaw, roll, 'YXZ'); m.scale.setScalar(r);
    const u = m.material.uniforms; u.uCol.value.copy(color); u.uDir.value = dir; u.uK.value = k; u.uP.value = 0;
    this._run(dur, (p) => { u.uP.value = p; }, () => { m.visible = false; });
  }
  ring(pos, { r0 = 0.5, r1 = 4, color = C_CYAN, dur = 0.35, y = 0.12, k = 2.2 } = {}) {
    const m = this._take(this.rings); m.visible = true; m.position.set(pos.x, y, pos.z); m.material.color.copy(color).multiplyScalar(k);
    this._run(dur, (p) => { const e = 1 - (1 - p) ** 3; m.scale.setScalar(r0 + (r1 - r0) * e); m.material.opacity = (1 - p) ** 1.5; }, () => { m.visible = false; });
  }
  disc(pos, { r = 3, color = C_CYAN, dur = 0.3, y = 0.1, k = 1.5 } = {}) {
    const m = this._take(this.discs); m.visible = true; m.position.set(pos.x, y, pos.z); m.material.color.copy(color).multiplyScalar(k);
    this._run(dur, (p) => { m.scale.setScalar(r * 2 * (0.6 + 0.4 * p)); m.material.opacity = 1 - p; }, () => { m.visible = false; });
  }
  streak(a, b, { color = C_CYAN, width = 1.4, dur = 0.3, y = 1.0, k = 2.4 } = {}) {
    const m = this._take(this.streaks), dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz);
    m.visible = true; m.position.set((a.x + b.x) / 2, y, (a.z + b.z) / 2); m.rotation.y = Math.atan2(dx, dz) - Math.PI / 2; m.material.color.copy(color).multiplyScalar(k);
    this._run(dur, (p) => { m.scale.set(len * (1 + p * 0.1), 1, width * (1 - p * 0.7)); m.material.opacity = (1 - p) ** 1.3; }, () => { m.visible = false; });
  }
  sparks(pos, n = 12, { color = C_CYAN, speed = 9, life = 0.4, up = 3, size = 0.5, grav = 14, dir = null, spread = 1 } = {}) {
    for (let i = 0; i < n; i++) {
      const j = this.pi = (this.pi + 1) % this.N, a = Math.random() * 6.283, s = speed * (0.35 + Math.random() * 0.65);
      let vx = Math.cos(a) * s * spread, vz = Math.sin(a) * s * spread; if (dir) { vx += dir.x * speed; vz += dir.z * speed; }
      this.pp.set([pos.x, pos.y ?? 1.2, pos.z], j * 3); this.pv.set([vx, up * (0.2 + Math.random()), vz], j * 3);
      const c = Math.random() < 0.3 ? C_WHITE : color; this.pc.set([c.r, c.g, c.b], j * 3);
      const l = life * (0.5 + Math.random() * 0.7); this.pl[j * 2] = l; this.pl[j * 2 + 1] = l; this.ps[j] = size * (0.6 + Math.random() * 0.8); this.pg[j] = grav;
    }
  }
  flash(pos, color = C_CYAN, k = 40) { this.light.position.set(pos.x, 2.2, pos.z); this.light.color.copy(color); this.lightK = k; }
  shake(a) { this.rig.shake = Math.max(this.rig.shake, a); }
  stop(t) { this.hitstop = Math.max(this.hitstop, t); }
  number(pos, text, cls = '') {
    const n = this.nums.reduce((a, b) => (a.t <= b.t ? a : b)); n.t = 0.8; n.pos = new THREE.Vector3(pos.x + (Math.random() - 0.5) * 0.8, 2.6, pos.z); n.d.textContent = text; n.d.className = 'dmg on ' + cls;
  }
  hit(pos, color = C_CYAN, heavy = false) {
    this.sparks({ x: pos.x, y: 1.3, z: pos.z }, heavy ? 22 : 10, { color, speed: heavy ? 13 : 9 });
    this.disc(pos, { r: heavy ? 2.4 : 1.5, color, dur: 0.18, y: 1.2, k: 1.2 }); this.flash(pos, color, heavy ? 60 : 30);
    if (heavy) { this.shake(0.5); this.stop(0.06); } else this.shake(0.16);
  }
  update(dt) {
    for (let i = this.live.length - 1; i >= 0; i--) { const e = this.live[i]; e.t += dt; const p = Math.min(1, e.t / e.dur); e.fn(p); if (p >= 1) { e.end?.(); this.live.splice(i, 1); } }
    const { pp, pv, pl, pg } = this;
    for (let j = 0; j < this.N; j++) {
      if (pl[j * 2] <= 0) continue; pl[j * 2] -= dt;
      pv[j * 3 + 1] -= pg[j] * dt; pp[j * 3] += pv[j * 3] * dt; pp[j * 3 + 1] += pv[j * 3 + 1] * dt; pp[j * 3 + 2] += pv[j * 3 + 2] * dt;
      if (pp[j * 3 + 1] < 0.05) { pp[j * 3 + 1] = 0.05; pv[j * 3 + 1] *= -0.4; pv[j * 3] *= 0.6; pv[j * 3 + 2] *= 0.6; }
    }
    const a = this.sparkPts.geometry.attributes; a.position.needsUpdate = true; a.life.needsUpdate = true; a.color.needsUpdate = true; a.size.needsUpdate = true;
    this.lightK *= Math.exp(-dt * 14); this.light.intensity = this.lightK;
    const v = new THREE.Vector3(), w = innerWidth, h = innerHeight;
    for (const n of this.nums) {
      if (n.t <= 0) continue; n.t -= dt; if (n.t <= 0) { n.d.className = 'dmg'; continue; }
      n.pos.y += dt * 2.2; v.copy(n.pos).project(this.cam);
      n.d.style.transform = `translate(${((v.x + 1) / 2) * w}px,${((1 - v.y) / 2) * h}px) translate(-50%,-50%) scale(${0.8 + Math.min(1, (0.8 - n.t) * 8) * 0.4})`; n.d.style.opacity = Math.min(1, n.t * 4);
    }
  }
}

// world-space health bar (two sprites)
export class Bar {
  constructor(scene, w = 2.2, color = 0xff5a3c, h = 0.22) {
    this.w = w; this.g = new THREE.Group();
    const mk = (c, o, z) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ color: c, opacity: o, transparent: true, depthTest: false, fog: false })); s.center.set(0, 0.5); s.scale.set(w, h, 1); s.renderOrder = z; s.layers.set(1); this.g.add(s); return s; };
    this.bg = mk(0x0a0e14, 0.75, 10); this.bg.scale.set(w + 0.1, h + 0.1, 1); this.fg = mk(color, 1, 11); scene.add(this.g); this.g.layers.set(1);
  }
  set(pos, y, frac) {
    // sprites are anchored on their left edge; shift the group left along camera-right is unnecessary at this FOV
    this.g.position.set(pos.x, y, pos.z); this.bg.position.x = -this.w / 2 - 0.05; this.fg.position.x = -this.w / 2; this.fg.scale.x = Math.max(0.001, this.w * frac);
  }
}

// ground aim indicators (arrow / circle) shown while a skill is being aimed
export class Indicator {
  constructor(scene) {
    const pg = new THREE.PlaneGeometry(1, 1); pg.rotateX(-Math.PI / 2); pg.translate(0, 0, 0.5);
    this.arrow = new THREE.Mesh(pg, new THREE.MeshBasicMaterial({ ...ADD, map: T.arrow, color: new THREE.Color(0x2fe4ff).multiplyScalar(1.3), opacity: 0.8 }));
    const rg = new THREE.RingGeometry(0.93, 1, 64); rg.rotateX(-Math.PI / 2);
    this.circle = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ ...ADD, color: new THREE.Color(0x2fe4ff).multiplyScalar(1.6), opacity: 0.9 }));
    const dg = new THREE.CircleGeometry(1, 48); dg.rotateX(-Math.PI / 2);
    this.fill = new THREE.Mesh(dg, new THREE.MeshBasicMaterial({ ...ADD, color: 0x2fe4ff, opacity: 0.12 })); this.circle.add(this.fill);
    this.range = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ ...ADD, color: 0x9fefff, opacity: 0.35 }));
    for (const m of [this.arrow, this.circle, this.range]) { m.visible = false; m.position.y = 0.09; m.layers.set(1); scene.add(m); } this.fill.layers.set(1);
  }
  hide() { this.arrow.visible = this.circle.visible = this.range.visible = false; }
  line(from, yaw, len, width) { this.hide(); this.arrow.visible = true; this.arrow.position.set(from.x, 0.09, from.z); this.arrow.rotation.y = yaw; this.arrow.scale.set(width, 1, len); }
  area(from, range, at, r) { this.hide(); this.circle.visible = this.range.visible = true; this.circle.position.set(at.x, 0.09, at.z); this.circle.scale.setScalar(r); this.range.position.set(from.x, 0.08, from.z); this.range.scale.setScalar(range); }
}
