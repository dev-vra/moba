// Dev helper: frame stats of the running game.  node tools/perf.mjs "q=high" [seconds]
import puppeteer from 'puppeteer-core'; import fs from 'node:fs';
const [query = 'q=high', secs = '6'] = process.argv.slice(2);
const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/opt/google/chrome/chrome'].find((p) => fs.existsSync(p));
const br = await puppeteer.launch({ executablePath: exe, headless: 'new', args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11'] });
const pg = await br.newPage(); await pg.setViewport({ width: 960, height: 540 });
pg.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 300)));
await pg.goto('http://localhost:5173/?' + query); await pg.waitForFunction('window.__ready', { timeout: 60000 });
const r = await pg.evaluate((secs) => new Promise((res) => {
  const g = window.__g, i = g.renderer.info; let n = 0, cpu = 0; const t0 = performance.now(); let last = t0;
  (function f() { n++; if (performance.now() - t0 < secs * 1000) requestAnimationFrame(f); else {
    let meshes = 0, lights = 0; g.scene.traverse((o) => { if (o.isMesh || o.isPoints || o.isSprite) meshes++; if (o.isLight) lights++; });
    res({ fps: +(n / secs).toFixed(1), calls: i.render.calls, tris: i.render.triangles, points: i.render.points, programs: i.programs.length, geos: i.memory.geometries, tex: i.memory.textures, objects: meshes, lights, ents: g.game.ents.length, gameT: +g.game.t.toFixed(1) }); } })();
}), +secs);
console.log(JSON.stringify(r)); await br.close();
