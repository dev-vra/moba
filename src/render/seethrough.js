// Raio-X do herói: cenário entre a câmera e o herói (silos, copas, estufas) ganha um recorte pontilhado
// em volta dele. Puro shader (discard com dither Bayer) — sem ordenação de transparência, custo ~zero.
// Só corta fragmentos ACIMA da cintura do herói e MAIS PERTO da câmera que ele (chão nunca é cortado).
import * as THREE from 'three';

export const SEE = {
  uSeePx: { value: new THREE.Vector2(-9999, -9999) }, // herói em pixels (drawing buffer)
  uSeeDepth: { value: 0 },                            // distância herói→câmera (view space)
  uSeeY: { value: 0 },                                // altura mínima de corte (mundo)
  uSeeR: { value: 120 },                              // raio em px
};

const _v = new THREE.Vector3(), _size = new THREE.Vector2();
export function updateSeeThrough(renderer, camera, pos, alive = true) {
  if (!alive) { SEE.uSeePx.value.set(-9999, -9999); return; }
  renderer.getDrawingBufferSize(_size);
  _v.set(pos.x, pos.y + 1.1, pos.z).project(camera);
  SEE.uSeePx.value.set((_v.x * 0.5 + 0.5) * _size.x, (_v.y * 0.5 + 0.5) * _size.y);
  _v.set(pos.x, pos.y + 1.1, pos.z).applyMatrix4(camera.matrixWorldInverse);
  SEE.uSeeDepth.value = -_v.z;
  SEE.uSeeY.value = pos.y + 1.0;
  SEE.uSeeR.value = _size.y * 0.16;
}

const patched = new WeakSet();
export function seeThrough(mat) {
  if (!mat || patched.has(mat)) return mat;
  patched.add(mat);
  const prev = mat.onBeforeCompile, prevKey = mat.customProgramCacheKey?.bind(mat);
  mat.onBeforeCompile = (sh, r) => {
    prev?.call(mat, sh, r);
    Object.assign(sh.uniforms, SEE);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vSeeY; varying float vSeeZ;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        vec4 seeW = vec4(transformed, 1.);
        #ifdef USE_INSTANCING
          seeW = instanceMatrix * seeW;
        #endif
        vSeeY = (modelMatrix * seeW).y; vSeeZ = -mvPosition.z;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying float vSeeY; varying float vSeeZ; uniform vec2 uSeePx; uniform float uSeeDepth, uSeeY, uSeeR;
        float seeBayer(vec2 p){ ivec2 i = ivec2(mod(p, 4.)); int k = i.x + i.y * 4;
          float m[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.); return (m[k] + .5) / 16.; }`)
      .replace('void main() {', `void main() {
        if (vSeeY > uSeeY && vSeeZ < uSeeDepth - 1.2) {
          float d = length(gl_FragCoord.xy - uSeePx) / uSeeR;
          float cut = (1. - smoothstep(.55, 1., d)) * .88;          // miolo quase vazio, borda pontilhada
          if (cut > seeBayer(gl_FragCoord.xy)) discard;
        }`);
  };
  mat.customProgramCacheKey = () => (prevKey ? prevKey() : '') + '|see';
  mat.needsUpdate = true;
  return mat;
}
