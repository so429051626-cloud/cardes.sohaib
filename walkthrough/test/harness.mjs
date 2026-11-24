// Test harness: serves dist/ on 127.0.0.1, opens it in headless Chromium
// (software WebGL), takes checkpoint screenshots and logs renderer.info.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright'); }
process.env.CHROMIUM_WEBGL_RENDERER = process.env.CHROMIUM_WEBGL_RENDERER || 'lavapipe';
process.env.CHROMIUM_LAVAPIPE_THREADS = process.env.CHROMIUM_LAVAPIPE_THREADS || 'auto';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

export function serve(port = 8765) {
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    let f = path.join(root, 'dist', u.pathname === '/' ? 'index.html' : u.pathname);
    if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise((r) => srv.listen(port, '127.0.0.1', () => r(srv)));
}

export async function open({ w = 1080, h = 1920, query = 'quality=medium&noadapt&manual', touch = false, dpr = 1 } = {}) {
  const browser = await pw.chromium.launch({ args: ['--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, hasTouch: touch, isMobile: touch });
  const page = await ctx.newPage();
  const log = { errors: [], console: [], requests: [] };
  page.on('console', (m) => { const t = m.text(); if (m.type() === 'error') log.errors.push(t); else log.console.push(m.type() + ': ' + t); });
  page.on('pageerror', (e) => log.errors.push('pageerror: ' + e.message));
  page.on('request', (r) => { if (!r.url().startsWith('http://127.0.0.1')) log.requests.push(r.url()); });
  const t0 = Date.now();
  await page.goto('http://127.0.0.1:8765/?' + query);
  await page.waitForFunction(() => window.__tour && window.__tour.ready, null, { timeout: 600000, polling: 500 });
  log.loadMs = Date.now() - t0;
  return { browser, page, log };
}
