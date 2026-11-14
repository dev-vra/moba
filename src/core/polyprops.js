// Props Poly Haven (public/props/<grupo>/<id>{,_lod1,_lod2}.glb) com LOD e "pass de direção de arte":
// dessatura o scan fotográfico (ambiente neutro), puxa para a paleta da facção, e aplica sujeira por altura
// (pé encardido) + leve escurecimento de cavidade via AO — para casar com os materiais PBR de mats.js.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

// tint = multiplicador de cor; sat = saturação retida; grime = força da sujeira no pé; rough = +rugosidade
export const LOOK = {
  ekoo: { tint: 0xf2d9bf, sat: 0.7, grime: 0.55, rough: 0.08 },   // quente, ferrugem, sujo
  axiom: { tint: 0xe4ecf7, sat: 0.35, grime: 0.15, rough: -0.05 }, // frio, limpo
  mid: { tint: 0xe8e2d6, sat: 0.55, grime: 0.4, rough: 0.05 },     // fazenda/infra neutra
  nature: { tint: 0xd9d6c8, sat: 0.6, grime: 0.2, rough: 0.1 },     // verdes contidos
  vessari: { tint: 0xc9c2e6, sat: 0.5, grime: 0.0, rough: -0.1 },   // pedra lilás estranha
};
const LOD_DIST = [0, 60, 95]; // câmera fica a ~48–72u: lod0 perto, lod2 só em zoom-out / borda

let loader;
export function propLoader(renderer) {
  if (loader) return loader;
  loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  if (renderer) loader.setKTX2Loader(new KTX2Loader().setTranscoderPath('/basis/').detectSupport(renderer));
  return loader;
}

const cache = new Map();
function lookMaterial(src, look) {
  const key = src.uuid + look.tint;
  if (cache.has(key)) return cache.get(key);
  const m = src.clone();
  m.color.multiply(new THREE.Color(look.tint));
  m.roughness = THREE.MathUtils.clamp(m.roughness + look.rough, 0.05, 1);
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uSat = { value: look.sat }; sh.uniforms.uGrime = { value: look.grime };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vH;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvH = position.y;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vH; uniform float uSat, uGrime;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
        diffuseColor.rgb = mix(vec3(lum), diffuseColor.rgb, uSat);
        float g = (1.0 - smoothstep(0.0, 0.45, vH)) * uGrime;
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.45, 0.4, 0.34), g);`);
  };
  m.customProgramCacheKey = () => `pp${look.sat}${look.grime}`;
  cache.set(key, m); return m;
}

const loaded = new Map();
async function loadLevel(group, id, suffix) {
  const url = `/props/${group}/${id}${suffix}.glb`;
  if (!loaded.has(url)) loaded.set(url, propLoader().loadAsync(url).then((g) => g.scene));
  return loaded.get(url);
}

// Retorna um THREE.LOD pronto para posicionar. `look` aceita chave de LOOK ou objeto próprio.
export async function loadProp(group, id, { look = group, scale = 1, lods = true } = {}) {
  const L = typeof look === 'string' ? LOOK[look] : look;
  const levels = await Promise.all((lods ? ['', '_lod1', '_lod2'] : ['']).map((s) => loadLevel(group, id, s)));
  const lod = new THREE.LOD();
  levels.forEach((scene, i) => {
    const o = scene.clone(true);
    o.traverse((n) => {
      if (!n.isMesh) return;
      n.castShadow = i < 2; n.receiveShadow = true;
      n.material = Array.isArray(n.material) ? n.material.map((m) => lookMaterial(m, L)) : lookMaterial(n.material, L);
    });
    lod.addLevel(o, LOD_DIST[i]);
  });
  lod.scale.setScalar(scale); lod.name = id;
  return lod;
}
