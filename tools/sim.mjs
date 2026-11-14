// Dev helper: fast-forwarded 2v2 match.  node tools/sim.mjs <speed> <realSeconds> <hero> [idle]
// By default the player's hero is driven by the same Bot brain as the others; "idle" leaves it standing at base.
import puppeteer from 'puppeteer-core'; import fs from 'node:fs';
const [speed = '6', secs = '60', hero = 'vetor', mode = 'bot'] = process.argv.slice(2);
const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/opt/google/chrome/chrome'].find((p) => fs.existsSync(p));
const br = await puppeteer.launch({ executablePath: exe, headless: 'new', args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11'] });
const pg = await br.newPage(); await pg.setViewport({ width: 640, height: 360 });
pg.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 500)));
pg.on('console', (m) => { if (m.type() === 'error') console.log('[error]', m.text().slice(0, 300)); });
await pg.goto(`http://localhost:${process.env.PORT || 5173}/?q=low&grass=0&style=real&speed=${speed}&hero=${hero}`); await pg.waitForFunction('window.__ready', { timeout: 60000 });
if (mode === 'bot') await pg.evaluate(async () => { const { Bot } = await import('/src/game/bot.js'); const g = window.__g; g.hero.ctrl = new Bot(1); });
const t0 = Date.now();
while (Date.now() - t0 < +secs * 1000) {
  await new Promise((r) => setTimeout(r, 6000));
  const s = await pg.evaluate(() => { const G = window.__g.game, c = (t) => G.ents.filter((e) => e.isUnit && e.alive && e.team === t).length;
    return `t=${G.t.toFixed(0).padStart(3)} T ${G.towers.map((t) => (t.isCore ? 'C' : 'T') + t.team[0] + ':' + t.hp).join(' ')} K ${G.score.axiom}x${G.score.ekoo} camps ${G.campScore.axiom}x${G.campScore.ekoo} u ${c('axiom')}/${c('ekoo')}/${c('vessari')} | ` +
      G.heroes.map((h) => `${h.kit.id.slice(0, 4)} L${h.level} ${h.alive ? Math.round(100 * h.hp / h.maxHp) + '%' : 'dead'} x${h.pos.x.toFixed(0)} z${h.pos.z.toFixed(0)} ${h.stat.kills}/${h.stat.deaths} it${h.items.length}`).join(' | ') + ` | over:${G.over}`; });
  console.log(s); if (!s.includes('over:null')) break;
}
await br.close();
