// Kitchen kit. Runs are built along local +x, front = +z, back against the wall at z = -depth/2.
import * as THREE from 'three';
import { Kit, sol, emit, tex, C, roundRectShape, slabGeom } from '../core/geom.js';
import { kelvin } from '../lighting.js';

const GREY = C.kitBase;
const GAP = 0.004;
const groove = sol('#0e0f10', 0.7, 0);

// fronts: list of {w, type: 'drawers3'|'drawers2'|'door'|'sinkdoor'}
function fronts(k, x0, y0, H, z, list, total) {
  let x = x0;
  for (const f of list) {
    const w = f.w;
    const rows = f.type === 'drawers3' ? [0.22, 0.28, 0.3] : f.type === 'drawers2' ? [0.38, 0.42] : [H];
    let y = y0;
    const sum = rows.reduce((a, b) => a + b, 0);
    for (const r0 of rows) {
      const r = (r0 / sum) * H;
      k.box(GREY, w - GAP, r - GAP, 0.019, x + w / 2, y + r / 2, z + 0.0095, { r: 0.002 });
      // J-pull groove along the top edge of each front
      k.box(groove, w - 0.03, 0.014, 0.012, x + w / 2, y + r - 0.012, z + 0.017, { r: 0 });
      y += r;
    }
    x += w;
  }
}

export function baseRun(len, o = {}) {
  const k = new Kit('baseRun');
  const D = o.depth || 0.6, H = 0.9, kick = 0.1, top = 0.03;
  const zb = -D / 2;
  k.boxB(C.black, len, kick, D - 0.07, 0, 0, zb + (D - 0.07) / 2, { r: 0 });
  k.boxB(sol('#7b8085', 0.6, 0), len, H - kick - top, D - 0.03, 0, kick, zb + (D - 0.03) / 2, { r: 0.002 });
  const list = o.fronts || [];
  if (!list.length) { let rem = len; while (rem > 0.05) { const w = Math.min(0.6, rem); list.push({ w, type: list.length % 2 ? 'door' : 'drawers3' }); rem -= w; } }
  fronts(k, -len / 2, kick + 0.003, H - kick - top - 0.006, zb + D - 0.03, list, len);
  // worktop (black stone)
  if (o.top !== false) {
    k.boxB(tex('blackMarble'), len + 0.004, top, D + 0.02, 0, H - top, zb + (D + 0.02) / 2, { r: 0.003, grain: 'x' });
  }
  k.collideRect(len, D + 0.02, 0, zb + D / 2);
  k.shadow(len, 0.1, 0, zb + D - 0.02, { soft: 0.08, k: 0.4 });
  return k;
}

export function backsplash(k, len, y0, y1, z) {
  k.box('marbleSlab', len, y1 - y0, 0.012, 0, (y0 + y1) / 2, z + 0.006, { r: 0 });
}

// handleless uppers from y0 up to ceiling, with under-cabinet LED
export function uppers(len, y0, ceil, o = {}) {
  const k = new Kit('uppers');
  const D = o.depth || 0.36;
  const H = ceil - y0;
  const zb = -0.3;
  k.boxB(sol('#cfd1d2', 0.5, 0), len, H, D - 0.02, 0, y0, zb + (D - 0.02) / 2, { r: 0 });
  const n = Math.max(1, Math.round(len / 0.5));
  const w = len / n;
  for (let i = 0; i < n; i++) {
    k.box(C.kitUpper, w - GAP, H - 0.01, 0.019, -len / 2 + w * (i + 0.5), y0 + H / 2, zb + D - 0.02 + 0.0095, { r: 0.002 });
  }
  // LED strip under the front edge and a wash on the backsplash
  const col = '#' + kelvin(4800).getHexString();
  k.box(emit(col, 4), len - 0.04, 0.004, 0.012, 0, y0 - 0.003, zb + D - 0.07, { r: 0 });
  const gl = k.glowPlane(col, 0.55, len - 0.06, 0.55, 'edge', { fall: 3, ends: true });
  gl.rotation.x = Math.PI; // falloff downwards
  gl.position.set(0, y0 - 0.005, zb + 0.014);
  k.light({ type: 'rect', p: [0, y0 - 0.01, zb + 0.12], t: [0, 0.2, zb + 0.12], w: len - 0.1, h: 0.08, color: kelvin(4800), intensity: o.led || 3.0 });
  return k;
}

export function hob(k, x, y, z) {
  k.box(sol('#08090a', 0.06, 0.1), 0.78, 0.008, 0.52, x, y + 0.004, z, { r: 0.004 });
  const steel = sol('#8d9093', 0.3, 1);
  const burners = [[-0.24, -0.12, 0.05], [-0.24, 0.12, 0.04], [0, 0, 0.065], [0.24, -0.12, 0.04], [0.24, 0.12, 0.05]];
  for (const [dx, dz, r] of burners) {
    k.cyl(steel, r, r, 0.012, x + dx, y + 0.014, z + dz, { seg: 24 });
    k.cyl(C.black, r * 0.7, r * 0.7, 0.012, x + dx, y + 0.024, z + dz, { seg: 24 });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      k.box(C.black, r * 2.3, 0.01, 0.012, x + dx, y + 0.032, z + dz, { r: 0, rot: [0, a, 0] });
    }
  }
  for (let i = 0; i < 5; i++) k.cyl(steel, 0.018, 0.018, 0.02, x - 0.3 + i * 0.15, y + 0.01, z + 0.29, { seg: 16, rot: [Math.PI / 2, 0, 0] });
}

export function hood(k, x, y, z) {
  k.box(sol('#111213', 0.4, 0.2), 0.9, 0.11, 0.48, x, y, z, { r: 0.006 });
  k.box(emit('#fff4e6', 2), 0.12, 0.003, 0.05, x - 0.25, y - 0.056, z + 0.1, { r: 0 });
  k.box(emit('#fff4e6', 2), 0.12, 0.003, 0.05, x + 0.25, y - 0.056, z + 0.1, { r: 0 });
}

export function sink(k, x, y, z, o = {}) {
  // undermount bowl seen as a dark recess in the worktop
  k.box(sol('#2a2c2e', 0.3, 0.8), 0.72, 0.004, 0.42, x, y + 0.0015, z, { r: 0.02 });
  k.box(sol('#3a3c3e', 0.35, 0.9), 0.7, 0.2, 0.4, x, y - 0.1, z, { r: 0.03 });
  const fm = o.faucet || sol('#111213', 0.35, 0.2);
  const zb = z - 0.27;
  k.cyl(fm, 0.025, 0.025, 0.04, x, y + 0.02, zb, { seg: 16 });
  k.tube(fm, [[x, y + 0.03, zb], [x, y + 0.36, zb], [x, y + 0.42, zb + 0.05], [x, y + 0.38, zb + 0.2], [x, y + 0.3, zb + 0.22]], 0.012, { ts: 30, rs: 10 });
  k.rod(fm, [x + 0.05, y + 0.08, zb], [x + 0.11, y + 0.1, zb], 0.006);
}

export function island(L, D, H) {
  const k = new Kit('island');
  const t = 0.05;
  const bm = tex('blackMarble');
  k.boxB(C.black, L - 2 * t - 0.1, 0.1, D - 0.14, 0, 0, 0, { r: 0 });
  k.boxB(sol('#7b8085', 0.6, 0), L - 2 * t - 0.02, H - t - 0.1, D - 0.06, 0, 0.1, 0, { r: 0 });
  const inner = L - 2 * t - 0.02;
  const n = Math.round(inner / 0.6);
  const list = Array.from({ length: n }, (_, i) => ({ w: inner / n, type: i % 2 ? 'drawers2' : 'drawers3' }));
  for (const s of [-1, 1]) {
    const kk = new Kit('islandFront');
    fronts(kk, -inner / 2, 0.103, H - t - 0.11, 0, list, inner);
    kk.group.position.z = s * (D / 2 - 0.03);
    kk.group.rotation.y = s > 0 ? 0 : Math.PI;
    k.group.add(kk.group);
  }
  k.boxB(bm, L, t, D, 0, H - t, 0, { r: 0.004, grain: 'x' });
  for (const s of [-1, 1]) k.boxB(bm, t, H - t, D, s * (L / 2 - t / 2), 0, 0, { r: 0.004, grain: 'y' });
  k.collideRect(L, D);
  k.shadow(L + 0.04, D + 0.04, 0, 0, { soft: 0.12, k: 0.45 });
  return k;
}

export function ovenColumn(w, ceil) {
  const k = new Kit('ovens');
  const D = 0.62;
  k.boxB(sol('#7b8085', 0.6, 0), w, ceil, D - 0.02, 0, 0, -0.01, { r: 0 });
  // grey panels with two ovens
  const z = D / 2 - 0.02;
  const panel = (y0, h) => k.box(GREY, w - GAP, h - GAP, 0.019, 0, y0 + h / 2, z + 0.0095, { r: 0.002 });
  panel(0.1, 0.62);
  for (const [y0, h] of [[0.72, 0.6], [1.32, 0.46]]) {
    k.box(sol('#0b0c0d', 0.08, 0.2), w - 0.03, h - 0.02, 0.025, 0, y0 + h / 2, z + 0.012, { r: 0.004 });
    k.box(sol('#2b2d2f', 0.05, 0.1), w - 0.12, h * 0.55, 0.002, 0, y0 + h * 0.42, z + 0.026, { r: 0 });
    k.box(sol('#a3a6a9', 0.3, 1), w - 0.16, 0.018, 0.02, 0, y0 + h - 0.07, z + 0.045, { r: 0.008 });
    k.box(emit('#ffffff', 0.9), 0.06, 0.014, 0.002, 0, y0 + h - 0.03, z + 0.026, { r: 0 });
  }
  panel(1.78, ceil - 1.78);
  k.boxB(C.black, w, 0.1, D - 0.08, 0, 0, -0.03, { r: 0 });
  k.collideRect(w, D);
  return k;
}

export function fridge(w, ceil) {
  const k = new Kit('fridge');
  const D = 0.7, H = 1.8;
  const st = C.fridge;
  const z = D / 2;
  k.boxB(sol('#2e3238', 0.5, 0.6), w, H, D - 0.05, 0, 0, -0.025, { r: 0.004 });
  // two french doors
  for (const s of [-1, 1]) {
    k.box(st, w / 2 - 0.006, 1.1, 0.05, s * w / 4, 0.68 + 0.55, z - 0.025, { r: 0.006 });
    k.box(sol('#c4c7ca', 0.25, 1), 0.02, 0.6, 0.025, s * 0.04, 1.1, z + 0.02, { r: 0.008 });
  }
  // freezer drawer
  k.box(st, w - 0.008, 0.6, 0.05, 0, 0.36, z - 0.025, { r: 0.006 });
  k.box(sol('#c4c7ca', 0.25, 1), w * 0.6, 0.02, 0.025, 0, 0.6, z + 0.02, { r: 0.008 });
  // water dispenser
  k.box(sol('#16181a', 0.3, 0.3), 0.18, 0.28, 0.01, -w / 4, 1.32, z + 0.002, { r: 0.01 });
  k.box(emit('#bfe3ff', 1.2), 0.06, 0.02, 0.003, -w / 4, 1.42, z + 0.008, { r: 0 });
  // cabinet above
  k.boxB(sol('#7b8085', 0.6, 0), w, ceil - H, D - 0.05, 0, H, -0.025, { r: 0 });
  k.box(GREY, w - GAP, ceil - H - 0.01, 0.019, 0, H + (ceil - H) / 2, z - 0.04, { r: 0.002 });
  k.collideRect(w, D);
  k.shadow(w, 0.12, 0, z, { soft: 0.08, k: 0.35 });
  return k;
}

// breakfast bar: grey front panel facing +z, oak top overhanging +z, waterfall end at -x
export function breakfastBar(len, depth, h, over) {
  const k = new Kit('bar');
  const oak = tex('oak', '#ffffff');
  const t = 0.04;
  k.boxB(sol('#7b8085', 0.6, 0), len - t, h - t, depth, t / 2, 0, 0, { r: 0 });
  k.box(GREY, len - t - GAP, h - t - 0.11, 0.019, t / 2, 0.1 + (h - t - 0.11) / 2, depth / 2 + 0.0095, { r: 0.002 });
  k.boxB(C.black, len - t, 0.1, depth - 0.04, t / 2, 0, -0.02, { r: 0 });
  k.boxB(oak, len, t, depth + over, 0, h - t, over / 2, { r: 0.004, grain: 'x' });
  k.boxB(oak, t, h - t, depth + over, -len / 2 + t / 2, 0, over / 2, { r: 0.004, grain: 'y' });
  k.collideRect(len, depth + over * 0.4, 0, over * 0.2);
  k.shadow(len, depth + 0.05, 0, 0, { k: 0.4 });
  return k;
}
