// HUD — PC MOBA layout: top scoreboard, bottom-centre command bar (stats · portrait/level · vitals + abilities · inventory/gold),
// minimap bottom-right, item shop panel. Touch devices additionally get the joystick + round skill buttons.
import './hud.css';
import { ITEMS, MAX_LEVEL, SLOTS, xpNeed } from '../game/items.js';
import { RANK_MAX, ULT_AT } from '../game/hero.js';
import { BUFFS } from '../game/game.js';
import { PATHS, PATH_R, CAMPS, BRUSH, widen, TOWER_X, BASE_X } from '../core/util.js';

const ICON = {
  passive: '<circle cx="16" cy="16" r="9"/><path d="M16 7v18M7 16h18M10 10l12 12M22 10 10 22" />',
  basic: '<path d="M5 27 21 11l4-6 2 2-6 4L5 27Zm2-6 4 4" />',
  q: '<path d="M4 16h14m-6-7 8 7-8 7M18 9l8 7-8 7" />',
  w: '<path d="M6 26 22 4l2 4L10 28Zm20 0L10 4 8 8l14 20Z" />',
  e: '<path d="M16 4c-7 0-10 5-10 11v11l4-3 3 3 3-3 3 3 3-3 4 3V15C26 9 23 4 16 4Zm-4 9h3m2 0h3" />',
  r: '<circle cx="16" cy="16" r="9"/><path d="M16 2v8m0 12v8M2 16h8m12 0h8M16 13v6m-3-3h6" />',
};
const KEY = { passive: '', basic: 'ESPAÇO', q: 'Q', w: 'W', e: 'E', r: 'R' }, NUM = { q: 1, w: 2, e: 3, r: 4 };
const svg = (d, cls = '') => `<svg viewBox="0 0 32 32" class="${cls}">${d}</svg>`;
const mmss = (s) => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(Math.floor(s % 60)).padStart(2, '0');
const MM = { w: 250, h: 160, sx: 1.25, sz: 1.25 };            // minimap: world x ±100, z ±64

export class HUD {
  constructor(input, defs) {
    this.input = input; this.defs = defs; const root = this.root = document.createElement('div'); root.id = 'hud'; document.body.appendChild(root);
    root.innerHTML = `
      <div id="fx"></div>
      <div id="top"><div class="side ax"><em title="Acampamentos Vessari tomados">◆ <span>0</span></em><i>AXIOM</i><b>0</b><u><s></s></u></div><div class="clock">00:00</div><div class="side ek"><u><s></s></u><b>0</b><i>EKOO</i><em title="Acampamentos Vessari tomados"><span>0</span> ◆</em></div></div>
      <div id="kda"><span>A / M / F</span><b>0 / 0 / 0</b></div><div id="feed"></div><div id="buffs"></div>
      <div id="bar">
        <div class="stats"></div>
        <div class="who"><div class="portrait"><svg viewBox="0 0 64 64"><path d="M32 4C17 4 9 16 9 31v25l10-5 13 9 13-9 10 5V31C55 16 47 4 32 4Z" fill="#101c2c" stroke="#2b4666" stroke-width="2"/>
          <path d="M32 16c-9 0-14 7-14 16 0 10 6 19 14 21 8-2 14-11 14-21 0-9-5-16-14-16Z" fill="#8798ac"/><path d="M20 30h24l-2 8H22Z" fill="#35e0ff" class="visor"/><path d="M27 44h10l-2 7h-6Z" fill="#55657a"/></svg></div>
          <div class="lvl">1</div><div class="name">—</div></div>
        <div class="mid"><div class="xp"><b></b><span></span></div>
          <div class="bar hp"><b></b><span></span></div><div class="bar en"><b></b><span></span></div><div class="abil"></div></div>
        <div class="inv"><div class="slots"></div><button class="shopbtn"><span class="coin"></span><b>300</b><em>LOJA <kbd>C</kbd></em></button></div>
      </div>
      <canvas id="minimap" width="${MM.w}" height="${MM.h}"></canvas>
      <div id="shop"><header><h2>ARSENAL AXIOM</h2><span class="gold"><span class="coin"></span><b></b></span><button class="x">✕</button></header><p class="note"></p><div class="grid"></div></div>
      <div id="stick"><div class="knob"></div></div><div id="skills"></div>
      <div id="tip"></div><div id="msg"></div>
      <div id="end"><div class="card"><h1></h1><p></p><table></table><button>JOGAR NOVAMENTE</button></div></div>
      <div id="pick"><div class="card"><h1>EKOOFALL <b>ARENA</b></h1><p>Escolha seu herói AXIOM. O outro luta ao seu lado, controlado por IA.</p><div class="opts"></div></div></div>`;
    const $ = (q) => root.querySelector(q);
    this.fx = $('#fx'); this.clock = $('#top .clock'); this.tip = $('#tip'); this.msg = $('#msg'); this.endEl = $('#end'); this.endEl.querySelector('button').onclick = () => location.reload();
    this.feed = $('#feed'); this.buffsEl = $('#buffs'); this.pickEl = $('#pick');
    this.el = { axC: $('.ax em span'), ekC: $('.ek em span'), name: $('.who .name'), axK: $('.ax b'), ekK: $('.ek b'), axT: $('.ax s'), ekT: $('.ek s'), kda: $('#kda b'), hp: $('.hp b'), hpT: $('.hp span'), en: $('.en b'), enT: $('.en span'), xp: $('.xp b'), xpT: $('.xp span'), lvl: $('.lvl'), stats: $('.stats'), gold: $('.shopbtn b'), shopGold: $('#shop .gold b'), note: $('#shop .note'), shopBtn: $('.shopbtn') };

    // ability row (PC) + round touch buttons share the same state
    const abil = $('.abil'), touch = $('#skills'); this.btn = {}; this.tbtn = {};
    for (const id of ['passive', 'q', 'w', 'e', 'r']) {
      const b = document.createElement('div'); b.className = 'ab ' + id; b.innerHTML = `${svg(ICON[id])}<div class="cd"></div><em></em>${KEY[id] ? `<kbd>${KEY[id]}</kbd><u class="pips"></u><span class="plus" title="Subir nível [${NUM[id]}]">+<small>${NUM[id]}</small></span>` : ''}<i></i>`;
      abil.appendChild(b); this.btn[id] = { el: b, cd: b.querySelector('.cd'), txt: b.querySelector('em'), cost: b.querySelector('i'), pips: b.querySelector('.pips') };
      b.addEventListener('pointerenter', () => { const h = this.hero; if (!h) return; const def = id === 'passive' ? h.kit.passive : h.skills[id]; this.showTip(`<b>${def.name}${KEY[id] ? ' [' + KEY[id] + ']' : ''}</b>${def.desc}${def.cd ? `<small>Recarga ${def.cd.join(' / ')}s · Energia ${def.cost} · Nível ${h.ranks[id]}/${RANK_MAX}</small>` : ''}`); }); b.addEventListener('pointerleave', () => this.hideTip());
      if (id !== 'passive') { b.addEventListener('pointerdown', (e) => { e.preventDefault(); if (e.target.closest('.plus')) input.cmds.push({ t: 'level', k: id }); else input.cmds.push({ t: 'cast', k: id, point: input.aim ? { x: input.aim.x, z: input.aim.z } : null }); }); }
    }
    for (const id of ['basic', 'q', 'w', 'e', 'r']) {
      const b = document.createElement('div'); b.className = 'sk ' + id; b.innerHTML = `${svg(ICON[id])}<div class="cd"></div><em></em>`;
      touch.appendChild(b); this.tbtn[id] = { el: b, cd: b.querySelector('.cd'), txt: b.querySelector('em') }; this.bindTouch(b, id);
    }
    this.joystick($('#stick'));

    // inventory + shop
    const slots = $('.slots'); this.slots = Array.from({ length: SLOTS }, () => { const s = document.createElement('div'); s.className = 'slot'; slots.appendChild(s); return s; });
    const grid = $('#shop .grid'); this.cards = ITEMS.map((it) => {
      const c = document.createElement('button'); c.className = 'item'; c.innerHTML = `${svg(`<path d="${it.icon}"/>`)}<div><b>${it.name}</b><span>${it.desc}</span></div><em><span class="coin"></span>${it.cost}</em>`;
      c.onclick = () => { input.cmds.push({ t: 'buy', item: it }); this.invDirty = true; }; grid.appendChild(c); return { c, it };
    });
    this.shop = $('#shop'); const toggle = (v) => this.shop.classList.toggle('on', v);
    this.el.shopBtn.onclick = () => toggle(); $('#shop .x').onclick = () => toggle(false);
    addEventListener('keydown', (e) => { if (e.code === 'KeyC' || e.code === 'KeyP') { if (!this.shop.classList.contains('on') && this.hero && this.hero.alive && !this.hero.atBase) this.announce('A loja só abre na base — aperte B para retornar', 'warn'); toggle(); } if (e.code === 'Escape') toggle(false); });
    // minimap
    this.mm = $('#minimap').getContext('2d'); this.mmBg = this.paintMap(); this.mmT = 0; this.invDirty = true;
  }
  showTip(html) { this.tip.innerHTML = html; this.tip.classList.add('on'); }
  hideTip() { this.tip.classList.remove('on'); }

  bindTouch(el, id) {
    const inp = this.input; let start = null;
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault(); el.setPointerCapture(e.pointerId); el.classList.add('down');
      if (id === 'basic') { inp.btnBasic = inp.attackHeld = true; return; }
      const h = this.hero; if (h && h.canLevel(id) && h.ranks[id] === 0) { inp.cmds.push({ t: 'level', k: id }); return; }
      start = { x: e.clientX, y: e.clientY, dir: null, mag: 0 }; const def = h?.skills[id]; if (def) this.showTip(`<b>${def.name}</b>${def.desc}`);
    });
    el.addEventListener('pointermove', (e) => {
      if (!start) return; const dx = e.clientX - start.x, dy = e.clientY - start.y, d = Math.hypot(dx, dy);
      const h = this.hero; if (d > 14 && h) { start.dir = inp.screenDir(dx, dy); start.mag = Math.min(1, d / 90); const r = h.skills[id].range || 0; inp.aimKey = id; inp.aim = h.pos.clone().addScaledVector(start.dir, r * start.mag); }
      else if (start.dir) { start.dir = null; start.cancel = true; inp.aimKey = null; }
    });
    const up = (e) => {
      el.classList.remove('down'); this.hideTip();
      if (id === 'basic') { inp.btnBasic = inp.attackHeld = false; return; }
      if (!start) return; inp.aimKey = null; inp.aim = null;
      if (e.type === 'pointerup' && !(start.cancel && !start.dir)) inp.touchCast(id, start.dir, start.mag);
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

  paintMap() {
    const c = document.createElement('canvas'); c.width = MM.w; c.height = MM.h; const x = c.getContext('2d'), X = (v) => MM.w / 2 + v * MM.sx, Z = (v) => MM.h / 2 + v * MM.sz;
    x.fillStyle = '#1a241a'; x.fillRect(0, 0, MM.w, MM.h);
    x.fillStyle = '#243024'; for (let i = 0; i < 260; i++) { x.globalAlpha = 0.5; x.beginPath(); x.arc(Math.random() * MM.w, Math.random() * MM.h, 3 + Math.random() * 9, 0, 6.3); x.fill(); } x.globalAlpha = 1;
    x.fillStyle = '#5c5444'; x.beginPath(); for (let wx = -74; wx <= 74; wx += 2) x.lineTo(X(wx), Z(-5.6 * widen(wx))); for (let wx = 74; wx >= -74; wx -= 2) x.lineTo(X(wx), Z(5.6 * widen(wx))); x.fill();
    x.strokeStyle = '#4c4638'; x.lineWidth = PATH_R * 2 * MM.sx; x.lineCap = 'round'; for (const [a, b, c2, d] of PATHS) { x.beginPath(); x.moveTo(X(a), Z(b)); x.lineTo(X(c2), Z(d)); x.stroke(); }
    x.fillStyle = '#6a7a2c'; for (const b of BRUSH) { x.beginPath(); x.arc(X(b.x), Z(b.z), b.r * MM.sx, 0, 6.3); x.fill(); }
    for (const cp of CAMPS) { x.fillStyle = '#3a2c4a'; x.beginPath(); x.arc(X(cp.x), Z(cp.z), cp.r * MM.sx, 0, 6.3); x.fill(); }
    x.fillStyle = '#7f93a8'; x.fillRect(X(-100), Z(-23), X(-54) - X(-100), 46 * MM.sz); x.fillStyle = '#6a4a38'; x.beginPath(); x.ellipse(X(BASE_X + 4), Z(0), 30 * MM.sx, 24 * MM.sz, 0, 0, 6.3); x.fill();
    return c;
  }
  drawMap(hero, game, rig) {
    const x = this.mm, X = (v) => MM.w / 2 + v * MM.sx, Z = (v) => MM.h / 2 + v * MM.sz; x.drawImage(this.mmBg, 0, 0);
    const col = { axiom: '#45d8ff', ekoo: '#ff6a3c', vessari: '#b070ff' };
    for (const e of game.ents) {
      if (!e.alive || e.isHero) continue; x.fillStyle = col[e.team] || '#b070ff';
      if (e.isTower) { const k = e.isCore ? 7 : 5; x.fillRect(X(e.pos.x) - k, Z(e.pos.z) - k, k * 2, k * 2); x.strokeStyle = '#0a0e12'; x.lineWidth = 1.5; x.strokeRect(X(e.pos.x) - k, Z(e.pos.z) - k, k * 2, k * 2); continue; }
      if (e.isTower) { x.fillRect(X(e.pos.x) - 5, Z(e.pos.z) - 5, 10, 10); x.strokeStyle = '#0a0e12'; x.lineWidth = 1.5; x.strokeRect(X(e.pos.x) - 5, Z(e.pos.z) - 5, 10, 10); }
      else { x.beginPath(); x.arc(X(e.pos.x), Z(e.pos.z), e.kind === 'eco' ? 3 : 2.2, 0, 6.3); x.fill(); }
    }
    for (const c of game.camps) if (!c.units.length && c.respawnAt) { x.fillStyle = '#d0b8ff'; x.font = 'bold 11px sans-serif'; x.textAlign = 'center'; x.fillText(Math.ceil(c.respawnAt - game.t) + 's', X(c.c.x), Z(c.c.z) + 4); }
    // camera footprint + hero
    const t = rig.target, k = rig.dist / 48; x.strokeStyle = 'rgba(255,255,255,.75)'; x.lineWidth = 1.2; x.save(); x.translate(X(t.x), Z(t.z)); x.rotate(-0.61); x.strokeRect(-24 * k * MM.sx, -15 * k * MM.sz, 48 * k * MM.sx, 30 * k * MM.sz); x.restore();
    for (const h of game.heroes) { if (!h.alive || (h.team !== hero.team && h.targetable === false)) continue; x.fillStyle = h === hero ? '#ffffff' : col[h.team]; x.strokeStyle = h === hero ? '#19c8ee' : '#0a0e12'; x.lineWidth = 2; x.beginPath(); x.arc(X(h.pos.x), Z(h.pos.z), h === hero ? 4.4 : 4, 0, 6.3); x.fill(); x.stroke(); }
  }

  end(result, st) {
    const win = result === 'victory';
    this.endEl.className = 'on ' + result; this.endEl.querySelector('h1').textContent = win ? 'VITÓRIA' : 'DERROTA';
    this.endEl.querySelector('p').innerHTML = (win ? 'A torre de rádio EKOO caiu. O sinal das 3h17 foi silenciado.' : 'A torre AXIOM foi destruída. A quarentena falhou.') + `<br><b>${mmss(st.time)}</b> · abates <b>${st.score.axiom}</b> × <b>${st.score.ekoo}</b> · acampamentos Vessari <b>${st.camps.axiom}</b> × <b>${st.camps.ekoo}</b>`;
    this.endEl.querySelector('table').innerHTML = '<tr><th>Herói</th><th>Nv</th><th>A</th><th>M</th><th>Farm</th><th>Dano</th></tr>' + st.heroes.map((h) => `<tr class="${h.team}${h.me ? ' me' : ''}"><td>${h.name}${h.me ? ' (você)' : ''}</td><td>${h.level}</td><td>${h.kills}</td><td>${h.deaths}</td><td>${h.cs}</td><td>${Math.round(h.dmg)}</td></tr>`).join('');
  }

  announce(text, cls = '') { const d = document.createElement('div'); d.className = cls; d.textContent = text; this.feed.prepend(d); while (this.feed.children.length > 4) this.feed.lastChild.remove(); setTimeout(() => d.classList.add('out'), 4200); setTimeout(() => d.remove(), 5000); }
  // hero select: resolves with the chosen kit id
  pickHero(kits) {
    return new Promise((res) => {
      const box2 = this.pickEl.querySelector('.opts'); this.pickEl.classList.add('on');
      for (const k of kits) { const c = document.createElement('button'); c.innerHTML = `<i>${k.role}</i><b>${k.name}</b><span>${k.title}</span><p>${k.blurb}</p><ul>${['q', 'w', 'e', 'r'].map((s) => `<li><kbd>${s.toUpperCase()}</kbd> ${k.skills[s].name}</li>`).join('')}</ul>`; c.onclick = () => { this.pickEl.classList.remove('on'); res(k.id); }; box2.appendChild(c); }
    });
  }
  setHero(hero) { this.hero = hero; this.el.name.textContent = hero.kit.name; }
  update(hero, time, game, rig, dt) {
    this.hero = hero; const E = this.el;
    this.clock.textContent = mmss(time); E.axK.textContent = game.score.axiom; E.ekK.textContent = game.score.ekoo; E.axC.textContent = game.campScore.axiom; E.ekC.textContent = game.campScore.ekoo; E.kda.textContent = hero.stat.kills + ' / ' + hero.stat.deaths + ' / ' + hero.stat.cs;
    const sh = (team) => { const ts = game.towers.filter((t) => t.team === team); return 100 * ts.reduce((a, t) => a + t.hp, 0) / ts.reduce((a, t) => a + t.maxHp, 0) + '%'; }; E.axT.style.width = sh('axiom'); E.ekT.style.width = sh('ekoo');
    E.hp.style.width = (100 * hero.hp / hero.maxHp) + '%'; E.hpT.textContent = Math.ceil(hero.hp) + ' / ' + hero.maxHp; E.en.style.width = hero.energy + '%'; E.enT.textContent = Math.floor(hero.energy) + ' / 100';
    const need = xpNeed(hero.level), max = hero.level >= MAX_LEVEL; E.xp.style.width = (max ? 100 : 100 * hero.xp / need) + '%'; E.xpT.textContent = max ? 'NÍVEL MÁXIMO' : `XP ${Math.floor(hero.xp)} / ${need}`; E.lvl.textContent = hero.level;
    E.lvl.classList.toggle('up', hero.t - (hero.leveledAt ?? -9) < 1.2);
    const g = Math.floor(hero.gold); E.gold.textContent = g; E.shopGold.textContent = g;
    const dead = !hero.alive && hero.respawnAt > hero.t; this.msg.classList.toggle('on', dead || !!hero.recall); if (dead) this.msg.textContent = hero.kit.name + ' ABATIDO — retornando em ' + Math.ceil(hero.respawnAt - hero.t) + 's'; else if (hero.recall) this.msg.textContent = 'RETORNANDO À BASE… ' + (hero.recall.dur - hero.recall.t).toFixed(1) + 's';
    this.msg.classList.toggle('recall', !dead && !!hero.recall);

    for (const set of [this.btn, this.tbtn]) for (const id in set) {
      const b = set[id], sk = hero.skills[id]; if (!sk) continue;
      const rank = hero.ranks[id] ?? 1, left = Math.max(0, sk.ready - hero.t), frac = left / (sk.cdNow || 1), locked = rank === 0, canUp = hero.canLevel?.(id);
      b.cd.style.background = left > 0 ? `conic-gradient(rgba(4,8,14,.82) ${frac * 360}deg, transparent 0)` : 'none';
      b.txt.textContent = locked ? (id === 'r' && hero.level < ULT_AT[0] ? 'NV' + ULT_AT[0] : '') : left > 0.05 ? (left < 1 ? left.toFixed(1) : Math.ceil(left)) : '';
      if (b.pips) { const key = rank + '|' + canUp; if (b.pk !== key) { b.pk = key; b.pips.innerHTML = Array.from({ length: RANK_MAX }, (_, i) => `<s class="${i < rank ? 'on' : ''}"></s>`).join(''); b.el.classList.toggle('up', !!canUp); } } else b.el.classList.toggle('up', !!canUp);
      if (b.cost) b.cost.textContent = sk.cost || '';
      b.el.classList.toggle('off', locked || left > 0.05 || hero.energy < (sk.cost || 0)); b.el.classList.toggle('lit', !!sk.lit); b.el.classList.toggle('locked', locked);
    }
    const bk = Object.keys(BUFFS).filter((k) => hero.buffs[k] > hero.t).map((k) => k + Math.ceil(hero.buffs[k] - hero.t)).join(',') + (hero.shield > 0 ? 's' + Math.ceil(hero.shield / 20) : '') + '|' + hero.points + (hero.brush >= 0 ? 'b' + (hero.hidden.ekoo ? 1 : 0) : '');
    if (bk !== this.bk) { this.bk = bk; this.buffsEl.innerHTML = Object.keys(BUFFS).filter((k) => hero.buffs[k] > hero.t).map((k) => `<div class="${k}" title="${BUFFS[k].desc}"><b>${BUFFS[k].name}</b><i>${Math.ceil(hero.buffs[k] - hero.t)}s</i></div>`).join('') + (hero.shield > 0 ? `<div class="shield"><b>ESCUDO</b><i>${Math.ceil(hero.shield)}</i></div>` : '') + (hero.brush >= 0 ? `<div class="hide"><b>${hero.hidden.ekoo ? 'OCULTO' : 'REVELADO'}</b><i>milharal</i></div>` : '') + (hero.points > 0 ? `<div class="pts"><b>${hero.points} PONTO${hero.points > 1 ? 'S' : ''} DE HABILIDADE</b><i>teclas 1 2 3 4</i></div>` : ''); }

    if ((this.mmT -= dt) <= 0) {                      // 10 Hz: minimap, stats, shop state
      this.mmT = 0.1; this.drawMap(hero, game, rig);
      const pct = (v) => Math.round(v * 100) + '%';
      E.stats.innerHTML = `<div><i>ATQ</i><b>${Math.round(hero.atk)}</b></div><div><i>VEL</i><b>${hero.speed.toFixed(1)}</b></div><div><i>DEF</i><b>${pct(hero.armor)}</b></div><div><i>CRIT</i><b>${pct(hero.crit)}</b></div><div><i>ROUBO</i><b>${pct(hero.steal)}</b></div><div><i>RECARGA</i><b>−${pct(hero.haste)}</b></div>`;
      const can = hero.atBase || !hero.alive; E.note.textContent = can ? 'Você está na base: clique num item para comprar.' : 'Volte à base (ou aguarde o retorno) para comprar.'; E.note.classList.toggle('ok', can);
      let afford = false;
      for (const { c, it } of this.cards) { const why = hero.canBuy(it); c.className = 'item' + (why ? ' ' + why : ' ok'); if (!why || why === 'base') afford = afford || hero.gold >= it.cost; }
      E.shopBtn.classList.toggle('ready', afford && can && hero.items.length < SLOTS);
      if (this.invDirty || this.invN !== hero.items.length) {
        this.invDirty = false; this.invN = hero.items.length;
        this.slots.forEach((s, i) => { const it = hero.items[i]; s.innerHTML = it ? svg(`<path d="${it.icon}"/>`) : ''; s.className = 'slot' + (it ? ' full' : ''); s.onpointerenter = it ? () => this.showTip(`<b>${it.name}</b>${it.desc}`) : null; s.onpointerleave = () => this.hideTip(); });
      }
    }
  }
}
