// Dev helper: screenshot any page path of the dev server.  node tools/shotpage.mjs out.jpg "/view.html?x=1" [w] [h]
import puppeteer from 'puppeteer-core'; import fs from 'node:fs';
const [out, path, w = '1100', h = '420'] = process.argv.slice(2);
const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/opt/google/chrome/chrome'].find((p) => fs.existsSync(p));
const br = await puppeteer.launch({ executablePath: exe, headless: 'new', args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11'] });
const pg = await br.newPage(); await pg.setViewport({ width: +w, height: +h });
pg.on('console', (m) => { const t = m.text(); if (m.type() === 'error' || t.startsWith('[info]')) console.log(t.slice(0, 300)); });
pg.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 400)));
await pg.goto('http://localhost:5173/' + path); try { await pg.waitForFunction('window.__ready', { timeout: 40000 }); } catch { console.log('timeout'); }
await new Promise((r) => setTimeout(r, 600)); await pg.screenshot({ path: out, type: 'jpeg', quality: 80 }); await br.close();
