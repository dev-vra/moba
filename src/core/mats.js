// Unified PBR material set. Few shared materials, one texel density (world-scale UVs), faction palettes.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { T, pbr } from './tex.js';

const noShadow = (m) => { m.userData.noShadow = true; m.userData.raw = true; return m; };
// PBR set from public/tex; `tile` = world units per texture repeat (same density everywhere)
function std(name, tile, o = {}) {
  const t = pbr(name);
  const m = new THREE.MeshStandardMaterial({ map: t.d, normalMap: t.n, aoMap: t.orm, roughnessMap: t.orm, metalnessMap: t.orm, roughness: 1, metalness: 1, vertexColors: true, ...o });
  m.userData.tile = tile; return m;
}
const plain = (o = {}) => new THREE.MeshStandardMaterial({ roughness: 0.72, metalness: 0, vertexColors: true, ...o });
const TILE = 3.2;

export const M = {
  flat: plain(),                                           // untextured small parts (dark iron, rubber, foliage)
  flatDS: plain({ side: THREE.DoubleSide }),
  leaf: plain({ roughness: 1, envMapIntensity: 0.25 }),   // foliage: matte, barely picks up the sky
  rust: std('rustA', TILE),                                // EKOO: heavy rust plate
  rustB: std('rustB', TILE),                               // EKOO: structural beams
  oldmetal: std('corrugated', TILE),                       // neutral: silos, sheds, frames
  grid: std('grid', TILE),                                 // decks / pads
  axiom: std('hull', TILE * 1.5, { roughness: 0.5, envMapIntensity: 1.3, color: 0xeaf1fb }),   // AXIOM: clean hull, light wear
  concrete: std('concrete', TILE * 1.25),
  rock: std('rock', 2.4),
  wood: plain({ map: T.wood, roughness: 0.85 }),
  tarp: plain({ map: T.tarp, roughness: 0.9, side: THREE.DoubleSide }),
  glassA: noShadow(new THREE.MeshStandardMaterial({ map: T.glassA, transparent: true, depthWrite: false, side: THREE.DoubleSide, roughness: 0.3, metalness: 0, envMapIntensity: 1.2, vertexColors: true })),
  glassB: noShadow(new THREE.MeshStandardMaterial({ map: T.glassB, transparent: true, depthWrite: false, side: THREE.DoubleSide, roughness: 0.3, metalness: 0, envMapIntensity: 1.2, vertexColors: true })),
  glow: noShadow(new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })),
  glowSoft: noShadow(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })),
};
M.leaf.userData.raw = true; M.wood.userData.tile = 2; M.wood.userData.keepTint = true; M.tarp.userData.keepTint = true;

// Environment emissives are deliberately restrained so hero / skill VFX own the bright, saturated range.
export const ENV_GLOW = 0.62;
export const glowC = (hex, k = 2.2) => new THREE.Color(hex).multiplyScalar(k * ENV_GLOW);
export const CYAN = 0x35dcff, AMBER = 0xff9a2e;

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _n = new THREE.Vector3(), WHITE = new THREE.Color(1, 1, 1);
const KEEP = ['position', 'normal', 'uv', 'color'];

// box-projected UVs in local space -> constant texel density on every flat part
function boxUV(g, sc, tile) {
  const p = g.attributes.position, uv = g.attributes.uv, ox = Math.random(), oy = Math.random();
  for (let i = 0; i < p.count; i += 3) {
    _a.fromBufferAttribute(p, i); _b.fromBufferAttribute(p, i + 1); _n.fromBufferAttribute(p, i + 2);
    _b.sub(_a); _n.sub(_a); _n.crossVectors(_b, _n);
    const ax = Math.abs(_n.x), ay = Math.abs(_n.y), az = Math.abs(_n.z);
    for (let k = 0; k < 3; k++) {
      const x = p.getX(i + k) * sc.x, y = p.getY(i + k) * sc.y, z = p.getZ(i + k) * sc.z;
      if (ax >= ay && ax >= az) uv.setXY(i + k, z / tile + ox, y / tile + oy);
      else if (ay >= az) uv.setXY(i + k, x / tile + ox, z / tile + oy);
      else uv.setXY(i + k, x / tile + ox, y / tile + oy);
    }
  }
}

// Collects transformed geometry per material and merges into one mesh per material.
export class Batch {
  constructor() { this.map = new Map(); this.stack = [new THREE.Matrix4()]; }
  get top() { return this.stack[this.stack.length - 1]; }
  push(x = 0, y = 0, z = 0, ry = 0, s = 1, rx = 0, rz = 0) {
    const m = new THREE.Matrix4().compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(s, s, s));
    this.stack.push(this.top.clone().multiply(m)); return this;
  }
  pop() { this.stack.pop(); return this; }
  add(geo, mat, p = [0, 0, 0], r = [0, 0, 0], c = 0xffffff, s = 1, uv = null) {
    const g = geo.index ? geo.toNonIndexed() : geo, tile = mat.userData.tile;
    if (typeof s === 'number') _s.set(s, s, s); else _s.fromArray(s);
    const ws = this.top.getMaxScaleOnAxis();
    if (tile && !uv) {
      if (geo.userData.box) boxUV(g, _s.clone().multiplyScalar(ws), tile);
      else if (geo.type === 'CylinderGeometry') {
        const q = geo.parameters, rad = Math.max(q.radiusTop, q.radiusBottom) * _s.x * ws;
        uv = [Math.max(1, Math.round((6.283 * rad) / tile)), Math.max(0.25, (q.height * _s.y * ws) / tile)];
      }
    }
    _m.compose(_p.fromArray(p), _q.setFromEuler(_e.set(r[0], r[1], r[2])), _s);
    _m.premultiply(this.top); g.applyMatrix4(_m);
    const n = g.attributes.position.count, col = new Float32Array(n * 3), pos = g.attributes.position;
    if (c.isColor) _c.copy(c); else _c.set(c);
    if (tile && !mat.userData.keepTint) _c.lerp(WHITE, 0.5);          // textured PBR: tint only nudges the albedo
    const grime = !mat.userData.raw;
    for (let i = 0; i < n; i++) {
      let k = 1;
      if (grime) { const y = THREE.MathUtils.clamp(pos.getY(i) / 1.5, 0, 1); k = 0.66 + 0.34 * y * y * (3 - 2 * y); }   // ground dirt / contact darkening
      col[i * 3] = _c.r * k; col[i * 3 + 1] = _c.g * k; col[i * 3 + 2] = _c.b * k;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (uv) { const a = g.attributes.uv; for (let i = 0; i < n; i++) a.setXY(i, a.getX(i) * uv[0], a.getY(i) * uv[1]); }
    for (const k of Object.keys(g.attributes)) if (!KEEP.includes(k)) g.deleteAttribute(k);
    if (!this.map.has(mat)) this.map.set(mat, []);
    this.map.get(mat).push(g);
  }
  build(parent, layer = 0) {
    const grp = new THREE.Group();
    for (const [mat, list] of this.map) {
      const mesh = new THREE.Mesh(mergeGeometries(list), mat);
      mesh.castShadow = mesh.receiveShadow = !mat.userData.noShadow;
      if (mat.transparent) mesh.layers.set(1); else mesh.layers.set(layer);
      list.forEach((g) => g.dispose()); grp.add(mesh);
    }
    this.map.clear(); parent.add(grp); return grp;
  }
}
