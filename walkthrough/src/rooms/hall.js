// [A] Reception and [B] main hall (living + dining).
import * as THREE from 'three';
import { Kit, sol, emit, tex, C, superEllipsoid } from '../core/geom.js';
import { RNG } from '../core/prng.js';
import { daylight, track, trackRect, ledLine, artOnWall, edge, W3 } from './common.js';
import { sofaSectional, armchairBarrel, chairTub, loungeQuilted, barStool } from '../kit/seating.js';
import { tableOvalPedestal, tableRoundTwoTier, diningTableMarble, consoleFloating, sideTableRound } from '../kit/tables.js';
import { tv, fireplace } from '../kit/media.js';
import { sputnik, tripleRing } from '../kit/lights.js';
import { pampasVase, orchidVase, ficus, books, bookStack, deer, candle, slatPanel, wavyPanel, rug, mirrorRound, towelRing, smallPlant } from '../kit/decor.js';
import { vesselBasin, spout } from '../kit/bath.js';
import { kelvin } from '../lighting.js';

export function buildA(z) {
  daylight(z, { sky: 1.5, max: 2, sunSide: 0.5, sunI: 0.8 });
  z.place(sofaSectional({ len: 4.0, depth: 0.92, ret: { side: -1, len: 2.4 }, seed: 'secA' }), 0.96, -2.6, 90);
  const rr = new RNG('A');
  z.place(rug(2.4, 2.4, tex('lowpile', '#f1f0ec'), { round: true, t: 0.01 }), 2.5, -2.0, 0);
  const t = tableRoundTwoTier();
  // a few objects on the table
  bookStack(t, 0.15, 0.4, 0.1, 3, rr);
  t.lathe(sol('#1c1d1e', 0.4, 0), [[0.001, 0], [0.09, 0], [0.12, 0.05], [0.13, 0.06], [0.001, 0.02]], -0.18, 0.4, -0.1, { seg: 32 });
  z.place(t, 2.5, -2.0, 0, { y: 0.01 });
  z.place(loungeQuilted(), 3.05, -0.78, 204);
  z.place(loungeQuilted(), 1.95, -0.7, 158);
  z.place(tripleRing(2.4, 3.15), 2.5, -2.0, 15);
  // small ficus in the south-east corner
  z.place(ficus({ h: 1.7, seed: 'ficusA', leaves: 320 }), 6.45, -5.45, 0);
  // brass signature, backlit, on the north wall left of the door
  signature(z, 1.95, -0.15, 2.08, 2.7);
}

function signature(z, X, Y, yc, w) {
  const k = new Kit('signature');
  const h = w * (384 / 2048);
  for (let i = 0; i < 4; i++) k.plane('brassScript', w, h, { pos: [0, 0, 0.012 + i * 0.0025], keepUV: true });
  k.glowPlane('#ffcf96', 0.22, w * 0.8, h * 0.45, 'halo', { spread: 0.35, pos: [0, -0.02, 0.003] });
  z.place(k, X, Y, 180, { y: yc });
}

function niche(z, X0, X1, yb, yt, wallX, rng) {
  // white open niche protruding from the east wall with shelves and decor
  const k = new Kit('niche');
  const w = X1 - X0, d = 0.34;
  const m = C.whiteLacquer;
  k.boxB(m, w, 0.03, d, 0, yb, d / 2, { r: 0.003 });
  k.boxB(m, w, 0.03, d, 0, yt - 0.03, d / 2, { r: 0.003 });
  for (const s of [-1, 1]) k.boxB(m, 0.03, yt - yb, d, s * (w / 2 - 0.015), yb, d / 2, { r: 0.003 });
  const shelves = [yb + 0.62, yb + 1.2, yb + 1.78];
  for (const y of shelves) k.boxB(m, w - 0.06, 0.025, d - 0.02, 0, y, d / 2, { r: 0.002 });
  k.box(emit('#ffe0b6', 2.2), w - 0.08, 0.004, 0.012, 0, yt - 0.034, d - 0.04, { r: 0 });
  // decor
  k.lathe(C.ceramic, [[0.001, 0], [0.07, 0], [0.09, 0.12], [0.05, 0.26], [0.03, 0.3], [0.001, 0.3]], -0.05, yb + 0.03, d / 2, { seg: 28 });
  books(k, -w / 2 + 0.06, shelves[0] + 0.025, d / 2, 6, { seed: 'nb' + X0 });
  k.lathe(sol('#151617', 0.5, 0), [[0.001, 0], [0.12, 0], [0.13, 0.05], [0.001, 0.04]], 0.08, shelves[1] + 0.025, d / 2, { seg: 28 });
  k.sphere(sol('#c9a35c', 0.3, 1), 0.06, -0.12, shelves[1] + 0.085, d / 2, { ws: 16, hs: 12 });
  k.lathe(sol('#d8d3c8', 0.7, 0), [[0.001, 0], [0.05, 0], [0.08, 0.1], [0.04, 0.2], [0.001, 0.2]], 0.0, shelves[2] + 0.025, d / 2, { seg: 24 });
  z.place(k, wallX, (X0 + X1) / 2, 270);
  z.world.addRect(wallX - d / 2, (X0 + X1) / 2, w, d, -Math.PI / 2);
}

function setting(z, X, Y, face, H) {
  const k = new Kit('setting');
  const white = sol('#f6f6f4', 0.15, 0);
  k.cyl(white, 0.16, 0.16, 0.008, 0, H + 0.004, 0, { seg: 40 });
  k.cyl(white, 0.13, 0.125, 0.014, 0, H + 0.015, 0, { seg: 40 });
  // standing folded napkin
  const s = new THREE.Shape([new THREE.Vector2(-0.05, 0), new THREE.Vector2(0.05, 0), new THREE.Vector2(0, 0.14)]);
  k.extrude(tex('fabric', '#fbfbf9'), s, 0.03, { center: true, pos: [0, H + 0.022, 0] });
  const blk = sol('#111213', 0.25, 0.4);
  k.lathe(blk, [[0.001, 0], [0.035, 0], [0.035, 0.004], [0.005, 0.01], [0.004, 0.09], [0.03, 0.11], [0.04, 0.16], [0.042, 0.2], [0.038, 0.2], [0.001, 0.13]], 0.13, H, -0.14, { seg: 20 });
  for (const sx of [-0.19, -0.21, 0.19]) k.box(blk, 0.012, 0.004, 0.2, sx, H + 0.003, 0, { r: 0.001 });
  z.place(k, X, Y, (face + 180) % 360);
}

export function buildB(z) {
  daylight(z, { sky: 1.7, max: 1, sunSide: -0.35, sunI: 0.8, sunTarget: [3.5, 11.5, 0] });
  const rng = new RNG('B');
  const field = { x0: 0.55, x1: 6.45, y0: 0.55, y1: 14.45 };
  // ---- ceiling tracks (field at 3.20) ----
  const H = 3.2;
  track(z, z.k, 1.25, 1.25, 1.25, 7.2, H, { light: true, i: 3.0, phase: 0 });
  track(z, z.k, 5.75, 1.25, 5.75, 7.2, H, { light: true, i: 3.0, phase: 1 });
  track(z, z.k, 1.28, 1.25, 5.72, 1.25, H, { phase: 1 });
  track(z, z.k, 1.28, 7.2, 5.72, 7.2, H, { phase: 0 });
  track(z, z.k, 3.5, 1.28, 3.5, 3.2, H, { phase: 1 });
  track(z, z.k, 3.5, 4.8, 3.5, 7.17, H, { phase: 0 });
  track(z, z.k, 3.5, 7.23, 3.5, 10.57, H, { phase: 1 });
  trackRect(z, z.k, 1.6, 5.0, 10.6, 14.2, H, { light: false });
  z.lights.push({ type: 'rect', zone: 'B', prio: 2, pos: W3(3.3, H - 0.05, 12.4), target: W3(3.3, 0, 12.4), w: 3.4, h: 0.6, color: kelvin(4000), intensity: 2.2, rotFix: 0 });

  // ---- TV wall (east, X = 7.0) ----
  z.place(wavyPanel(3.6, 2.95), 7.0, 4.0, 270);
  z.place(tv(1.68, 0.97), 6.95, 4.0, 270, { y: 1.55 });
  const con = consoleFloating(3.4, 0.32, 0.45, 0.2, { groove: true });
  deer(con, -1.3, 0.52, 0.02, 1.0);
  candle(con, -1.05, 0.52, 0.08);
  candle(con, 1.25, 0.52, 0.05);
  con.lathe(sol('#d9d4ca', 0.6, 0), [[0.001, 0], [0.06, 0], [0.08, 0.1], [0.05, 0.22], [0.001, 0.22]], 1.4, 0.52, -0.05, { seg: 24 });
  z.place(con, 6.755, 4.0, 270);
  z.place(fireplace(1.6, 0.2), 6.53, 4.0, 270, { y: 0.26 });
  niche(z, 1.6, 2.15, 0.2, 2.6, 7.0, rng);
  niche(z, 5.85, 6.4, 0.2, 2.6, 7.0, rng);
  z.place(slatPanel(0.5, 2.95, { seed: 'sE' }), 7.0, 6.65, 270);
  z.place(slatPanel(0.6, 2.95, { seed: 'sW' }), 0.0, 5.7, 90);

  // ---- living seating ----
  z.place(sofaSectional({ len: 4.9, depth: 1.0, ret: { side: 1, len: 2.4 }, seed: 'secB' }), 1.5, 4.45, 90);
  z.place(rug(3.2, 4.0, tex('shag', '#c9cacb'), { t: 0.025 }), 3.25, 4.0, 0);
  const ot = tableOvalPedestal(1.3, 0.7, 0.38);
  const pv = pampasVase({ h: 0.58, seed: 'pvB' });
  pv.group.position.set(-0.32, 0.38, 0.05);
  ot.group.add(pv.group);
  bookStack(ot, 0.25, 0.38, -0.05, 3, rng);
  z.place(ot, 3.2, 4.0, 90, { y: 0.025 });
  const ot2 = tableOvalPedestal(0.95, 0.55, 0.32);
  bookStack(ot2, 0.0, 0.32, 0.0, 2, rng);
  z.place(ot2, 3.95, 4.55, 90, { y: 0.025 });
  z.place(armchairBarrel(), 5.6, 1.9, 309);
  z.place(armchairBarrel(), 5.85, 5.75, 236);
  z.place(sputnik(24, 0.95, 2.35, H, { i: 1.2 }), 3.4, 4.0, 0);

  // ---- dining ----
  const tH = 0.75;
  const dt = diningTableMarble(2.8, 1.1, tH);
  const ov = orchidVase({ seed: 'orB' });
  ov.group.position.set(0, tH, 0);
  dt.group.add(ov.group);
  dt.cyl(sol('#141516', 0.85, 0), 0.05, 0.05, 0.16, -0.55, tH + 0.08, 0.05, { seg: 24 });
  dt.cyl(sol('#141516', 0.85, 0), 0.045, 0.035, 0.12, 0.6, tH + 0.06, -0.06, { seg: 24 });
  z.place(dt, 3.3, 12.5, 90);
  z.place(rug(3.0, 4.2, 'rugTone', { t: 0.012 }), 3.3, 12.5, 0);
  const tub = () => chairTub({ R: 0.28, back: 0.33, seat: 0.47 });
  for (const y of [11.55, 12.2, 12.85, 13.5]) {
    z.place(tub(), 2.35, y, 90);
    z.place(tub(), 4.25, y, 270);
    setting(z, 2.98, y, 90, tH);
    setting(z, 3.62, y, 270, tH);
  }
  z.place(tub(), 3.3, 10.6, 0);
  z.place(tub(), 3.3, 14.4, 180);
  setting(z, 3.3, 11.33, 0, tH);
  setting(z, 3.3, 13.67, 180, tH);
  z.place(sputnik(30, 0.95, 2.35, H, { i: 1.2 }), 3.3, 12.5, 0);

  // east wall: guest wash niche + ficus
  washNiche(z, 7.0, 12.0);
  z.place(ficus({ h: 1.9, seed: 'ficusB' }), 6.45, 13.4, 0);
  // west wall art (semicircles + arcs)
  artOnWall(z, z.k, edge(z, 'W', 8.8), 8.8, 1.6, 0.8, 1.2, 'arcsHall');
  // north-west corner: navy velvet armchairs + side table
  const navy = tex('velvet', '#2A3550');
  z.place(chairTub({ mat: navy, R: 0.36, back: 0.36, seat: 0.43, open: 110 }), 1.15, 14.05, 140);
  z.place(chairTub({ mat: navy, R: 0.36, back: 0.36, seat: 0.43, open: 110 }), 2.15, 14.3, 168);
  const st = sideTableRound();
  st.lathe(C.ceramic, [[0.001, 0], [0.04, 0], [0.06, 0.08], [0.03, 0.16], [0.001, 0.16]], 0, 0.512, 0, { seg: 20 });
  z.place(st, 1.55, 14.6, 0);
  // bar stools (kitchen bar overhang is in the hall)
  for (const y of [11.6, 12.2, 12.8]) z.place(barStool(), 0.42, y, 270);
}

function washNiche(z, wallX, Yc) {
  const k = new Kit('wash');
  const w = 0.8, d = 0.42, top = 2.35;
  const m = C.whiteLacquer;
  for (const s of [-1, 1]) k.boxB(m, 0.04, top, d, s * (w / 2 + 0.02), 0, d / 2, { r: 0.004 });
  k.boxB(m, w + 0.08, 0.06, d, 0, top, d / 2, { r: 0.004 });
  k.box(sol('#2b2e30', 0.35, 0), w, top, 0.01, 0, top / 2, 0.005, { r: 0 });
  k.box(emit('#ffe2b8', 2.5), 0.07, 0.003, 0.07, 0, top - 0.002, d / 2, { r: 0 });
  k.glowPlane('#ffe2b8', 0.35, w - 0.04, 0.9, 'edge', { fall: 2.5, ends: true, pos: [0, top - 0.01, 0.012], rot: [0, 0, Math.PI] });
  // floating counter + basin + spout
  k.boxB(C.whiteLacquer, w, 0.12, 0.42, 0, 0.74, 0.21, { r: 0.004 });
  vesselBasin(k, 0, 0.86, 0.24, { r: 0.19 });
  spout(k, 0, 0.86, 0.06, { tall: true });
  const mr = mirrorRound(0.6, { frame: C.black, ft: 0.01 });
  mr.group.position.set(0, 1.55, 0.01);
  k.group.add(mr.group);
  towelRing(k, w / 2 - 0.08, 1.15, 0.01);
  z.place(k, wallX, Yc, 270);
  z.world.addRect(wallX - 0.21, Yc, w + 0.1, 0.42, -Math.PI / 2);
}
