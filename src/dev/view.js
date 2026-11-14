// Dev-only: contact sheet of a Vetor clip.  view.html?clip=stab&n=8&yaw=0.5
import * as THREE from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { loadVetor } from '../game/vetorModel.js';
const q = new URLSearchParams(location.search), n = +(q.get('n') || 8), name = q.get('clip') || 'stab';
const r = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true }); r.setSize(innerWidth, innerHeight); r.autoClear = false;
r.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x59636d);
const tex = await new HDRLoader().loadAsync('/env/sky_1k.hdr'); const pm = new THREE.PMREMGenerator(r); scene.environment = pm.fromEquirectangular(tex).texture; scene.environmentIntensity = 0.45;
const d = new THREE.DirectionalLight(0xffdfba, 3.9); d.position.set(3, 5, 4); scene.add(d);
const v = await loadVetor(); scene.add(v.root); v.root.rotation.y = +(q.get('yaw') || 0.5);
const g = new THREE.GridHelper(4, 4, 0x222222, 0x444444); scene.add(g);
const cam = new THREE.PerspectiveCamera(28, innerWidth / n / innerHeight, 0.1, 100); cam.position.set(0, 3.2, 8.5); cam.lookAt(0, 1.2, 0);
const a = v.actions[name]; a.play(); const dur = v.clips[name].duration; console.log('[info]', name, dur.toFixed(2));
r.clear();
for (let i = 0; i < n; i++) { v.mixer.setTime((dur * i) / n); r.setScissorTest(true); r.setScissor((innerWidth / n) * i, 0, innerWidth / n, innerHeight); r.setViewport((innerWidth / n) * i, 0, innerWidth / n, innerHeight); r.render(scene, cam); }
window.__ready = true;
