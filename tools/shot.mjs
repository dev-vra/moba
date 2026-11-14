// Dev helper: low-res screenshot of the running dev server.  node tools/shot.mjs out.jpg "x=0&z=0" [w] [h]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const [out = 'shots/shot.jpg', query = '', w = '960', h = '540'] = process.argv.slice(2);
const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/opt/google/chrome/chrome', '/usr/bin/google-chrome'].find((p) => fs.existsSync(p));
fs.mkdirSync('shots', { recursive: true });
const browser = await puppeteer.launch({ executablePath: exe, headless: 'new', args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11', '--mute-audio'] });
const page = await browser.newPage();
await page.setViewport({ width: +w, height: +h, deviceScaleFactor: 1 });
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) console.log('[' + m.type() + ']', m.text().slice(0, 400)); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 600)));
const t0 = Date.now();
await page.goto(`http://localhost:${process.env.PORT || 5173}/?${query}`, { waitUntil: 'load' });
try { await page.waitForFunction('window.__ready', { timeout: 30000 }); } catch { console.log('[timeout] never ready'); }
console.log('ready in', Date.now() - t0, 'ms');
if (process.env.EVAL) await page.evaluate(process.env.EVAL);
await new Promise((r) => setTimeout(r, +(process.env.WAIT || 2500)));
await page.screenshot({ path: out, type: 'jpeg', quality: 80 });
const fps = await page.evaluate(() => new Promise((res) => { let n = 0; const s = performance.now(); (function f() { n++; performance.now() - s < 1000 ? requestAnimationFrame(f) : res(n); })(); }));
console.log('fps', fps);
await browser.close();
