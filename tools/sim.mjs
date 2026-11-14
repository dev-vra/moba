// Dev helper: fast-forwarded match, optional autopilot hero.  node tools/sim.mjs <speed> <realSeconds> [bot]
import puppeteer from 'puppeteer-core'; import fs from 'node:fs';
const [speed = '6', secs = '40', bot = ''] = process.argv.slice(2);
const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/opt/google/chrome/chrome'].find((p) => fs.existsSync(p));
const br = await puppeteer.launch({ executablePath: exe, headless: 'new', args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11'] });
const pg = await br.newPage(); await pg.setViewport({ width: 640, height: 360 });
pg.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 400)));
pg.on('console', (m) => { if (m.type() === 'error') console.log('[error]', m.text().slice(0, 300)); });
await pg.goto(`http://localhost:5173/?q=low&grass=0&speed=${speed}`); await pg.waitForFunction('window.__ready', { timeout: 60000 });
if (bot) await pg.evaluate((mode) => {
  const g = window.__g, h = g.hero, inp = g.input, rig = g.rig;
  window.__bot = () => {
    if (!h.alive || g.game.over) { inp.stick.set(0, 0); inp.keyBasic = false; return; }
    const G = g.game, low = h.hp < h.maxHp * 0.3, near = G.nearest('axiom', h.pos, 30);
    const wave = G.ents.filter((e) => e.isUnit && e.alive && e.team === 'axiom' && e.lane).reduce((m, e) => Math.max(m, e.pos.x), -60);
    let tx, tz = 0;
    if (low || (h.retreat && h.hp < h.maxHp * 0.85)) { h.retreat = true; tx = -66; } else { h.retreat = false;
      if (mode === 'jungle' && G.camps[0].units.some((u) => u.alive) && G.t > 20) { const u = G.camps[0].units.find((u) => u.alive); tx = u.pos.x; tz = u.pos.z; if (Math.abs(h.pos.z) < 6 && Math.abs(h.pos.x + 22) > 2) { tx = -22; tz = 0; } else if (Math.abs(h.pos.z) < 19) { tx = -21.5; tz = -20; } }
      else if (near && near.pos.x < wave + 9) { tx = near.pos.x; tz = near.pos.z; } else tx = wave - 1; }
    const dx = tx - h.pos.x, dz = tz - h.pos.z, d = Math.hypot(dx, dz);
    if (d > 2.2) inp.stick.set((dx * rig.right.x + dz * rig.right.z) / d, (dx * rig.fwd.x + dz * rig.fwd.z) / d); else inp.stick.set(0, 0);
    const t = G.nearest('axiom', h.pos, 5); inp.keyBasic = !!t && !h.retreat;
    if (t && !h.retreat) for (const k of ['s2', 's1', 's3', 'ult']) if (h.can(k) && Math.random() < 0.05) inp.events.push({ skill: k, dir: null });
  };
}, bot);
const t0 = Date.now();
while (Date.now() - t0 < +secs * 1000) {
  await new Promise((r) => setTimeout(r, 5000));
  const s = await pg.evaluate(() => { const G = window.__g.game, h = window.__g.hero, c = (t, f) => G.ents.filter((e) => e.isUnit && e.alive && e.team === t && (f ? f(e) : true)).length;
    return `t=${G.t.toFixed(0).padStart(3)} towers A:${G.towers[0].hp} E:${G.towers[1].hp} | units A:${c('axiom')} E:${c('ekoo')} V:${c('vessari')} ecoA:${c('axiom', (e) => e.kind === 'eco')} | hero hp:${Math.round(h.hp)} x:${h.pos.x.toFixed(0)} z:${h.pos.z.toFixed(0)} k:${G.kills} d:${h.deaths} | front A:${Math.max(-99, ...G.ents.filter((e) => e.isUnit && e.alive && e.team === 'axiom').map((e) => e.pos.x)).toFixed(0)} | over:${G.over}`; });
  console.log(s); if (s.includes('over:victory') || s.includes('over:defeat')) break;
}
await br.close();
