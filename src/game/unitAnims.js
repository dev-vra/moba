// Unidades com modelos animados (Quaternius CC0: Animated Mech Pack, Ultimate Space Kit, Sci-Fi Essentials, Modular Sci-Fi MegaKit).
// Cada tipo: modelo, altura alvo, clips por estado, tinta (facção / Vessari). O resto da lógica de Unit continua igual.
import * as THREE from 'three';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';

const U = '/packs/units/';
// clips: idle / move / attack / hit / death  (nome do clip no glTF; ausente = sem clip, usa o mais próximo)
export const ANIM = {
  // ---- AXIOM ----
  hoste: { url: U + 'Stan.glb', h: 2.9, clips: { idle: 'Idle', move: 'Run', attack: 'Punch', hit: 'HitRecieve_1', death: 'Death' }, tint: 'axiom', atkAt: 0.45 },
  cerco: { url: U + 'George.glb', h: 3.6, clips: { idle: 'Idle', move: 'Run', attack: 'Shoot', hit: 'HitRecieve_2', death: 'Death' }, tint: 'axiom', atkAt: 0.4 },
  drone: { url: U + 'Enemy_EyeDrone.glb', h: 1.3, hover: 2.0, clips: { idle: 'Idle', move: 'Idle', attack: 'Attack', hit: 'Hit', death: 'Hit' }, tint: 'axiom', atkAt: 0.5 },
  // ---- selva (Vessari) ----
  cao: { url: U + 'Enemy_QuadShell.glb', h: 1.4, clips: { idle: 'Idle', move: 'Run', attack: 'Attack', hit: 'Hit', death: 'TurnOff' }, tint: 'vessari' },
  eco: { url: U + 'Enemy_Trilobite.glb', h: 1.5, clips: { idle: 'Idle', move: 'Run', attack: 'Attack', hit: 'Hit', death: 'TurnOff' }, tint: 'vessari' },
  faisca: { url: U + 'U_Enemy_Flying.glb', h: 1.6, hover: 1.4, clips: { idle: 'Flying_Idle', move: 'Fast_Flying', attack: 'Headbutt', hit: 'HitReact', death: 'Death' }, tint: 'vessari' },
  colosso: { url: U + 'U_Enemy_Large.glb', h: 3.6, clips: { idle: 'Idle', move: 'Run', attack: 'Punch', hit: 'HitReact', death: 'Death' }, tint: 'vessariRust' },
  tita: { url: U + 'U_Enemy_Large.glb', h: 6.0, clips: { idle: 'Idle', move: 'Walk', attack: 'Weapon', hit: 'HitReact', death: 'Death' }, tint: 'vessariRust' },
  anciao: { url: U + 'Alien_Cyclop.glb', h: 3.4, clips: { idle: 'Alien_Idle' }, tint: 'vessari', lunge: true },
  lorde: { url: U + 'Alien_Oculichrysalis.glb', h: 6.5, clips: { idle: 'Alien_Idle' }, tint: 'vessari', lunge: true },
};

// tinta: cor multiplicada + brilho (veias). Vessari = violeta estranho; AXIOM = branco frio com ciano.
const TINT = {
  axiom: { mul: 0xf2f7ff, emis: 0x2fe4ff, ek: 0.25, sat: 0.35 },
  vessari: { mul: 0xe2d8ff, emis: 0xb070ff, ek: 0.9, sat: 0.9 },
  vessariRust: { mul: 0xf0d6c8, emis: 0xb070ff, ek: 0.6, sat: 0.8 },
  ekoo: { mul: 0xffd2a8, emis: 0xff9a2e, ek: 0.3, sat: 0.8 },
};
function tintMat(m, t) {
  const n = m.clone(); const c = new THREE.Color(t.mul);
  if (n.color) { const hsl = {}; n.color.getHSL(hsl); n.color.setHSL(hsl.h, hsl.s * t.sat, hsl.l).multiply(c); }
  n.emissive = new THREE.Color(t.emis); n.emissiveIntensity = t.ek * (n.emissiveMap ? 1.4 : 0.35); n.roughness = Math.min(1, (n.roughness ?? 0.7) + 0.05);
  return n;
}

const SRC = {};
export async function preloadAnimated(loader) {
  const urls = [...new Set(Object.values(ANIM).map((a) => a.url))];
  const got = await Promise.all(urls.map((u) => loader.loadAsync(u).then((g) => [u, g]).catch((e) => { console.warn('[anim]', u, e.message); return [u, null]; })));
  for (const [u, g] of got) if (g) SRC[u] = g;
}

// instancia o modelo de um tipo → { root, mixer, act(state), update(dt) }  (null se não carregou)
export function makeAnimated(kind, look) {
  const A = ANIM[kind]; const g = A && SRC[A.url]; if (!g) return null;
  const T = TINT[look === 'vessari' || !TINT[look] ? A.tint : (A.tint.startsWith('vessari') ? A.tint : look)];
  const root = new THREE.Group(), body = new THREE.Group(); body.name = 'body'; root.add(body);
  const m = skClone(g.scene); body.add(m);
  const box = new THREE.Box3().setFromObject(g.scene), size = box.getSize(new THREE.Vector3()), k = A.h / (size.y || 1);
  m.scale.setScalar(k); m.position.y = -box.min.y * k + (A.hover || 0);
  const mats = new Map();
  m.traverse((o) => { if (!o.isMesh) return; o.castShadow = true; o.frustumCulled = false; o.material = Array.isArray(o.material) ? o.material.map((x) => (mats.has(x) || mats.set(x, tintMat(x, T)), mats.get(x))) : (mats.has(o.material) || mats.set(o.material, tintMat(o.material, T)), mats.get(o.material)); });
  const mixer = new THREE.AnimationMixer(m), clip = (n) => n && THREE.AnimationClip.findByName(g.animations, n);
  const acts = {}; for (const [st, n] of Object.entries(A.clips)) { const c = clip(n); if (c) acts[st] = mixer.clipAction(c); }
  for (const st of ['move', 'attack', 'hit', 'death']) acts[st] ||= acts.idle;
  for (const st of ['attack', 'hit', 'death']) if (acts[st] && acts[st] !== acts.idle) { acts[st].setLoop(THREE.LoopOnce); acts[st].clampWhenFinished = st === 'death'; }
  let cur = null, lockT = 0;
  const api = {
    root, mixer, A, oneShot: false,
    act(st, { force = false, speed = 1 } = {}) {
      if (lockT > 0 && !force) return; const a = acts[st]; if (!a) return;
      if (a !== cur) { a.reset().setEffectiveWeight(1).fadeIn(0.12).play(); cur?.fadeOut(0.12); cur = a; }
      a.timeScale = speed;
      if (st === 'attack' || st === 'hit' || st === 'death') lockT = st === 'death' ? 99 : Math.min(0.6, a.getClip().duration / speed * 0.8);
    },
    update(dt) { lockT -= dt; mixer.update(dt); },
  };
  api.act('idle'); mixer.update(Math.random() * 2);
  return api;
}
