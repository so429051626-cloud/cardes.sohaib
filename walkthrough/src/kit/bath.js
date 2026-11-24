// Bathroom kit. Wall-mounted items: local XY = wall plane, +z = out of the wall.
import * as THREE from 'three';
import { Kit, sol, emit, tex, C, superEllipsoid } from '../core/geom.js';
import { RNG } from '../core/prng.js';
import { rolledTowels, bottles, smallPlant, mirrorRound, towelRing } from './decor.js';
import { kelvin } from '../lighting.js';

export function vesselBasin(k, x, y, z, o = {}) {
  const r = o.r || 0.21;
  const sx = o.oval ? 1.35 : 1;
  const prof = [[0.001, 0.0], [r * 0.55, 0.0], [r * 0.85, 0.02], [r, 0.07], [r, 0.12], [r - 0.012, 0.125], [r - 0.012, 0.075], [r * 0.82, 0.032], [r * 0.5, 0.018], [0.001, 0.016]];
  k.lathe(C.ceramic, prof, x, y, z, { seg: 48, scl: [sx, 1, 1] });
}

export function spout(k, x, y, z, o = {}) {
  const m = o.mat || sol('#121314', 0.35, 0.3);
  const H = o.tall ? 0.32 : 0.16;
  k.cyl(m, 0.022, 0.022, H, x, y + H / 2, z, { seg: 16 });
  k.tube(m, [[x, y + H - 0.01, z], [x, y + H + 0.02, z + 0.04], [x, y + H, z + 0.14]], 0.011, { ts: 16, rs: 8 });
  k.rod(m, [x, y + H - 0.04, z], [x + 0.07, y + H - 0.03, z], 0.006);
}

// floating vanity on a wall: width w, depth d, top at h. front facing +z
export function vanity(o = {}) {
  const k = new Kit('vanity');
  const w = o.w || 1.0, d = o.d || 0.48, h = o.h || 0.86;
  const front = o.front || tex('oak', '#ffffff');
  const top = sol('#f4f4f2', 0.2, 0);
  k.boxB(top, w, 0.04, d, 0, h - 0.04, d / 2, { r: 0.004 });
  k.boxB(front, w, 0.2, d - 0.02, 0, h - 0.24, d / 2 - 0.01, { r: 0.003, grain: 'x' });
  k.box(sol('#0e0f10', 0.7, 0), w - 0.06, 0.012, 0.01, 0, h - 0.06, d, { r: 0 });
  // open shelf below
  k.boxB(front, w, 0.025, d - 0.04, 0, h - 0.5, d / 2 - 0.02, { r: 0.003, grain: 'x' });
  for (const s of [-1, 1]) k.boxB(front, 0.025, 0.26, d - 0.04, s * (w / 2 - 0.0125), h - 0.5, d / 2 - 0.02, { r: 0.002 });
  if (o.towels !== false) {
    rolledTowels(k, -w / 2 + 0.12, h - 0.475, d / 2 - 0.02, 3, d - 0.12);
    k.boxB(tex('walnut'), 0.3, 0.02, 0.18, w / 2 - 0.22, h - 0.475, d / 2 - 0.02, { r: 0.005, grain: 'x' });
  }
  vesselBasin(k, o.basinX || 0, h, d / 2 + 0.02, { oval: o.oval, r: o.basinR });
  spout(k, o.basinX || 0, h, 0.07, { tall: o.tall, mat: o.faucet });
  if (o.decor !== false) {
    const rng = new RNG('vanity' + w);
    bottles(k, w / 2 - 0.28, h, d * 0.55, 2, rng);
    const p = smallPlant({ s: 0.8, seed: 'vp' + w });
    p.group.position.set(-w / 2 + 0.14, h, d * 0.55);
    k.group.add(p.group);
  }
  k.collideRect(w, d, 0, d / 2);
  return k;
}

// wall-hung WC with flush plate; back at z=0
export function wc(o = {}) {
  const k = new Kit('wc');
  const bowl = superEllipsoid(0.36, 0.3, 0.54, 0.5, 0.45, 0.6, 28, 16);
  k.mesh(bowl, C.ceramic, { pos: [0, 0.27, 0.29] });
  k.mesh(superEllipsoid(0.36, 0.035, 0.5, 0.45, 0.6, 0.6, 28, 8), C.ceramic, { pos: [0, 0.43, 0.29] });
  k.box(C.ceramic, 0.3, 0.12, 0.12, 0, 0.3, 0.06, { r: 0.04 });
  const plate = o.plate || sol('#f4f4f2', 0.25, 0);
  k.box(plate, 0.24, 0.16, 0.012, 0, 1.0, 0.006, { r: 0.01 });
  k.box(sol('#d5d5d3', 0.3, 0), 0.08, 0.1, 0.004, -0.045, 1.0, 0.014, { r: 0.008 });
  k.box(sol('#d5d5d3', 0.3, 0), 0.08, 0.1, 0.004, 0.045, 1.0, 0.014, { r: 0.008 });
  k.collideRect(0.38, 0.6, 0, 0.3);
  k.shadow(0.3, 0.45, 0, 0.3, { k: 0.25, soft: 0.1 });
  return k;
}

// shower column (thermostatic) with rain head and hand shower
export function showerColumn(o = {}) {
  const k = new Kit('shower');
  const m = o.mat || C.brassBrushed;
  k.box(m, 0.08, 0.12, 0.05, 0, 1.05, 0.025, { r: 0.015 });
  for (const s of [-1, 1]) k.cyl(m, 0.025, 0.025, 0.03, s * 0.05, 1.05, 0.06, { seg: 16, rot: [Math.PI / 2, 0, 0] });
  k.rod(m, [0, 1.1, 0.03], [0, 2.1, 0.03], 0.012);
  k.rod(m, [0, 2.1, 0.03], [0, 2.12, 0.33], 0.01);
  k.cyl(m, 0.125, 0.125, 0.012, 0, 2.1, 0.33, { seg: 40 });
  k.cyl(sol('#2c2a27', 0.5, 0.3), 0.11, 0.11, 0.002, 0, 2.093, 0.33, { seg: 40 });
  k.rod(m, [0.06, 1.3, 0.04], [0.06, 1.55, 0.06], 0.012);
  k.cyl(m, 0.03, 0.022, 0.08, 0.06, 1.6, 0.06, { seg: 16 });
  k.tube(sol('#c6c6c4', 0.3, 0.8), [[0.06, 1.3, 0.04], [0.04, 1.0, 0.07], [0.02, 0.85, 0.06], [0.0, 1.0, 0.04]], 0.006, { ts: 20, rs: 5 });
  return k;
}

// recessed lit niche (seen as an inset box with LED strip and bottles)
export function litNiche(w, h, o = {}) {
  const k = new Kit('niche');
  const d = 0.12;
  const back = o.back || sol('#e9e9e7', 0.3, 0);
  k.box(back, w, h, 0.01, 0, h / 2, -d, { r: 0 });
  for (const s of [-1, 1]) k.box(back, 0.01, h, d, s * w / 2, h / 2, -d / 2, { r: 0 });
  k.box(back, w, 0.01, d, 0, 0.005, -d / 2, { r: 0 });
  k.box(back, w, 0.01, d, 0, h - 0.005, -d / 2, { r: 0 });
  const col = '#' + kelvin(o.K || 5000).getHexString();
  k.box(emit(col, 4), w - 0.02, 0.006, 0.01, 0, h - 0.015, -0.02, { r: 0 });
  k.glowPlane(col, 0.8, w - 0.02, h - 0.03, 'edge', { fall: 2.2, ends: true, pos: [0, h - 0.02, -d + 0.008], rot: [0, 0, Math.PI] });
  const rng = new RNG('niche' + w);
  bottles(k, -w / 2 + 0.08, 0.01, -d / 2, Math.max(2, Math.floor(w / 0.12)), rng, o.pal || ['#f2f2f0', '#141414', '#c9c3b8']);
  return k;
}

export function grabBar(k, x, y, z, len, m = C.brassBrushed) {
  k.rod(m, [x - len / 2, y, z + 0.06], [x + len / 2, y, z + 0.06], 0.014);
  for (const s of [-1, 1]) k.rod(m, [x + s * len / 2, y, z], [x + s * len / 2, y, z + 0.06], 0.014);
}

export function glassPanel(k, w, h, x, z, rot = 0, o = {}) {
  const g = new THREE.BoxGeometry(w, h, 0.01);
  g.translate(0, h / 2 + (o.y0 || 0), 0);
  g.rotateY(rot);
  g.translate(x, 0, z);
  k.mesh(g, 'glass', { uv: false });
  if (o.clamps !== false) {
    for (const y of [0.3, h - 0.3]) k.box(o.clampMat || C.brass, 0.05, 0.05, 0.03, x + Math.cos(rot) * (-w / 2 + 0.02), y, z - Math.sin(rot) * (-w / 2 + 0.02), { r: 0.006, rot: [0, rot, 0] });
  }
}

// black-framed glass box room (plan rectangle in local x/z), door gap on one side
export function glassBox(w, d, h, o = {}) {
  const k = new Kit('glassBox');
  const f = 0.03;
  const blk = C.black;
  const corners = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]];
  for (const [x, z] of corners) k.boxB(blk, f, h, f, x, 0, z, { r: 0.002 });
  // top and bottom rails + mid rails
  for (const y of [0, h - f, o.mid || 1.05]) {
    k.boxB(blk, w, f, f, 0, y, -d / 2, { r: 0 });
    k.boxB(blk, w, f, f, 0, y, d / 2, { r: 0 });
    k.boxB(blk, f, f, d, -w / 2, y, 0, { r: 0 });
    k.boxB(blk, f, f, d, w / 2, y, 0, { r: 0 });
  }
  // glass on sides listed in o.glass: 'front','back','left','right'
  const sides = o.glass || ['front', 'left', 'right'];
  const pane = (gw, gh, x, z, ry) => { const g = new THREE.BoxGeometry(gw, gh, 0.008); g.translate(0, gh / 2, 0); g.rotateY(ry); g.translate(x, 0, z); k.mesh(g, 'glass', { uv: false }); };
  if (sides.includes('front')) {
    const door = o.door || 0;
    if (door) { pane(w - door - f, h, -door / 2, d / 2, 0); k.boxB(blk, f, h, f, w / 2 - door, 0, d / 2, { r: 0 }); pane(door - f, h, w / 2 - door / 2, d / 2 - 0.03, 0.15); }
    else pane(w, h, 0, d / 2, 0);
  }
  if (sides.includes('back')) pane(w, h, 0, -d / 2, 0);
  if (sides.includes('left')) pane(d, h, -w / 2, 0, Math.PI / 2);
  if (sides.includes('right')) pane(d, h, w / 2, 0, Math.PI / 2);
  // roof frame
  k.boxB(blk, w, 0.02, d, 0, h, 0, { r: 0 });
  k.collideRect(w, d);
  return k;
}

export function towelLadder(k, x, y0, z, w = 0.5, h = 1.2) {
  const b = sol('#141516', 0.45, 0.3);
  for (const s of [-1, 1]) {
    k.rod(b, [x + s * w / 2, y0, z + 0.06], [x + s * w / 2, y0 + h, z + 0.06], 0.012);
    k.rod(b, [x + s * w / 2, y0 + 0.1, z], [x + s * w / 2, y0 + 0.1, z + 0.06], 0.008);
    k.rod(b, [x + s * w / 2, y0 + h - 0.1, z], [x + s * w / 2, y0 + h - 0.1, z + 0.06], 0.008);
  }
  for (let i = 0; i < 6; i++) k.rod(b, [x - w / 2, y0 + 0.12 + i * (h - 0.2) / 5, z + 0.06], [x + w / 2, y0 + 0.12 + i * (h - 0.2) / 5, z + 0.06], 0.008);
}

export function rollHolder(k, x, y, z, m = C.brass) {
  k.cyl(m, 0.02, 0.02, 0.02, x, y, z + 0.01, { seg: 12, rot: [Math.PI / 2, 0, 0] });
  k.rod(m, [x, y, z + 0.02], [x + 0.13, y, z + 0.02], 0.006);
  k.cyl(sol('#f6f6f4', 0.9, 0), 0.055, 0.055, 0.1, x + 0.07, y - 0.01, z + 0.07, { seg: 20, rot: [0, 0, Math.PI / 2] });
}

export { mirrorRound, towelRing };
