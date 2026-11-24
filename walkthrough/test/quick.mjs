// quick look: node test/quick.mjs out_prefix t1 t2 ... [--w=1080 --h=1920]
import { serve, open } from './harness.mjs';
const args = process.argv.slice(2);
const opt = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), '1'] : [a.slice(2, i), a.slice(i + 1)]; }));
const pos = args.filter((a) => !a.startsWith('--'));
const prefix = pos[0];
const times = pos.slice(1).map(Number);
const srv = await serve();
const { browser, page, log } = await open({ w: +(opt.w || 540), h: +(opt.h || 960), query: opt.q || 'quality=medium&noadapt&manual' });
console.log('load ms', log.loadMs);
for (const t of times) {
  const info = await page.evaluate((t) => window.__tour.goto(t), t);
  await page.screenshot({ path: `${prefix}_${String(t).replace('.', '_')}.jpg`, quality: 85 });
  console.log(t, JSON.stringify({ calls: info.calls, tris: info.triangles, zone: info.zone, vis: info.visible.join(''), tex: info.textures, texMB: info.texMB }));
}
if (opt.stats) console.log(JSON.stringify((await page.evaluate(() => window.__tour.info())).zoneStats));
console.log('errors', log.errors.slice(0, 20));
console.log('requests', log.requests.slice(0, 10));
if (opt.console) console.log(log.console.slice(0, 40).join('\n'));
await browser.close();
srv.close();
