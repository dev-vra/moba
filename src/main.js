import * as THREE from 'three';
import { createPost } from './render/post.js';
import { CameraRig } from './camera.js';
import { buildWorld } from './world/index.js';
import { Input } from './game/input.js';
import { HUD } from './ui/hud.js';
import { VFX } from './game/vfx.js';
import { Game } from './game/game.js';
import { Hero, SKILLS } from './game/hero.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.shadowMap.autoUpdate = false;
renderer.info.autoReset = false; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;

const q = new URLSearchParams(location.search);
// quality: ?q=low|high > saved choice > auto (touch / low-core devices start on low)
const quality = q.get('q') || localStorage.getItem('ekoo.quality') || (matchMedia('(pointer:coarse)').matches || (navigator.hardwareConcurrency || 8) <= 4 ? 'low' : 'high');
const qBtn = document.getElementById('quality');
qBtn.textContent = 'GRÁFICOS: ' + (quality === 'high' ? 'ALTO' : 'BAIXO');
qBtn.onclick = () => { localStorage.setItem('ekoo.quality', quality === 'high' ? 'low' : 'high'); q.delete('q'); location.search = q.toString(); };
let loaded = false; THREE.DefaultLoadingManager.onLoad = () => { loaded = true; };
const bootbar = document.getElementById('bootbar'); THREE.DefaultLoadingManager.onProgress = (_u, n, total) => { bootbar.style.width = Math.round(8 + 88 * n / total) + '%'; };

const scene = new THREE.Scene();
const rig = new CameraRig(innerWidth / innerHeight);
const world = buildWorld(scene, renderer, quality);
const post = createPost(renderer, scene, rig.camera, quality, Object.fromEntries(q));

function resize() {
  const pr = Math.min(devicePixelRatio, quality === 'high' ? 2 : 1), w = innerWidth, h = innerHeight;
  renderer.setPixelRatio(pr); renderer.setSize(w, h, false);
  rig.resize(w / h); post.setSize(w, h, pr);
}
addEventListener('resize', resize); resize();

const input = new Input(canvas, rig);
const hud = new HUD(input, SKILLS);
const vfx = new VFX(scene, rig, hud.fx);
const game = new Game(scene, vfx, hud);
game.start();                                         // towers + jungle camps; waves start a few seconds in
const hero = await Hero.create(game, scene, rig, input, vfx);
rig.snap(hero.pos.x, hero.pos.z);
window.__g = { game, hero, input, vfx, rig, renderer, scene };         // dev / automated screenshots

const clock = new THREE.Clock(), speed = parseFloat(q.get('speed') || '1'); let t = 0, frames = 0;   // ?speed=N: dev fast-forward
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05); t += dt; renderer.info.reset();
  input.update(); window.__bot?.();
  for (let k = 0; k < speed; k++) {
  const gdt = (vfx.hitstop > 0 ? dt * 0.06 : dt) * (game.over ? 0.35 : 1); vfx.hitstop -= dt;      // hit-stop on heavy impacts, slow-mo on match end
  game.update(gdt); vfx.update(dt); }
  rig.update(dt);
  world.update(t, dt, rig.target, rig.dist, rig.camera); hud.update(hero, game.t, game, rig, dt);
  post.render();
  if (loaded && scene.environment && ++frames === 3) { document.getElementById('boot').classList.add('off'); window.__ready = true; }
});
