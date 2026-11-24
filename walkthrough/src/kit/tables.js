// Tables, consoles, TV units. Origin at floor centre, +Z = front.
import * as THREE from 'three';
import { Kit, sol, tex, C, roundRectShape, slabGeom } from '../core/geom.js';

// oval black lacquer top on an oval pedestal with a brushed brass band
export function tableOvalPedestal(w, d, h) {
  const k = new Kit('oval');
  const top = new THREE.CylinderGeometry(0.5, 0.5, 0.035, 64);
  k.mesh(top, C.blackGloss, { pos: [0, h - 0.0175, 0], scl: [w, 1, d] });
  k.torus(C.blackGloss, 0.5, 0.0175, 0, h - 0.0175, 0, { rot: [Math.PI / 2, 0, 0], scl: [w, d, 1], ts: 64, rs: 8 });
  const ph = h - 0.035;
  k.cyl(C.blackGloss, 0.5, 0.5, ph - 0.05, 0, 0.05 + (ph - 0.05) / 2, 0, { seg: 48, scl: [w * 0.55, 1, d * 0.5] });
  k.cyl(C.brassBrushed, 0.5, 0.5, 0.05, 0, 0.025, 0, { seg: 48, scl: [w * 0.56, 1, d * 0.51] });
  k.collideRect(w * 0.92, d * 0.92);
  k.shadow(w * 0.8, d * 0.8, 0, 0, { soft: 0.12, k: 0.4 });
  return k;
}

// round two-tier honey oak table
export function tableRoundTwoTier() {
  const k = new Kit('twotier');
  const oak = tex('oak', '#d7b98f', 'x');
  k.cyl(oak, 0.5, 0.5, 0.035, 0, 0.3825, 0, { seg: 64 });
  k.torus(oak, 0.5, 0.0175, 0, 0.3825, 0, { rot: [Math.PI / 2, 0, 0], ts: 64 });
  k.cyl(oak, 0.4, 0.4, 0.028, 0, 0.12, 0, { seg: 56 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    k.cyl(oak, 0.022, 0.022, 0.365, Math.cos(a) * 0.33, 0.1825, Math.sin(a) * 0.33, { seg: 12 });
  }
  k.collideCircle(0.5);
  k.shadowRound(0.48, 0, 0, { soft: 0.12, k: 0.45 });
  return k;
}

// nested round tables: honey oak top on 3 splayed legs + cream upholstered ottoman
export function tableNestingRound() {
  const k = new Kit('nesting');
  const oak = tex('oak', '#d7b98f', 'x');
  k.cyl(oak, 0.4, 0.4, 0.03, 0, 0.435, 0, { seg: 56 });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    k.rod(oak, [Math.cos(a) * 0.36, 0, Math.sin(a) * 0.36], [Math.cos(a) * 0.26, 0.42, Math.sin(a) * 0.26], 0.018, { r2: 0.022, seg: 10 });
  }
  k.collideCircle(0.42);
  k.shadowRound(0.42, 0, 0, { k: 0.4 });
  return k;
}

// black marble dining top on two black steel trapezoid frames; long axis = x
export function diningTableMarble(L = 2.8, W = 1.1, H = 0.75) {
  const k = new Kit('dining');
  k.mesh(slabGeom(roundRectShape(L, W, 0.05), 0.03, H - 0.03, 0.006), tex('blackMarble'), {});
  const st = C.blackSteel;
  for (const s of [-1, 1]) {
    const x = s * (L / 2 - 0.45);
    // trapezoid: top 0.9 wide, bottom 1.0, along z
    k.box(st, 0.05, 0.05, W - 0.2, x, H - 0.055, 0, { r: 0.004 });
    k.box(st, 0.05, 0.05, W - 0.1, x, 0.025, 0, { r: 0.004 });
    for (const z of [-1, 1]) k.rod(st, [x, 0.04, z * (W - 0.12) / 2], [x, H - 0.06, z * (W - 0.22) / 2], 0.024, { seg: 4 });
  }
  k.collideRect(L * 0.94, W * 0.6);
  k.shadow(L * 0.85, W * 0.7, 0, 0, { soft: 0.18, k: 0.35 });
  return k;
}

// sculptural black console: thick top, two cylinder legs
export function consoleSculptural() {
  const k = new Kit('consoleS');
  const b = sol('#151617', 0.35, 0);
  k.box(b, 1.0, 0.06, 0.36, 0, 0.72, 0, { r: 0.02 });
  for (const x of [-0.28, 0.28]) k.cyl(b, 0.09, 0.09, 0.69, x, 0.345, 0, { seg: 32 });
  k.collideRect(1.0, 0.36);
  k.shadow(0.9, 0.3, 0, 0, { k: 0.4 });
  return k;
}

// floating white lacquer console (wall mounted), depth along z
export function consoleFloating(L, h, d, bottom, o = {}) {
  const k = new Kit('consoleF');
  const m = o.mat || C.whiteLacquer;
  k.boxB(m, L, h, d, 0, bottom, 0, { r: 0.006 });
  if (o.walnutFrame) {
    k.boxB(tex('walnut'), L + 0.04, 0.03, d + 0.02, 0, bottom - 0.03, 0, { r: 0.004, grain: 'x' });
    for (const x of [-L / 2 + 0.05, L / 2 - 0.05]) k.boxB(tex('walnut'), 0.04, bottom - 0.03, 0.04, x, 0, d / 2 - 0.06, { r: 0.004 });
  }
  if (o.groove) for (let i = 1; i < 3; i++) k.box(sol('#c9c9c7', 0.5, 0), 0.003, h - 0.02, 0.002, -L / 2 + (L * i) / 3, bottom + h / 2, d / 2 + 0.001, { r: 0 });
  k.collideRect(L, d + 0.02);
  if (bottom < 0.4) k.shadow(L, d + 0.1, 0, 0.05, { soft: 0.2, k: 0.25 });
  return k;
}

export function sideTableRound(o = {}) {
  const k = new Kit('side');
  const top = o.mat || C.blackGloss;
  k.cyl(top, 0.22, 0.22, 0.025, 0, 0.5, 0, { seg: 40 });
  k.cyl(o.leg || C.brass, 0.015, 0.015, 0.49, 0, 0.245, 0, { seg: 12 });
  k.cyl(o.leg || C.brass, 0.14, 0.15, 0.015, 0, 0.0075, 0, { seg: 32 });
  k.collideCircle(0.22);
  k.shadowRound(0.2, 0, 0, { k: 0.35 });
  return k;
}
