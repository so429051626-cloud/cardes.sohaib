// Wardrobes and shelving. Origin at floor centre, back against the wall (-z), front +z.
import * as THREE from 'three';
import { Kit, sol, emit, tex, C } from '../core/geom.js';
import { books } from './decor.js';
import { kelvin } from '../lighting.js';

// o: { w, h, d, doors, handles: 'brass'|'silver'|'none', vanity: {x0, x1} (local x),
//      column: {x, w} walnut open-shelf column }
export function wardrobe(o = {}) {
  const k = new Kit('wardrobe');
  const w = o.w || 2, h = o.h || 2.8, d = o.d || 0.6;
  const white = sol('#f2f2f0', 0.35, 0);
  const zf = d / 2;
  k.boxB(sol('#e6e6e4', 0.5, 0), w, h, d - 0.02, 0, 0, -0.01, { r: 0 });
  // segments along x: doors, vanity niche, walnut column
  const cuts = [];
  if (o.vanity) cuts.push({ ...o.vanity, kind: 'vanity' });
  if (o.column) cuts.push({ x0: o.column.x - o.column.w / 2, x1: o.column.x + o.column.w / 2, kind: 'column' });
  cuts.sort((a, b) => a.x0 - b.x0);
  const spans = [];
  let x = -w / 2;
  for (const c of cuts) { if (c.x0 > x + 0.01) spans.push([x, c.x0]); x = c.x1; }
  if (x < w / 2 - 0.01) spans.push([x, w / 2]);
  const handle = o.handles === 'brass' ? C.brass : o.handles === 'silver' ? sol('#c9ccce', 0.25, 1) : null;
  for (const [a, b] of spans) {
    const n = Math.max(1, Math.round((b - a) / (o.doorW || 0.5)));
    const dw = (b - a) / n;
    for (let i = 0; i < n; i++) {
      const cx = a + dw * (i + 0.5);
      k.box(white, dw - 0.004, h - 0.01, 0.02, cx, h / 2, zf + 0.01, { r: 0.002 });
      if (handle) {
        const hx = cx + (i % 2 ? -1 : 1) * (dw / 2 - 0.06);
        const hl = o.handleLen || 1.2;
        k.box(handle, 0.016, hl, 0.016, hx, 1.05, zf + 0.045, { r: 0.006 });
        for (const yy of [1.05 - hl / 2 + 0.05, 1.05 + hl / 2 - 0.05]) k.rod(handle, [hx, yy, zf + 0.02], [hx, yy, zf + 0.04], 0.005);
      }
    }
  }
  for (const c of cuts) {
    const cw = c.x1 - c.x0, cx = (c.x0 + c.x1) / 2;
    if (c.kind === 'vanity') {
      // niche with backlit mirror and a white shelf at 0.75
      k.box(sol('#f4f4f2', 0.6, 0), cw, h, 0.01, cx, h / 2, -d / 2 + 0.04, { r: 0 });
      k.boxB(white, cw, 0.03, d - 0.08, cx, 0.75, 0.0, { r: 0.003 });
      k.boxB(white, cw, h - 2.2, d, cx, 2.2, 0, { r: 0.002 });
      k.box('mirror', cw - 0.16, 0.9, 0.008, cx, 1.35, -d / 2 + 0.05, { r: 0.004 });
      k.glowPlane('#fff1dc', 0.8, cw - 0.16, 0.9, 'halo', { spread: 0.08, inner: 0, pos: [cx, 1.35, -d / 2 + 0.046] });
      k.box(emit('#fff1dc', 3), cw - 0.04, 0.005, 0.01, cx, 2.19, 0.0, { r: 0 });
    } else {
      const wal = tex('walnut', '#ffffff');
      k.box(wal, cw, h, 0.012, cx, h / 2, -d / 2 + 0.03, { r: 0 });
      for (const s of [-1, 1]) k.boxB(wal, 0.02, h, d, cx + s * (cw / 2 - 0.01), 0, 0, { r: 0.002 });
      const ys = [0.4, 0.8, 1.2, 1.6, 2.0, 2.4];
      for (const y of ys) k.boxB(wal, cw - 0.04, 0.022, d - 0.06, cx, y, 0, { r: 0.002, grain: 'x' });
      books(k, cx - cw / 2 + 0.04, 1.222, 0.0, 6, { seed: 'wc' + cx, hs: 0.8 });
      k.lathe(sol('#d9d4ca', 0.5, 0), [[0.001, 0], [0.05, 0], [0.07, 0.1], [0.03, 0.18], [0.001, 0.18]], cx, 1.622, 0.02, { seg: 20 });
      k.box(emit('#ffe2b8', 2), cw - 0.06, 0.004, 0.01, cx, 2.39, d / 2 - 0.06, { r: 0 });
    }
  }
  k.collideRect(w, d);
  k.shadow(w, 0.1, 0, d / 2, { soft: 0.08, k: 0.3 });
  return k;
}

// floating desk wall for the study (built along local x, against the wall)
export function studyWall(w, o = {}) {
  const k = new Kit('studyWall');
  const white = sol('#f3f3f1', 0.3, 0);
  const wal = tex('walnut', '#ffffff');
  // desk
  k.boxB(white, w, 0.04, 0.6, 0, 0.73, 0.3, { r: 0.004 });
  // pedestals
  for (const s of [-1, 1]) {
    const x = s * (w / 2 - 0.25);
    k.boxB(wal, 0.42, 0.68, 0.55, x, 0.02, 0.29, { r: 0.004 });
    for (let i = 0; i < 3; i++) {
      const y = 0.06 + i * 0.22;
      k.box(sol('#2c211a', 0.6, 0), 0.4, 0.004, 0.004, x, y + 0.2, 0.567, { r: 0 });
      k.sphere(C.chrome, 0.012, x, y + 0.11, 0.575, { ws: 10, hs: 8 });
    }
  }
  // walnut shelf with LED under it
  k.boxB(wal, w, 0.035, 0.26, 0, 1.25, 0.13, { r: 0.003, grain: 'x' });
  k.box(emit('#fff0dc', 3), w - 0.1, 0.004, 0.01, 0, 1.246, 0.2, { r: 0 });
  const gl = k.glowPlane('#fff0dc', 0.5, w - 0.1, 0.45, 'edge', { fall: 2.6, ends: true });
  gl.rotation.z = Math.PI; gl.position.set(0, 1.24, 0.012);
  // bookcase niche 1.55..2.1 with walnut back, packed with books
  k.box(wal, w, 0.55, 0.012, 0, 1.825, 0.006, { r: 0 });
  k.boxB(white, w, 0.025, 0.32, 0, 1.53, 0.16, { r: 0.002 });
  k.boxB(white, w, 0.025, 0.32, 0, 2.1, 0.16, { r: 0.002 });
  for (const x of [-w / 2, -w / 6, w / 6, w / 2]) k.boxB(white, 0.025, 0.6, 0.32, Math.max(-w / 2 + 0.0125, Math.min(w / 2 - 0.0125, x)), 1.53, 0.16, { r: 0.002 });
  for (let s = 0; s < 3; s++) {
    const x0 = -w / 2 + 0.03 + s * (w / 3);
    books(k, x0, 1.555, 0.16, 32, { seed: 'study' + s, lean: true, hs: 0.95 });
  }
  // upper cabinets 2.15 .. 2.8
  const n = Math.round(w / 0.55);
  for (let i = 0; i < n; i++) k.box(white, w / n - 0.004, 0.64, 0.34, -w / 2 + (w / n) * (i + 0.5), 2.47, 0.17, { r: 0.002 });
  k.collideRect(w, 0.62, 0, 0.31);
  k.shadow(w, 0.62, 0, 0.31, { k: 0.25, soft: 0.15 });
  return k;
}

export function monitor(screen, w = 0.6, h = 0.36, o = {}) {
  const k = new Kit('monitor');
  const shell = o.white ? sol('#e9e9e7', 0.35, 0.1) : sol('#18191a', 0.35, 0.2);
  k.box(shell, w, h, 0.02, 0, 0, 0, { r: 0.008 });
  k.plane('screen:' + screen, w - 0.02, h - 0.03, { pos: [0, 0.005, 0.0105], keepUV: true });
  k.box(shell, 0.05, 0.2, 0.03, 0, -h / 2 - 0.08, -0.04, { r: 0.006, rot: [-0.15, 0, 0] });
  k.box(shell, 0.2, 0.012, 0.16, 0, -h / 2 - 0.18, -0.02, { r: 0.005 });
  return k;
}
