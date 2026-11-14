// Folha de contato: todos os props Poly Haven de um grupo, vistos na câmera MOBA real (fov 30, yaw 35°, pitch 50°).
// /props.html?g=ekoo&d=48&raw=1   (raw=1 desliga o pass de direção de arte, p/ comparar)
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { loadProp, propLoader, LOOK } from '../core/polyprops.js';

const q = new URLSearchParams(location.search), group = q.get('g') || 'ekoo', dist = +(q.get('d') || 48);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true });
renderer.setSize(innerWidth, innerHeight); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.shadowMap.enabled = true;
propLoader(renderer);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x6d7175);
scene.environment = (await new RGBELoader().loadAsync('/env/sky_1k.hdr')); scene.environment.mapping = THREE.EquirectangularReflectionMapping;
scene.environmentIntensity = 0.6;
const sun = new THREE.DirectionalLight(0xfff1dd, 2.2); sun.position.set(-20, 40, 15); sun.castShadow = true;
Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40 }); sun.shadow.mapSize.set(2048, 2048); scene.add(sun);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x7a7468, roughness: 1 }));
floor.rotateX(-Math.PI / 2); floor.receiveShadow = true; scene.add(floor);
// herói de referência (~1.8u) para escala
const ref = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 1, 4, 8), new THREE.MeshStandardMaterial({ color: 0xff3b6b }));
ref.position.y = 0.9; scene.add(ref);

const ids = (await (await fetch('/props/report.json')).json()).report.filter((r) => r.group === group && !['pine_tree_01', 'tree_small_02'].includes(r.id)).map((r) => r.id);
const look = q.get('raw') ? { tint: 0xffffff, sat: 1, grime: 0, rough: 0 } : LOOK[group];
const cols = Math.ceil(Math.sqrt(ids.length + 1)), gap = 4.5, labels = [];
const props = await Promise.all(ids.map((id) => loadProp(group, id, { look })));
props.forEach((p, i) => {
  const k = i + 1, x = (k % cols - (cols - 1) / 2) * gap, z = (Math.floor(k / cols) - (cols - 1) / 2) * gap;
  p.position.set(x, 0, z); scene.add(p); labels.push([p, ids[i]]);
});
ref.position.x = (-(cols - 1) / 2) * gap; ref.position.z = (-(cols - 1) / 2) * gap;

const cam = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 1, 400);
const Y = THREE.MathUtils.degToRad(35), P = THREE.MathUtils.degToRad(50);
cam.position.set(-Math.sin(Y) * Math.cos(P), Math.sin(P), Math.cos(Y) * Math.cos(P)).multiplyScalar(dist); cam.lookAt(0, 0, 0);
const box = document.getElementById('l'), v = new THREE.Vector3();
for (const [p, id] of labels) {
  v.copy(p.position).project(cam); const d = document.createElement('div'); d.textContent = id;
  d.style.left = (v.x + 1) / 2 * innerWidth + 'px'; d.style.top = (1 - v.y) / 2 * innerHeight + 8 + 'px'; box.append(d);
}
renderer.setAnimationLoop(() => renderer.render(scene, cam));
setTimeout(() => (window.__ready = true), 1500);
