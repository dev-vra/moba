// Assembles the Cidade-Celeiro: terrain, props, bases, lights, atmosphere
import * as THREE from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { M, Batch, glowC, CYAN, AMBER } from '../core/mats.js';
import { T } from '../core/tex.js';
import { rng, heightAt, smooth, lerp, noise, BASE_X, TOWER_X } from '../core/util.js';
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
  const fx = { vents: [], beams: [], smoke: [], fires: [] };
  scene.background = new THREE.Color(FOG); scene.fog = new THREE.Fog(FOG, 95, 290);

  buildGround(scene);
  axiomBase(b, g, scene, R, fx);
  ekooBase(b, g, scene, R, fx);

  // ---------- mid-map: the abandoned granary town ----------
  const H = heightAt;
  // big silo cluster north of the lane (signature landmark), smaller ones around
  P.silo(b, R, -7, -13.5, { r: 3.6, h: 13 }); P.silo(b, R, 0.5, -16.5, { r: 3.3, h: 11.5, tint: 0xcbbfb0 }); P.silo(b, R, -13, -19, { r: 2.6, h: 9, tint: 0xc4b6a2 });
  P.silo(b, R, 15, 17.5, { r: 3, h: 10.5, tint: 0xd0c2b4 }); P.silo(b, R, 20.5, 21, { r: 2.4, h: 8 });
  // conveyor between silos
  P.beam(b, M.rust, [-7, 12.6, -13.5], [0.5, 11.2, -16.5], 0.5, 0x8a6a54, 0.7);
  // greenhouses
  P.greenhouse(b, g, R, 19, -13, 0.1, { len: 15 }); P.greenhouse(b, g, R, -25, -12.5, -0.12, { len: 13, ruined: true });
  P.greenhouse(b, g, R, -11, 13.5, 0.08, { len: 15 }); P.greenhouse(b, g, R, 30, 13.5, -0.1, { len: 12, ruined: true });
  P.greenhouse(b, g, R, 38, -19, 0.6, { len: 11, wid: 5 }); P.greenhouse(b, g, R, -34, 14.5, 0.5, { len: 10, wid: 5, ruined: true });
  // wreck, tank, wind-pump
  P.harvester(b, R, 5, 12.5, 2.6); P.waterTank(b, R, 37, 0, -11.5 + 0); P.waterTank(b, R, -44, H(-44, 17), 17);
  const wheels = [P.windmill(b, scene, -31, H(-31, -21), -21, 0.7), P.windmill(b, scene, 48, H(48, 22), 22, -0.5)];
  // utility poles with sagging wires along the north side
  let prev = null;
  for (let x = -46; x <= 46; x += 18.4) {
    const z = -9.2 + Math.sin(x * 0.4) * 0.8, a = P.pole(b, x, z, 0.1 * Math.sin(x));
    if (prev) { P.wire(b, prev[0], a[0], 1.1); P.wire(b, prev[1], a[1], 1.3); } prev = a;
  }
  // fences bordering the lane and fields
  for (const [x1, z1, x2, z2] of [[-30, 8, -18, 8.4], [-2, 8.2, 12, 8], [22, -7.8, 32, -8.2], [-20, -8, -12, -7.8], [10, -8.4, 14, -8], [18, 8.6, 26, 8.2]]) P.fence(b, R, x1, z1, x2, z2);
  for (const f of FARMS) {
    const c = Math.cos(f.r), s = Math.sin(f.r), hw = f.w / 2 + 0.8, hd = f.d / 2 + 0.8;
    const pt = (u, v) => [f.x + u * c - v * s, f.z + u * s + v * c];
    const [a, e] = [pt(-hw, -Math.sign(f.z) * hd), pt(hw, -Math.sign(f.z) * hd)];
    P.fence(b, R, a[0], a[1], e[0], e[1]);
    for (let i = 0; i < 3; i++) { const [hx, hz] = pt((R() - 0.5) * f.w, (R() - 0.5) * f.d); P.hay(b, R, hx, H(hx, hz), hz); }
  }
  // scatter: clutter near the lane, nature further out
  const free = (x, z) => Math.abs(z) > 6.8 && Math.abs(x) < 50;
  for (let i = 0; i < 26; i++) { const x = (R() - 0.5) * 96, z = (R() < 0.5 ? -1 : 1) * (7 + R() * 5); if (free(x, z)) (R() < 0.5 ? P.barrel : P.crate)(b, R, x, 0, z); }
  for (const [x, z] of [[-17, 9.5], [9, -9.5], [27, 9], [-36, -9], [41, 8.6]]) P.scrap(b, R, x, z, 0.9);
  for (let i = 0; i < 110; i++) {
    const x = (R() - 0.5) * 190, z = (R() < 0.5 ? -1 : 1) * (7.5 + R() * 34), t = smooth(-60, 60, x);
    if (Math.abs(x) > 56 && Math.abs(z) < 24) continue;
    const k = R();
    if (k < 0.55) P.bush(b, R, x, H(x, z), z, 0.8 + R() * 0.9, new THREE.Color().setHSL(lerp(0.29, 0.2, t), 0.34, 0.07 + R() * 0.05).getHex());
    else if (k < 0.8) P.rock(b, R, x, H(x, z), z, 0.8 + R() * 1.4, 0xd8d4cc);
    else P.deadTree(b, R, x, H(x, z), z, 0.9 + R() * 0.6);
  }
  // tower pads (towers themselves arrive in milestone 3)
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
  const NG = new URLSearchParams(location.search).get('grass') === '0' ? 10 : hi ? 42000 : 14000, grass = new THREE.InstancedMesh(blade, grassMat, NG);
  const inFarm = (x, z) => FARMS.some((f) => { const c = Math.cos(f.r), s = Math.sin(f.r), u = (x - f.x) * c + (z - f.z) * s, v = -(x - f.x) * s + (z - f.z) * c; return Math.abs(u) < f.w / 2 && Math.abs(v) < f.d / 2; });
  let ng = 0;
  for (let k = 0; ng < NG && k < NG * 6; k++) {
    const x = (R() - 0.5) * 204, z = (R() - 0.5) * 88, t = smooth(-60, 60, x);
    if (Math.abs(z) < 6.6 + R() * 1.2 || (x < -54 && Math.abs(z) < 23.5)) continue;
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
  const fires = fx.fires.slice(0, 2).map(([x, y, z]) => pl(0xff8a3c, 14, 13, x, y + 0.6, z));
  pl(0x6fe0ff, 9, 13, -TOWER_X, 2.5, 0); pl(0xffa04c, 9, 13, TOWER_X, 2.5, 0);

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

  const pm = [
    motes(scene, { n: 140, center: [BASE_X - 8, 0, 0], box: [60, 16, 50], vel: [-0.5, 1.5, 0.2], color: new THREE.Color(0xff9a4a).multiplyScalar(1.1), size: 4 }),
    motes(scene, { n: 140, center: [-BASE_X + 10, 0, 0], box: [60, 14, 50], vel: [0.3, -0.6, 0.1], color: new THREE.Color(0xa8e6f4).multiplyScalar(0.9), size: 3.6 }),
    motes(scene, { n: 160, center: [0, 0, 0], box: [110, 9, 44], vel: [0.6, 0.15, 0.2], color: new THREE.Color(0xfff0d8).multiplyScalar(0.45), size: 3 }),
  ];
  const drones = [0, 1, 2].map((i) => { const d = droneDecor(scene); d.userData = { r: 13 + i * 4, h: 13 + i * 2.5, sp: 0.35 - i * 0.07, p: i * 2.1 }; return d; });

  return {
    update(t, dt, focus, dist) {
      // shadow frustum fitted to the visible ground footprint, snapped to texels (no shimmer while panning)
      const half = Math.ceil(dist * 0.8 / 4) * 4;
      if (half !== sHalf) { sHalf = half; Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 1, far: 220 }); sun.shadow.camera.updateProjectionMatrix(); }
      const tx = (2 * half) / SM, px = focus.dot(sRight), py = focus.dot(sUp);
      snapped.copy(focus).addScaledVector(sRight, Math.round(px / tx) * tx - px).addScaledVector(sUp, Math.round(py / tx) * tx - py);
      sun.target.position.copy(snapped); sun.position.copy(snapped).addScaledVector(SUN_DIR, 100); wind.value = t;
      wheels.forEach((w, i) => { w.rotation.z += dt * (1.1 - i * 0.4); });
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
