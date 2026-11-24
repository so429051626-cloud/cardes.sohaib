// [F] master bedroom and [F1] master ensuite.
import * as THREE from 'three';
import { Kit, sol, emit, tex, C } from '../core/geom.js';
import { RNG } from '../core/prng.js';
import { daylight, track, ledLine, artOnWall, edge, wallPanel, W3 } from './common.js';
import { bed, headboard, nightstand } from '../kit/beds.js';
import { wardrobe } from '../kit/storage.js';
import { swivelBoucle, chairTub } from '../kit/seating.js';
import { consoleFloating } from '../kit/tables.js';
import { tv } from '../kit/media.js';
import { crystalDandelion, flushRound } from '../kit/lights.js';
import { slatPanel, rug, mirrorRound, bottles, smallPlant, towelRing } from '../kit/decor.js';
import { vanity, wc, showerColumn, litNiche, grabBar, glassPanel, towelLadder, rollHolder } from '../kit/bath.js';
import { kelvin } from '../lighting.js';

export function buildF(z) {
  daylight(z, { sky: 1.6, max: 2, sunI: 0.8, sunSide: 0.4 });
  const rng = new RNG('F');
  // headboard wall: 5 grey upholstered panels with brass strips, centred Y 2.8
  z.place(headboard('panelsBrass', { n: 5, pw: 0.62, h: 2.7, color: '#A4A7AA' }), -9.5, 2.8, 90);
  const mr = mirrorRound(0.8, { ft: 0.014 });
  z.place(mr, -9.44, 2.8, 90, { y: 1.85 });
  // king bed, head on the west wall
  z.place(bed({
    w: 2.0, len: 2.15, baseH: 0.34, base: tex('fabric', '#C6C8CA'), seed: 'bedF',
    duvet: tex('drape', '#F4F4F2'), puff: 0.04,
    runner: { n: 'pat:geoRunner', c: '#ffffff' },
    throw: { spec: tex('fabric', '#2C3852'), mode: 'diagonal', depth: 0.75 },
    pillows: [tex('fabric', '#F6F6F4'), tex('fabric', '#F6F6F4'), tex('fabric', '#F6F6F4')],
    front: [tex('fabric', '#9A9DA0'), tex('fabric', '#F6F6F4'), tex('fabric', '#9A9DA0')],
  }), -9.44 + 1.075, 2.8, 90);
  for (const y of [1.45, 4.15]) {
    const ns = nightstand('walnut2', { w: 0.5, d: 0.42 });
    ns.lathe(sol('#d9d4ca', 0.4, 0), [[0.001, 0], [0.06, 0], [0.08, 0.12], [0.05, 0.25], [0.001, 0.25]], 0.1, 0.56, -0.05, { seg: 24 });
    z.place(ns, -9.2, y, 90);
  }
  z.place(rug(4.0, 3.2, 'rugDiag', { t: 0.012 }), -7.1, 2.8, 90);
  z.place(crystalDandelion(0.7, 2.25, 3.0), -6.5, 2.8, 0);
  // TV wall east: walnut slats Y 0.6..3.6, 65" TV, floating console
  z.place(slatPanel(3.0, 2.85, { seed: 'fTV' }), -3.15, 2.1, 270);
  z.place(tv(1.45, 0.83), -3.2, 2.1, 270, { y: 1.3 });
  const con = consoleFloating(2.0, 0.28, 0.42, 0.32, { walnutFrame: true });
  con.lathe(C.ceramic, [[0.001, 0], [0.05, 0], [0.07, 0.12], [0.04, 0.22], [0.001, 0.22]], 0.6, 0.6, 0.0, { seg: 20 });
  z.place(con, -3.15 - 0.034 - 0.21, 2.1, 270);
  z.place(swivelBoucle(), -3.65, 0.0, 300);
  const S = edge(z, 'S');
  artOnWall(z, z.k, S, -5.15, 1.5, 0.25, 1.0, 'copper1', { frame: 0.018, fcol: C.brass });
  artOnWall(z, z.k, S, -4.6, 1.5, 0.25, 1.0, 'copper2', { frame: 0.018, fcol: C.brass });
  // north wall: walnut strip, wardrobes with brass bars + vanity niche
  z.place(slatPanel(0.4, 2.85, { seed: 'fN' }), -6.3, 6.1, 180);
  const wd = wardrobe({ w: 1.9, h: 2.85, d: 0.6, handles: 'brass', vanity: { x0: -0.45, x1: 0.35 } });
  z.place(wd, -4.15, 6.1 - 0.3, 180);
  // blue velvet slipper chair in the vanity niche (local -0.05 -> plan X -4.1)
  z.place(chairTub({ mat: tex('velvet', '#3B5C8C'), R: 0.25, back: 0.3, seat: 0.44, open: 140 }), -4.1, 5.45, 180);
  // ceiling: track lines in the raised field
  track(z, z.k, -8.4, 0.2, -8.4, 5.4, 3.0, { light: true, i: 2.4, phase: 0 });
  track(z, z.k, -4.6, 0.2, -4.6, 5.4, 3.0, { light: true, i: 2.4, phase: 1 });
}

export function buildF1(z) {
  daylight(z, { sky: 1.6, max: 1, sun: false });
  const W = edge(z, 'W'), N = edge(z, 'N'), Eg = edge(z, 'E'), S = edge(z, 'S');
  // shower in the NW corner: mint marble on its walls
  for (const [a, b, y0, y1] of [[7.3, 7.75, 0, 2.7], [8.45, 8.85, 0, 2.7], [7.75, 8.45, 0, 1.75], [7.75, 8.45, 2.3, 2.7]]) wallPanel(z, W, a, b, y0, y1, 'mintTile', 0.008);
  wallPanel(z, N, -9.5, -8.4, 0, 2.7, 'mintTile', 0.008);
  const sh = showerColumn({ mat: C.brassBrushed });
  z.place(sh, -8.95, 8.85 - 0.008, 180);
  const ni = litNiche(1.0, 0.3, { K: 5000 });
  z.place(ni, -9.5 + 0.008, 8.07, 90, { y: 1.1 });
  const gb = new Kit('grab');
  grabBar(gb, 0, 0.95, 0, 0.6);
  z.place(gb, -9.5 + 0.008, 8.07, 90);
  const gp = new Kit('glassP');
  glassPanel(gp, 1.4, 2.0, 0, 0, Math.PI / 2, { clampMat: C.brass });
  z.place(gp, -8.4, 8.15, 0);
  z.world.addRect(-8.4, 8.15, 1.4, 0.02, Math.PI / 2);
  // WC on the north wall at X -7.9
  z.place(wc(), -7.9, 8.85, 180);
  const rh = new Kit('roll');
  rollHolder(rh, 0, 0.75, 0);
  z.place(rh, -7.45, 8.85, 180);
  // vanity on the east wall: walnut slats, round brass mirror, oak front
  z.place(slatPanel(0.9, 2.7, { seed: 'f1v' }), -6.6, 7.75, 270);
  z.place(vanity({ w: 1.0, d: 0.48, h: 0.86, front: tex('oak', '#ffffff'), faucet: C.brassBrushed }), -6.6 - 0.034, 7.75, 270);
  z.place(mirrorRound(0.65, { ft: 0.01 }), -6.6 - 0.034, 7.75, 270, { y: 1.55 });
  const tr = new Kit('ring');
  towelRing(tr, 0, 1.25, 0);
  z.place(tr, -6.6, 8.45, 270);
  // heated towel ladder on the south wall near the door
  const tl = new Kit('ladder');
  towelLadder(tl, 0, 0.25, 0, 0.5, 1.2);
  z.place(tl, -8.7, 6.25, 0);
  z.place(flushRound(0.4, 2.7, { i: 0.9 }), -8.05, 7.55, 0);
  z.lights.push({ type: 'rect', zone: 'F1', prio: 1, pos: W3(-9.45, 1.4, 8.07), target: W3(-7, 1.2, 8.07), w: 0.9, h: 0.2, color: kelvin(5000), intensity: 1.6 });
}
