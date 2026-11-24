// Seating. Origin at floor centre, +Z = front.
import * as THREE from 'three';
import { Kit, sol, tex, C, superEllipsoid, pillowGeom, shellGeom } from '../core/geom.js';
import { RNG } from '../core/prng.js';

const D2R = Math.PI / 180;

function throwPillows(k, list, rng) {
  for (const p of list) {
    const g = pillowGeom(p.s || 0.48, p.s || 0.48, 0.16, rng);
    k.mesh(g, p.m, { pos: p.at, rot: p.rot || [-0.25, 0, 0] });
  }
}

// L-sectional: main run along x (length len, depth D), optional return at one end
// (o.ret = { side: -1|1, len }) extending towards +z. Back along -z.
export function sofaSectional(o = {}) {
  const k = new Kit('sectional');
  const rng = new RNG(o.seed || 'sect');
  const len = o.len || 4, D = o.depth || 0.98, fab = tex('fabric', o.color || '#55595C');
  const seatH = 0.43, plinth = 0.07, backH = 0.8, backT = 0.2, armW = 0.16;
  const ret = o.ret;
  const zb = -D / 2;
  // plinth (recessed dark)
  k.boxB(C.black, len - 0.06, plinth, D - 0.08, 0, 0, 0.0, { r: 0.004 });
  // base under seats
  k.boxB(fab, len, seatH - plinth - 0.13, D, 0, plinth, 0, { r: 0.03 });
  // back frame
  k.boxB(fab, len, backH - plinth, backT, 0, plinth, zb + backT / 2, { r: 0.04 });
  // arm at the end without return
  const armX = ret ? -ret.side : 1;
  const ends = ret ? [armX] : [-1, 1];
  for (const s of ends) k.boxB(fab, armW, 0.62 - plinth, D, s * (len / 2 - armW / 2), plinth, 0, { r: 0.05 });
  // seat cushions on the main run
  const x0 = -len / 2 + (ret && ret.side < 0 ? D : (ends.includes(-1) ? armW : 0));
  const x1 = len / 2 - (ret && ret.side > 0 ? D : (ends.includes(1) ? armW : 0));
  const runL = x1 - x0;
  const nC = Math.max(1, Math.round(runL / 1.0));
  for (let i = 0; i < nC; i++) {
    const cw = runL / nC;
    const g = superEllipsoid(cw - 0.012, 0.17, D - backT - 0.02, 0.18, 0.55, 0.18, 24, 14);
    k.mesh(g, fab, { pos: [x0 + cw * (i + 0.5), seatH - 0.07, zb + backT + (D - backT) / 2] });
    const b = superEllipsoid(cw - 0.03, 0.46, 0.2, 0.2, 0.3, 0.6, 20, 14);
    k.mesh(b, fab, { pos: [x0 + cw * (i + 0.5), seatH + 0.2, zb + backT + 0.06], rot: [-0.14, 0, 0] });
  }
  k.collideRect(len, D, 0, 0);
  k.shadow(len + 0.1, D + 0.1, 0, 0, { soft: 0.14, k: 0.55 });
  if (ret) {
    const rl = ret.len; // along +z from the back
    const xc = ret.side * (len / 2 - D / 2);
    const zc = zb + rl / 2;
    // base & plinth for the chaise part beyond the main depth
    const extL = rl - D;
    const zExt = zb + D + extL / 2;
    k.boxB(C.black, D - 0.08, plinth, extL - 0.04, xc, 0, zExt, { r: 0.004 });
    k.boxB(fab, D, seatH - plinth - 0.13, extL, xc, plinth, zExt, { r: 0.03 });
    // outer back along the return
    k.boxB(fab, backT, backH - plinth, rl, ret.side * (len / 2 - backT / 2), plinth, zc, { r: 0.04 });
    // arm at the front of the return
    k.boxB(fab, D, 0.62 - plinth, armW, xc, plinth, zb + rl - armW / 2, { r: 0.05 });
    const n = Math.max(1, Math.round((rl - D - armW) / 0.95));
    const cl = (rl - D - armW) / n;
    for (let i = 0; i < n; i++) {
      const g = superEllipsoid(D - backT - 0.02, 0.17, cl - 0.012, 0.18, 0.55, 0.18, 24, 14);
      k.mesh(g, fab, { pos: [xc - ret.side * backT / 2, seatH - 0.07, zb + D + cl * (i + 0.5)] });
      const b = superEllipsoid(0.2, 0.46, cl - 0.03, 0.6, 0.3, 0.2, 14, 14);
      k.mesh(b, fab, { pos: [ret.side * (len / 2 - backT - 0.06), seatH + 0.2, zb + D + cl * (i + 0.5)], rot: [0, 0, ret.side * 0.14] });
    }
    // corner seat
    const g = superEllipsoid(D - backT - 0.02, 0.17, D - backT - 0.02, 0.18, 0.55, 0.18, 24, 14);
    k.mesh(g, fab, { pos: [xc - ret.side * backT / 2, seatH - 0.07, zb + backT + (D - backT) / 2] });
    k.collideRect(D, extL, xc, zExt);
    k.shadow(D + 0.1, extL + 0.1, xc, zExt, { soft: 0.14, k: 0.55 });
  }
  // throw pillows
  const pal = o.pillows || [tex('fabric', '#B9BCBE'), tex('boucle', '#F1EFEA'), tex('fabric', '#8F9396')];
  const P = [];
  const np = Math.max(2, Math.round(len / 1.1));
  for (let i = 0; i < np; i++) {
    const x = -len / 2 + 0.45 + ((len - 0.9) * i) / Math.max(1, np - 1);
    P.push({ m: pal[i % pal.length], at: [x + rng.range(-0.08, 0.08), seatH + 0.3, zb + backT + 0.2], rot: [-0.3, rng.range(-0.25, 0.25), rng.range(-0.12, 0.12)], s: rng.range(0.44, 0.52) });
  }
  throwPillows(k, P, rng);
  return k;
}

export function sofa3(o = {}) {
  const k = new Kit('sofa3');
  const rng = new RNG('sofa3');
  const L = o.len || 2.1, D = 0.92, fab = tex('fabric', o.color || '#8E9194');
  for (const x of [-L / 2 + 0.08, L / 2 - 0.08]) for (const z of [-D / 2 + 0.08, D / 2 - 0.08]) k.cyl(C.black, 0.018, 0.012, 0.12, x, 0.06, z, { seg: 10 });
  k.boxB(fab, L, 0.24, D, 0, 0.12, 0, { r: 0.03 });
  k.boxB(fab, L, 0.62, 0.18, 0, 0.12, -D / 2 + 0.09, { r: 0.05 });
  for (const s of [-1, 1]) k.boxB(fab, 0.15, 0.36, D, s * (L / 2 - 0.075), 0.12, 0, { r: 0.06 });
  for (let i = 0; i < 3; i++) {
    const cw = (L - 0.3) / 3;
    k.mesh(superEllipsoid(cw - 0.01, 0.15, D - 0.2, 0.18, 0.55, 0.18), fab, { pos: [-L / 2 + 0.15 + cw * (i + 0.5), 0.43, 0.09] });
    k.mesh(superEllipsoid(cw - 0.03, 0.42, 0.18, 0.2, 0.3, 0.6), fab, { pos: [-L / 2 + 0.15 + cw * (i + 0.5), 0.66, -D / 2 + 0.22], rot: [-0.15, 0, 0] });
  }
  throwPillows(k, [
    { m: tex('fabric', '#D9DBDC'), at: [-L / 2 + 0.4, 0.72, -D / 2 + 0.38], rot: [-0.3, 0.2, 0.1] },
    { m: tex('boucle', '#F1EFEA'), at: [L / 2 - 0.4, 0.72, -D / 2 + 0.38], rot: [-0.3, -0.2, -0.1] },
  ], rng);
  k.collideRect(L, D);
  k.shadow(L + 0.1, D + 0.08, 0, 0, { k: 0.5 });
  return k;
}

// white boucle barrel armchair on walnut ball feet
export function armchairBarrel(o = {}) {
  const k = new Kit('barrel');
  const m = o.mat || tex('boucle', '#F1EFEA');
  const R = 0.42;
  k.mesh(shellGeom(R, 0.13, 0.5, 100, 0.04), m, { pos: [0, 0.18, 0] });
  k.mesh(superEllipsoid(0.62, 0.16, 0.6, 0.35, 0.55, 0.35), m, { pos: [0, 0.32, 0.03] });
  k.cyl(m, R - 0.02, R - 0.02, 0.16, 0, 0.18, 0, { seg: 36 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    k.sphere(tex('walnut', '#ffffff'), 0.045, Math.cos(a) * 0.28, 0.06, Math.sin(a) * 0.28, { ws: 14, hs: 10 });
  }
  k.collideCircle(0.42);
  k.shadowRound(0.42, 0, 0, { soft: 0.12, k: 0.5 });
  return k;
}

// tub chair (dining / velvet / leather), legs
export function chairTub(o = {}) {
  const k = new Kit('tub');
  const m = o.mat || tex('boucle', '#F1EFEA');
  const R = o.R || 0.29, back = o.back || 0.36, seat = o.seat || 0.47;
  k.mesh(shellGeom(R, 0.07, back, o.open || 120, 0.03, 36), m, { pos: [0, seat - 0.06, 0] });
  k.mesh(superEllipsoid(R * 2 - 0.08, 0.12, R * 2 - 0.06, 0.35, 0.55, 0.35), m, { pos: [0, seat, 0.02] });
  k.cyl(m, R - 0.01, R - 0.03, 0.08, 0, seat - 0.09, 0, { seg: 32 });
  const legM = o.legs || C.black;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const x = Math.cos(a) * R * 0.72, z = Math.sin(a) * R * 0.72;
    k.rod(legM, [x * 1.15, 0, z * 1.15], [x, seat - 0.12, z], 0.009, { r2: 0.015, seg: 10 });
  }
  k.collideCircle(R + 0.02);
  k.shadowRound(R + 0.04, 0, 0, { soft: 0.1, k: 0.4 });
  return k;
}

// black quilted lounge chair on a 4-prong swivel base
export function loungeQuilted(o = {}) {
  const k = new Kit('lounge');
  const leather = sol('#17181a', 0.42, 0.05);
  const seam = sol('#0b0b0c', 0.6, 0);
  k.mesh(superEllipsoid(0.7, 0.17, 0.66, 0.3, 0.55, 0.3), leather, { pos: [0, 0.43, 0.04] });
  // curved back shell
  const g = new THREE.CylinderGeometry(0.4, 0.36, 0.52, 40, 6, true, -Math.PI * 0.62, Math.PI * 1.24);
  g.rotateY(Math.PI);
  const back = k.mesh(g, solDSLike(leather), { pos: [0, 0.73, 0.02] });
  back.rotation.x = -0.16;
  // thickness: inner + outer shells
  const g2 = new THREE.CylinderGeometry(0.44, 0.4, 0.54, 40, 1, true, -Math.PI * 0.62, Math.PI * 1.24);
  g2.rotateY(Math.PI);
  k.mesh(g2, solDSLike(leather), { pos: [0, 0.72, 0.02], rot: [-0.16, 0, 0] });
  // quilting lines
  for (let i = 0; i < 4; i++) {
    const t = new THREE.TorusGeometry(0.405 - i * 0.008, 0.004, 4, 40, Math.PI * 1.2);
    t.rotateX(Math.PI / 2);
    t.rotateY(Math.PI * 0.4 + Math.PI);
    k.mesh(t, seam, { pos: [0, 0.53 + i * 0.11, 0.0], rot: [-0.16, 0, 0] });
  }
  // armrests
  for (const s of [-1, 1]) k.mesh(superEllipsoid(0.12, 0.12, 0.55, 0.4, 0.6, 0.4), leather, { pos: [s * 0.36, 0.6, 0.05] });
  // base
  k.cyl(C.chrome, 0.03, 0.03, 0.26, 0, 0.21, 0, { seg: 16 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    k.rod(C.chrome, [0, 0.08, 0], [Math.cos(a) * 0.36, 0.02, Math.sin(a) * 0.36], 0.016, { seg: 8 });
    k.cyl(C.black, 0.02, 0.02, 0.02, Math.cos(a) * 0.36, 0.01, Math.sin(a) * 0.36, { seg: 10 });
  }
  k.collideCircle(0.4);
  k.shadowRound(0.42, 0, 0, { soft: 0.14, k: 0.5 });
  return k;
}
function solDSLike(s) { return { ...s, n: 'solidDS' }; }

// white moulded bar stool, beech dowel legs, black wire brace
export function barStool(o = {}) {
  const k = new Kit('stool');
  const H = o.h || 0.75;
  const shell = sol('#f2f2f0', 0.3, 0);
  const lg = new THREE.LatheGeometry([[0, 0], [0.18, 0.005], [0.2, 0.03], [0.205, 0.06], [0.198, 0.065], [0.18, 0.04], [0, 0.03]].map((p) => new THREE.Vector2(p[0], p[1])), 36);
  k.mesh(lg, shell, { pos: [0, H - 0.04, 0] });
  // low back lip
  const g = new THREE.CylinderGeometry(0.2, 0.2, 0.09, 32, 1, true, Math.PI * 0.62, Math.PI * 0.76);
  k.mesh(g, { ...shell, n: 'solidDS' }, { pos: [0, H + 0.06, 0] });
  const beech = tex('oak', '#e6c9a0');
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    k.rod(beech, [Math.cos(a) * 0.25, 0, Math.sin(a) * 0.25], [Math.cos(a) * 0.12, H - 0.04, Math.sin(a) * 0.12], 0.014, { seg: 10 });
  }
  k.torus(C.black, 0.205, 0.004, 0, H * 0.33, 0, { rot: [Math.PI / 2, 0, 0], ts: 40, rs: 5 });
  k.collideCircle(0.22);
  k.shadowRound(0.26, 0, 0, { soft: 0.1, k: 0.35 });
  return k;
}

// white mesh office chair on chrome 5-star base
export function officeChair() {
  const k = new Kit('office');
  const white = sol('#f0f0ee', 0.45, 0);
  k.mesh(superEllipsoid(0.48, 0.07, 0.46, 0.35, 0.6, 0.35), white, { pos: [0, 0.47, 0.02] });
  const back = new THREE.CylinderGeometry(0.42, 0.42, 0.5, 24, 1, true, -0.55, 1.1);
  back.rotateY(Math.PI);
  k.mesh(back, { ...sol('#e6e6e4', 0.8, 0), n: 'solidDS' }, { pos: [0, 0.82, 0.2], rot: [-0.12, 0, 0] });
  k.box(white, 0.05, 0.5, 0.03, 0, 0.75, -0.21, { r: 0.012, rot: [-0.12, 0, 0] });
  for (const s of [-1, 1]) {
    k.box(white, 0.05, 0.03, 0.26, s * 0.25, 0.66, 0.02, { r: 0.012 });
    k.rod(white, [s * 0.25, 0.48, -0.06], [s * 0.25, 0.65, -0.04], 0.012);
  }
  k.cyl(C.chrome, 0.025, 0.025, 0.32, 0, 0.27, 0, { seg: 14 });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    k.rod(C.chrome, [0, 0.1, 0], [Math.cos(a) * 0.32, 0.06, Math.sin(a) * 0.32], 0.016, { seg: 8 });
    k.sphere(C.black, 0.025, Math.cos(a) * 0.32, 0.026, Math.sin(a) * 0.32, { ws: 10, hs: 8 });
  }
  k.collideCircle(0.3);
  k.shadowRound(0.34, 0, 0, { k: 0.35 });
  return k;
}

// white wire petal shell chair on chrome legs
export function shellWireChair() {
  const k = new Kit('shell');
  const white = sol('#f3f3f1', 0.35, 0);
  const pts = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector2(0.05 + 0.33 * Math.sin(t * Math.PI * 0.5), 0.02 + t * 0.42)); }
  const g = new THREE.LatheGeometry(pts, 40, Math.PI * 0.35, Math.PI * 1.3);
  g.rotateY(Math.PI * 0.85);
  k.mesh(g, { ...white, n: 'solidDS' }, { pos: [0, 0.4, 0] });
  // petal scallops on the rim
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * 0.35 + Math.PI * 1.3 * (i / 6) + Math.PI * 0.85;
    k.sphere(white, 0.07, Math.sin(a) * 0.36, 0.82, Math.cos(a) * 0.36, { ws: 12, hs: 8, scl: [1, 0.6, 0.35] });
  }
  k.mesh(superEllipsoid(0.5, 0.08, 0.46, 0.35, 0.6, 0.35), tex('fabric', '#ECECEA'), { pos: [0, 0.45, 0.02] });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    k.rod(C.chrome, [Math.cos(a) * 0.26, 0, Math.sin(a) * 0.26], [Math.cos(a) * 0.12, 0.42, Math.sin(a) * 0.12], 0.009);
  }
  k.collideCircle(0.36);
  k.shadowRound(0.36, 0, 0, { k: 0.35 });
  return k;
}

export function swivelBoucle() {
  const k = new Kit('swivel');
  const m = tex('boucle', '#F1EFEA');
  k.mesh(shellGeom(0.4, 0.14, 0.42, 110, 0.05), m, { pos: [0, 0.3, 0] });
  k.mesh(superEllipsoid(0.6, 0.18, 0.58, 0.4, 0.55, 0.4), m, { pos: [0, 0.42, 0.04] });
  k.cyl(m, 0.38, 0.33, 0.12, 0, 0.27, 0, { seg: 36 });
  k.cyl(sol('#d9d9d6', 0.4, 0.2), 0.2, 0.22, 0.2, 0, 0.1, 0, { seg: 30 });
  k.collideCircle(0.4);
  k.shadowRound(0.42, 0, 0, { k: 0.45 });
  return k;
}

export function ottomanRound(o = {}) {
  const k = new Kit('ottoman');
  const r = o.r || 0.42, h = o.h || 0.36;
  k.mesh(superEllipsoid(r * 2, h, r * 2, 0.3, 0.3, 0.3, 36, 18), o.mat || tex('boucle', '#E9E3D6'), { pos: [0, h / 2 + 0.005, 0] });
  k.shadowRound(r, 0, 0, { k: 0.45 });
  return k;
}

export function benchUpholstered(o = {}) {
  const k = new Kit('bench');
  const L = o.len || 1.3;
  k.mesh(superEllipsoid(L, 0.14, 0.42, 0.15, 0.5, 0.25), tex('fabric', o.color || '#C9CBCD'), { pos: [0, 0.4, 0] });
  for (const x of [-L / 2 + 0.07, L / 2 - 0.07]) for (const z of [-0.15, 0.15]) k.cyl(o.legs || C.black, 0.016, 0.01, 0.33, x, 0.165, z, { seg: 10 });
  k.collideRect(L, 0.42);
  k.shadow(L, 0.42, 0, 0, { k: 0.35 });
  return k;
}
