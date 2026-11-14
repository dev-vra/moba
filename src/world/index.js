// Assembles the Cidade-Celeiro: terrain, props, bases, lights, atmosphere
import * as THREE from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { M, Batch, glowC, CYAN, AMBER } from '../core/mats.js';
import { T } from '../core/tex.js';
import { rng, heightAt, smooth, lerp, noise, navDist, CAMPS, BRUSH, BASE_X, TOWER_X, CORE_X } from '../core/util.js';
import { buildGround, FARMS } from './ground.js';
import * as P from './props.js';
import { axiomBase, ekooBase } from './bases.js';

const FOG = 0x8796a0;
const SUN_DIR = new THREE.Vector3(0.62, 0.62, 0.48).normalize();

function motes(scene, { n, center, box, vel, color, size }) {
  const pos = new Float32Array(n * 3), seed = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos.set([Math.random() * box[0], Math.random() * box[1], Math.random() * box[2]], i * 3); seed.set([Math.random(), Math.random(), 0.4 + Math.random() * 0.6], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('seed', new THREE.BufferAttribute(seed, 3));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uBox: { value: new THREE.Vector3(...box) }, uCenter: { value: new THREE.Vector3(...center) }, uVel: { value: new THREE.Vector3(...vel) }, uColor: { value: color }, uSize: { value: size }, tMap: { value: T.soft } },
    vertexShader: `attribute vec3 seed; uniform float uTime,uSize; uniform vec3 uBox,uCenter,uVel; varying float vA;
      void main(){ vec3 p=position+uVel*uTime*seed.z+vec3(sin(uTime*.5+seed.x*6.28),0.,cos(uTime*.4+seed.y*6.28))*.7;
        p=mod(p,uBox); vA=smoothstep(0.,.15,p.y/uBox.y)*(1.-smoothstep(.7,1.,p.y/uBox.y))*(.5+.5*sin(uTime*3.*seed.x+seed.y*40.));
        p+=uCenter-vec3(uBox.x*.5,0.,uBox.z*.5); vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; gl_PointSize=uSize*seed.z*(40./-mv.z); }`,
    fragmentShader: `uniform vec3 uColor; uniform sampler2D tMap; varying float vA; void main(){ gl_FragColor=vec4(uColor,texture2D(tMap,gl_PointCoord).a*vA); }`,
  });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.layers.set(1); scene.add(pts); return mat;
}

function droneDecor(scene) {
  const b = new Batch(), grp = new THREE.Group();
  b.add(P.B(1.1, 0.3, 0.7), M.axiom, [0, 0, 0], [0, 0, 0], 0xeef3f8);
  b.add(P.B(0.5, 0.2, 2.6), M.axiom, [-0.1, 0.05, 0], [0, 0, 0], 0xc9d4e0);
  b.add(P.B(0.25, 0.2, 0.3), M.glow, [0.56, -0.02, 0], [0, 0, 0], glowC(CYAN, 3));
  for (const s of [-1, 1]) { b.add(P.C(0.32, 0.32, 0.08, 8), M.flat, [-0.1, 0.18, s * 1.2], [0, 0, 0], 0x2b3644); b.add(P.C(0.1, 0.16, 0.25, 6), M.glow, [-0.6, -0.1, s * 0.5], [0, 0, Math.PI / 2], glowC(CYAN, 2.4)); }
  b.build(grp); scene.add(grp); return grp;
}

export function buildWorld(scene, renderer, quality) {
  const R = rng(2049), b = new Batch(), g = new Batch();
  // estilo Quaternius (?styl=0 volta ao procedural): mesmas posições, modelos instanciados por nature.js
  const STYL = new URLSearchParams(location.search).get('styl') !== '0', NAT = [];
  P.plantSink.fn = STYL ? (x, y, z, s) => NAT.push({ kind: 'plant', x, y, z, s, bare: true }) : null;
  const fx = { vents: [], beams: [], smoke: [], fires: [] }, fxj = { rifts: [] }, pools = [];
  scene.background = new THREE.Color(FOG); scene.fog = new THREE.Fog(FOG, 95, 290);

  buildGround(scene);
  axiomBase(b, g, scene, R, fx);
  ekooBase(b, g, scene, R, fx);

  // ---------- mid-map: the abandoned granary town ----------
  const H = heightAt;
  // Layout: a town block (|x| < 16) and outer blocks (|x| > 27) wall the lane off from the jungle;
  // the gaps at |x| ~ 22 are the jungle trail mouths.
  P.silo(b, R, -7, -13.5, { r: 3.6, h: 13 }); P.silo(b, R, 0.5, -17, { r: 3.3, h: 11.5, tint: 0xcbbfb0 }); P.silo(b, R, -12.5, -19.5, { r: 2.6, h: 9, tint: 0xc4b6a2 });
  P.silo(b, R, 11.5, 18.5, { r: 3, h: 10.5, tint: 0xd0c2b4 }); P.silo(b, R, 5.5, 21.5, { r: 2.4, h: 8 });
  P.beam(b, M.rust, [-7, 12.6, -13.5], [0.5, 11.2, -17], 0.5, 0x8a6a54, 0.7);      // conveyor between silos
  P.greenhouse(b, g, R, 10, -11.5, 0.06, { len: 11 }); P.greenhouse(b, g, R, -9, 13.5, 0.05, { len: 13 });
  P.greenhouse(b, g, R, -31.5, -13, -0.06, { len: 9, ruined: true }); P.greenhouse(b, g, R, 31.5, 13.5, -0.06, { len: 9, ruined: true });
  P.greenhouse(b, g, R, 31.5, -14, 0.08, { len: 9, wid: 5 }); P.greenhouse(b, g, R, -31.5, 14, 0.05, { len: 9, wid: 5, ruined: true });
  P.harvester(b, R, 10, 13.5, 2.6); P.waterTank(b, R, 50, 0, -8.6); P.waterTank(b, R, -50, 0, 8.6);
  const wheels = [P.windmill(b, scene, -60, H(-60, -31), -31, 0.7), P.windmill(b, scene, 60, H(60, 31), 31, -0.5)];
  let prev = null;
  for (let x = -46; x <= 46; x += 18.4) {                                           // utility poles with sagging wires
    const z = -7.6 + Math.sin(x * 0.4) * 0.4, a = P.pole(b, x, z, 0.1 * Math.sin(x));
    if (prev) { P.wire(b, prev[0], a[0], 1.1); P.wire(b, prev[1], a[1], 1.3); } prev = a;
  }
  for (const [x1, z1, x2, z2] of [[-34, 8.4, -27, 8.4], [27, -8.3, 34, -8.4], [-16, -8.4, -13, -8.2], [27, 8.4, 33, 8.4]]) P.fence(b, R, x1, z1, x2, z2);
  for (const f of FARMS) {
    const c = Math.cos(f.r), s = Math.sin(f.r), hw = f.w / 2 + 0.8, hd = f.d / 2 + 0.8;
    const pt = (u, v) => [f.x + u * c - v * s, f.z + u * s + v * c];
    const [a, e] = [pt(-hw, -Math.sign(f.z) * hd), pt(hw, -Math.sign(f.z) * hd)];
    P.fence(b, R, a[0], a[1], e[0], e[1]);
    for (let i = 0; i < 3; i++) { const [hx, hz] = pt((R() - 0.5) * f.w, (R() - 0.5) * f.d); P.hay(b, R, hx, H(hx, hz), hz); }
  }
  const off = (x, z, m) => navDist(x, z) > m;                                        // keep props out of walkable ground
  const inFarmP = (x, z) => FARMS.some((f) => Math.abs(x - f.x) < f.w / 2 + 1 && Math.abs(z - f.z) < f.d / 2 + 1);
  for (let i = 0; i < 34; i++) { const x = (R() - 0.5) * 96, z = (R() < 0.5 ? -1 : 1) * (7.2 + R() * 4); if (off(x, z, 1.2)) (R() < 0.5 ? P.barrel : P.crate)(b, R, x, 0, z); }
  for (const [x, z] of [[-15, 9.8], [15, -9.2], [28, 9.4], [-33, -9.6], [48, 9.6]]) P.scrap(b, R, x, z, 0.9);
  const nat = (kind, fallback) => (b2, R2, x, y, z, s, c) => (STYL ? NAT.push({ kind, x, y, z, s }) : fallback(b2, R2, x, y, z, s, c));
  const bush = nat('bush', P.bush), rock = nat('rock', P.rock), deadTree = nat('dead', P.deadTree), tree = nat('tree', P.tree);
  for (let i = 0; i < 150; i++) {                                                     // open-field scatter
    const x = (R() - 0.5) * 190, z = (R() < 0.5 ? -1 : 1) * (7.5 + R() * 60), t = smooth(-60, 60, x);
    if ((Math.abs(x) > 56 && Math.abs(z) < 24) || !off(x, z, 1.6) || inFarmP(x, z)) continue;
    const k = R();
    if (k < 0.55) bush(b, R, x, H(x, z), z, 0.8 + R() * 0.9, new THREE.Color().setHSL(lerp(0.29, 0.2, t), 0.34, 0.07 + R() * 0.05).getHex());
    else if (k < 0.8) rock(b, R, x, H(x, z), z, 0.8 + R() * 1.4, 0xd8d4cc);
    else deadTree(b, R, x, H(x, z), z, 0.9 + R() * 0.6);
  }
  // ---------- the jungle: overgrowth walls along the trails, Vessari rifts at the camps ----------
  for (let i = 0, n = 0; n < 210 && i < 5000; i++) {
    const x = (R() - 0.5) * 100, z = (R() < 0.5 ? -1 : 1) * (19 + R() * 44), d = navDist(x, z);
    if (d < 2.2 || d > 15 || inFarmP(x, z) || (Math.abs(z) < 25 && Math.abs(x) < 17) || (Math.abs(x) > 27 && Math.abs(z) < 19)) continue;
    if (navDist(x + 1.3, z - 1.9) < 1 || navDist(x + 2.8, z - 4.1) < 1 || navDist(x + 4, z - 5.8) < 0.5) continue;   // never between the camera and walkable ground
    tree(b, R, x, H(x, z), z, 0.9 + R() * 0.7); n++;
    if (R() < 0.7) bush(b, R, x + (R() - 0.5) * 4, H(x, z), z + (R() - 0.5) * 4, 0.9 + R(), 0x1c3018);
    if (R() < 0.3) rock(b, R, x + 2, H(x + 2, z), z + 1, 1 + R() * 1.6, 0xb8b4b0);
  }
  for (const c of CAMPS) {
    if (!c.rift) { for (let i = 0; i < 7; i++) { const a = R() * 6.28, d = c.r + 0.6 + R() * 2; P.rock(b, R, c.x + Math.cos(a) * d, 0, c.z + Math.sin(a) * d, 0.9 + R() * 1.2, 0x8a8494); } continue; }
    const fx0 = c.x, fz0 = c.z + c.side * 5.2;                                         // rift sits at the back of the clearing
    for (let i = 0; i < 9; i++) {                                                     // jagged dark shards cradling the rift
      const a = (i / 8 - 0.5) * 2.6, r = 2.6 + (i % 2) * 0.7, hgt = 2.2 + Math.cos(a) * 2.4 + (i % 3) * 0.5;
      b.add(P.C(0.05, 0.75, hgt, 5), M.rock, [fx0 + Math.sin(a) * r, hgt / 2 - 0.1, fz0 + c.side * (1 - Math.cos(a)) * 1.2], [c.side * 0.12, i, Math.sin(a) * -0.3], 0x5a5068);
    }
    for (let i = 0; i < 12; i++) { const a = R() * 6.28, d = c.r + R() * 2.5; P.rock(b, R, c.x + Math.cos(a) * d, 0, c.z + Math.sin(a) * d, 1 + R() * 1.4, 0x8a8494); }
    fxj.rifts.push([fx0, 2.4, fz0, c.side]);
  }
  // ---------- the ORACLE core: a shard of the original world-AI, half buried beside mid lane (lore landmark) ----------
  {
    const ox = 0, oz = 10.8;
    b.add(P.C(3.6, 4.2, 0.5, 9), M.rock, [ox, 0.2, oz], [0, 0.3, 0], 0x6a6672);
    for (let i = 0; i < 7; i++) { const a = i * 0.9 + 0.2, r = 1.2 + (i % 3) * 0.9, hgt = 3.2 + (i * 1.7) % 4.2; b.add(P.C(0.08, 0.55 + (i % 2) * 0.25, hgt, 5), M.flat, [ox + Math.cos(a) * r, hgt / 2, oz + Math.sin(a) * r], [Math.sin(a) * 0.18, i, -Math.cos(a) * 0.18], 0x15161c); }
    b.add(P.C(0.05, 0.9, 6.5, 6), M.flat, [ox, 3.3, oz], [0.06, 0, 0.05], 0x0e0f14);
    for (const [c, y, r] of [[CYAN, 2.2, 1.5], [AMBER, 3.4, 1.15], [0xa55cff, 4.6, 0.8]]) b.add(new THREE.TorusGeometry(r, 0.05, 5, 28), M.glow, [ox, y, oz], [Math.PI / 2 + 0.25, 0, 0.3], glowC(c, 2.6));
    pools.push([ox, oz, 6, 0x8a6cff, 0.5]);
  }
  // tower pads
  b.add(P.C(3.3, 3.7, 0.3, 8), M.axiom, [-TOWER_X, 0.15, 0], [0, 0.39, 0], 0xdfe6ee);
  b.add(P.C(3.4, 3.4, 0.08, 8, true), M.glow, [-TOWER_X, 0.26, 0], [0, 0.39, 0], glowC(CYAN, 2));
  b.add(P.C(3.3, 3.8, 0.3, 9), M.grid, [TOWER_X, 0.15, 0], [0, 0, 0], 0xb0a090);
  b.add(P.C(3.45, 3.45, 0.08, 9, true), M.glow, [TOWER_X, 0.26, 0], [0, 0, 0], glowC(AMBER, 2));

  b.build(scene, 0); g.build(scene, 1);

  // ---------- instanced grass (wind-swayed tufts) + crops ----------
  const dummy = new THREE.Object3D(), col = new THREE.Color(), hi = quality === 'high';
  const bp = [], bc = [], bn = [];
  for (let i = 0; i < 5; i++) {               // tuft of 5 blades, normals up so it shades like the ground beneath
    const a = i * 1.257 + 0.3, r = i ? 0.17 : 0, cx = Math.cos(a) * r, cz = Math.sin(a) * r, h = 0.3 + (i % 3) * 0.11;
    const lx = Math.cos(a + 1.6) * 0.065, lz = Math.sin(a + 1.6) * 0.065;
    bp.push(cx - lx, 0, cz - lz, cx + lx, 0, cz + lz, cx + Math.cos(a) * 0.13, h, cz + Math.sin(a) * 0.13);
    bc.push(0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 1, 1, 1); bn.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
  }
  const blade = new THREE.BufferGeometry();
  blade.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3)); blade.setAttribute('color', new THREE.Float32BufferAttribute(bc, 3)); blade.setAttribute('normal', new THREE.Float32BufferAttribute(bn, 3));
  const wind = { value: 0 };
  const grassMat = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.92, metalness: 0 });
  grassMat.onBeforeCompile = (s) => {
    s.uniforms.uTime = wind;
    s.vertexShader = 'uniform float uTime;\n' + s.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 wp = (instanceMatrix * vec4(position, 1.)).xyz; float sway = position.y * position.y;
        transformed.x += sin(uTime * 1.6 + wp.x * .35 + wp.z * .25) * .4 * sway; transformed.z += cos(uTime * 1.2 + wp.x * .2 - wp.z * .3) * .3 * sway;
      #endif`);
  };
  const NG = new URLSearchParams(location.search).get('grass') === '0' ? 10 : STYL ? 0 : hi ? 60000 : 20000, grass = new THREE.InstancedMesh(blade, grassMat, NG);
  const inFarm = (x, z) => FARMS.some((f) => { const c = Math.cos(f.r), s = Math.sin(f.r), u = (x - f.x) * c + (z - f.z) * s, v = -(x - f.x) * s + (z - f.z) * c; return Math.abs(u) < f.w / 2 && Math.abs(v) < f.d / 2; });
  let ng = 0;
  for (let k = 0; ng < NG && k < NG * 6; k++) {
    const x = (R() - 0.5) * 204, z = (R() - 0.5) * 150, t = smooth(-60, 60, x);
    if (Math.abs(z) < 6.6 + R() * 1.2 || (x < -54 && Math.abs(z) < 23.5)) continue;
    if (navDist(x, z) < 0.6 && R() < 0.9) continue;                                                     // trails / camps are worn bare
    if (((x - BASE_X - 6) / 34) ** 2 + (z / 25) ** 2 < 1 && R() < 0.93) continue;                       // EKOO yard is bare
    if (noise(x * 0.07, z * 0.07) + smooth(-20, 80, x) * 0.22 > 0.6 && R() < 0.8) continue;           // dry patches
    if (inFarm(x, z)) continue;
    dummy.position.set(x, H(x, z), z); dummy.rotation.set(0, R() * 6.28, 0); dummy.scale.set(0.9 + R() * 0.8, 0.7 + R() * 1.2, 0.9 + R() * 0.8); dummy.updateMatrix();
    grass.setMatrixAt(ng, dummy.matrix); grass.setColorAt(ng++, col.setHSL(lerp(0.27, 0.19, t) + (R() - 0.5) * 0.04, lerp(0.3, 0.36, t) + R() * 0.08, 0.1 + R() * 0.07));
  }
  grass.count = ng; grass.layers.set(1); grass.receiveShadow = true; scene.add(grass);

  const stalkB = new Batch();
  stalkB.add(new THREE.BoxGeometry(0.06, 1.5, 0.06), M.flat, [0, 0.75, 0]);
  for (const a of [0, 2.1, 4.2]) stalkB.add(new THREE.PlaneGeometry(0.16, 0.8), M.flat, [Math.cos(a) * 0.22, 0.9, Math.sin(a) * 0.22], [0, -a, 0.9]);
  const stalkGeo = stalkB.build(new THREE.Group()).children[0].geometry;
  const nCorn = hi ? 1400 : 700, corn = new THREE.InstancedMesh(stalkGeo, M.flatDS, nCorn);
  for (let i = 0; i < nCorn; i++) {
    const f = FARMS[i % FARMS.length], c = Math.cos(f.r), s = Math.sin(f.r);
    const u = (R() - 0.5) * f.w, v = (Math.floor(R() * (f.d / 1.25)) + 0.5) * 1.25 - f.d / 2, x = f.x + u * c - v * s, z = f.z + u * s + v * c;
    dummy.position.set(x, H(x, z), z); dummy.rotation.set((R() - 0.5) * 0.4, R() * 6.28, (R() - 0.5) * 0.4); dummy.scale.setScalar(0.6 + R() * 0.7); dummy.updateMatrix();
    corn.setMatrixAt(i, dummy.matrix); corn.setColorAt(i, col.setHSL(0.11 + R() * 0.05, 0.3, 0.3 + R() * 0.14));
  }
  corn.layers.set(1); corn.castShadow = true; scene.add(corn);

  // ---------- milharais: tall corn patches heroes can hide in (fade when the local hero is inside) ----------
  const tall = stalkGeo.clone(); tall.scale(1.5, 2.5, 1.5);
  const brushMeshes = [];
  // moitas (estilo novo): arbustos Quaternius densos por zona; cada zona tem seus materiais p/ o fade de esconderijo
  const brush = STYL ? BRUSH.map((z, zi) => {
    const zone = { opacity: 1, mats: [] }, n = Math.round(z.r * z.r * 0.55) + 3;
    for (let i = 0; i < n; i++) {
      const a = R() * 6.283, d = Math.sqrt(R()) * z.r * 0.95, x = z.x + Math.cos(a) * d, zz = z.z + Math.sin(a) * d;
      NAT.push({ kind: 'moita', x, y: H(x, zz), z: zz, s: 1 + R() * 0.45 * (1 - d / z.r), zone: zi, bare: R() < 0.6 });
    }
    return zone;
  }) : BRUSH.map((z) => {
    const n = Math.round(z.r * z.r * 9), mat = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.9, metalness: 0, transparent: true, opacity: 1 }), m = new THREE.InstancedMesh(tall, mat, n);
    for (let i = 0; i < n; i++) {
      const a = R() * 6.283, d = Math.sqrt(R()) * z.r; dummy.position.set(z.x + Math.cos(a) * d, 0, z.z + Math.sin(a) * d); dummy.rotation.set((R() - 0.5) * 0.25, R() * 6.28, (R() - 0.5) * 0.25); dummy.scale.setScalar(0.8 + R() * 0.5); dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix); m.setColorAt(i, col.setHSL(0.16 + R() * 0.08, 0.5, 0.22 + R() * 0.14));
    }
    m.layers.set(1); m.castShadow = true; scene.add(m); brushMeshes.push(m); return mat;
  });


  // ---------- lighting: HDRI image-based ambient + one warm sun ----------
  new HDRLoader().load(`${import.meta.env.BASE_URL}env/sky_1k.hdr`, (tex) => {
    const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromEquirectangular(tex).texture; tex.dispose(); pm.dispose();
  });
  scene.environmentIntensity = 0.45;
  const sun = new THREE.DirectionalLight(0xffdfba, 3.9); sun.castShadow = true;
  const SM = hi ? 2048 : 1024; sun.shadow.mapSize.set(SM, SM); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.07; sun.shadow.radius = 2.2;
  scene.add(sun, sun.target);
  const sRight = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), SUN_DIR).normalize(), sUp = new THREE.Vector3().crossVectors(SUN_DIR, sRight).normalize();
  let sHalf = 0; const snapped = new THREE.Vector3();
  const pl = (c, i, d, x, y, z) => { const l = new THREE.PointLight(c, i, d, 1.5); l.position.set(x, y, z); scene.add(l); return l; };
  const axL = pl(0x6fe0ff, 46, 44, -BASE_X + 10, 7, 0), ekL = pl(0xffb468, 42, 44, BASE_X - 6, 10, 0);
  const fires = fx.fires.slice(0, 1).map(([x, y, z]) => pl(0xff8a3c, 14, 13, x, y + 0.6, z));
  // light pools: cheap painted light on the ground under lamps, fires, rifts and objectives
  for (const s of [-1, 1]) { pools.push([-54.5, s * 7.6, 4, 0x35dcff, 0.5], [-46, s * 7.4, 3.4, 0x35dcff, 0.45], [-70, s * 8, 4, 0x35dcff, 0.45], [54, s * 7.4, 4.5, 0xff8a2e, 0.6], [60, s * 8.2, 3.6, 0xffb060, 0.4], [47, s * 7.9, 3.6, 0xffb060, 0.4]); }
  pools.push([-TOWER_X, 0, 7, 0x35dcff, 0.4], [TOWER_X, 0, 7, 0xff9a3c, 0.4], [-CORE_X, 0, 9, 0x35dcff, 0.5], [CORE_X, 0, 9, 0xff9a3c, 0.5]);
  for (const c of CAMPS) pools.push([c.x, c.z + (c.rift ? c.side * 4 : 0), c.rift ? 11 : 6, 0x8a4cff, c.rift ? 0.55 : 0.3]);
  const poolGeo = new THREE.PlaneGeometry(1, 1); poolGeo.rotateX(-Math.PI / 2);
  const poolMesh = new THREE.InstancedMesh(poolGeo, new THREE.MeshBasicMaterial({ map: T.soft, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), pools.length);
  pools.forEach(([x, z, r, c, k], i) => { dummy.position.set(x, 0.07, z); dummy.rotation.set(0, 0, 0); dummy.scale.set(r * 2, 1, r * 2); dummy.updateMatrix(); poolMesh.setMatrixAt(i, dummy.matrix); poolMesh.setColorAt(i, col.set(c).multiplyScalar(k)); });
  poolMesh.layers.set(1); scene.add(poolMesh);
  fxj.rifts.forEach(([x, y, z]) => pl(0x9a5cff, 34, 20, x, 3, z));

  // ---------- atmosphere ----------
  const soft = (color, opacity, blending = THREE.NormalBlending) => new THREE.SpriteMaterial({ map: T.soft, color, opacity, transparent: true, depthWrite: false, blending, fog: true });
  const mist = [];
  for (let i = 0; i < 26; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: T.soft, color: 0xcdf3ff, transparent: true, opacity: 0.06 + Math.random() * 0.09, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; const a = Math.random() * 6.28, d = 8 + Math.random() * 22;
    m.position.set(-BASE_X + 6 + Math.cos(a) * d * 1.2, 0.35 + Math.random() * 1.4, Math.sin(a) * d * 0.8); m.scale.setScalar(9 + Math.random() * 12);
    m.userData = { x: m.position.x, z: m.position.z, p: Math.random() * 6.28 }; m.layers.set(1); scene.add(m); mist.push(m);
  }
  const puffs = [];
  const emitter = (list, n, mat, rise, grow, spread) => list.forEach(([x, y, z]) => {
    for (let i = 0; i < n; i++) { const s = new THREE.Sprite(mat.clone()); s.userData = { x, y, z, p: i / n + Math.random() * 0.1, rise, grow, spread, o: mat.opacity, dx: Math.random() - 0.5 }; s.layers.set(1); scene.add(s); puffs.push(s); }
  });
  emitter(fx.smoke, 9, soft(0x3a3634, 0.42), 9, 4.2, 2.2);
  emitter(fx.vents, 5, soft(0xdff6ff, 0.3), 3.2, 2.6, 0.8);
  emitter(fx.fires, 5, soft(0xffa040, 0.4, THREE.AdditiveBlending), 1.6, 0.9, 0.3);
  const beamMat = new THREE.MeshBasicMaterial({ map: T.beam, color: glowC(CYAN, 1.3), transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  fx.beams.forEach(([x, y, z]) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.2, 14, 8, 1, true), beamMat); m.position.set(x, y + 7, z); m.layers.set(1); scene.add(m); });

  // Vessari rifts: a violet tear in the air (gameplay landmark, so it is allowed to be saturated)
  const rifts = fxj.rifts.map(([x, y, z, side]) => {
    const g2 = new THREE.Group(); g2.position.set(x, y + 0.4, z);
    const mk2 = (w, h, c, o) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: T.rift, color: c, transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); m.layers.set(1); g2.add(m); return m; };
    const core = mk2(3.2, 6.2, new THREE.Color(0xb070ff).multiplyScalar(2.4), 1), halo = mk2(6.5, 8.5, new THREE.Color(0x6a2cff).multiplyScalar(1.2), 0.55);
    const rocks = [0, 1, 2, 3, 4].map((i) => { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28 + (i % 3) * 0.12, 0), M.rock); m.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(m.geometry.attributes.position.count * 3).fill(0.45), 3)); m.castShadow = true; g2.add(m); return m; });
    scene.add(g2); return { g2, core, halo, rocks, side };
  });
  const pm = [
    motes(scene, { n: 140, center: [BASE_X - 8, 0, 0], box: [60, 16, 50], vel: [-0.5, 1.5, 0.2], color: new THREE.Color(0xff9a4a).multiplyScalar(1.1), size: 4 }),
    motes(scene, { n: 140, center: [-BASE_X + 10, 0, 0], box: [60, 14, 50], vel: [0.3, -0.6, 0.1], color: new THREE.Color(0xa8e6f4).multiplyScalar(0.9), size: 3.6 }),
    ...CAMPS.filter((c) => c.rift).map((c) => motes(scene, { n: 90, center: [c.x, 0, c.z + c.side * 3], box: [20, 9, 20], vel: [0.1, 1.1, 0.1], color: new THREE.Color(0xa060ff).multiplyScalar(2.2), size: 4.5 })),
    motes(scene, { n: 160, center: [0, 0, 0], box: [110, 9, 44], vel: [0.6, 0.15, 0.2], color: new THREE.Color(0xfff0d8).multiplyScalar(0.45), size: 3 }),
  ];
  const drones = [0, 1, 2].map((i) => { const d = droneDecor(scene); d.userData = { r: 13 + i * 4, h: 13 + i * 2.5, sp: 0.35 - i * 0.07, p: i * 2.1 }; return d; });

  return {
    nat: NAT, brushMeshes, grass, brush,
    update(t, dt, focus, dist, cam, zone = -1) {
      brush.forEach((m, i) => {
        m.opacity += ((i === zone ? 0.35 : 1) - m.opacity) * Math.min(1, dt * 8);
        if (m.mats) for (const mm of m.mats) { mm.opacity = m.opacity; const t = m.opacity < 0.98; if (mm.transparent !== t) { mm.transparent = t; mm.depthWrite = !t; mm.needsUpdate = true; } }
      });
      // shadow frustum fitted to the visible ground footprint, snapped to texels (no shimmer while panning)
      const half = Math.ceil(dist * 0.8 / 4) * 4;
      if (half !== sHalf) { sHalf = half; Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 1, far: 220 }); sun.shadow.camera.updateProjectionMatrix(); }
      const tx = (2 * half) / SM, px = focus.dot(sRight), py = focus.dot(sUp);
      snapped.copy(focus).addScaledVector(sRight, Math.round(px / tx) * tx - px).addScaledVector(sUp, Math.round(py / tx) * tx - py);
      sun.target.position.copy(snapped); sun.position.copy(snapped).addScaledVector(SUN_DIR, 100); wind.value = t;
      wheels.forEach((w, i) => { w.rotation.z += dt * (1.1 - i * 0.4); });
      for (const r of rifts) {
        r.core.scale.set(1 + Math.sin(t * 3.1) * 0.08, 1 + Math.sin(t * 2.3) * 0.05, 1); r.halo.material.opacity = 0.45 + Math.sin(t * 1.7) * 0.12;
        if (cam) { r.core.quaternion.copy(cam.quaternion); r.halo.quaternion.copy(cam.quaternion); }
        r.rocks.forEach((m, i) => { const a = t * (0.5 + i * 0.13) + i * 1.3; m.position.set(Math.cos(a) * (2.3 + i * 0.35), Math.sin(t * 1.3 + i) * 0.7 + (i - 2) * 0.8, Math.sin(a) * 1.2); m.rotation.set(a, a * 1.3, 0); });
      }
      pm.forEach((m) => { m.uniforms.uTime.value = t; });
      for (const m of mist) { m.position.x = m.userData.x + Math.sin(t * 0.12 + m.userData.p) * 4; m.position.z = m.userData.z + Math.cos(t * 0.1 + m.userData.p) * 3; }
      for (const s of puffs) {
        const u = s.userData, k = (t * 0.22 + u.p) % 1;
        s.position.set(u.x + u.dx * u.spread * k + k * k * 1.5, u.y + k * u.rise, u.z + u.dx * u.spread * 0.5 * k);
        s.scale.setScalar(0.6 + k * u.grow); s.material.opacity = u.o * Math.sin(k * Math.PI) * (1 - k * 0.5);
      }
      for (const d of drones) { const u = d.userData, a = t * u.sp + u.p; d.position.set(-BASE_X + Math.cos(a) * u.r, u.h + Math.sin(t * 1.3 + u.p) * 0.5, Math.sin(a) * u.r); d.rotation.y = -a - Math.PI / 2; }
      const fl = 0.85 + Math.sin(t * 13) * 0.08 + Math.sin(t * 7.3) * 0.07;
      fires.forEach((l, i) => { l.intensity = 14 * (fl + Math.sin(t * 17 + i * 2) * 0.1); });
      ekL.intensity = 42 * (0.93 + Math.sin(t * 2.2) * 0.05 + Math.sin(t * 31) * 0.02); axL.intensity = 46 * (0.96 + Math.sin(t * 1.1) * 0.04);
    },
  };
}
