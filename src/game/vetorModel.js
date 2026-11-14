// VETOR — loads the rigged Mixamo mesh (assets/vetor/*.fbx), paints it in code (the source mesh has no UVs / textures),
// attaches the twin energy blades (assets/vetor/vetor.glb is the knife) and prepares the animation clips.
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const URLS = {
  taunt: new URL('../../assets/vetor/Taunt.fbx', import.meta.url).href,
  run: new URL('../../assets/vetor/Standard Run.fbx', import.meta.url).href,
  arc: new URL('../../assets/vetor/Running Arc.fbx', import.meta.url).href,
  stab: new URL('../../assets/vetor/Stabbing.fbx', import.meta.url).href,
  swipe: new URL('../../assets/vetor/Mutant Swiping.fbx', import.meta.url).href,
  death: new URL('../../assets/vetor/Sword And Shield Death.fbx', import.meta.url).href,
  knife: new URL('../../assets/vetor/vetor.glb', import.meta.url).href,
};
export const HERO_SCALE = 1.6;            // source mesh is ~2 units tall
const CYAN = new THREE.Color(0x28e0ff);
// Characters get the saturated range: crisp white armour, deep navy suit, HDR cyan accents + rim light.
const WHITE = new THREE.Color(0xf2f6fb), NAVY = new THREE.Color(0x15263d), PLATE = new THREE.Color(0x9fb2c8), DARK = new THREE.Color(0x0b1220);

function heroMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.3, envMapIntensity: 1.5 });
  m.userData.u = { uGlow: { value: 2.6 }, uRim: { value: 0.55 }, uGlowCol: { value: CYAN.clone() }, uFlash: { value: 0 } };
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, m.userData.u);
    s.vertexShader = 'attribute float aGlow; varying float vGlow;\n' + s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vGlow = aGlow;');
    s.fragmentShader = 'uniform float uGlow, uRim, uFlash; uniform vec3 uGlowCol; varying float vGlow;\n' + s.fragmentShader.replace('#include <emissivemap_fragment>', /* glsl */`
      float fr = pow(1. - saturate(dot(normal, normalize(vViewPosition))), 2.6);
      totalEmissiveRadiance += uGlowCol * (vGlow * uGlow + fr * uRim) + vec3(1.) * uFlash;`);
  };
  return m;
}

// weld by position -> smooth normals (the FBX ships none) + per-vertex concavity (panel lines / glowing seams)
function weldInfo(geo) {
  const p = geo.attributes.position, N = p.count, id = new Int32Array(N), map = new Map(); let M = 0;
  for (let i = 0; i < N; i++) {
    const k = `${Math.round(p.getX(i) * 2000)},${Math.round(p.getY(i) * 2000)},${Math.round(p.getZ(i) * 2000)}`;
    let j = map.get(k); if (j === undefined) { j = M++; map.set(k, j); } id[i] = j;
  }
  const nrm = new Float32Array(M * 3), sum = new Float32Array(M * 3), cnt = new Uint16Array(M);
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  for (let t = 0; t < N; t += 3) {
    A.fromBufferAttribute(p, t); B.fromBufferAttribute(p, t + 1); C.fromBufferAttribute(p, t + 2);
    B.sub(A); C.sub(A); B.cross(C);                                   // area-weighted face normal
    for (let a = 0; a < 3; a++) {
      const j = id[t + a]; nrm[j * 3] += B.x; nrm[j * 3 + 1] += B.y; nrm[j * 3 + 2] += B.z;
      for (const o of [t + (a + 1) % 3, t + (a + 2) % 3]) { sum[j * 3] += p.getX(o); sum[j * 3 + 1] += p.getY(o); sum[j * 3 + 2] += p.getZ(o); cnt[j]++; }
    }
  }
  const normal = new Float32Array(N * 3), cav = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const j = id[i], l = Math.hypot(nrm[j * 3], nrm[j * 3 + 1], nrm[j * 3 + 2]) || 1, nx = nrm[j * 3] / l, ny = nrm[j * 3 + 1] / l, nz = nrm[j * 3 + 2] / l, c = cnt[j] || 1;
    normal[i * 3] = nx; normal[i * 3 + 1] = ny; normal[i * 3 + 2] = nz;
    cav[i] = (sum[j * 3] / c - p.getX(i)) * nx + (sum[j * 3 + 1] / c - p.getY(i)) * ny + (sum[j * 3 + 2] / c - p.getZ(i)) * nz;   // > 0 concave
  }
  geo.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  return cav;
}

function paint(mesh) {
  const g = mesh.geometry, cav = weldInfo(g), p = g.attributes.position, n = g.attributes.normal, si = g.attributes.skinIndex, sw = g.attributes.skinWeight, N = p.count;
  const names = mesh.skeleton.bones.map((b) => b.name.replace('mixamorig', ''));
  const col = new Float32Array(N * 3), glow = new Float32Array(N), c = new THREE.Color();
  for (let i = 0; i < N; i++) {
    let bi = 0, bw = -1; for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w > bw) { bw = w; bi = si.getComponent(i, k); } }
    const b = names[bi], x = p.getX(i), y = p.getY(i), ax = Math.abs(x), nx = n.getX(i) * Math.sign(x || 1), ny = n.getY(i), nz = n.getZ(i);
    let gl = 0, armour = false; c.copy(NAVY);
    if (b === 'Head' || b === 'Neck') {
      c.copy(DARK).lerp(NAVY, 0.6);                                                       // hood
      if (nz > 0.25 && y > 0.66 && y < 0.88 && ax < 0.14) { c.copy(PLATE); if (y > 0.755 && y < 0.82 && ax < 0.115 && nz > 0.45) { c.copy(CYAN); gl = 1; } }   // mask + visor
    } else if (b === 'Spine2' || b === 'Spine1' || b.endsWith('Shoulder')) {
      armour = true; c.copy(WHITE); if (ax < 0.04 && y > 0.41 && y < 0.5 && nz > 0.5) { c.copy(CYAN); gl = 1; }                                               // chest core
      if (nz < -0.3 && ax < 0.16 && y < 0.6) c.copy(PLATE);                                // back unit
    } else if (b === 'Spine') { if (y > 0.2 && nz > 0.3 && ax > 0.09) { armour = true; c.copy(PLATE); } }
    else if (b === 'Hips') { if (y > 0.085 && y < 0.17) { armour = true; c.copy(WHITE); if (ax < 0.05 && nz > 0.5) { c.copy(CYAN); gl = 0.8; } } }
    else if (b.endsWith('ForeArm')) { if (ax < 0.59) { armour = true; c.copy(WHITE); } else c.copy(DARK); }
    else if (b.endsWith('Arm')) { if (ax < 0.33 || ny > 0.55) { armour = true; c.copy(WHITE); } }
    else if (b.endsWith('Hand')) c.copy(DARK);
    else if (b.endsWith('UpLeg')) { if ((nz > 0.15 || nx > 0.35) && y < -0.06) { armour = true; c.copy(WHITE); } }
    else if (b.endsWith('Leg')) { if (nz > -0.45) { armour = true; c.copy(WHITE); } }
    else { armour = true; c.copy(ny < -0.6 ? DARK : PLATE); }                              // boots
    // panel lines: creases darken; on armour the deepest creases carry the cyan circuit glow
    const cv = cav[i];
    if (armour && gl === 0) { if (cv > 0.0042) { c.copy(CYAN); gl = 0.75; } else if (cv > 0.0016) c.lerp(DARK, THREE.MathUtils.clamp((cv - 0.0016) * 500, 0, 0.85)); }
    else if (gl === 0 && cv > 0.002) c.lerp(DARK, 0.5);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; glow[i] = gl;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('aGlow', new THREE.BufferAttribute(glow, 1));
}

function makeBlade(knife, mat) {
  // knife mesh: X is the long axis, handle on -X, tip on +X. Grip dark, blade = cyan energy.
  const g = knife.geometry.index ? knife.geometry.toNonIndexed() : knife.geometry.clone(); weldInfo(g);
  g.computeBoundingBox(); const bb = g.boundingBox, len = bb.max.x - bb.min.x, p = g.attributes.position, N = p.count;
  const col = new Float32Array(N * 3), glow = new Float32Array(N), c = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const t = (p.getX(i) - bb.min.x) / len;
    if (t < 0.36) { c.copy(DARK).lerp(PLATE, 0.25); glow[i] = t > 0.3 ? 0.6 : 0; } else { c.copy(CYAN).lerp(WHITE, 0.25); glow[i] = 1.6; }
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('aGlow', new THREE.BufferAttribute(glow, 1));
  g.translate(-bb.min.x - len * 0.2, -(bb.min.y + bb.max.y) / 2, -(bb.min.z + bb.max.z) / 2);   // origin at the grip
  const m = new THREE.Mesh(g, mat); m.scale.setScalar(0.62 / len); m.castShadow = true;
  m.userData.tip = new THREE.Vector3(len * 0.8, 0, 0); m.userData.base = new THREE.Vector3(len * 0.18, 0, 0);
  return m;
}

// keep clips in place (root motion is driven by gameplay); optionally keep only a time window
function clip(src, name, { t0 = 0, t1 = src.duration, lockXZ = true } = {}) {
  let c = src.clone(); c.name = name;
  if (t0 > 0 || t1 < src.duration) c = THREE.AnimationUtils.subclip(c, name, Math.round(t0 * 30), Math.round(t1 * 30), 30);
  if (lockXZ) for (const tr of c.tracks) if (tr.name.endsWith('Hips.position')) { const v = tr.values, x0 = v[0], z0 = v[2]; for (let i = 0; i < v.length; i += 3) { v[i] = x0 * 0; v[i + 2] = z0 * 0; } }
  return c;
}

export async function loadVetor() {
  const fb = new FBXLoader(), [base, run, arc, stab, swipe, death, knife] = await Promise.all([
    fb.loadAsync(URLS.taunt), fb.loadAsync(URLS.run), fb.loadAsync(URLS.arc), fb.loadAsync(URLS.stab), fb.loadAsync(URLS.swipe), fb.loadAsync(URLS.death), new GLTFLoader().loadAsync(URLS.knife),
  ]);
  const mat = heroMaterial(); let mesh;
  base.traverse((o) => { if (o.isSkinnedMesh) mesh = o; });
  paint(mesh); mesh.material = mat; mesh.castShadow = true; mesh.receiveShadow = false; mesh.frustumCulled = false;
  const bone = (n) => mesh.skeleton.bones.find((b) => b.name === 'mixamorig' + n);
  let km; knife.scene.traverse((o) => { if (o.isMesh) km = o; });
  const blades = ['RightHand', 'LeftHand'].map((h, i) => {
    const b = makeBlade(km, mat), s = i ? -1 : 1; bone(h).add(b);
    b.position.set(0, 0.09, 0.025); b.rotation.set(0, s * Math.PI / 2, Math.PI / 2 * 0); b.userData.side = s; return b;
  });
  const root = new THREE.Group(); base.scale.setScalar(HERO_SCALE); root.add(base);
  const clips = {
    idle: clip(base.animations[0], 'idle', { t0: 0, t1: 0.5 }),
    taunt: clip(base.animations[0], 'taunt'),
    run: clip(run.animations[0], 'run'),
    dash: clip(arc.animations[0], 'dash'),
    stab: clip(stab.animations[0], 'stab'),
    swipe: clip(swipe.animations[0], 'swipe'),
    death: clip(death.animations[0], 'death', { lockXZ: false }),
  };
  const mixer = new THREE.AnimationMixer(base), actions = {};
  for (const k in clips) actions[k] = mixer.clipAction(clips[k]);
  return { root, model: base, mesh, mat, mixer, actions, clips, blades, bone };
}
