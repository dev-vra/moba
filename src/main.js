import * as THREE from 'three';
import { createPost } from './render/post.js';
import { CameraRig } from './camera.js';
import { buildWorld } from './world/index.js';
import { Input } from './game/input.js';
import { HUD } from './ui/hud.js';
import { VFX } from './game/vfx.js';
import { Game } from './game/game.js';
import { Hero } from './game/hero.js';
import { Bot } from './game/bot.js';
import { KITS, PLAYABLE } from './game/kits/index.js';
import { inBrush } from './core/util.js';
import { updateSeeThrough } from './render/seethrough.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.shadowMap.autoUpdate = false;
renderer.info.autoReset = false; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;

const q = new URLSearchParams(location.search);
// quality: ?q=low|high > saved choice > auto (touch / low-core devices start on low).  style: 'hq' (inked comic) | 'real'
const quality = q.get('q') || localStorage.getItem('ekoo.quality') || (matchMedia('(pointer:coarse)').matches || (navigator.hardwareConcurrency || 8) <= 4 ? 'low' : 'high');
const style = q.get('style') || localStorage.getItem('ekoo.style') || 'hq';
const toggle = (id, label, key, cur, next) => { const b = document.getElementById(id); b.textContent = label; b.onclick = () => { localStorage.setItem(key, next); q.delete(key === 'ekoo.quality' ? 'q' : 'style'); location.search = q.toString(); }; };
toggle('quality', 'GRÁFICOS: ' + (quality === 'high' ? 'ALTO' : 'BAIXO'), 'ekoo.quality', quality, quality === 'high' ? 'low' : 'high');
toggle('style', 'ESTILO: ' + (style === 'hq' ? 'HQ' : 'REALISTA'), 'ekoo.style', style, style === 'hq' ? 'real' : 'hq');
let loaded = false; THREE.DefaultLoadingManager.onLoad = () => { loaded = true; };
const bootbar = document.getElementById('bootbar'); THREE.DefaultLoadingManager.onProgress = (_u, n, total) => { bootbar.style.width = Math.round(8 + 88 * n / total) + '%'; };

const scene = new THREE.Scene();
const rig = new CameraRig(innerWidth / innerHeight);
const world = buildWorld(scene, renderer, quality);
if (world.nat?.length) import('./world/nature.js').then((m) => {
  m.buildNature(scene, renderer, world.nat, world.brush);
});
if (q.get('ph') === '1') import('./world/dressing.js').then((m) => m.dress(scene, renderer));   // props Poly Haven (fotorreal) — fora do estilo novo
const post = createPost(renderer, scene, rig.camera, quality, { ...Object.fromEntries(q), ink: style === 'hq' });

function resize() {
  const pr = Math.min(devicePixelRatio, quality === 'high' ? 1.25 : 1), w = innerWidth, h = innerHeight;
  renderer.setPixelRatio(pr); renderer.setSize(w, h, false);
  rig.resize(w / h); post.setSize(w, h, pr);
}
addEventListener('resize', resize); resize();

const input = new Input(canvas, rig, null);
const hud = new HUD(input);
const vfx = new VFX(scene, rig, hud.fx);
const game = new Game(scene, vfx, hud); input.game = game; game.playerTeam = 'axiom';
game.start();                                         // towers + jungle camps; waves start a few seconds in
let hero = null; rig.snap(-52, 0);

const clock = new THREE.Clock(), speed = parseFloat(q.get('speed') || '1'), STEP = 1 / 60, fog0 = scene.fog.color.clone(), VIOLET = new THREE.Color(0x3a2060); let t = 0, frames = 0, running = false, acc = 0;   // ?speed=N: dev fast-forward
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05); t += dt; renderer.info.reset();
  window.__bot?.();
  if (running) {                                   // fixed 60 Hz simulation step: same result at any frame rate (needed for online play later)
    acc = Math.min(acc + dt * speed, 0.25 * speed);
    while (acc >= STEP) { acc -= STEP; const k = (vfx.hitstop > 0 ? 0.06 : 1) * (game.over ? 0.35 : 1); vfx.hitstop -= STEP; game.update(STEP * k); vfx.update(STEP); }   // hit-stop on heavy impacts, slow-mo on match end
    input.tick(dt); rig.goal.set(hero.pos.x, 0, hero.pos.z).addScaledVector(rig.right, input.pan.x).addScaledVector(rig.fwd, input.pan.y);
    const ev = THREE.MathUtils.clamp(Math.min(game.eventUntil - game.t, 30 - (game.eventUntil - game.t)) / 2, 0, 1) * (game.eventUntil > game.t ? 1 : 0);   // 3h17: the world goes violet
    scene.fog.color.lerpColors(fog0, VIOLET, ev * 0.55); scene.background.copy(scene.fog.color); scene.environmentIntensity = 0.45 - ev * 0.2;
  }
  rig.update(dt);
  if (hero) updateSeeThrough(renderer, rig.camera, hero.pos, hero.alive);
  world.update(t, dt, rig.target, rig.dist, rig.camera, hero && hero.alive ? inBrush(hero.pos.x, hero.pos.z) : -1); if (hero) hud.update(hero, game.t, game, rig, dt);
  post.render();
  if (loaded && scene.environment && ++frames === 3) { document.getElementById('boot').classList.add('off'); window.__loaded = true; }
});

// ---- hero select, then 2v2: you + the other AXIOM hero (bot) vs DESPLUGADA + VÁLVULA (bots) ----
const pick = PLAYABLE.includes(q.get('hero')) ? q.get('hero') : await hud.pickHero(PLAYABLE.map((k) => KITS[k]));
const mate = PLAYABLE.find((k) => k !== pick);
const DIFF = { easy: { power: 1.0, skill: 0.6 }, normal: { power: 1.22, skill: 1 }, hard: { power: 1.45, skill: 1.4 } }[q.get('diff') || hud.diff || 'normal'];
hero = await Hero.create(game, scene, rig, vfx, KITS[pick], 'axiom', input, true, 0);
await Hero.create(game, scene, rig, vfx, KITS[mate], 'axiom', new Bot(0.9), false, 1);
await Hero.create(game, scene, rig, vfx, KITS[pick], 'axiom', new Bot(0.9), false, 2);   // 3v3: 3º herói repete um kit até termos mais heróis
for (const [i, k] of ['desplugada', 'valvula', 'desplugada'].entries()) { const e = await Hero.create(game, scene, rig, vfx, KITS[k], 'ekoo', new Bot(1), false, i); e.power = DIFF.power; e.ctrl.skill = DIFF.skill; e.recalc(); e.hp = e.maxHp; }   // enemy bots hit a little harder than a human-led team
game.hero = hero; input.hero = hero; hud.setHero(hero); rig.snap(hero.pos.x, hero.pos.z); running = true;
window.__g = { game, hero, input, vfx, rig, renderer, scene, hud }; window.__ready = true;         // dev / automated tests
