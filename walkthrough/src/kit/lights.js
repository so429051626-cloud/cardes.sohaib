// Light fixtures. Origin at floor below the fixture; ceil = ceiling height.
// Every fixture adds a point light (no shadows) through k.light().
import * as THREE from 'three';
import { Kit, sol, emit, tex, C } from '../core/geom.js';
import { kelvin } from '../lighting.js';
import { RNG } from '../core/prng.js';

const WARM = '#ffe2b8';

function canopy(k, ceil, r = 0.07, m = C.brass) {
  k.cyl(m, r, r, 0.025, 0, ceil - 0.0125, 0, { seg: 28 });
}
function fib(n, i) {
  const y = 1 - (2 * (i + 0.5)) / n;
  const r = Math.sqrt(1 - y * y);
  const a = i * 2.399963;
  return [Math.cos(a) * r, y, Math.sin(a) * r];
}

export function sputnik(n, dia, bottom, ceil, o = {}) {
  const k = new Kit('sputnik');
  const gr = 0.06;
  const hub = bottom + dia / 2;
  const R = dia / 2 - gr;
  k.sphere(C.brass, 0.055, 0, hub, 0, { ws: 20, hs: 14 });
  k.rod(C.brass, [0, hub, 0], [0, ceil, 0], 0.009, { seg: 8 });
  canopy(k, ceil);
  const tiers = [0.62, 0.0, -0.62];
  const per = Math.round(n / 3);
  let idx = 0;
  for (let t = 0; t < 3; t++) {
    const el = tiers[t];
    const cnt = t === 1 ? n - 2 * per : per;
    for (let i = 0; i < cnt; i++) {
      const az = (i / cnt) * Math.PI * 2 + t * 0.4;
      const d = [Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)];
      const end = [d[0] * R, hub + d[1] * R, d[2] * R];
      k.rod(C.brass, [d[0] * 0.05, hub + d[1] * 0.05, d[2] * 0.05], end, 0.0045, { seg: 6 });
      k.rod(C.brass, [end[0] - d[0] * 0.02, end[1] - d[1] * 0.02, end[2] - d[2] * 0.02], [end[0] + d[0] * 0.012, end[1] + d[1] * 0.012, end[2] + d[2] * 0.012], 0.012, { seg: 10 });
      k.sphere(emit('#fff4e6', o.glow || 1.3), gr, end[0] + d[0] * gr * 0.95, end[1] + d[1] * gr * 0.95, end[2] + d[2] * gr * 0.95, { ws: 14, hs: 10 });
      idx++;
    }
  }
  k.light({ type: 'point', p: [0, hub - 0.55, 0], color: kelvin(3000), intensity: o.i || 1.2, distance: 6.5 });
  return k;
}

export function tripleRing(bottom, ceil) {
  const k = new Kit('triple');
  const rings = [[0.45, 0.0, 0.12], [0.35, 0.16, -0.1], [0.25, 0.3, 0.08]];
  for (const [R, dy, tilt] of rings) {
    const y = bottom + dy;
    const rot = [Math.PI / 2 + tilt, 0, tilt * 0.6];
    k.torus(C.brass, R, 0.014, 0, y, 0, { rot, ts: 72, rs: 10 });
    k.torus(emit(WARM, 3.0), R - 0.004, 0.0075, 0, y - 0.01, 0, { rot, ts: 72, rs: 6 });
  }
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    k.rod(C.black, [Math.cos(a) * 0.25, bottom + 0.32, Math.sin(a) * 0.25], [Math.cos(a) * 0.1, ceil, Math.sin(a) * 0.1], 0.0015, { seg: 4 });
  }
  canopy(k, ceil, 0.12);
  k.light({ type: 'point', p: [0, bottom + 0.1, 0], color: kelvin(3000), intensity: 2.4, distance: 6 });
  return k;
}

export function crystalDandelion(dia, bottom, ceil) {
  const k = new Kit('dandelion');
  const hub = bottom + dia / 2;
  k.sphere(C.brass, 0.05, 0, hub, 0, { ws: 16, hs: 12 });
  k.rod(C.brass, [0, hub, 0], [0, ceil, 0], 0.008);
  canopy(k, ceil);
  const crystal = sol('#e8eef2', 0.04, 0.85);
  const N = 300;
  for (let i = 0; i < N; i++) {
    const d = fib(N, i);
    const r1 = dia / 2 - 0.01;
    k.rod(crystal, [d[0] * 0.06, hub + d[1] * 0.06, d[2] * 0.06], [d[0] * r1, hub + d[1] * r1, d[2] * r1], 0.0028, { seg: 4 });
    if (i % 3 === 0) k.sphere(emit('#fff4e6', 4), 0.006, d[0] * (r1 + 0.004), hub + d[1] * (r1 + 0.004), d[2] * (r1 + 0.004), { ws: 6, hs: 4 });
  }
  k.light({ type: 'point', p: [0, hub, 0], color: kelvin(2900), intensity: 2.0, distance: 6 });
  return k;
}

export function starburst(n, bottom, ceil) {
  const k = new Kit('starburst');
  const hub = bottom + 0.56;
  k.sphere(C.black, 0.07, 0, hub, 0, { ws: 18, hs: 12 });
  k.rod(C.black, [0, hub, 0], [0, ceil, 0], 0.01);
  canopy(k, ceil, 0.07, C.black);
  const lens = [0.35, 0.45, 0.55];
  for (let i = 0; i < n; i++) {
    const d = fib(n, i);
    const L = lens[i % 3];
    const e = [d[0] * L, hub + d[1] * L, d[2] * L];
    k.rod(C.brass, [d[0] * 0.06, hub + d[1] * 0.06, d[2] * 0.06], e, 0.0035, { seg: 5 });
    k.sphere(emit('#fff6ea', 4.5), 0.011, e[0], e[1], e[2], { ws: 8, hs: 6 });
  }
  k.light({ type: 'point', p: [0, hub, 0], color: kelvin(3000), intensity: 2.6, distance: 7 });
  return k;
}

export function sunburstFlush(ceil) {
  const k = new Kit('sunburst');
  const y = ceil - 0.06;
  k.cyl(C.brass, 0.1, 0.1, 0.03, 0, y, 0, { seg: 40 });
  k.cyl(C.brass, 0.03, 0.03, 0.05, 0, ceil - 0.025, 0, { seg: 12 });
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const L = i % 2 ? 0.45 : 0.3;
    const dy = (i % 4 === 0 ? 0.03 : i % 4 === 2 ? -0.03 : 0);
    const e = [Math.cos(a) * L, y + dy, Math.sin(a) * L];
    k.rod(C.brass, [Math.cos(a) * 0.09, y, Math.sin(a) * 0.09], e, 0.003, { seg: 4 });
    k.sphere(emit('#ffffff', 5), 0.009, e[0], e[1], e[2], { ws: 8, hs: 6 });
  }
  k.light({ type: 'point', p: [0, y - 0.15, 0], color: kelvin(3200), intensity: 1.8, distance: 6 });
  return k;
}

function waveRing(R, amp, waves, y, rot = 0) {
  const pts = [];
  for (let i = 0; i < 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    pts.push([Math.cos(a) * R, y + Math.sin(a * waves + rot) * amp, Math.sin(a) * R]);
  }
  return pts;
}
export function doubleWaveRing(bottom, ceil) {
  const k = new Kit('wave');
  const rings = [[0.45, bottom + 0.06, 0], [0.35, bottom + 0.2, 1.1]];
  for (const [R, y, ph] of rings) {
    k.tube(C.brass, waveRing(R, 0.045, 3, y, ph), 0.012, { closed: true, ts: 192, rs: 8 });
    k.tube(emit(WARM, 3), waveRing(R - 0.008, 0.045, 3, y - 0.012, ph), 0.006, { closed: true, ts: 192, rs: 5 });
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.3;
    k.rod(C.black, [Math.cos(a) * 0.45, bottom + 0.06, Math.sin(a) * 0.45], [Math.cos(a) * 0.3, ceil, Math.sin(a) * 0.3], 0.0015, { seg: 4 });
  }
  canopy(k, ceil, 0.1);
  k.light({ type: 'point', p: [0, bottom + 0.1, 0], color: kelvin(3000), intensity: 2.0, distance: 6 });
  return k;
}

export function rattanGlobe(dia, bottom, ceil) {
  const k = new Kit('rattanGlobe');
  const c = bottom + dia / 2;
  k.sphere('rattan', dia / 2, 0, c, 0, { ws: 32, hs: 20, uvScale: 3 });
  k.sphere(emit('#ffd9a6', 3.2), 0.07, 0, c, 0, { ws: 12, hs: 8 });
  k.rod(C.black, [0, c + dia / 2, 0], [0, ceil, 0], 0.004);
  canopy(k, ceil, 0.06, C.black);
  k.light({ type: 'point', p: [0, c, 0], color: kelvin(2700), intensity: 1.6, distance: 5.5 });
  return k;
}

function domeShade(k, spec, x, y, z, r, inner) {
  const pts = [];
  for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI / 2; pts.push([Math.sin(a) * r + 0.001, Math.cos(a) * r * 0.75]); }
  k.lathe(spec, pts, x, y, z, { seg: 32 });
  if (inner) k.lathe(inner, pts.map(([a, b]) => [a * 0.97, b * 0.97]), x, y - 0.003, z, { seg: 32 });
}

export function rattanTrioLinear(len, h, ceil) {
  const k = new Kit('rattanTrio');
  k.box(C.brass, len, 0.022, 0.04, 0, h + 0.3, 0, { r: 0.008 });
  for (const s of [-1, 1]) k.rod(C.black, [s * len * 0.4, h + 0.31, 0], [s * len * 0.4, ceil, 0], 0.0015, { seg: 4 });
  for (let i = -1; i <= 1; i++) {
    const x = i * len * 0.36;
    k.rod(C.black, [x, h + 0.29, 0], [x, h + 0.2, 0], 0.003);
    domeShade(k, 'rattan', x, h, 0, 0.14);
    k.sphere(emit('#ffd9a6', 3), 0.035, x, h + 0.04, 0, { ws: 10, hs: 8 });
  }
  canopy(k, ceil, 0.05);
  k.light({ type: 'point', p: [0, h - 0.05, 0], color: kelvin(2700), intensity: 1.2, distance: 4 });
  return k;
}

export function branchGlobes(h, ceil) {
  const k = new Kit('branch');
  const pts = [[-0.6, h + 0.12, 0.0], [-0.3, h + 0.16, 0.05], [0.0, h + 0.12, -0.02], [0.3, h + 0.17, 0.03], [0.6, h + 0.13, 0.0]];
  k.tube(C.brass, pts, 0.008, { ts: 40 });
  const g = [[-0.52, -0.05], [-0.18, 0.06], [0.15, -0.04], [0.5, 0.05]];
  for (const [x, dz] of g) {
    const by = h + 0.14;
    k.rod(C.brass, [x, by, dz * 0.3], [x, h + 0.02, dz], 0.005);
    k.sphere(emit('#fff2e0', 1.9), 0.075, x, h - 0.05, dz, { ws: 18, hs: 12 });
  }
  for (const x of [-0.35, 0.35]) k.rod(C.black, [x, h + 0.15, 0], [x, ceil, 0], 0.0018, { seg: 4 });
  for (const x of [-0.35, 0.35]) k.cyl(C.black, 0.04, 0.04, 0.02, x, ceil - 0.01, 0, { seg: 16 });
  k.light({ type: 'point', p: [0, h - 0.1, 0], color: kelvin(2800), intensity: 1.6, distance: 5 });
  return k;
}

export function molecule(ceil) {
  const k = new Kit('molecule');
  const y = ceil - 0.08;
  k.cyl(C.black, 0.07, 0.07, 0.02, 0, ceil - 0.01, 0, { seg: 24 });
  k.rod(C.black, [0, ceil - 0.02, 0], [0, y, 0], 0.01);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI;
    const dx = Math.cos(a) * 0.32, dz = Math.sin(a) * 0.32;
    k.rod(C.black, [-dx, y, -dz], [dx, y, dz], 0.006);
    for (const s of [-1, 1]) {
      k.cyl(C.black, 0.012, 0.012, 0.03, s * dx, y - 0.02, s * dz, { seg: 10 });
      k.sphere(emit('#fff4e4', 2.2), 0.05, s * dx, y - 0.075, s * dz, { ws: 14, hs: 10 });
    }
  }
  k.light({ type: 'point', p: [0, y - 0.2, 0], color: kelvin(3000), intensity: 1.6, distance: 6 });
  return k;
}

export function domePendant(dia, h, ceil, o = {}) {
  const k = new Kit('dome');
  const m = o.mat || sol('#141516', 0.35, 0.4);
  domeShade(k, { ...m, n: 'solidDS' }, 0, h, 0, dia / 2, null);
  k.cyl(emit('#ffe1b5', 3.5), dia * 0.2, dia * 0.2, 0.004, 0, h - 0.002, 0, { seg: 20 });
  k.rod(C.black, [0, h + dia * 0.37, 0], [0, ceil, 0], 0.0025, { seg: 4 });
  k.cyl(C.black, 0.035, 0.035, 0.02, 0, ceil - 0.01, 0, { seg: 16 });
  if (o.light !== false) k.light({ type: 'point', p: [0, h - 0.08, 0], color: kelvin(2700), intensity: o.i || 0.5, distance: 2.5 });
  return k;
}

export function drumLamp() {
  const k = new Kit('drum');
  const b = sol('#141516', 0.4, 0.3);
  k.cyl(b, 0.07, 0.08, 0.02, 0, 0.01, 0, { seg: 24 });
  k.cyl(b, 0.012, 0.012, 0.3, 0, 0.17, 0, { seg: 10 });
  k.cyl({ ...b, n: 'solidDS' }, 0.13, 0.13, 0.17, 0, 0.39, 0, { seg: 32, open: true });
  k.cyl(emit('#ffdcae', 1.4), 0.125, 0.125, 0.15, 0, 0.39, 0, { seg: 32, open: true });
  k.light({ type: 'point', p: [0, 0.38, 0], color: kelvin(2700), intensity: 0.35, distance: 2.2 });
  return k;
}

export function eggLamp() {
  const k = new Kit('egg');
  k.cyl(sol('#d9d9d6', 0.3, 0.6), 0.06, 0.07, 0.03, 0, 0.015, 0, { seg: 24 });
  k.sphere(emit('#fff1de', 2.4), 0.11, 0, 0.17, 0, { ws: 24, hs: 16, scl: [1, 1.35, 1] });
  k.light({ type: 'point', p: [0, 0.2, 0], color: kelvin(2800), intensity: 0.45, distance: 2.4 });
  return k;
}

export function flushRound(dia, ceil, o = {}) {
  const k = new Kit('flush');
  k.cyl(sol('#f1f1ef', 0.4, 0), dia / 2, dia / 2, 0.04, 0, ceil - 0.02, 0, { seg: 40 });
  k.cyl(emit(o.c || '#fff0dc', o.e || 2.4), dia / 2 - 0.02, dia / 2 - 0.02, 0.003, 0, ceil - 0.0415, 0, { seg: 40 });
  if (o.light !== false) k.light({ type: 'point', p: [0, ceil - 0.3, 0], color: kelvin(o.K || 3200), intensity: o.i || 1.0, distance: 4.5 });
  return k;
}

// brass vertical linear wall sconce
export function linearSconce(h) {
  const k = new Kit('sconce');
  k.box(C.brass, 0.05, h, 0.04, 0, 0, 0.02, { r: 0.01 });
  k.box(emit('#ffe2b8', 2.5), 0.02, h - 0.04, 0.004, 0, 0, 0.042, { r: 0 });
  return k;
}
