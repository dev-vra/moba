// Natureza estilizada (Quaternius, CC0) instanciada: 1 InstancedMesh por (modelo × primitiva).
// Recebe as posições que o index.js gerava para o procedural (layout de gameplay intacto).
import * as THREE from 'three';
import { propLoader } from '../core/polyprops.js';
import { rng, heightAt, navDist } from '../core/util.js';
import { seeThrough } from '../render/seethrough.js';

const T = (...a) => a;
const CHUNK = 32;
// tipo -> [modelos, escala base]  (Quaternius ~1u = 1m; nossa câmera pede exagero leve)
const KINDS = {
  tree: [T('U_MapleTree_1', 'U_MapleTree_2', 'U_MapleTree_3', 'U_BirchTree_1', 'U_BirchTree_3'), 1.25],
  bush: [T('Bush_Common', 'U_Bush_Large', 'U_Bush_Small', 'Bush_Common_Flowers'), 1.5],
  rock: [T('Rock_Medium_1', 'Rock_Medium_2', 'Rock_Medium_3'), 0.75],
  dead: [T('U_DeadTree_6', 'U_DeadTree_7', 'U_DeadTree_9'), 1.1],
  grass: [T('Grass_Common_Tall', 'Grass_Wispy_Tall', 'U_Grass_Large', 'Fern_1', 'Plant_7_Big', 'Flower_3_Group', 'Clover_1'), 1.6],
  moita: [T('Bush_Common', 'U_Bush_Large', 'Bush_Common_Flowers', 'U_Bush_Large_Flowers', 'Bush_Common'), 2.1],
  plant: [T('Plant_1_Big', 'Fern_1', 'U_Bush_Small', 'Flower_4_Group', 'Plant_7_Big', 'Bush_Common_Flowers'), 1.6],
  flower: [T('Flower_3_Group', 'Flower_4_Group', 'Clover_1', 'Fern_1', 'Mushroom_Common'), 1.3],
  pebble: [T('Pebble_Round_1', 'Pebble_Round_2', 'Pebble_Square_1', 'Pebble_Square_2'), 1.4],
};

// Ambiente um pouco abaixo dos personagens: leve dessaturação, sem brilho especular.
function styl(m) {
  const n = m.clone(); n.roughness = 1; n.metalness = 0; n.envMapIntensity = 0.55;
  if (n.color) n.color.offsetHSL(0, -0.08, -0.02);
  if (n.map) n.alphaTest = Math.max(n.alphaTest, 0.4);
  return seeThrough(n);
}

export async function buildNature(scene, renderer, spots, zones = []) {
  propLoader(renderer);
  const R = rng(911), groups = new Map();
  const add = (kind, x, y, z, s, zone = -1) => {
    const [list, base] = KINDS[kind], id = list[Math.floor(R() * list.length)];
    const key = zone >= 0 ? `${id}|z${zone}` : `${id}|${Math.floor(x / CHUNK)},${Math.floor(z / CHUNK)}`;   // blocos espaciais → frustum culling por bloco
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), R() * 6.28),
      new THREE.Vector3().setScalar(base * s)));
  };
  for (const p of spots) {
    add(p.kind, p.x, p.y, p.z, p.kind === 'tree' ? 0.9 + R() * 0.35 : p.kind === 'moita' ? p.s : p.s * 0.75, p.zone ?? -1);
    // tufos de grama/flor em volta: quebram a borda dura do chão
    const tufts = p.bare ? 0 : p.kind === 'tree' ? 3 : p.kind === 'bush' ? 2 : 1;
    for (let i = 0; i < tufts; i++) {
      const x = p.x + (R() - 0.5) * 5, z = p.z + (R() - 0.5) * 5;
      if (navDist(x, z) > 0.6) add(R() < 0.6 ? 'flower' : 'pebble', x, heightAt(x, z), z, 0.7 + R() * 0.6);
    }
  }
  const loader = propLoader(), q = [];
  const glb = new Map(), get = (id) => (glb.has(id) || glb.set(id, loader.loadAsync(`/packs/nature/${id}.glb`)), glb.get(id));
  const matCache = new Map(), mat = (m) => (matCache.has(m) || matCache.set(m, styl(m)), matCache.get(m));
  for (const [key, mats] of groups) {
    const [id, zk] = key.split('|'), zone = zk.startsWith('z') ? zones[+zk.slice(1)] : null;
    q.push(get(id).then((g) => {
      g.scene.updateMatrixWorld(true);
      g.scene.traverse((o) => {
        if (!o.isMesh) return;
        // moitas: material próprio por zona (fade independente quando o herói entra)
        const zm = (m) => { const c = seeThrough(mat(m).clone()); c.userData.zone = true; zone.mats.push(c); return c; };
        const pick = zone ? zm : mat;
        const im = new THREE.InstancedMesh(o.geometry, Array.isArray(o.material) ? o.material.map(pick) : pick(o.material), mats.length);
        mats.forEach((m, i) => im.setMatrixAt(i, new THREE.Matrix4().multiplyMatrices(m, o.matrixWorld)));
        im.computeBoundingSphere(); im.castShadow = !id.startsWith('Grass') && !id.startsWith('Pebble') && !id.startsWith('U_Grass') && !id.startsWith('Clover');
        im.receiveShadow = true; scene.add(im);
      });
    }).catch((e) => console.warn('[nature]', id, e.message)));
  }
  await Promise.all(q);
}

// Troca a geometria de InstancedMeshes procedurais (milharal, tapete de grama) por um modelo Quaternius,
// mantendo matrizes/cores/material (fade do milharal, vento da grama continuam funcionando).
export async function reskin(meshes, id, { split = 0, scale = 1, hue = [0.25, 0.04], sat = 0.3, light = [0.72, 0.12] } = {}) {
  const g = await propLoader().loadAsync(`/packs/nature/${id}.glb`); let src = null;
  g.scene.traverse((o) => { if (o.isMesh && !src) src = o; });
  if (!src) return;
  const geo = src.geometry.clone(); const [sx, sy] = Array.isArray(scale) ? scale : [scale, scale]; geo.scale(sx, sy, sx);
  if (!geo.attributes.color) geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 3).fill(1), 3));
  for (const m of meshes) {
    m.geometry = geo;
    const mat = m.material; mat.map = src.material.map; mat.alphaTest = 0.4; mat.side = THREE.DoubleSide;
    // cor por instância vira só uma tinta clara sobre a textura do modelo (antes era a cor final, escura)
    const c = new THREE.Color(), R = rng(m.count);
    for (let i = 0; i < m.count; i++) m.setColorAt(i, c.setHSL(hue[0] + (R() - 0.5) * hue[1] * 2, sat, light[0] + (R() - 0.5) * light[1] * 2));
    m.instanceColor.needsUpdate = true;
    mat.needsUpdate = true;
  }
}
