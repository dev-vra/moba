// Stylized-realistic pipeline: scene (HDR, MSAA) -> GTAO (high) -> subtle emissive bloom -> light grade -> ACES output
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const GradeShader = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; varying vec2 vUv;
    void main(){
      vec3 c=texture2D(tDiffuse,vUv).rgb;
      float l=dot(c,vec3(.2126,.7152,.0722));
      c=mix(vec3(l),c,1.06);                                             // light saturation lift
      c*=mix(vec3(.96,.99,1.06),vec3(1.05,1.,.94),smoothstep(0.,.9,l));  // cool shadows / warm highlights
      vec2 q=vUv-.5; c*=mix(.9,1.,smoothstep(.95,.35,length(q)));        // very mild corner falloff
      gl_FragColor=vec4(c,1.);
    }`,
};

export function createPost(renderer, scene, camera, quality, flags = {}) {
  const hi = quality === 'high', ao = hi && flags.ao !== '0', msaa = hi && flags.msaa !== '0';
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: msaa ? 4 : 0 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));

  // G-buffer for AO: opaque world only (layer 0) so particles / glass / grass never get AO halos
  let nrt = null, gtao = null; const nmat = new THREE.MeshNormalMaterial();
  if (ao) {
    nrt = new THREE.WebGLRenderTarget(size.x, size.y, { depthTexture: new THREE.DepthTexture(size.x, size.y), type: THREE.HalfFloatType });
    nrt.texture.minFilter = nrt.texture.magFilter = THREE.NearestFilter;
    gtao = new GTAOPass(scene, camera, size.x, size.y);
    gtao.setGBuffer(nrt.depthTexture, nrt.texture);
    gtao.blendIntensity = 0.85;
    gtao.updateGtaoMaterial({ radius: 1.1, distanceExponent: 1.4, thickness: 1.2, scale: 1.15, samples: 12, distanceFallOff: 1, screenSpaceRadius: false });
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5, radiusExponent: 1.5, rings: 2, samples: 12 });
    composer.addPass(gtao);
  }
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), hi ? 0.32 : 0.26, 0.45, 1.15);   // emissives only (HDR > 1.15)
  composer.addPass(bloom);
  composer.addPass(new ShaderPass(GradeShader));
  composer.addPass(new OutputPass());

  const clear = new THREE.Color(0x8080ff), prev = new THREE.Color();
  return {
    bloom, gtao,
    setSize(w, h, pr) { composer.setPixelRatio(pr); composer.setSize(w, h); if (nrt) nrt.setSize(Math.floor(w * pr), Math.floor(h * pr)); },
    render() {
      renderer.shadowMap.needsUpdate = true;
      if (nrt) {
        const bg = scene.background, fog = scene.fog, env = scene.environment; renderer.getClearColor(prev); const pa = renderer.getClearAlpha();
        scene.background = null; scene.fog = null; scene.environment = null; scene.overrideMaterial = nmat; camera.layers.set(0);
        renderer.setRenderTarget(nrt); renderer.setClearColor(clear, 1); renderer.clear(); renderer.render(scene, camera);
        scene.overrideMaterial = null; scene.background = bg; scene.fog = fog; scene.environment = env; camera.layers.enableAll();
        renderer.setRenderTarget(null); renderer.setClearColor(prev, pa);
        renderer.shadowMap.needsUpdate = false;
      }
      composer.render();
    },
  };
}
