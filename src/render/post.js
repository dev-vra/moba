// Stylized-realistic pipeline: scene (HDR, MSAA) -> GTAO (high) -> subtle emissive bloom -> light grade -> ACES output
import * as THREE from 'three';
import { HEAVY } from './ink.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// "HQ" style: hand-inked contour from depth + normal discontinuities (wobbly, fading with distance)
const InkShader = {
  uniforms: { tDiffuse: { value: null }, tNormal: { value: null }, tDepth: { value: null }, texel: { value: new THREE.Vector2() }, near: { value: 1 }, far: { value: 300 }, thick: { value: 1.1 }, ink: { value: new THREE.Color(0x0e0c14) }, light: { value: 0.32 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse, tNormal, tDepth; uniform vec2 texel; uniform float near, far, thick, light; uniform vec3 ink; varying vec2 vUv;
    float lin(vec2 uv){ float z=texture2D(tDepth,uv).x*2.-1.; return 2.*near*far/(far+near-z*(far-near)); }
    float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    void main(){
      vec4 col=texture2D(tDiffuse,vUv);
      vec2 w=(vec2(hash(floor(vUv/texel/5.)),hash(floor(vUv/texel/5.)+7.))-.5)*texel*.8, o=texel*thick, uv=vUv+w;
      float d0=lin(uv), dd=(abs(lin(uv+o)-lin(uv-o))+abs(lin(uv+vec2(-o.x,o.y))-lin(uv+vec2(o.x,-o.y))))/d0;
      vec3 nA=texture2D(tNormal,uv+o).xyz, nB=texture2D(tNormal,uv-o).xyz, nC=texture2D(tNormal,uv+vec2(-o.x,o.y)).xyz, nD=texture2D(tNormal,uv+vec2(o.x,-o.y)).xyz;
      float e=max(smoothstep(.012,.03,dd), smoothstep(.6,1.1,length(nA-nB)+length(nC-nD)));
      e*=1.-smoothstep(90.,170.,d0);
      // alpha do G-buffer = peso da tinta: mundo leve, personagens/mobs/torres fortes
      float wgt=max(max(texture2D(tNormal,uv).a,texture2D(tNormal,uv+o).a),max(texture2D(tNormal,uv-o).a,max(texture2D(tNormal,uv+vec2(-o.x,o.y)).a,texture2D(tNormal,uv+vec2(o.x,-o.y)).a)));
      e*=mix(light,1.,smoothstep(.5,.9,wgt));
      col.rgb=mix(col.rgb, ink*max(col.rgb,vec3(.02))*6., e*.86);          // ink tinted by what is underneath, never pure black on glows
      gl_FragColor=col;
    }`,
};

const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uComic: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uComic; varying vec2 vUv;
    void main(){
      vec3 c=max(texture2D(tDiffuse,vUv).rgb,0.);
      float l=dot(c,vec3(.2126,.7152,.0722));
      if (uComic > .5 && l < 1.2) {                                     // painted comic: soft light banding + richer colour
        float b=l*5., f=fract(b), s=floor(b)+smoothstep(.35,.65,f); c*=mix(1., (s/5.)/max(l,1e-3), .5);
        l=dot(c,vec3(.2126,.7152,.0722)); c=mix(vec3(l),c,1.2);
      }
      c=mix(vec3(l),c,1.06);                                             // light saturation lift
      c*=mix(vec3(.96,.99,1.06),vec3(1.05,1.,.94),smoothstep(0.,.9,l));  // cool shadows / warm highlights
      vec2 q=vUv-.5; c*=mix(.9,1.,smoothstep(.95,.35,length(q)));        // very mild corner falloff
      gl_FragColor=vec4(c,1.);
    }`,
};

export function createPost(renderer, scene, camera, quality, flags = {}) {
  const hi = quality === 'high', ao = hi && flags.ao !== '0', msaa = hi && flags.msaa !== '0', inked = !!flags.ink;
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: msaa ? 4 : 0 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));

  // G-buffer for AO: opaque world only (layer 0) so particles / glass / grass never get AO halos
  let nrt = null, gtao = null, ink = null; const nmat = new THREE.MeshNormalMaterial({ opacity: 0.25 }), nmatH = new THREE.MeshNormalMaterial({ opacity: 1, depthFunc: THREE.LessEqualDepth });
  if (ao || inked) {
    nrt = new THREE.WebGLRenderTarget(size.x, size.y, { depthTexture: new THREE.DepthTexture(size.x, size.y), type: THREE.HalfFloatType });
    nrt.texture.minFilter = nrt.texture.magFilter = THREE.NearestFilter;
  }
  if (ao) {
    gtao = new GTAOPass(scene, camera, size.x, size.y);
    gtao.setGBuffer(nrt.depthTexture, nrt.texture);
    gtao.blendIntensity = 0.85;
    gtao.updateGtaoMaterial({ radius: 1.1, distanceExponent: 1.4, thickness: 1.2, scale: 1.15, samples: 12, distanceFallOff: 1, screenSpaceRadius: false });
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5, radiusExponent: 1.5, rings: 2, samples: 12 });
    composer.addPass(gtao);
  }
  if (inked) { ink = new ShaderPass(InkShader); ink.uniforms.tNormal.value = nrt.texture; ink.uniforms.tDepth.value = nrt.depthTexture; composer.addPass(ink); }
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), hi ? 0.32 : 0.26, 0.45, 1.15);   // emissives only (HDR > 1.15)
  composer.addPass(bloom);
  const grade = new ShaderPass(GradeShader); grade.uniforms.uComic.value = inked ? 1 : 0; composer.addPass(grade);
  composer.addPass(new OutputPass());

  const clear = new THREE.Color(0x8080ff), prev = new THREE.Color();
  return {
    bloom, gtao,
    setSize(w, h, pr) {
      composer.setPixelRatio(pr); composer.setSize(w, h); if (nrt) nrt.setSize(Math.floor(w * pr), Math.floor(h * pr));
      if (ink) { ink.uniforms.texel.value.set(1 / (w * pr), 1 / (h * pr)); ink.uniforms.thick.value = Math.max(1, (h * pr) / 760) * 1.05; }
    },
    render() {
      renderer.shadowMap.needsUpdate = true;
      if (ink) { ink.uniforms.near.value = camera.near; ink.uniforms.far.value = camera.far; }
      if (nrt) {
        const bg = scene.background, fog = scene.fog, env = scene.environment; renderer.getClearColor(prev); const pa = renderer.getClearAlpha();
        scene.background = null; scene.fog = null; scene.environment = null; scene.overrideMaterial = nmat; camera.layers.set(0);
        renderer.setRenderTarget(nrt); renderer.setClearColor(clear, 0); renderer.clear(); renderer.render(scene, camera);
        if (ink) { scene.overrideMaterial = nmatH; const ac = renderer.autoClear; renderer.autoClear = false;
          for (const o of HEAVY) { if (!o.parent) { HEAVY.delete(o); continue; } o.traverse((n) => n.layers.enable(2)); }
          camera.layers.set(2); renderer.render(scene, camera); camera.layers.set(0);
          renderer.autoClear = ac; }
        scene.overrideMaterial = null; scene.background = bg; scene.fog = fog; scene.environment = env; camera.layers.enableAll();
        renderer.setRenderTarget(null); renderer.setClearColor(prev, pa);
        renderer.shadowMap.needsUpdate = false;
      }
      composer.render();
    },
  };
}
