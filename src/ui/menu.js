// Tela inicial (logo animado) → seleção de herói com prévia 3D → resolve {hero, diff}. Roda ANTES do carregamento do mapa.
import * as THREE from 'three';
import './menu.css';
import { Puppet } from '../game/puppet.js';

const LETTERS = 'EKOOFALL';

function sparks(n = 26) {
  return Array.from({ length: n }, () => `<b style="left:${Math.random() * 100}%;--dx:${(Math.random() - 0.5) * 160}px;animation-duration:${6 + Math.random() * 8}s;animation-delay:${Math.random() * 8}s"></b>`).join('');
}

// prévia 3D: um renderer pequeno só para o menu (descartado ao entrar na partida)
function makeStage(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); r.setPixelRatio(Math.min(devicePixelRatio, 1.5)); r.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100); cam.position.set(-2.2, 3.4, 17); cam.lookAt(-2.2, 2.5, 0);
  scene.add(new THREE.HemisphereLight(0xbfe6ff, 0x3a2414, 1.4));
  const key = new THREE.DirectionalLight(0xfff0dc, 2.6); key.position.set(4, 8, 6); scene.add(key);
  const rimC = new THREE.DirectionalLight(0x5fe6ff, 3.2); rimC.position.set(-6, 4, -5); scene.add(rimC);
  const rimA = new THREE.DirectionalLight(0xffa23a, 2.2); rimA.position.set(6, 3, -5); scene.add(rimA);
  const tex = new THREE.TextureLoader().load('/ui/concrete.webp'); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(2, 1);
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.6, 0.5, 8), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0.2 })); ped.position.y = -0.25; scene.add(ped);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.45, 0.05, 6, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x5fe6ff).multiplyScalar(2) })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.02; scene.add(ring);
  const holder = new THREE.Group(); holder.position.x = 1.2; scene.add(holder); ped.position.x = ring.position.x = 1.2;
  let body = null, mixer = null, spin = 0, alive = true, last = performance.now();
  const size = () => { const w = canvas.clientWidth, h = canvas.clientHeight; if (canvas.width !== Math.round(w * r.getPixelRatio())) { r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); } };
  (function loop() {
    if (!alive) return; requestAnimationFrame(loop); const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now; size();
    spin += dt * 0.5; holder.rotation.y = Math.sin(spin) * 0.6 + 0.25; ring.material.color.setHSL(0.52, 1, 0.5 + Math.sin(now / 400) * 0.1);
    body?.update?.(dt, { moving: false, speedK: 1 }); mixer?.update(dt); r.render(scene, cam);
  })();
  return {
    async show(kit) {
      holder.clear(); body = null; mixer = null;
      if (kit.id === 'vetor') {                         // Vetor: modelo riggado (FBX) com a guarda de idle
        const { loadVetor, HERO_SCALE } = await import('../game/vetorModel.js'); const V = await loadVetor(); if (!alive) return;
        V.model.position.y = 0.2 * HERO_SCALE; mixer = V.mixer; const a = mixer.clipAction(THREE.AnimationUtils.subclip(V.clips.stab, 'guard', 0, 9, 30)); a.setLoop(THREE.LoopPingPong).play(); a.timeScale = 0.3;
        holder.add(V.root); V.root.scale.multiplyScalar(1.15);
      } else { body = new Puppet(kit.id, kit.team, 'melee'); body.root.scale.multiplyScalar(1.2); holder.add(body.root); }
    },
    dispose() { alive = false; r.dispose(); },
  };
}

export function showMenu({ kits, playable, foes }) {
  const el = document.createElement('div'); el.id = 'menu';
  const logo = [...LETTERS].map((c, i) => `<span class="${i < 4 ? 'ax' : ''}" style="animation-delay:${0.1 + i * 0.09}s">${c}</span>`).join('');
  el.innerHTML = `
    <div class="bg"><i class="ax"></i><i class="ek"></i></div><div class="seam"></div><div class="sparks">${sparks()}</div><div class="vig"></div><div class="scan"></div>
    <div class="title"><div class="waves"><s></s><s></s><s></s></div>
      <div class="logo">${logo}</div><div class="arena">ARENA</div><div class="tag">CIDADE-CELEIRO · 2049 · O SINAL DAS 3H17</div>
      <div class="actions"><button class="btn hot" data-a="play">JOGAR</button><button class="btn sm" data-a="how">CONTROLES</button></div>
      <div class="tag how" style="display:none;margin-top:14px;letter-spacing:.18em;text-align:center;line-height:1.7">CLIQUE DIREITO: MOVER / ATACAR · QWER: HABILIDADES · 1-4: SUBIR NÍVEL · B: VOLTAR À BASE · C: LOJA</div>
    </div>
    <div class="select"><div class="stage"><canvas></canvas><div class="who"></div></div>
      <div class="side"><h4>AXIOM — SEU TIME</h4><div class="mine"></div>
        <div class="skills"></div>
        <h4 class="ek">EKOO — OPONENTES</h4><div class="foes">${foes.map((k) => `<div class="card foe"><div class="ic">${k.name[0]}</div><div><b>${k.name}</b><span>${k.role} · IA</span></div></div>`).join('')}</div>
        <div class="diff"><span>IA</span>${[['easy', 'FÁCIL'], ['normal', 'NORMAL'], ['hard', 'DIFÍCIL']].map(([k, l]) => `<button class="btn sm" data-d="${k}">${l}</button>`).join('')}</div>
        <button class="btn hot go">ENTRAR NA PARTIDA</button></div></div>`;
  document.body.append(el);
  setTimeout(() => el.querySelector('.logo').classList.add('glitch'), 1200);

  return new Promise((resolve) => {
    let hero = localStorage.getItem('ekoo.hero'); if (!playable.includes(hero)) hero = playable[0];
    let diff = localStorage.getItem('ekoo.diff') || 'normal', stage = null;
    const pick = (id) => {
      hero = id; const k = kits[id];
      el.querySelectorAll('.mine .card').forEach((c) => c.classList.toggle('on', c.dataset.k === id));
      el.querySelector('.who').innerHTML = `<i>${k.role}</i><h3>${k.name}</h3><em>${k.title}</em><p>${k.blurb}</p>`;
      el.querySelector('.skills').innerHTML = ['q', 'w', 'e', 'r'].map((s) => `<div><kbd>${s.toUpperCase()}</kbd><br>${k.skills[s].name}</div>`).join('');
      stage?.show(k);
    };
    const setDiff = (d) => { diff = d; el.querySelectorAll('[data-d]').forEach((b) => b.classList.toggle('on', b.dataset.d === d)); };
    el.querySelector('.mine').innerHTML = playable.map((id) => { const k = kits[id]; return `<button class="card" data-k="${id}"><div class="ic">${k.name[0]}</div><div><b>${k.name}</b><span>${k.role}</span></div></button>`; }).join('');
    el.addEventListener('click', (e) => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.a === 'play') { el.querySelector('.title').classList.add('away'); el.querySelector('.select').classList.add('on'); stage = makeStage(el.querySelector('.stage canvas')); pick(hero); }
      else if (t.dataset.a === 'how') { const h = el.querySelector('.how'); h.style.display = h.style.display === 'none' ? 'block' : 'none'; }
      else if (t.dataset.k) pick(t.dataset.k);
      else if (t.dataset.d) setDiff(t.dataset.d);
      else if (t.classList.contains('go')) {
        localStorage.setItem('ekoo.hero', hero); localStorage.setItem('ekoo.diff', diff);
        el.classList.add('off'); setTimeout(() => { stage?.dispose(); el.remove(); }, 650); resolve({ hero, diff });
      }
    });
    setDiff(diff);
  });
}
