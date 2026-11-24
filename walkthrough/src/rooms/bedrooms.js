// [G] corridor, bedrooms [H] [I] [K] [M] [N], ensuites [H1] [N1], study [L].
import * as THREE from 'three';
import { Kit, sol, emit, tex, C } from '../core/geom.js';
import { RNG } from '../core/prng.js';
import { daylight, track, trackRect, ledLine, artOnWall, edge, wallPanel, mouldings, downlight, W3 } from './common.js';
import { bed, headboard, nightstand } from '../kit/beds.js';
import { wardrobe, studyWall, monitor } from '../kit/storage.js';
import { shellWireChair, chairTub, benchUpholstered, officeChair, sofa3, ottomanRound } from '../kit/seating.js';
import { consoleFloating, consoleSculptural, tableNestingRound } from '../kit/tables.js';
import { tv } from '../kit/media.js';
import { sputnik, rattanGlobe, domePendant, drumLamp, molecule, sunburstFlush, doubleWaveRing, flushRound, eggLamp, linearSconce, starburst } from '../kit/lights.js';
import { slatPanel, wavyPanel, rug, mirrorRound, mirrorPill, mirrorPebble, archFloorMirror, hoop, ficus, smallPlant, pampasVase, bottles, towelRing, chalkboard, bookStack, books } from '../kit/decor.js';
import { vanity, wc, showerColumn, litNiche, grabBar, glassPanel, glassBox, rollHolder } from '../kit/bath.js';
import { kelvin } from '../lighting.js';

// ---------------------------------------------------------------- corridor
export function buildG(z) {
  daylight(z, { sky: 1.2, max: 1, sun: false });
  ledLine(z, z.k, 7.3, 9.2, 30.7, 9.2, 2.8, { K: 4200, i: 6.5, e: 5 });
  ledLine(z, z.k, 7.3, 9.6, 30.7, 9.6, 2.8, { K: 4200, i: 6.5, e: 5 });
  const S = edge(z, 'S'), N = edge(z, 'N');
  for (const [a, b] of [[7.15, 7.5], [8.6, 12.2], [15.9, 16.3], [17.4, 22.1], [23.2, 25.1], [26.2, 29.7], [30.8, 31]]) mouldings(z, S, a, b);
  for (const [a, b] of [[7.15, 8.0], [9.1, 10.2], [11.3, 14.85], [15.95, 16.9], [18.0, 23.6], [24.7, 26.3], [27.4, 31]]) mouldings(z, N, a, b);
  // feature wall: wavy relief + backlit walnut panel
  z.place(wavyPanel(2.9, 2.8), 13.75, 8.6, 0);
  const wp = new Kit('walnutPanel');
  wp.box(tex('walnut', '#ffffff'), 0.6, 2.7, 0.04, 0, 1.4, 0.05, { r: 0.004 });
  for (const s of [-1, 1]) {
    wp.box(emit('#ffcf96', 3), 0.006, 2.6, 0.01, s * 0.305, 1.4, 0.03, { r: 0 });
    wp.glowPlane('#ffcf96', 0.7, 2.6, 0.32, 'edge', { fall: 3, ends: true, pos: [s * 0.3, 1.4, 0.004], rot: [0, 0, s > 0 ? -Math.PI / 2 : Math.PI / 2] });
  }
  z.place(wp, 15.5, 8.6, 0);
}

// ---------------------------------------------------------------- bedroom 2
export function buildH(z) {
  daylight(z, { sky: 1.5, max: 1, sunI: 0.7 });
  const S = edge(z, 'S');
  wallPanel(z, S, 8.1, 10.5, 0.0, 1.9, tex('plaster', '#CDCFD1'), 0.02);
  const halo = new Kit('halo');
  halo.glowPlane('#fff0dc', 0.55, 2.4, 1.9, 'halo', { spread: 0.18, inner: 0 });
  z.place(halo, 9.3, 3.555, 0, { y: 0.95 });
  z.place(headboard('oakUpholstered', { w: 2.0, h: 1.15, color: '#D9CCB8' }), 9.3, 3.57, 0);
  z.place(bed({ w: 1.8, len: 2.1, seed: 'bedH', base: tex('fabric', '#D6D7D8'), duvet: tex('drape', '#F2F2F0'),
    throw: { spec: tex('fabric', '#A9ACAF'), mode: 'foot', depth: 0.55 },
    pillows: [tex('fabric', '#F5F5F3'), tex('fabric', '#F5F5F3')], front: [tex('fabric', '#B5B8BA'), tex('fabric', '#B5B8BA')] }), 9.3, 3.55 + 0.07 + 1.05, 0);
  for (const x of [8.1, 10.5]) {
    const ns = nightstand('walnutFloat', { w: 0.45, d: 0.38 });
    const lamp = drumLamp();
    lamp.group.position.set(0, 0.585, 0);
    ns.group.add(lamp.group);
    ns.lights.push(...lamp.lights.map((l) => ({ ...l, p: [l.p[0], l.p[1] + 0.585, l.p[2]] })));
    z.place(ns, x, 3.55 + 0.19, 0);
  }
  z.place(shellWireChair(), 7.75, 4.75, 40);
  z.place(sputnik(10, 0.75, 2.3, 3.0, { i: 1.0 }), 9.3, 5.6, 0);
  ledLine(z, z.k, 7.9, 4.3, 9.3, 5.25, 3.0, { K: 4000, i: 4 });
  ledLine(z, z.k, 9.3, 5.25, 10.9, 4.3, 3.0, { K: 4000, i: 4 });
  z.place(wardrobe({ w: 1.05, h: 2.6, d: 0.6, handles: 'none', doorW: 0.52 }), 9.22, 8.45 - 0.3, 180);
  z.place(archFloorMirror(0.7, 1.8), 10.65, 5.75, 215);
  z.place(rug(2.6, 1.9, tex('lowpile', '#D9DADB'), { t: 0.01 }), 9.3, 5.1, 0);
}

export function buildH1(z) {
  const N = edge(z, 'N');
  z.place(slatPanel(0.9, 2.7, { seed: 'h1' }), 10.55, 8.45, 180);
  z.place(vanity({ w: 0.9, d: 0.46, h: 0.85, oval: true, tall: true, front: tex('oak', '#ffffff'), basinR: 0.19 }), 10.55, 8.45 - 0.034, 180);
  z.place(mirrorRound(0.6), 10.55, 8.45 - 0.034, 180, { y: 1.6 });
  const tr = new Kit('ring'); towelRing(tr, 0, 1.2, 0); z.place(tr, 11.35, 8.45, 180);
  z.place(wc(), 11.8, 7.75, 270);
  z.place(showerColumn(), 11.8, 6.7, 270);
  const gp = new Kit('glass'); glassPanel(gp, 0.75, 2.0, 0, 0, 0, { clampMat: C.brass });
  z.place(gp, 11.42, 7.22, 0);
  z.world.addRect(11.42, 7.22, 0.75, 0.02, 0);
  z.place(flushRound(0.4, 2.7, { i: 1.2 }), 10.85, 7.35, 0);
  z.lights.push({ type: 'rect', zone: 'H1', prio: 1, pos: W3(10.85, 2.68, 7.35), target: W3(10.85, 0, 7.35), w: 1.2, h: 1.0, color: kelvin(3500), intensity: 0.9, rotFix: 0 });
}

// ---------------------------------------------------------------- bedroom 3 (pink)
function pleatPanel(k, w, h, color, x, z0, rng) {
  const g = new THREE.PlaneGeometry(w, h, 40, 6);
  const p = g.attributes.position;
  const ph = rng.range(0, 6);
  for (let i = 0; i < p.count; i++) { const xx = p.getX(i); p.setZ(i, 0.025 * Math.sin((xx / 0.09) * Math.PI * 2 + ph) + 0.03); }
  g.computeVertexNormals();
  g.translate(x, h / 2, z0);
  k.mesh(g, tex('drape', color), {});
}

export function buildI(z) {
  daylight(z, { sky: 1.3, max: 1, sunI: 0.5 });
  const rng = new RNG('I');
  const N = edge(z, 'N');
  // headboard wall: grey panel, brass strips, brass hoop, quilted lattice headboard
  wallPanel(z, N, 10.1, 12.0, 0, 2.7, tex('plaster', '#CBCDCF'), 0.015);
  const hb = new Kit('hbI');
  for (const x of [-0.55, 0, 0.55]) hb.box(C.brass, 0.012, 2.7, 0.006, x, 1.35, 0.018, { r: 0 });
  hoop(hb, 0, 1.75, 0.03, 0.45);
  z.place(hb, 11.05, 15.4, 180);
  z.place(headboard('quiltedLattice', { w: 1.9, h: 1.3 }), 11.05, 15.385, 180);
  const pk = new Kit('pink');
  pleatPanel(pk, 0.5, 2.95, '#D9B9BE', 0, 0, rng);
  z.place(pk, 9.85, 15.4, 180);
  const pk2 = new Kit('pink2');
  pleatPanel(pk2, 0.45, 2.95, '#D9B9BE', 0, 0.06, rng);
  z.place(pk2, 12.25, 15.4, 180);
  for (const x of [10.05, 12.05]) z.place(domePendant(0.2, 1.2, 3.0, { i: 0.4 }), x, 15.05, 0);
  z.place(bed({ w: 1.6, len: 2.0, seed: 'bedI', base: tex('fabric', '#E4E4E3'), duvet: { n: 'pat:gingham', c: '#ffffff' }, duvetUV: 0.6,
    throw: { spec: tex('knit', '#D9B9BE'), mode: 'foot', depth: 0.6, uvS: 0.3 },
    pillows: [tex('fabric', '#F6F6F4'), tex('fabric', '#F6F6F4')], front: [tex('velvet', '#D9B9BE')] }), 11.2, 15.4 - 0.08 - 1.0, 180);
  z.place(benchUpholstered({ len: 1.3, color: '#C6C8CA' }), 11.2, 12.95, 180);
  z.place(rattanGlobe(0.6, 2.2, 3.0), 11.4, 13.4, 0);
  ledLine(z, z.k, 10.0, 11.0, 12.4, 11.0, 3.0, { i: 3.5 });
  ledLine(z, z.k, 10.4, 12.6, 12.0, 12.6, 3.0, { i: 3.5 });
  ledLine(z, z.k, 10.0, 11.0, 10.4, 12.6, 3.0, { light: false });
  ledLine(z, z.k, 12.4, 11.0, 12.0, 12.6, 3.0, { light: false });
  for (const y of [11.2, 12.2]) downlight(z.k, 13.6, y, 3.0, { square: true });
  // glass-box bathroom in the NE corner
  const gb = glassBox(1.8, 2.25, 2.4, { glass: ['front', 'left'], door: 0.7 });
  z.place(gb, 13.5, 14.125, 180);
  const inside = new Kit('gbI');
  const sh = showerColumn({ mat: C.black });
  sh.group.position.set(0.55, 0, -1.125 - 0.15);
  inside.group.add(sh.group);
  const v = vanity({ w: 0.7, d: 0.42, h: 0.85, front: tex('oak', '#ffffff'), towels: false, decor: false, basinR: 0.16 });
  v.group.position.set(-0.45, 0, -1.125 - 0.15);
  inside.group.add(v.group);
  const m = mirrorRound(0.55, { frame: C.black, ft: 0.008 });
  m.group.position.set(-0.45, 1.55, -1.125 - 0.15);
  inside.group.add(m.group);
  z.place(inside, 13.5, 14.125, 180);
  z.place(wc(), 14.4, 13.55, 270);
  downlight(z.k, 13.5, 14.2, 3.0, { K: 4000 });
  // entry vignette on the east wall: sculptural console + branches + pebble mirror
  const con = consoleSculptural();
  for (const [x, h] of [[-0.25, 0.32], [0.22, 0.24]]) {
    con.lathe(sol('#121314', 0.6, 0), [[0.001, 0], [0.06, 0], [0.08, 0.1], [0.05, h * 0.8], [0.035, h], [0.001, h]], x, 0.75, 0, { seg: 24 });
    for (let i = 0; i < 6; i++) {
      const a = rng.range(0, 6.28), L = rng.range(0.35, 0.6);
      const tip = [x + Math.cos(a) * 0.25, 0.75 + h + L, Math.sin(a) * 0.1];
      con.tube(sol('#5a3a2a', 0.8, 0), [[x, 0.75 + h - 0.05, 0], [x + Math.cos(a) * 0.08, 0.75 + h + L * 0.5, Math.sin(a) * 0.04], tip], 0.004, { ts: 10, rs: 4 });
      for (let b = 0; b < 7; b++) con.sphere(sol(rng.pick(['#c0451f', '#d3622b', '#a8361a']), 0.6, 0), 0.018, tip[0] + rng.range(-0.08, 0.08), tip[1] - rng.range(0, 0.2), tip[2] + rng.range(-0.05, 0.05), { ws: 6, hs: 4, scl: [1, 0.5, 1] });
    }
  }
  z.place(con, 14.4 - 0.18, 11.8, 270);
  z.place(mirrorPebble(0.75, 1.05), 14.4, 11.8, 270, { y: 1.62 });
}

// ---------------------------------------------------------------- bedroom 4
export function buildK(z) {
  daylight(z, { sky: 1.4, max: 1, sunI: 0.6 });
  const S = edge(z, 'S');
  wallPanel(z, S, 18.08, 20.8, 1.05, 3.0, tex('cloudPlaster', '#ffffff'), 0.008);
  z.place(headboard('slatsLow', { w: 2.6, h: 1.05, tint: '#cf9f66' }), 19.4, 3.55, 0);
  z.place(bed({ w: 1.6, len: 2.0, seed: 'bedK', base: tex('fabric', '#E9E9E7'), duvet: tex('drape', '#F6F6F4'), puff: 0.06,
    throw: { spec: tex('fabric', '#C4C6C8'), mode: 'foot', depth: 0.55 },
    pillows: [tex('fabric', '#F7F7F5'), tex('fabric', '#F7F7F5')], front: [tex('boucle', '#F1EFEA')] }), 19.4, 3.55 + 0.06 + 1.0, 0);
  for (const x of [18.325, 20.475]) {
    z.place(nightstand('whiteFloat', { w: 0.45, d: 0.38 }), x, 3.55 + 0.21, 0);
    z.place(domePendant(0.2, 1.48, 3.0, { i: 0.35 }), x, 3.85, 0);
  }
  z.place(molecule(3.0), 19.4, 5.8, 0);
  ledLine(z, z.k, 16.4, 3.95, 20.4, 3.95, 3.0, { light: false });
  ledLine(z, z.k, 16.4, 8.05, 20.4, 8.05, 3.0, { light: false });
  ledLine(z, z.k, 16.4, 3.95, 16.4, 8.05, 3.0, { i: 3.5 });
  ledLine(z, z.k, 20.4, 3.95, 20.4, 8.05, 3.0, { i: 3.5 });
  const gb = glassBox(1.2, 1.8, 2.4, { glass: ['front', 'left'], door: 0.6 });
  z.place(gb, 16.75, 4.6, 0);
  const inside = new Kit('gbK');
  const sh = showerColumn({ mat: C.black });
  sh.group.position.set(0.35, 0, -0.9 - 0.15);
  sh.group.rotation.y = 0;
  inside.group.add(sh.group);
  z.place(inside, 16.75, 4.6, 0);
  z.place(wc(), 16.0, 5.05, 90);
  artOnWall(z, z.k, edge(z, 'E'), 6.2, 1.55, 1.1, 1.4, 'strokes');
  z.place(wardrobe({ w: 2.8, h: 2.7, d: 0.6, handles: 'silver', handleLen: 1.3, column: { x: 1.15, w: 0.4 }, doorW: 0.6 }), 19.3, 8.45 - 0.3, 180);
  z.place(rug(2.6, 2.0, tex('lowpile', '#CFD0D1'), { t: 0.01 }), 19.4, 5.6, 0);
}

// ---------------------------------------------------------------- bedroom 5 (navy)
export function buildM(z) {
  daylight(z, { sky: 1.4, max: 1, sunI: 0.6, sunSide: 0.6 });
  const rng = new RNG('M');
  const S = edge(z, 'S');
  wallPanel(z, S, 25.6, 26.8, 0, 3.0, tex('plaster', '#34435C'), 0.008);
  wallPanel(z, S, 26.8, 29.4, 0, 3.0, tex('cloudPlaster', '#e4e5e6'), 0.006);
  const acc = new Kit('accent');
  const nv = sol('#3a4a66', 0.7, 0);
  for (const [x0, x1, y0, y1] of [[-0.48, 0.48, 0.25, 0.27], [-0.48, 0.48, 2.6, 2.62], [-0.48, -0.46, 0.27, 2.6], [0.46, 0.48, 0.27, 2.6]]) acc.box(nv, x1 - x0, y1 - y0, 0.015, (x0 + x1) / 2, (y0 + y1) / 2, 0.016, { r: 0 });
  const sc = linearSconce(0.6);
  sc.group.position.set(-0.4, 1.55, 0.008);
  acc.group.add(sc.group);
  const pm = mirrorPill(0.45, 1.0);
  pm.group.position.set(0.08, 1.45, 0.008);
  acc.group.add(pm.group);
  acc.boxB(C.whiteLacquer, 0.95, 0.14, 0.42, 0.08, 0.68, 0.22, { r: 0.004 });
  z.place(acc, 26.2, 3.55, 0);
  z.place(ottomanRound_({ r: 0.2, h: 0.45 }), 26.28, 4.25, 0);
  z.place(headboard('padded2', { w: 1.9, h: 1.15, color: '#A9ACAF' }), 27.9, 3.565, 0);
  z.place(bed({ w: 1.8, len: 2.0, seed: 'bedM', base: tex('fabric', '#A9ACAF'), legs: sol('#2a2420', 0.5, 0), baseH: 0.36, duvet: tex('drape', '#F5F5F3'),
    throw: { spec: { n: 'pat:tartan', c: '#ffffff' }, mode: 'foot', depth: 1.0, uvS: 0.6 },
    pillows: [tex('fabric', '#F6F6F4'), tex('fabric', '#F6F6F4')], front: [tex('fabric', '#8F9295'), tex('fabric', '#F6F6F4')] }), 27.9, 3.6 + 1.0 + 0.04, 0);
  const ns = nightstand('whiteFloat', { w: 0.45, d: 0.38 });
  const egg = eggLamp();
  egg.group.position.set(0, 0.575, 0);
  ns.group.add(egg.group); ns.lights.push(...egg.lights.map((l) => ({ ...l, p: [l.p[0], l.p[1] + 0.575, l.p[2]] })));
  z.place(ns, 29.08, 3.55 + 0.21, 0);
  z.place(chairTub({ mat: tex('leather', '#8A4B2A'), R: 0.36, back: 0.36, seat: 0.43, open: 100 }), 25.15, 4.7, 60);
  z.place(ficus({ h: 1.6, seed: 'ficusM', leaves: 300 }), 24.98, 5.85, 0);
  z.place(sunburstFlush(3.0), 27.9, 5.8, 0);
  ledLine(z, z.k, 25.0, 6.9, 27.2, 6.9, 3.0, { i: 3.5 });
  ledLine(z, z.k, 27.2, 6.9, 27.2, 6.2, 3.0, { light: false });
  ledLine(z, z.k, 27.2, 6.2, 29.0, 6.2, 3.0, { i: 3.5 });
  const gb = glassBox(1.55, 1.8, 2.4, { glass: ['front', 'left'], door: 0.6 });
  z.place(gb, 28.475, 7.4, 180);
  const inside = new Kit('gbM');
  const v = vanity({ w: 0.6, d: 0.4, h: 0.85, front: tex('walnut', '#ffffff'), towels: false, decor: false, basinR: 0.15 });
  v.group.position.set(-0.35, 0, -0.9 - 0.15);
  inside.group.add(v.group);
  const mr = mirrorRound(0.5, { frame: C.black, ft: 0.008 });
  mr.group.position.set(-0.35, 1.55, -0.9 - 0.15);
  inside.group.add(mr.group);
  const sh = showerColumn({ mat: C.black });
  sh.group.position.set(0.45, 0, -0.9 - 0.15);
  inside.group.add(sh.group);
  z.place(inside, 28.475, 7.4, 180);
  z.place(wc(), 29.4, 6.95, 270);
  z.place(flushRound(0.3, 3.0, { light: false }), 28.475, 7.4, 0);
  z.place(wardrobe({ w: 1.35, h: 2.7, d: 0.6, handles: 'silver', handleLen: 1.3, doorW: 0.45 }), 26.925, 8.45 - 0.3, 180);
  const Eg = edge(z, 'E');
  artOnWall(z, z.k, Eg, 4.55, 1.55, 0.45, 1.2, 'navyGold', { fcol: C.brass, frame: 0.015 });
  artOnWall(z, z.k, Eg, 5.55, 1.55, 0.8, 1.2, 'contour', { frame: 0.02 });
  z.place(rug(2.6, 2.0, tex('lowpile', '#E6DFD2'), { t: 0.012 }), 27.9, 5.75, 0);
}
function ottomanRound_(o) { return ottomanRound({ r: o.r, h: o.h, mat: sol('#f3f3f1', 0.3, 0) }); }

// ---------------------------------------------------------------- bedroom 6 (pale blue)
export function buildN(z) {
  daylight(z, { sky: 1.6, max: 1, sunI: 0.7 });
  const W = edge(z, 'W'), S = edge(z, 'S', 29);
  wallPanel(z, W, 10.35, 15.4, 0, 3.0, 'leafPaper', 0.004);
  z.place(headboard('channelTufted', { w: 1.9, h: 1.25 }), 25.805, 13.0, 90);
  z.place(bed({ w: 1.8, len: 2.0, seed: 'bedN', base: tex('fabric', '#C9CBCD'), duvet: tex('drape', '#F6F6F4'),
    throw: { spec: { n: 'pat:floral', c: '#ffffff' }, mode: 'foot', depth: 0.6, uvS: 0.6 },
    pillows: [tex('fabric', '#F6F6F4'), tex('fabric', '#F6F6F4')], front: [tex('fabric', '#C4D3E0'), tex('velvet', '#B3C6D8')] }), 25.8 + 0.08 + 1.0, 13.0, 90);
  for (const y of [11.75, 14.25]) {
    const ns = nightstand('whiteFloat', { w: 0.45, d: 0.38 });
    ns.lathe(C.ceramic, [[0.001, 0], [0.05, 0], [0.07, 0.1], [0.04, 0.2], [0.001, 0.2]], 0.08, 0.575, 0, { seg: 20 });
    z.place(ns, 25.8 + 0.2, y, 90);
  }
  z.place(doubleWaveRing(2.25, 3.0), 26.9, 13.0, 0);
  trackRect(z, z.k, 26.4, 28.2, 10.9, 14.7, 3.0, { light: true, i: 2.4 });
  z.place(wardrobe({ w: 2.75, h: 2.7, d: 0.6, handles: 'silver', handleLen: 1.3, doorW: 0.55 }), 27.225, 15.4 - 0.3, 180);
  // south wall (corridor side, east of the door): grey with mouldings, TV, floating unit
  wallPanel(z, S, 27.4, 31.0, 0, 3.0, tex('plaster', '#D3D5D7'), 0.004);
  mouldings(z, S, 27.45, 31.0, { top: 2.6 });
  z.place(tv(1.23, 0.7), 28.85, 10.35 + 0.035, 0, { y: 1.4 });
  const unit = consoleFloating(2.2, 0.26, 0.3, 0.35, {});
  const pv = pampasVase({ h: 0.4, seed: 'pvN', vase: sol('#dfe7ea', 0.05, 0), n: 7, scale: 0.8 });
  pv.group.position.set(0.75, 0.61, 0);
  unit.group.add(pv.group);
  z.place(unit, 28.85, 10.35 + 0.19, 0);
  z.place(rug(3.4, 2.1, 'rugSquiggle', { t: 0.012 }), 29.05, 11.5, 0);
}

export function buildN1(z) {
  daylight(z, { sky: 1.4, max: 1, sun: false });
  const N = edge(z, 'N'), W = edge(z, 'W');
  // shower in the north part: mint marble on north and west walls
  wallPanel(z, N, 28.8, 29.88, 0, 2.7, 'mintTile', 0.008);
  wallPanel(z, N, 29.88, 31.0, 0, 1.2, 'mintTile', 0.008);
  wallPanel(z, N, 29.88, 31.0, 1.8, 2.7, 'mintTile', 0.008);
  wallPanel(z, W, 14.45, 15.4, 0, 2.7, 'mintTile', 0.008);
  z.place(showerColumn(), 29.55, 15.392, 180);
  z.place(litNiche(0.7, 0.3), 28.808, 14.95, 90, { y: 1.15 });
  const gbk = new Kit('grab'); grabBar(gbk, 0, 0.95, 0, 0.5); z.place(gbk, 28.808, 14.95, 90);
  const gp = new Kit('glass'); glassPanel(gp, 1.25, 2.0, 0, 0, 0, { clampMat: C.brass });
  z.place(gp, 29.43, 14.45, 0);
  z.world.addRect(29.43, 14.45, 1.25, 0.02, 0);
  // walnut vanity on the east wall, round backlit mirror
  z.place(vanity({ w: 1.0, d: 0.48, h: 0.85, front: tex('walnut', '#ffffff') }), 31.0, 13.6, 270);
  z.place(mirrorRound(0.6, { frame: sol('#e9e9e7', 0.3, 0), ft: 0.006, backlit: true }), 31.0, 13.6, 270, { y: 1.55 });
  // WC on the south wall with a white-framed open niche above
  z.place(wc(), 30.35, 12.8, 0);
  const nk = new Kit('nicheWC');
  const wht = sol('#f3f3f1', 0.3, 0);
  nk.box(wht, 0.7, 0.03, 0.15, 0, 0, 0.075, { r: 0.003 });
  nk.box(wht, 0.7, 0.03, 0.15, 0, 0.42, 0.075, { r: 0.003 });
  for (const s of [-1, 1]) nk.box(wht, 0.03, 0.45, 0.15, s * 0.335, 0.21, 0.075, { r: 0.003 });
  bottles(nk, -0.25, 0.015, 0.075, 4, new RNG('n1b'), ['#141414', '#1e1e1e']);
  z.place(nk, 30.35, 12.8, 0, { y: 1.2 });
  // towel rail with two towels beside the door
  const tk = new Kit('rail');
  tk.rod(sol('#141516', 0.4, 0.3), [-0.3, 1.1, 0.07], [0.3, 1.1, 0.07], 0.01);
  for (const s of [-1, 1]) tk.rod(sol('#141516', 0.4, 0.3), [s * 0.3, 1.1, 0], [s * 0.3, 1.1, 0.07], 0.008);
  for (const x of [-0.14, 0.14]) tk.box(tex('fabric', '#f4f4f2'), 0.24, 0.5, 0.03, x, 0.86, 0.075, { r: 0.012 });
  z.place(tk, 29.3, 12.8, 0);
  z.place(flushRound(0.35, 2.7, { i: 1.0 }), 29.9, 13.6, 0);
}

// ---------------------------------------------------------------- study
export function buildL(z) {
  daylight(z, { sky: 1.8, max: 1, sunI: 0.8, sunSide: -0.3 });
  const rng = new RNG('L');
  z.place(studyWall(3.4), 22.6, 12.9, 270);
  for (const y of [12.0, 13.8]) z.place(officeChair(), 21.95, y, 90);
  z.place(monitor('violet', 0.62, 0.38, { white: true }), 22.32, 12.0, 270, { y: 0.77 + 0.19 + 0.18 });
  z.place(monitor('ice', 0.6, 0.35), 22.32, 13.8, 270, { y: 0.77 + 0.175 + 0.18 });
  artOnWall(z, z.k, edge(z, 'E'), 12.9, 1.0, 0.5, 0.38, 'photos', { fcol: tex('oak', '#ffffff'), frame: 0.02 });
  const sh = new Kit('frames');
  for (const [x, w, h] of [[-0.4, 0.13, 0.18], [0.5, 0.18, 0.13]]) {
    sh.box(C.black, w, h, 0.015, x, 1.285 + h / 2, 0.08, { r: 0.002, rot: [-0.12, 0, 0] });
    sh.plane('art:photos', w - 0.03, h - 0.03, { pos: [x, 1.285 + h / 2, 0.089], rot: [-0.12, 0, 0], keepUV: true });
  }
  z.place(sh, 22.6, 12.9, 270);
  z.place(chalkboard(1.2, 0.8), 20.4, 10.35, 0, { y: 1.5 });
  z.place(sofa3({ len: 2.1, color: '#8E9194' }), 16.4 + 0.47, 12.9, 90);
  const W = edge(z, 'W');
  for (let i = 0; i < 3; i++) artOnWall(z, z.k, W, 12.3 + i * 0.6, 1.6, 0.5, 0.7, 'night' + i, { frame: 0.018 });
  const nt = tableNestingRound();
  bookStack(nt, -0.1, 0.45, 0.05, 2, rng);
  nt.box(sol('#f4f2ec', 0.9, 0), 0.21, 0.004, 0.297, 0.15, 0.452, -0.1, { r: 0, rot: [0, 0.4, 0] });
  z.place(nt, 18.6, 12.6, 0);
  z.place(ottomanRound({ r: 0.42, h: 0.34, mat: tex('fabric', '#E8E0D0') }), 18.95, 12.25, 0);
  z.place(rug(3.0, 2.4, tex('lowpile', '#D2D3D4'), { t: 0.01 }), 18.7, 12.8, 0);
  z.place(starburst(96, 2.15, 3.0), 19.5, 12.9, 0);
  ledLine(z, z.k, 17.2, 11.2, 21.6, 11.2, 3.0, { i: 3.0 });
  ledLine(z, z.k, 17.2, 14.6, 21.6, 14.6, 3.0, { i: 3.0 });
  for (const [x, y] of [[17.3, 13.2], [21.4, 12.0], [21.4, 13.8]]) downlight(z.k, x, y, 3.0, { square: true });
  const pl = smallPlant({ seed: 'Lp', s: 1.6 });
  z.place(pl, 16.75, 14.95, 0);
}
