// Boot: textures -> materials -> zones -> lights -> shader compile -> env
// probes -> first frame. Then the frame loop with zone/portal culling.
import * as THREE from 'three';
import { Renderer, PRESETS, ORDER, installGrade, GRADE } from './render.js';
import { buildTextures } from './core/textures.js';
import { Materials } from './core/materials.js';
import { World } from './world.js';
import { Lighting, Probes } from './lighting.js';
import { Player, ShiftCamera, Collision, NavGrid } from './player.js';
import { UI } from './ui/ui.js';
import { ROOMS } from './rooms/index.js';
import { sampleTour, TOUR_END, CHECKPOINTS } from './tour.js';

const Q = new URLSearchParams(location.search);
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
const isPhone = () => (navigator.maxTouchPoints > 0 && Math.min(screen.width, screen.height) < 900) || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);

async function boot() {
  const ui = new UI();
  if (Q.has('nohud')) document.getElementById('ui').style.display = 'none';
  try { await document.fonts.load('40px "Sig Script"'); } catch (e) { /* fallback font */ }
  const grade = {};
  if (Q.get('tm')) grade.tone = Q.get('tm');
  if (Q.get('exp')) grade.exposure = parseFloat(Q.get('exp'));
  if (Q.get('lift')) grade.lift = parseFloat(Q.get('lift'));
  if (Q.get('sat')) grade.sat = parseFloat(Q.get('sat'));
  installGrade(grade);

  const canvas = document.getElementById('app');
  let R;
  try { R = new Renderer(canvas); } catch (e) {
    ui.error('تعذّر تشغيل العرض ثلاثي الأبعاد على هذا الجهاز (WebGL2 غير متاح).');
    throw e;
  }
  const renderer = R.r;
  const deviceCap = isPhone() ? 'medium' : 'high';
  let userChoice = Q.get('quality') || 'auto';
  let preset = PRESETS[userChoice === 'auto' ? deviceCap : userChoice] || PRESETS.medium;
  const adaptive = !Q.has('noadapt');
  ui.qual.value = userChoice;
  R.preset = preset;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, preset.pr));
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  ui.progress(0.02, 'تحضير الخامات');
  await nextFrame();
  const T = await buildTextures(renderer, async (p) => { ui.progress(0.02 + 0.22 * p, 'تحضير الخامات'); await nextFrame(); }, preset.name === 'low' ? 'low' : 'high');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdfe5ea);
  const probes = new Probes(renderer, scene, 256);
  const env0 = probes.placeholder();
  const M = new Materials(T, env0);

  const world = new World();
  await world.build(M, ROOMS, async (p, z) => { ui.progress(0.24 + 0.38 * p, 'بناء الغرف'); await nextFrame(); });
  for (const z of world.zones) scene.add(z.group);

  const lighting = new Lighting(renderer, scene, world);
  const col = new Collision(world.segments, world.circles);
  ui.progress(0.64, 'تجهيز الحركة');
  await nextFrame();
  const nav = new NavGrid(world, col);

  const camera = new ShiftCamera(75, window.innerWidth / window.innerHeight, 0.05, 90);
  scene.add(camera);
  R.setup(scene, camera);
  R.apply(preset, lighting);

  // compile every shader up front so walking into a room never stutters
  ui.progress(0.68, 'تجهيز المؤثرات');
  await nextFrame();
  for (const z of world.zones) { z.group.visible = true; z.setLod('full'); }
  lighting.assign(world.byId.A, [world.byId.B], null, true);
  try { await renderer.compileAsync(scene, camera); } catch (e) { renderer.compile(scene, camera); }

  // env probes: two bounces
  const passes = Q.has('onepass') ? 1 : 2;
  const total = world.zones.length * passes;
  let n = 0;
  for (let pass = 0; pass < passes; pass++) {
    for (const z of world.zones) {
      for (const o of world.zones) { o.setLod('full'); o.group.visible = o === z || z.neighbors.has(o.id); }
      lighting.assign(z, [...z.neighbors].map((id) => world.byId[id]), null, true);
      probes.capture(z);
      n++;
      if (n % 2 === 0) { ui.progress(0.72 + 0.26 * (n / total), 'حساب الإضاءة والانعكاسات'); await nextFrame(); }
    }
  }

  const player = new Player(camera, canvas, world, col, nav, ui);
  const s0 = sampleTour(0);
  player.setPose(s0.X, s0.Y, s0.yaw);
  player.shift = (2 * s0.H) / 100 - 1;

  let cur = null;
  let frameN = 0;
  const labelFor = (z) => {
    if (!z) return '';
    if (z.def.sub) for (const s of z.def.sub) if (player.pos.y >= s.y0) return s.name;
    return z.name;
  };

  // --- portal visibility -------------------------------------------------------
  const pm = new THREE.Matrix4();
  const v4 = new THREE.Vector4();
  function portalRect(p, cam) {
    let x0 = 1, x1 = -1, y0 = 1, y1 = -1, behind = 0;
    for (const v of p.pts) {
      v4.set(v.x, v.y, v.z, 1).applyMatrix4(pm);
      if (v4.w < 0.05) { behind++; continue; }
      const x = v4.x / v4.w, y = v4.y / v4.w;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    if (behind === 4) return cam.position.distanceTo(p.center) < 1.2 ? [-1, 1, -1, 1] : null;
    if (behind > 0) return [-1, 1, -1, 1];
    return [x0, x1, y0, y1];
  }
  function visibleSet(cam, start) {
    pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    const vis = new Map([[start, 'full']]);
    const q = [{ z: start, r: [-1, 1, -1, 1], d: 0 }];
    while (q.length) {
      const { z, r, d } = q.shift();
      for (const p of z.portals) {
        const other = world.byId[p.a === z.id ? p.b : p.a];
        if (other === start) continue;
        const pr = portalRect(p, cam);
        if (!pr) continue;
        const nr = [Math.max(r[0], pr[0]), Math.min(r[1], pr[1]), Math.max(r[2], pr[2]), Math.min(r[3], pr[3])];
        if (nr[0] >= nr[1] || nr[2] >= nr[3]) continue;
        const w = nr[1] - nr[0];
        const lod = w < 0.1 && cam.position.distanceTo(p.center) > 3.5 ? 'shell' : 'full';
        if (vis.has(other)) { if (lod === 'full') vis.set(other, 'full'); continue; }
        vis.set(other, lod);
        if (d < 3) q.push({ z: other, r: nr, d: d + 1 });
      }
    }
    return vis;
  }

  function updateZones(instant = false) {
    const z = world.zoneAt(player.pos.x, player.pos.y, cur) || world.byId.A;
    if (z !== cur) {
      cur = z;
      lighting.assign(cur, [...cur.neighbors].map((id) => world.byId[id]), camera.position, instant);
    }
    ui.showRoom(labelFor(cur));
    const vis = visibleSet(camera, cur);
    for (const o of world.zones) {
      const m = vis.get(o);
      o.group.visible = !!m;
      if (m) o.setLod(m);
    }
    return vis;
  }

  // --- quality -------------------------------------------------------------------
  let cap = userChoice === 'auto' ? deviceCap : userChoice;
  function setPreset(name) {
    preset = PRESETS[name];
    R.apply(preset, lighting);
    lighting.assign(cur, [...cur.neighbors].map((id) => world.byId[id]), camera.position, true);
  }
  ui.on('quality', (v) => {
    userChoice = v;
    cap = v === 'auto' ? deviceCap : v;
    setPreset(cap);
    try { localStorage.setItem('apt-quality', v); } catch (e) { /* storage blocked */ }
  });
  let ftAcc = 0, ftN = 0, slowT = 0, fastT = 0;
  function adapt(dt) {
    if (!adaptive) return;
    ftAcc += dt; ftN++;
    if (ftAcc < 0.5) return;
    const avg = (ftAcc / ftN) * 1000;
    ftAcc = 0; ftN = 0;
    if (avg > 40) { slowT += 0.5; fastT = 0; } else if (avg < 20) { fastT += 0.5; slowT = 0; } else { slowT = 0; fastT = 0; }
    const i = ORDER.indexOf(preset.name), ci = ORDER.indexOf(cap);
    if (slowT >= 2 && i > 0) { setPreset(ORDER[i - 1]); slowT = 0; }
    else if (fastT >= 5 && i < ci) { setPreset(ORDER[i + 1]); fastT = 0; }
  }

  // --- tour / navigation hooks --------------------------------------------------------
  const tourState = () => (player.mode === 'tour' ? 'playing' : player.tourPaused ? 'paused' : 'idle');
  player.onInteract = () => { if (player.mode === 'tour') { player.pauseTour(); ui.setTourState(tourState()); } };
  ui.on('tour', () => {
    if (player.mode === 'tour') player.pauseTour();
    else if (player.tourPaused) player.startTour(player.tourT);
    else player.startTour(0);
    ui.setTourState(tourState());
  });
  ui.on('tourStart', () => { player.startTour(0); ui.setTourState(tourState()); });
  ui.on('tourEnded', () => ui.setTourState('idle'));
  ui.on('go', (d) => { player.mode = 'free'; player.tourPaused = false; ui.setTourState('idle'); player.goTo(d.p[0], d.p[1], 2.4, d.p[2]); });
  ui.on('goPoint', (X, Y) => { player.mode = 'free'; ui.setTourState(tourState()); player.goTo(X, Y, 2.4); });
  ui.on('menuOpen', () => ui.drawMap(player.pos, player.yaw, cur && cur.id));

  window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); R.resize(); });

  // flame + animated uniforms
  const animated = [];
  scene.traverse((o) => { if (o.userData.tick) animated.push(o); });

  // --- test hook -----------------------------------------------------------------------
  window.__tour = {
    ready: false,
    checkpoints: CHECKPOINTS,
    goto(t) {
      player.mode = 'tour'; player.tourT = t; player.tourPaused = false;
      player.update(0);
      player.mode = 'free'; player.tourPaused = true;
      updateZones(true);
      lighting.assign(cur, [...cur.neighbors].map((id) => world.byId[id]), camera.position, true);
      lighting.update(1);
      R.r.shadowMap.needsUpdate = true;
      R.render(0.016);
      return this.info();
    },
    pose(X, Y, yaw, pitch = 0) { player.mode = 'free'; player.path = null; player.tourPaused = false; player.setPose(X, Y, yaw, pitch); player.update(0); updateZones(true); lighting.update(1); R.render(0.016); return this.info(); },
    frame(dt = 1 / 30) { step(dt); return this.info(); },
    info() {
      const i = renderer.info;
      return {
        calls: i.render.calls, triangles: i.render.triangles, textures: i.memory.textures, geometries: i.memory.geometries,
        zone: cur && cur.id, visible: world.zones.filter((z) => z.group.visible).map((z) => z.id + (z.lod === 'shell' ? '*' : '')),
        pos: [player.pos.x, player.pos.y], yaw: player.yaw, preset: preset.name, texMB: Math.round(T.gen.bytes / 1048576),
        zoneStats: Object.fromEntries(world.zones.map((z) => [z.id, z.stats])),
      };
    },
    player, world, renderer, scene, camera, lighting, R, GRADE, col, nav,
    sample: sampleTour, end: TOUR_END,
  };

  function step(dt) {
    frameN++;
    player.update(dt);
    updateZones();
    lighting.update(dt);
    for (const o of animated) o.userData.tick(frameN);
    R.render(dt);
    if (!ui.menu.hidden && frameN % 6 === 0) ui.drawMap(player.pos, player.yaw, cur && cur.id);
  }

  updateZones(true);
  lighting.update(1);
  ui.progress(1, 'جاهز');
  R.render(0.016);
  await nextFrame();
  ui.hideLoading(Q.has('manual'));
  window.__tour.ready = true;

  let last = performance.now();
  const loop = () => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!Q.has('manual')) { step(dt); adapt(dt); }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

boot().catch((e) => {
  console.error(e);
  const t = document.getElementById('ld-text');
  if (t) t.textContent = 'حدث خطأ أثناء التحميل: ' + (e && e.message ? e.message : e);
});
