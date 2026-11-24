// Decor: plants, vases, books, mirrors, panels, rugs, small objects.
import * as THREE from 'three';
import { Kit, sol, emit, tex, C, roundRectShape, superEllipsoid } from '../core/geom.js';
import { RNG } from '../core/prng.js';

// foliage atlas cells (u0, v0) of 0.5 x 0.5
const CELL = { ficus: [0, 0.5], plume: [0.5, 0.5], grass: [0, 0], leaf: [0.5, 0] };
function card(w, h, cell) {
  const g = new THREE.PlaneGeometry(w, h);
  g.translate(0, h / 2, 0);
  const uv = g.attributes.uv;
  const [u0, v0] = CELL[cell];
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * 0.5, v0 + uv.getY(i) * 0.5);
  return g;
}
function addCard(k, w, h, cell, tint, pos, dir, roll = 0) {
  // dir: unit vector the card grows along; card faces sideways
  const g = card(w, h, cell);
  const up = new THREE.Vector3(0, 1, 0);
  const d = new THREE.Vector3(...dir).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(up, d);
  const r = new THREE.Quaternion().setFromAxisAngle(d, roll);
  g.applyQuaternion(q.premultiply(r));
  g.translate(pos[0], pos[1], pos[2]);
  k.mesh(g, tex('foliage', tint), { keepUV: true });
}

export function vase(k, prof, spec, x, y, z, seg = 32) { return k.lathe(spec, prof, x, y, z, { seg }); }

export function pampasVase(o = {}) {
  const k = new Kit('pampas');
  const rng = new RNG(o.seed || 'pampas');
  const H = o.h || 0.62;
  const prof = [[0.001, 0], [0.09, 0], [0.11, 0.06], [0.125, H * 0.35], [0.1, H * 0.75], [0.06, H * 0.92], [0.065, H], [0.055, H], [0.05, H * 0.9], [0.001, H * 0.88]];
  vase(k, prof, o.vase || C.ceramic, 0, 0, 0);
  const n = o.n || 9;
  for (let i = 0; i < n; i++) {
    const a = rng.range(0, Math.PI * 2), lean = rng.range(0.12, 0.42);
    const L = rng.range(0.55, 0.85) * (o.scale || 1);
    const d = [Math.cos(a) * Math.sin(lean), Math.cos(lean), Math.sin(a) * Math.sin(lean)];
    const base = [d[0] * 0.02, H - 0.05, d[2] * 0.02];
    const tip = [base[0] + d[0] * L, base[1] + d[1] * L, base[2] + d[2] * L];
    k.rod(sol('#bfa77f', 0.8, 0), base, tip, 0.0035, { seg: 4 });
    const ph = rng.range(0.32, 0.46) * (o.scale || 1);
    const at = [base[0] + d[0] * (L - ph * 0.6), base[1] + d[1] * (L - ph * 0.6), base[2] + d[2] * (L - ph * 0.6)];
    const tint = rng.pick(['#efe2c8', '#e9dbbf', '#f3ead8']);
    for (let c = 0; c < 3; c++) addCard(k, ph * 0.42, ph, 'plume', tint, at, d, (c * Math.PI) / 3 + rng.range(0, 0.4));
  }
  k.shadowRound(0.13, 0, 0, { k: 0.4, soft: 0.06 });
  return k;
}

export function orchidVase(o = {}) {
  const k = new Kit('orchid');
  const rng = new RNG(o.seed || 'orchid');
  k.cyl(sol('#141516', 0.85, 0), 0.075, 0.075, 0.22, 0, 0.11, 0, { seg: 32 });
  const petal = sol(o.color || '#b8287e', 0.55, 0);
  const lip = sol('#f0d24a', 0.5, 0);
  for (let i = 0; i < 3; i++) {
    const leaf = superEllipsoid(0.32, 0.012, 0.09, 0.6, 0.6, 0.6, 16, 6);
    k.mesh(leaf, sol('#2f4a2a', 0.45, 0), { pos: [Math.cos(i * 2.1) * 0.1, 0.235, Math.sin(i * 2.1) * 0.1], rot: [0, -i * 2.1, -0.25] });
  }
  for (let s = 0; s < (o.stems || 3); s++) {
    const a = s * 2.1 + rng.range(-0.3, 0.3);
    const pts = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      const r = 0.02 + t * t * 0.18;
      pts.push([Math.cos(a) * r, 0.22 + t * 0.48 - t * t * 0.08, Math.sin(a) * r]);
    }
    k.tube(sol('#4b5a35', 0.6, 0), pts, 0.003, { ts: 24, rs: 4 });
    for (let f = 0; f < 7; f++) {
      const t = 0.45 + (f / 7) * 0.55;
      const r = 0.02 + t * t * 0.18;
      const p = [Math.cos(a) * r, 0.22 + t * 0.48 - t * t * 0.08 - 0.02, Math.sin(a) * r];
      const sz = 0.035 * (1 - f * 0.05);
      for (let q = 0; q < 5; q++) {
        const pa = (q / 5) * Math.PI * 2;
        k.sphere(petal, sz * 0.55, p[0] + Math.cos(pa) * sz * 0.5, p[1] + Math.sin(pa) * sz * 0.5, p[2], { ws: 8, hs: 6, scl: [1, 1, 0.25], rot: [0, a, 0] });
      }
      k.sphere(lip, sz * 0.2, p[0], p[1], p[2] + 0.004, { ws: 6, hs: 4 });
    }
  }
  return k;
}

export function ficus(o = {}) {
  const k = new Kit('ficus');
  const rng = new RNG(o.seed || 'ficus');
  const H = o.h || 1.9;
  k.cyl(o.pot || sol('#f2f2f0', 0.4, 0), 0.2, 0.16, 0.42, 0, 0.21, 0, { seg: 32 });
  k.cyl(sol('#3a2e24', 1, 0), 0.185, 0.185, 0.01, 0, 0.405, 0, { seg: 24 });
  const bark = sol('#6b5a48', 0.85, 0);
  const trunk = [[0, 0.4, 0], [0.03, 0.8, 0.01], [-0.02, 1.15, 0.02], [0.02, H * 0.72, -0.01]];
  k.tube(bark, trunk, 0.022, { ts: 16, rs: 6 });
  const tips = [];
  for (let b = 0; b < 6; b++) {
    const a = b * 1.1 + rng.range(-0.3, 0.3);
    const y0 = 0.95 + b * 0.12;
    const L = rng.range(0.28, 0.45);
    const end = [Math.cos(a) * L, y0 + rng.range(0.15, 0.35), Math.sin(a) * L];
    k.tube(bark, [[0.0, y0, 0.0], [end[0] * 0.5, (y0 + end[1]) / 2 + 0.05, end[2] * 0.5], end], 0.01, { ts: 8, rs: 5 });
    tips.push(end);
  }
  tips.push([0.02, H * 0.75, 0]);
  const greens = ['#3f5d34', '#4c6b3d', '#365230', '#577845'];
  const nLeaves = o.leaves || 420;
  for (let i = 0; i < nLeaves; i++) {
    const t = tips[i % tips.length];
    const r = rng.range(0.05, 0.38);
    const dir = [rng.range(-1, 1), rng.range(-0.2, 1), rng.range(-1, 1)];
    const len = Math.hypot(...dir) || 1;
    const p = [t[0] + (dir[0] / len) * r, Math.min(H, t[1] + (dir[1] / len) * r * 0.8 + rng.range(-0.1, 0.15)), t[2] + (dir[2] / len) * r];
    addCard(k, 0.07, 0.11, 'ficus', rng.pick(greens), p, [dir[0], dir[1] + 0.4, dir[2]], rng.range(0, Math.PI));
  }
  k.collideCircle(0.22);
  k.shadowRound(0.22, 0, 0, { k: 0.45 });
  return k;
}

export function smallPlant(o = {}) {
  const k = new Kit('plant');
  const rng = new RNG(o.seed || 'plant');
  const s = o.s || 1;
  k.cyl(o.pot || sol('#e9e7e2', 0.6, 0), 0.07 * s, 0.055 * s, 0.11 * s, 0, 0.055 * s, 0, { seg: 24 });
  for (let i = 0; i < 26; i++) {
    const a = rng.range(0, Math.PI * 2), lean = rng.range(0.1, 0.9);
    const d = [Math.cos(a) * Math.sin(lean), Math.cos(lean), Math.sin(a) * Math.sin(lean)];
    addCard(k, 0.06 * s, 0.13 * s, o.cell || 'grass', rng.pick(['#4f7040', '#5f8248', '#3e5b33']), [d[0] * 0.02, 0.1 * s, d[2] * 0.02], d, rng.range(0, 3));
  }
  return k;
}

export function books(k, x, y, z, n, o = {}) {
  const rng = new RNG(o.seed || 'books' + x + z);
  const pal = o.pal || ['#2b3a55', '#8c3b2f', '#d8cfc0', '#3d5a4a', '#1c1c1c', '#b88a3e', '#6d6f73', '#e9e5dc', '#5a3d5c', '#a64b3c', '#3b6e8f'];
  let cx = x;
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = rng.range(0.022, 0.05), h = rng.range(0.19, 0.29) * (o.hs || 1), d = rng.range(0.14, 0.2);
    const lean = o.lean && i === n - 1 ? 0.25 : 0;
    k.box(sol(rng.pick(pal), 0.65, 0), t, h, d, cx + t / 2, y + h / 2 * Math.cos(lean), z, { r: 0.003, rot: [0, 0, -lean] });
    k.box(sol('#efe9dc', 0.9, 0), t * 0.85, h * 0.96, 0.004, cx + t / 2, y + h / 2, z + d / 2 + 0.001, { r: 0 });
    cx += t + 0.001;
    out.push(cx);
  }
  return cx;
}

export function bookStack(k, x, y, z, n, rng) {
  let yy = y;
  for (let i = 0; i < n; i++) {
    const t = rng.range(0.025, 0.045);
    k.box(sol(rng.pick(['#e9e5dc', '#1c1c1c', '#7a7d80', '#c9b79a', '#2b3a55']), 0.6, 0), rng.range(0.2, 0.28), t, rng.range(0.15, 0.2), x, yy + t / 2, z, { r: 0.003, rot: [0, rng.range(-0.25, 0.25), 0] });
    yy += t;
  }
  return yy;
}

export function deer(k, x, y, z, s = 1) {
  const b = sol('#121314', 0.35, 0.1);
  k.mesh(superEllipsoid(0.16 * s, 0.07 * s, 0.06 * s, 0.6, 0.6, 0.6, 16, 10), b, { pos: [x, y + 0.16 * s, z] });
  for (const [dx, dz] of [[-0.06, -0.02], [-0.06, 0.02], [0.06, -0.02], [0.06, 0.02]]) k.rod(b, [x + dx * s, y, z + dz * s], [x + dx * s, y + 0.15 * s, z + dz * s], 0.006 * s);
  k.rod(b, [x + 0.07 * s, y + 0.18 * s, z], [x + 0.11 * s, y + 0.3 * s, z], 0.012 * s);
  k.mesh(superEllipsoid(0.06 * s, 0.035 * s, 0.035 * s, 0.6, 0.6, 0.6, 12, 8), b, { pos: [x + 0.13 * s, y + 0.31 * s, z] });
  for (const dz of [-0.015, 0.015]) k.tube(b, [[x + 0.11 * s, y + 0.33 * s, z + dz * s], [x + 0.1 * s, y + 0.4 * s, z + dz * 2.5 * s], [x + 0.06 * s, y + 0.45 * s, z + dz * 4 * s]], 0.003 * s, { ts: 8, rs: 4 });
}

export function candle(k, x, y, z) {
  k.cyl(sol('#f4f1ea', 0.6, 0), 0.035, 0.035, 0.12, x, y + 0.06, z, { seg: 20 });
  k.cyl(sol('#1a1a1a', 0.3, 0.5), 0.04, 0.04, 0.01, x, y + 0.005, z, { seg: 20 });
  k.sphere(emit('#ffb766', 6), 0.007, x, y + 0.135, z, { ws: 8, hs: 6, scl: [1, 1.8, 1] });
}

export function bottles(k, x, y, z, n, rng, pal = ['#141414', '#f2f2f0']) {
  for (let i = 0; i < n; i++) {
    const h = rng.range(0.12, 0.2), r = rng.range(0.022, 0.032);
    const prof = [[0.001, 0], [r, 0], [r, h * 0.78], [r * 0.45, h * 0.9], [r * 0.4, h], [0.001, h]];
    k.lathe(sol(rng.pick(pal), 0.25, 0), prof, x + i * (r * 2 + 0.012), y, z + rng.range(-0.01, 0.01), { seg: 16 });
    k.cyl(sol('#1a1a1a', 0.4, 0.3), r * 0.35, r * 0.35, 0.03, x + i * (r * 2 + 0.012), y + h + 0.015, z, { seg: 10 });
  }
}

export function rolledTowels(k, x, y, z, n, len = 0.28) {
  for (let i = 0; i < n; i++) {
    k.cyl(tex('fabric', '#f4f4f2'), 0.045, 0.045, len, x + i * 0.095, y + 0.045, z, { seg: 18, rot: [Math.PI / 2, 0, 0] });
  }
}

// mirrors -------------------------------------------------------------------------
export function mirrorRound(dia, o = {}) {
  const k = new Kit('mirrorR');
  k.cyl('mirror', dia / 2, dia / 2, 0.01, 0, 0, 0.012, { seg: 56, rot: [Math.PI / 2, 0, 0] });
  k.torus(o.frame || C.brass, dia / 2, o.ft || 0.012, 0, 0, 0.014, { ts: 72, rs: 8 });
  if (o.backlit) k.glowPlane('#ffe7c4', 0.6, dia / 2, 0, 'disc', { spread: 0.18, inner: 0, pos: [0, 0, 0.002] });
  return k;
}

export function mirrorPill(w, h, o = {}) {
  const k = new Kit('mirrorP');
  const s = roundRectShape(w, h, w / 2 - 0.001);
  k.extrude('mirror', s, 0.01, { pos: [0, 0, 0.012] });
  k.glowPlane('#fff1dc', 0.9, w - 0.02, h - 0.02, 'halo', { spread: 0.12, inner: 0, pos: [0, 0, 0.003] });
  return k;
}

function pebbleShape(w, h, rng) {
  const s = new THREE.Shape();
  const n = 48;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = 1 + 0.06 * Math.sin(a * 2 + 0.6) + 0.04 * Math.sin(a * 3 + 1.7);
    const x = Math.cos(a) * r * w / 2, y = Math.sin(a) * r * h / 2;
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  return s;
}
export function mirrorPebble(w, h) {
  const k = new Kit('mirrorPebble');
  const s = pebbleShape(w, h);
  k.extrude(C.black, s, 0.015, { pos: [0, 0, 0.0] });
  k.extrude('mirror', pebbleShape(w - 0.02, h - 0.02), 0.01, { pos: [0, 0, 0.012] });
  return k;
}

export function archFloorMirror(w, h) {
  const k = new Kit('archMirror');
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h - w / 2);
  s.absarc(0, h - w / 2, w / 2, 0, Math.PI, false);
  s.lineTo(-w / 2, 0);
  k.extrude(C.black, s, 0.025, {});
  const s2 = new THREE.Shape();
  const iw = w - 0.05;
  s2.moveTo(-iw / 2, 0.025); s2.lineTo(iw / 2, 0.025); s2.lineTo(iw / 2, h - w / 2);
  s2.absarc(0, h - w / 2, iw / 2, 0, Math.PI, false);
  s2.lineTo(-iw / 2, 0.025);
  k.extrude('mirror', s2, 0.01, { pos: [0, 0, 0.022] });
  k.collideRect(w, 0.3, 0, -0.1);
  k.shadow(w, 0.12, 0, 0.01, { k: 0.35 });
  return k;
}

export function hoop(k, x, y, z, dia) { k.torus(C.brass, dia / 2, 0.006, x, y, z, { ts: 64, rs: 6 }); }

// panels ------------------------------------------------------------------------------
// vertical slats on a dark backing, local XY = wall plane, front +z
export function slatPanel(w, h, o = {}) {
  const k = new Kit('slats');
  const rng = new RNG(o.seed || 'slats' + w);
  const sw = o.slat || 0.04, gap = o.gap || 0.015, d = o.depth || 0.022;
  const m = o.mat || 'walnut';
  if (o.back !== false) k.box(sol('#1b1715', 0.9, 0), w, h, 0.012, 0, h / 2, 0.006, { r: 0 });
  const n = Math.floor((w + gap) / (sw + gap));
  const x0 = -((n * sw + (n - 1) * gap) / 2) + sw / 2;
  for (let i = 0; i < n; i++) {
    k.box(tex(m, o.tint || '#ffffff'), sw, h, d, x0 + i * (sw + gap), h / 2, 0.012 + d / 2, { r: 0.002, uvOff: [rng.range(0, 10), rng.range(0, 10)] });
  }
  return k;
}

export function wavyPanel(w, h) {
  const k = new Kit('wavy');
  k.box('wavy', w, h, 0.02, 0, h / 2, 0.01, { r: 0.002 });
  return k;
}

export function rug(w, d, spec, o = {}) {
  const k = new Kit('rug');
  const t = o.t || 0.012;
  if (o.round) k.cyl(spec, w / 2, w / 2, t, 0, t / 2, 0, { seg: 64 });
  else k.box(spec, w, t, d, 0, t / 2, 0, { r: Math.min(0.004, t / 2 - 0.001) });
  return k;
}

export function chalkboard(w, h) {
  const k = new Kit('chalk');
  k.box(C.black, w + 0.06, h + 0.06, 0.025, 0, 0, 0.0125, { r: 0.004 });
  k.plane('chalk', w, h, { pos: [0, 0, 0.0265] });
  k.box(sol('#141516', 0.6, 0), w * 0.6, 0.02, 0.05, 0, -h / 2 - 0.03, 0.04, { r: 0.004 });
  k.box(sol('#f3f3ef', 0.9, 0), 0.07, 0.012, 0.012, -0.1, -h / 2 - 0.014, 0.05, { r: 0.004 });
  return k;
}

export function coffeeMachine(k, x, y, z) {
  const st = sol('#c7c9cb', 0.3, 1), bl = sol('#151617', 0.4, 0.2);
  k.boxB(bl, 0.24, 0.34, 0.36, x, y, z, { r: 0.02 });
  k.boxB(st, 0.25, 0.06, 0.37, x, y + 0.34, z, { r: 0.015 });
  k.boxB(st, 0.16, 0.02, 0.12, x, y + 0.02, z + 0.1, { r: 0.004 });
  k.cyl(st, 0.025, 0.025, 0.06, x, y + 0.2, z + 0.15, { seg: 12 });
  k.cyl(sol('#f2f2f0', 0.2, 0), 0.03, 0.026, 0.07, x, y + 0.075, z + 0.12, { seg: 18 });
}

export function towelRing(k, x, y, z, rot = 0) {
  k.cyl(C.black, 0.02, 0.02, 0.03, x, y + 0.1, z, { seg: 12, rot: [Math.PI / 2, 0, 0] });
  k.torus(C.black, 0.09, 0.006, x, y, z + 0.035, { ts: 40, rs: 6 });
  const g = new THREE.PlaneGeometry(0.22, 0.42, 6, 10);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const xx = p.getX(i); p.setZ(i, 0.035 * Math.cos((xx / 0.22) * Math.PI) + 0.01 * Math.sin(p.getY(i) * 20)); }
  g.computeVertexNormals();
  k.mesh(g, { ...tex('fabric', '#f4f4f2'), n: 'drape' }, { pos: [x, y - 0.25, z + 0.035] });
}
