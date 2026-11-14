// HUD: joystick, skill buttons with cooldowns, hero plate (HP / energy), timer. Functional layer for M2 (final skin in M4).
import './hud.css';

const ICON = {
  basic: '<path d="M5 27 21 11l4-6 2 2-6 4L5 27Zm2-6 4 4" />',
  s1: '<path d="M4 16h14m-6-7 8 7-8 7M18 9l8 7-8 7" />',
  s2: '<path d="M6 26 22 4l2 4L10 28Zm20 0L10 4 8 8l14 20Z" />',
  s3: '<path d="M16 4c-7 0-10 5-10 11v11l4-3 3 3 3-3 3 3 3-3 4 3V15C26 9 23 4 16 4Zm-4 9h3m2 0h3" />',
  ult: '<circle cx="16" cy="16" r="9"/><path d="M16 2v8m0 12v8M2 16h8m12 0h8M16 13v6m-3-3h6" />',
};
const KEY = { basic: 'ESPAÇO', s1: 'Q', s2: 'E', s3: 'R', ult: 'F' };
const LABEL = { basic: 'BÁSICO', s1: 'S1', s2: 'S2', s3: 'S3', ult: 'ULT' };

export class HUD {
  constructor(input, defs) {
    this.input = input; const root = this.root = document.createElement('div'); root.id = 'hud'; document.body.appendChild(root);
    root.innerHTML = `
      <div id="fx"></div>
      <div id="timer"><span>00:00</span></div>
      <div id="plate"><div class="face"></div><div class="info"><div class="name">VETOR <i>NÍVEL 1</i></div>
        <div class="bar hp"><b></b><span></span></div><div class="bar en"><b></b></div></div><div class="mark" title="Marcas aplicadas"><i>MARCAS</i><b>0</b></div></div>
      <div id="stick"><div class="knob"></div></div>
      <div id="skills"></div><div id="tip"></div><div id="msg"></div>
      <div id="end"><div class="card"><h1></h1><p></p><button>JOGAR NOVAMENTE</button></div></div>`;
    this.msg = root.querySelector('#msg'); this.endEl = root.querySelector('#end'); this.endEl.querySelector('button').onclick = () => location.reload();
    this.fx = root.querySelector('#fx'); this.timer = root.querySelector('#timer span'); this.tip = root.querySelector('#tip');
    this.hp = root.querySelector('.hp b'); this.hpTxt = root.querySelector('.hp span'); this.en = root.querySelector('.en b'); this.marks = root.querySelector('.mark b');
    const box = root.querySelector('#skills'); this.btn = {};
    for (const id of ['basic', 's1', 's2', 's3', 'ult']) {
      const b = document.createElement('div'); b.className = 'sk ' + id;
      b.innerHTML = `<svg viewBox="0 0 32 32">${ICON[id]}</svg><div class="cd"></div><em></em><label>${LABEL[id]}</label><kbd>${KEY[id]}</kbd>`;
      box.appendChild(b); this.btn[id] = { el: b, cd: b.querySelector('.cd'), txt: b.querySelector('em') }; this.bind(b, id, defs?.[id]);
    }
    this.joystick(root.querySelector('#stick'));
  }
  bind(el, id, def) {
    const inp = this.input; let start = null;
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault(); el.setPointerCapture(e.pointerId); el.classList.add('down');
      if (id === 'basic') { inp.btnBasic = true; return; }
      start = { x: e.clientX, y: e.clientY, aim: false }; if (def) this.tip.innerHTML = `<b>${def.name}</b> ${def.desc}`, this.tip.classList.add('on');
    });
    el.addEventListener('pointermove', (e) => {
      if (!start) return; const dx = e.clientX - start.x, dy = e.clientY - start.y, d = Math.hypot(dx, dy);
      if (d > 14) { start.aim = true; inp.aiming = { skill: id, dir: inp.screenDir(dx, dy), mag: Math.min(1, d / 90) }; }
      else if (start.aim) inp.aiming = { skill: id, dir: null, mag: 0, cancel: true };
    });
    const up = (e) => {
      el.classList.remove('down'); this.tip.classList.remove('on');
      if (id === 'basic') { inp.btnBasic = false; return; }
      if (!start) return; const a = inp.aiming; inp.aiming = null;
      if (e.type === 'pointerup' && !(a && a.cancel)) inp.events.push({ skill: id, dir: a?.dir ?? null, mag: a ? a.mag : null, touchAim: !!a });
      start = null;
    };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  }
  joystick(el) {
    const knob = el.firstChild, inp = this.input; let id = null, cx = 0, cy = 0; const R = 56;
    const set = (e) => { let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; } knob.style.transform = `translate(${dx}px,${dy}px)`; inp.stick.set(dx / R, -dy / R); if (inp.stick.length() < 0.18) inp.stick.set(0, 0); else inp.moveTo = null; };
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); id = e.pointerId; el.setPointerCapture(id); const r = el.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; el.classList.add('down'); set(e); });
    el.addEventListener('pointermove', (e) => { if (e.pointerId === id) set(e); });
    const end = (e) => { if (e.pointerId !== id) return; id = null; knob.style.transform = ''; inp.stick.set(0, 0); el.classList.remove('down'); };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  }
  end(result, st) {
    const win = result === 'victory', mm = (s) => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(Math.floor(s % 60)).padStart(2, '0');
    this.endEl.className = 'on ' + result; this.endEl.querySelector('h1').textContent = win ? 'VITÓRIA' : 'DERROTA';
    this.endEl.querySelector('p').innerHTML = (win ? 'A torre de rádio EKOO caiu. O sinal das 3h17 foi silenciado.' : 'A torre AXIOM foi destruída. A quarentena falhou.') + `<br><b>${mm(st.time)}</b> de partida · <b>${st.kills}</b> abates · <b>${st.deaths}</b> mortes`;
  }
  update(hero, time) {
    const dead = !hero.alive && hero.respawnAt > hero.t; this.msg.classList.toggle('on', dead); if (dead) this.msg.textContent = 'VETOR ABATIDO — retornando em ' + Math.ceil(hero.respawnAt - hero.t) + 's';
    const s = Math.floor(time); this.timer.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    this.hp.style.width = (100 * hero.hp / hero.maxHp) + '%'; this.hpTxt.textContent = Math.ceil(hero.hp) + ' / ' + hero.maxHp; this.en.style.width = hero.energy + '%'; this.marks.textContent = hero.marksApplied;
    for (const id in this.btn) {
      const b = this.btn[id], sk = hero.skills[id]; if (!sk) continue;
      const left = Math.max(0, sk.ready - hero.t), frac = sk.cd ? left / sk.cd : 0;
      b.cd.style.background = left > 0 ? `conic-gradient(rgba(6,10,16,.78) ${frac * 360}deg, transparent 0)` : 'none';
      b.txt.textContent = left > 0.05 && id !== 'basic' ? (left < 1 ? left.toFixed(1) : Math.ceil(left)) : '';
      b.el.classList.toggle('off', left > 0.05 || hero.energy < (sk.cost || 0)); b.el.classList.toggle('lit', !!sk.lit);
    }
  }
}
