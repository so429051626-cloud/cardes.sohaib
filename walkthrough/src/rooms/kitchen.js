// [C] Kitchen, [D] pantry, [E] master lobby.
import * as THREE from 'three';
import { Kit, sol, emit, tex, C } from '../core/geom.js';
import { RNG } from '../core/prng.js';
import { daylight, track, ledLine, artOnWall, edge, downlight, W3 } from './common.js';
import { baseRun, uppers, backsplash, hob, hood, sink, island, ovenColumn, fridge, breakfastBar } from '../kit/kitchen.js';
import { barStool } from '../kit/seating.js';
import { branchGlobes, rattanTrioLinear, flushRound } from '../kit/lights.js';
import { smallPlant, slatPanel, coffeeMachine, bottles, books } from '../kit/decor.js';
import { kelvin } from '../lighting.js';

export function buildC(z) {
  daylight(z, { sky: 2.2, max: 1, sunI: 0.9, sunSide: 0.3 });
  const ceil = 3.0;
  // south run (Y = 9.0, X -6.0 .. -0.6)
  const south = baseRun(5.4, { fronts: [
    { w: 0.6, type: 'door' }, { w: 0.6, type: 'drawers3' }, { w: 0.6, type: 'drawers2' }, { w: 0.9, type: 'drawers3' },
    { w: 0.9, type: 'drawers2' }, { w: 0.6, type: 'drawers3' }, { w: 0.6, type: 'door' }, { w: 0.6, type: 'drawers3' } ] });
  backsplash(south, 5.4, 0.9, 1.5, -0.3);
  hob(south, -0.2, 0.9, -0.02);
  hood(south, -0.2, 1.44, -0.05);
  const rng = new RNG('C');
  bottles(south, 1.6, 0.9, -0.16, 3, rng, ['#2b2d2f', '#e9e5dc', '#5c4a3a']);
  south.lathe(sol('#d9d4ca', 0.5, 0), [[0.001, 0], [0.12, 0], [0.14, 0.06], [0.001, 0.05]], -1.6, 0.9, -0.05, { seg: 28 });
  z.place(south, -3.3, 9.3, 0);
  z.place(uppers(5.4, 1.5, ceil, { led: 3.2 }), -3.3, 9.3, 0);
  // west run under the window (X = -6.0, Y 9.6 .. 12.4)
  const west = baseRun(2.8, { fronts: [{ w: 0.6, type: 'drawers3' }, { w: 0.9, type: 'door' }, { w: 0.7, type: 'door' }, { w: 0.6, type: 'drawers3' }] });
  sink(west, -0.1, 0.9, 0.0);
  const pl = smallPlant({ seed: 'kp' });
  pl.group.position.set(0.85, 0.9, -0.15);
  west.group.add(pl.group);
  z.place(west, -5.7, 11.0, 90);
  // north wall: base + uppers, pantry door, oven column, fridge, tall cabinet
  const north = baseRun(1.7, { fronts: [{ w: 0.9, type: 'drawers3' }, { w: 0.8, type: 'door' }] });
  backsplash(north, 1.7, 0.9, 1.5, -0.3);
  coffeeMachine(north, 0.3, 0.9, -0.1);
  z.place(north, -5.15, 14.7, 180);
  z.place(uppers(1.7, 1.5, ceil), -5.15, 14.7, 180);
  z.place(ovenColumn(0.8, ceil), -2.8, 14.69, 180);
  z.place(fridge(1.0, ceil), -1.8, 14.65, 180);
  const tall = ovenColumn(0.6, ceil);
  z.place(tall, -0.95, 14.69, 180);
  // island with waterfall ends + branch pendant
  const isl = island(3.0, 1.0, 0.92);
  isl.lathe(sol('#ecebe7', 0.3, 0), [[0.001, 0], [0.14, 0], [0.17, 0.07], [0.18, 0.09], [0.001, 0.06]], 0.6, 0.92, 0.05, { seg: 32 });
  for (let i = 0; i < 4; i++) isl.sphere(sol(['#d9a33b', '#7a9a3a', '#c9542e', '#e3c66a'][i], 0.4, 0), 0.04, 0.55 + (i % 2) * 0.07, 0.99, 0.02 + Math.floor(i / 2) * 0.07, { ws: 12, hs: 8 });
  books(isl, -0.9, 0.92, 0.0, 3, { seed: 'cook', pal: ['#e9e5dc', '#2b3a55', '#b88a3e'], hs: 0.9 });
  z.place(isl, -3.0, 12.2, 0);
  z.place(branchGlobes(2.05, 3.15), -3.0, 12.2, 0);
  // breakfast bar in the hall opening + rattan trio
  z.place(breakfastBar(2.0, 0.45, 1.05, 0.3), -0.225, 12.2, 90);
  z.place(rattanTrioLinear(1.6, 2.0, ceil), -0.2, 12.2, 90);
  // ceiling: track lines with linear modules along two sides of the cove field
  track(z, z.k, -5.2, 9.62, -0.8, 9.62, ceil, { light: true, i: 2.6, K: 4500, phase: 0 });
  track(z, z.k, -5.2, 14.38, -0.8, 14.38, ceil, { light: true, i: 2.6, K: 4500, phase: 1 });
  z.lights.push({ type: 'rect', zone: 'C', prio: 3, pos: W3(-3.0, 3.1, 12.0), target: W3(-3.0, 0, 12.0), w: 3.6, h: 3.0, color: kelvin(4800), intensity: 0.35, rotFix: 0 });
}

export function buildD(z) {
  daylight(z, { sky: 2.0, max: 1, sun: false });
  const run = baseRun(5.4, {});
  z.place(run, -3.3, 17.05, 180);
  // three white open shelves with dividers every 1.2 m
  const k = new Kit('shelves');
  const w = 5.4, d = 0.35;
  const m = sol('#f3f3f1', 0.4, 0);
  const ys = [1.45, 1.85, 2.25];
  for (const y of ys) k.boxB(m, w, 0.03, d, 0, y, d / 2, { r: 0.003 });
  for (let x = -w / 2; x <= w / 2 + 1e-3; x += 1.2) k.boxB(m, 0.025, 0.83, d, Math.min(w / 2 - 0.0125, Math.max(-w / 2 + 0.0125, x)), 1.45, d / 2, { r: 0.002 });
  const rng = new RNG('D');
  for (const y of ys) {
    for (let x = -w / 2 + 0.15; x < w / 2 - 0.15; x += rng.range(0.18, 0.32)) {
      const t = rng.int(0, 2);
      if (t === 0) { const h = rng.range(0.14, 0.24); k.cyl(sol('#e8eef0', 0.08, 0), 0.05, 0.05, h, x, y + 0.03 + h / 2, d / 2, { seg: 18 }); k.cyl(sol('#c9a35c', 0.3, 1), 0.052, 0.052, 0.02, x, y + 0.03 + h, d / 2, { seg: 18 }); }
      else if (t === 1) k.boxB(sol(rng.pick(['#e9e6e0', '#bdb3a4', '#f1f1ef', '#6f6a64']), 0.8, 0), 0.12, rng.range(0.16, 0.3), 0.18, x, y + 0.03, d / 2, { r: 0.004 });
      else k.cyl(sol(rng.pick(['#d7d2c8', '#3b3c3e', '#f2f2f0']), 0.4, 0), 0.06, 0.06, 0.12, x, y + 0.09, d / 2, { seg: 20 });
    }
  }
  z.place(k, -3.3, 17.35, 180);
  z.place(flushRound(0.35, 2.8, { i: 1.1 }), -3.3, 16.25, 0);
}

export function buildE(z) {
  // coffee niche on the north wall (Y 8.85): X -2.4 .. -1.0, 0.45 deep
  const k = new Kit('coffee');
  const w = 1.4, d = 0.45;
  const m = C.whiteLacquer;
  for (const s of [-1, 1]) k.boxB(m, 0.03, 2.35, d, s * (w / 2 + 0.015), 0, d / 2, { r: 0.003 });
  k.boxB(m, w + 0.06, 0.04, d, 0, 2.35, d / 2, { r: 0.003 });
  k.boxB(m, w, 0.9, d - 0.02, 0, 0.06, d / 2 - 0.01, { r: 0.003 });
  k.boxB(C.black, w - 0.02, 0.06, d - 0.06, 0, 0, d / 2 - 0.03, { r: 0 });
  k.boxB(tex('oak', '#ffffff'), w, 0.04, d, 0, 0.96, d / 2, { r: 0.004, grain: 'x' });
  k.boxB(m, w, 0.025, 0.28, 0, 1.45, 0.14, { r: 0.003 });
  k.box(emit('#ffe2b8', 2.4), w - 0.06, 0.004, 0.01, 0, 1.44, 0.24, { r: 0 });
  k.glowPlane('#ffe2b8', 0.4, w - 0.04, 0.45, 'edge', { fall: 2.6, ends: true, pos: [0, 1.44, 0.01], rot: [0, 0, Math.PI] });
  coffeeMachine(k, -0.35, 1.0, 0.2);
  for (let i = 0; i < 4; i++) k.cyl(sol('#f2f2f0', 0.2, 0), 0.035, 0.03, 0.08, -0.2 + i * 0.09, 1.515, 0.12, { seg: 16 });
  k.lathe(sol('#3a3b3d', 0.5, 0), [[0.001, 0], [0.09, 0], [0.11, 0.04], [0.001, 0.03]], 0.35, 1.0, 0.22, { seg: 24 });
  z.place(k, -1.7, 8.85, 180);
  z.world.addRect(-1.7, 8.85 - d / 2, w + 0.06, d, 0);
  z.place(barStool({ h: 0.68 }), -1.55, 8.05, 0);
  // walnut slat strip on the south wall with a small oak shelf and a plant
  z.place(slatPanel(0.5, 2.8, { seed: 'sE1' }), -2.4, 3.6, 0);
  const sh = new Kit('shelf');
  sh.boxB(tex('oak', '#ffffff'), 0.42, 0.03, 0.18, 0, 1.25, 0.12, { r: 0.004, grain: 'x' });
  const pl = smallPlant({ seed: 'ep', s: 1.1 });
  pl.group.position.set(0.04, 1.28, 0.12);
  sh.group.add(pl.group);
  z.place(sh, -2.4, 3.6, 0);
  artOnWall(z, z.k, edge(z, 'W', 6.0), 6.0, 1.55, 0.9, 1.4, 'arcsLobby');
  ledLine(z, z.k, -1.55, 4.0, -1.55, 8.3, 2.8, { K: 4000, i: 5.5 });
  for (const y of [4.6, 6.4]) downlight(z.k, -0.6, y, 2.8, { K: 3500 });
}
