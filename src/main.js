import * as THREE from 'three';
import { createPost } from './render/post.js';
import { CameraRig, freeCam } from './camera.js';
import { buildWorld } from './world/index.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.shadowMap.autoUpdate = false;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;

const q = new URLSearchParams(location.search);
// quality: ?q=low|high > saved choice > auto (touch / low-core devices start on low)
const quality = q.get('q') || localStorage.getItem('ekoo.quality') || (matchMedia('(pointer:coarse)').matches || (navigator.hardwareConcurrency || 8) <= 4 ? 'low' : 'high');
const qBtn = document.getElementById('quality');
qBtn.textContent = 'GRÁFICOS: ' + (quality === 'high' ? 'ALTO' : 'BAIXO');
qBtn.onclick = () => { localStorage.setItem('ekoo.quality', quality === 'high' ? 'low' : 'high'); q.delete('q'); location.search = q.toString(); };
let loaded = false; THREE.DefaultLoadingManager.onLoad = () => { loaded = true; };

const scene = new THREE.Scene();
const rig = new CameraRig(innerWidth / innerHeight);
const world = buildWorld(scene, renderer, quality);
const post = createPost(renderer, scene, rig.camera, quality, Object.fromEntries(q));

rig.snap(parseFloat(q.get('x') ?? '0'), parseFloat(q.get('z') ?? '0'));
if (q.has('d')) rig.dist = rig.distGoal = parseFloat(q.get('d'));
const control = freeCam(rig, canvas);

function resize() {
  const pr = Math.min(devicePixelRatio, quality === 'high' ? 2 : 1), w = innerWidth, h = innerHeight;
  renderer.setPixelRatio(pr); renderer.setSize(w, h, false);
  rig.resize(w / h); post.setSize(w, h, pr);
}
addEventListener('resize', resize); resize();

const clock = new THREE.Clock(); let t = 0, frames = 0;
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05); t += dt;
  control(dt); rig.update(dt); world.update(t, dt, rig.target, rig.dist);
  post.render();
  if (loaded && scene.environment && ++frames === 3) { document.getElementById('boot').classList.add('off'); window.__ready = true; }
});
