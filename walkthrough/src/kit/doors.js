// Door leaves. Local frame: hinge axis at origin, leaf runs along +X (0..w),
// thickness along Z, height along Y. Lever handles near the free edge.
import { Kit, sol, emit, tex, C } from '../core/geom.js';

const T = 0.045;

function lever(k, w, side) {
  const z = side * (T / 2 + 0.008);
  const x = w - 0.075;
  k.cyl(C.steel, 0.025, 0.025, 0.01, x, 1.02, z, { rot: [Math.PI / 2, 0, 0], seg: 20 });
  k.rod(C.steel, [x, 1.02, z], [x, 1.02, z + side * 0.05], 0.009, { seg: 10 });
  k.box(C.steel, 0.13, 0.018, 0.018, x - 0.065, 1.02, z + side * 0.055, { r: 0.008 });
}

export function doorLeaf(w, h, type) {
  const k = new Kit('door');
  const oak = tex('oak', '#ffffff');
  k.box(oak, w, h, T, w / 2, h / 2, 0, { r: 0.003, grain: 'y' });
  if (type === 'groove') {
    const dark = sol('#6a5037', 0.6, 0);
    for (let i = 1; i <= 4; i++) {
      const x = (w * i) / 5;
      for (const s of [-1, 1]) k.box(dark, 0.006, h - 0.004, 0.0012, x, h / 2, s * (T / 2 + 0.0003), { r: 0 });
    }
  } else if (type === 'panel') {
    const pw = (w - 0.12 * 3) / 2 + 0.06;
    const rows = [[0.12, 0.7], [0.86, 0.75], [1.65, h - 0.12 - 1.65]];
    for (const [y0, ph] of rows) for (const cx of [0.12 + pw / 2 - 0.03, w - 0.12 - pw / 2 + 0.03]) {
      for (const s of [-1, 1]) {
        k.box(oak, pw - 0.06, ph, 0.012, cx, y0 + ph / 2, s * (T / 2 + 0.003), { r: 0.004, grain: 'y' });
        k.box(sol('#8f704f', 0.6, 0), pw - 0.03, ph + 0.03, 0.003, cx, y0 + ph / 2, s * (T / 2 + 0.0008), { r: 0.001 });
      }
    }
  }
  lever(k, w, 1);
  lever(k, w, -1);
  // hinges
  for (const y of [0.25, h / 2, h - 0.25]) k.box(C.steel, 0.012, 0.1, 0.05, 0.006, y, 0, { r: 0.002 });
  return k;
}

// black lacquer pivot leaf with steel inlays, glass slit and (left) keypad lock
export function pivotLeaf(w, h, left) {
  const k = new Kit('pivot');
  k.box(C.blackGloss, w, h, 0.055, w / 2, h / 2, 0, { r: 0.003 });
  const steel = sol('#9ea2a6', 0.32, 1);
  for (let i = 1; i <= 4; i++) {
    const y = h * (0.2 + i * 0.15);
    for (const s of [-1, 1]) k.box(steel, w - 0.26, 0.006, 0.002, w / 2 + 0.06, y, s * 0.0285, { r: 0 });
  }
  // vertical glass slit near the hinge
  for (const s of [-1, 1]) k.box('glassDark', 0.06, h - 0.5, 0.004, 0.11, h / 2, s * 0.028, { r: 0 });
  // long pull bar near the free edge
  for (const s of [-1, 1]) {
    k.box(steel, 0.025, 1.4, 0.025, w - 0.09, 1.15, s * 0.07, { r: 0.008 });
    k.rod(steel, [w - 0.09, 0.55, s * 0.028], [w - 0.09, 0.55, s * 0.065], 0.008);
    k.rod(steel, [w - 0.09, 1.75, s * 0.028], [w - 0.09, 1.75, s * 0.065], 0.008);
  }
  if (left) {
    for (const s of [-1, 1]) {
      k.box(sol('#0a0a0b', 0.25, 0.2), 0.065, 0.16, 0.02, w - 0.16, 1.12, s * 0.038, { r: 0.006 });
      k.box(emit('#36ff6a', 4), 0.006, 0.006, 0.004, w - 0.16, 1.18, s * 0.049, { r: 0 });
      for (let r = 0; r < 4; r++) for (let c2 = 0; c2 < 3; c2++) k.box(emit('#9fb8ff', 0.35), 0.008, 0.008, 0.003, w - 0.176 + c2 * 0.016, 1.07 + r * 0.02 - 0.03, s * 0.049, { r: 0 });
    }
  }
  return k;
}
