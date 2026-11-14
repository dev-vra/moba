// Dev: quem causa dano nas torres (por time/tipo) numa partida acelerada só de bots. node tools/towerdmg.mjs <speed> <secs>
import puppeteer from 'puppeteer-core';
const [speed = '14', secs = '45'] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11'] });
const p = await b.newPage(); await p.setViewport({ width: 640, height: 360 }); p.on('pageerror', (e) => console.log('[pageerror]', e.message));
await p.goto(`http://localhost:${process.env.PORT || 5173}/?q=low&style=real&speed=${speed}&hero=vetor&diff=easy`); await p.waitForFunction('window.__ready', { timeout: 60000 });
await p.evaluate(async () => {
  const { Bot } = await import('/src/game/bot.js'); const g = window.__g.game; g.hero.ctrl = new Bot(1); g.hero.power = 1;
  window.__td = {}; const dmg = g.damage.bind(g);
  g.damage = (src, tg, amt, ...r) => { const d = dmg(src, tg, amt, ...r); if (src && !tg.alive && tg.isUnit && tg.lane) { const k = 'KILL ' + tg.team + ' minion by ' + (src.isHero ? src.kit.id : src.isTower ? 'tower' : src.kind); window.__td[k] = (window.__td[k] || 0) + 1; }
    if (tg.isTower && src) { const k = `${tg.team}<-${src.team}:${src.isHero ? 'HERO ' + src.kit.id : src.kind || 'tower'}`; window.__td[k] = (window.__td[k] || 0) + (d || 0); } return d; };
});
await new Promise((r) => setTimeout(r, +secs * 1000));
console.log(await p.evaluate(() => JSON.stringify({ t: Math.round(__g.game.t), over: __g.game.over, td: Object.entries(__td).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + '=' + Math.round(v)) })));
await b.close();
