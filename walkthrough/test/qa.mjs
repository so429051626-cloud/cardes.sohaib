// QA (section 13): tour clearance, touch + keyboard controls, collision,
// checkpoint screenshots at 1080x1920 and 1920x1080 with renderer.info budgets.
//   node test/qa.mjs --tour --touch --shots
import fs from 'node:fs';
import path from 'node:path';
import { serve, open } from './harness.mjs';

const args = new Set(process.argv.slice(2));
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const report = { date: new Date().toISOString() };
const srv = await serve();

if (args.has('--tour') || args.has('--touch')) {
  const { browser, page, log } = await open({ w: 540, h: 960, touch: true, query: 'quality=medium&noadapt&manual' });
  report.loadMs = log.loadMs;
  if (args.has('--tour')) {
    report.tour = await page.evaluate(() => {
      const T = window.__tour;
      const out = { minDist: 9, minAt: 0, below02: [], outside: [] };
      for (let t = 0; t <= T.end + 1e-6; t += 0.02) {
        const s = T.sample(t);
        const d = T.col.dist(s.X, s.Y);
        if (d < out.minDist) { out.minDist = d; out.minAt = t; }
        if (d < 0.2) out.below02.push([+t.toFixed(2), +d.toFixed(3)]);
        const z = T.world.zoneAt(s.X, s.Y, null);
        const nav = T.nav.ok(T.nav.cx(s.X), T.nav.cy(s.Y));
        if (!z && !nav) out.outside.push(+t.toFixed(2));
      }
      out.minDist = +out.minDist.toFixed(3);
      return out;
    });
    console.log('tour', JSON.stringify(report.tour).slice(0, 600));
  }
  if (args.has('--touch')) {
    const cdp = await page.context().newCDPSession(page);
    const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i + 1 })) });
    const frames = (n) => page.evaluate((n) => { for (let i = 0; i < n; i++) window.__tour.frame(1 / 30); return window.__tour.info(); }, n);
    const pose = (X, Y, yaw, pitch = 0) => page.evaluate(([X, Y, yaw, pitch]) => window.__tour.pose(X, Y, yaw, pitch), [X, Y, yaw, pitch]);
    const joy = await page.evaluate(() => { const r = document.getElementById('joy').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    const R = {};
    // A: joystick forward
    await pose(3.5, 1.0, 0);
    await touch('touchStart', [joy]); await touch('touchMove', [[joy[0], joy[1] - 46]]);
    let i = await frames(30);
    await touch('touchEnd', []); await frames(10);
    i = await page.evaluate(() => window.__tour.info());
    R.joystickForward = { from: [3.5, 1.0], to: i.pos.map((v) => +v.toFixed(2)), pass: i.pos[1] > 1.8 };
    // B: wall collision (reception south wall, Y = -6.0)
    await pose(5.5, -5.0, 180);
    await touch('touchStart', [joy]); await touch('touchMove', [[joy[0], joy[1] - 46]]);
    i = await frames(90);
    await touch('touchEnd', []);
    R.wallStop = { pos: i.pos.map((v) => +v.toFixed(3)), wallY: -6.0, pass: i.pos[1] >= -6.0 + 0.24 && i.pos[1] < -5.6 };
    // B2: slide along the wall when pushing diagonally
    await pose(5.0, -5.5, 225);
    await touch('touchStart', [joy]); await touch('touchMove', [[joy[0], joy[1] - 46]]);
    i = await frames(45);
    await touch('touchEnd', []);
    R.wallSlide = { pos: i.pos.map((v) => +v.toFixed(3)), pass: i.pos[1] >= -5.77 && i.pos[0] < 4.6 };
    // C: furniture collision (kitchen island, Y 11.7 .. 12.7)
    await pose(-3.0, 10.4, 0);
    await touch('touchStart', [joy]); await touch('touchMove', [[joy[0], joy[1] - 46]]);
    i = await frames(75);
    await touch('touchEnd', []);
    R.furnitureStop = { pos: i.pos.map((v) => +v.toFixed(3)), islandY0: 11.7, pass: i.pos[1] <= 11.7 - 0.24 };
    // D: drag to look
    await pose(3.5, 1.0, 0);
    await touch('touchStart', [[150, 400]]);
    for (let k = 1; k <= 5; k++) await touch('touchMove', [[150 + k * 20, 400]]);
    await touch('touchEnd', []);
    i = await frames(20);
    R.dragLook = { yaw: +i.yaw.toFixed(1), pass: i.yaw < -15 };
    // E: pinch zoom
    const fov0 = await page.evaluate(() => window.__tour.camera.fov);
    await touch('touchStart', [[200, 400], [340, 600]]);
    for (let k = 1; k <= 4; k++) await touch('touchMove', [[200 - k * 15, 400 - k * 20], [340 + k * 15, 600 + k * 20]]);
    await touch('touchEnd', []);
    await frames(20);
    const fov1 = await page.evaluate(() => window.__tour.camera.fov);
    R.pinch = { fov0: +fov0.toFixed(1), fov1: +fov1.toFixed(1), pass: fov1 < fov0 - 3 };
    // F: tap the floor to walk there
    await pose(3.5, 0.8, 0, -25);
    await touch('touchStart', [[270, 760]]); await touch('touchEnd', []);
    i = await frames(90);
    R.tapToWalk = { pos: i.pos.map((v) => +v.toFixed(2)), pass: Math.hypot(i.pos[0] - 3.5, i.pos[1] - 0.8) > 0.6 };
    // G: walk through a doorway (corridor -> bedroom 2)
    await pose(8.05, 9.4, 180);
    await touch('touchStart', [joy]); await touch('touchMove', [[joy[0], joy[1] - 46]]);
    i = await frames(75);
    await touch('touchEnd', []);
    R.doorway = { pos: i.pos.map((v) => +v.toFixed(2)), zone: i.zone, pass: i.zone === 'H' };
    // H: auto-tour pauses on touch
    await page.evaluate(() => { const T = window.__tour; T.player.startTour(10); T.frame(1 / 30); });
    await touch('touchStart', [[270, 300]]); await touch('touchEnd', []);
    const st = await page.evaluate(() => ({ mode: window.__tour.player.mode, paused: window.__tour.player.tourPaused, btn: document.getElementById('tour-btn').textContent }));
    R.tourPause = { ...st, pass: st.mode === 'free' && st.paused };
    // I: RTL
    R.rtl = await page.evaluate(() => ({ ui: getComputedStyle(document.getElementById('ui')).direction, menu: getComputedStyle(document.getElementById('menu')).direction }));
    report.touch = R;
    console.log('touch', JSON.stringify(R, null, 1));
    report.consoleErrors = log.errors;
    report.externalRequests = log.requests;
    await browser.close();
  }
  if (!args.has('--touch')) await browser.close();
}

if (args.has('--keys')) {
  const { browser, page } = await open({ w: 1280, h: 720, query: 'quality=medium&noadapt&manual' });
  await page.evaluate(() => window.__tour.pose(3.5, 1.0, 0));
  await page.keyboard.down('w');
  const i = await page.evaluate(() => { for (let k = 0; k < 30; k++) window.__tour.frame(1 / 30); return window.__tour.info(); });
  await page.keyboard.up('w');
  report.keys = { pos: i.pos, pass: i.pos[1] > 1.8 };
  console.log('keys', JSON.stringify(report.keys));
  await browser.close();
}

if (args.has('--shots')) {
  const out = path.join(root, 'screenshots');
  fs.mkdirSync(out, { recursive: true });
  report.budgets = {};
  for (const [tag, w, h] of [['portrait', 1080, 1920], ['landscape', 1920, 1080]]) {
    const { browser, page, log } = await open({ w, h, query: 'quality=medium&noadapt&manual&nohud' });
    const cps = await page.evaluate(() => window.__tour.checkpoints);
    for (const t of cps) {
      const info = await page.evaluate((t) => window.__tour.goto(t), t);
      const name = `${tag}_${t.toFixed(1).padStart(4, '0')}.jpg`;
      await page.screenshot({ path: path.join(out, name), type: 'jpeg', quality: 86 });
      report.budgets[`${tag}@${t}`] = { calls: info.calls, triangles: info.triangles, textures: info.textures, zone: info.zone, visible: info.visible.join(',') };
    }
    report.texMB = (await page.evaluate(() => window.__tour.info())).texMB;
    report['errors_' + tag] = log.errors;
    await browser.close();
  }
  const vals = Object.values(report.budgets);
  report.maxCalls = Math.max(...vals.map((v) => v.calls));
  report.maxTriangles = Math.max(...vals.map((v) => v.triangles));
  console.log('max calls', report.maxCalls, 'max tris', report.maxTriangles, 'texMB', report.texMB);
}

fs.writeFileSync(path.join(root, 'test', 'qa-report.json'), JSON.stringify(report, null, 1));
srv.close();
