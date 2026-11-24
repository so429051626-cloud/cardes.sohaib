// Beds with draped bedding, headboards and nightstands.
// Bed origin at the centre of the mattress footprint; head at -z, foot at +z.
import * as THREE from 'three';
import { Kit, sol, emit, tex, C, superEllipsoid, pillowGeom, roundRectShape } from '../core/geom.js';
import { RNG } from '../core/prng.js';
import { slatPanel } from './decor.js';

// cloth over a box: grid in (u along x, v along z), draped over the edges listed
function drapeCloth(w, len, top, hangX, hangZ, rng, o = {}) {
  const R = 0.06;
  const ox = w / 2 + hangX, z0 = o.z0, z1 = o.z1 + hangZ;
  const nx = 46, nz = Math.max(20, Math.round((z1 - z0) / 0.05));
  const g = new THREE.PlaneGeometry(2 * ox, z1 - z0, nx, nz);
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0, (z0 + z1) / 2);
  const p = g.attributes.position, uv = g.attributes.uv;
  const ph = [rng.range(0, 6), rng.range(0, 6), rng.range(0, 6)];
  const edgeMap = (d) => {
    // horizontal distance beyond the edge -> (outward, drop)
    if (d <= 0) return [d, 0];
    const arc = (Math.PI / 2) * R;
    if (d < arc) { const a = d / R; return [R * Math.sin(a), R - R * Math.cos(a)]; }
    return [R + 0.015 * (d - arc), R + (d - arc)];
  };
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const dx = Math.abs(x) - w / 2;
    const dz = z - len / 2;
    let X = x, Y = top, Z = z;
    const ex = edgeMap(dx), ez = edgeMap(dz);
    if (dx > 0) { X = Math.sign(x) * (w / 2 + ex[0]); Y -= ex[1]; }
    if (dz > 0 && o.footHang !== false) { Z = len / 2 + ez[0]; Y -= ez[1]; }
    // wrinkles: soft on top, vertical folds on drops
    const drop = Math.max(0, top - Y);
    const fold = drop > 0.05 ? Math.sin((dx > 0 ? z : x) * 9 + ph[0]) * 0.012 * Math.min(1, drop * 4) : 0;
    const wr = (Math.sin(x * 5.3 + ph[1]) * Math.cos(z * 4.1 + ph[2]) * 0.008 + Math.sin((x + z) * 13 + ph[0]) * 0.003) * (drop > 0.02 ? 0.3 : 1);
    if (dx > 0) X += Math.sign(x) * fold; else if (dz > 0) Z += fold;
    Y += wr + (o.puff || 0) * Math.max(0, 1 - drop * 8) * (1 - Math.pow(Math.min(1, Math.abs(x) / (w / 2)), 6));
    p.setXYZ(i, X, Y, Z);
    uv.setXY(i, (x + ox) / (o.uvS || 0.3), (z - z0) / (o.uvS || 0.3));
  }
  g.computeVertexNormals();
  return g;
}

// o: { w, len, baseH, base: spec, legs, duvet: spec, throw: {spec, mode, depth}, runner: spec,
//      pillows: [specs back row], front: [specs], foldBand }
export function bed(o = {}) {
  const k = new Kit('bed');
  const rng = new RNG(o.seed || 'bed');
  const w = o.w || 1.8, L = o.len || 2.0;
  const baseH = o.baseH || 0.32;
  const base = o.base || tex('fabric', '#BFC1C3');
  const legH = o.legs ? 0.12 : 0.04;
  if (o.legs) {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.rod(o.legs, [sx * (w / 2 - 0.08), 0, sz * (L / 2 - 0.08)], [sx * (w / 2 - 0.1), legH, sz * (L / 2 - 0.1)], 0.012, { r2: 0.02, seg: 10 });
  } else k.boxB(C.black, w - 0.12, legH, L - 0.12, 0, 0, 0, { r: 0 });
  k.boxB(base, w + 0.04, baseH - legH, L + 0.04, 0, legH, 0, { r: 0.03 });
  const mTop = baseH + 0.24;
  k.mesh(superEllipsoid(w - 0.02, 0.25, L - 0.02, 0.12, 0.35, 0.12, 32, 12), sol('#f4f4f2', 0.9, 0), { pos: [0, baseH + 0.12, 0] });
  // duvet / coverlet: starts below the pillows and drapes over sides and foot
  const duv = o.duvet || tex('drape', '#F3F3F1');
  const z0 = -L / 2 + (o.duvetStart || 0.55);
  const g = drapeCloth(w, L, mTop + 0.03, 0.26, 0.24, rng, { z0, z1: L / 2, puff: o.puff === undefined ? 0.03 : o.puff, uvS: o.duvetUV });
  k.mesh(g, duv, { keepUV: true });
  // turned-down fold band near the pillows
  if (o.fold !== false) k.mesh(superEllipsoid(w + 0.06, 0.08, 0.3, 0.12, 0.6, 0.5, 32, 10), o.foldSpec || duv, { pos: [0, mTop + 0.05, z0 + 0.1] });
  // runner / throw at the foot
  if (o.runner) {
    const r = drapeCloth(w, L, mTop + 0.075, 0.3, 0.0, rng, { z0: L / 2 - 0.62, z1: L / 2 - 0.12, footHang: false, puff: 0.005, uvS: 0.5 });
    k.mesh(r, o.runner, { keepUV: true });
  }
  if (o.throw) {
    const t = o.throw;
    const depth = t.depth || 0.6;
    const r = drapeCloth(w, L, mTop + 0.09, 0.28, t.mode === 'foot' ? 0.2 : 0.0, rng, { z0: L / 2 - depth, z1: L / 2, puff: 0.012, uvS: t.uvS || 0.4, footHang: t.mode === 'foot' });
    const m = k.mesh(r, t.spec, { keepUV: true });
    if (t.mode === 'diagonal') { m.rotation.y = 0.35; m.position.set(-0.1, 0.0, -0.15); }
  }
  // pillows: back row (large, upright-ish) and front row (smaller)
  const back = o.pillows || [tex('fabric', '#F5F5F3'), tex('fabric', '#F5F5F3')];
  const nb = back.length;
  for (let i = 0; i < nb; i++) {
    const x = -w / 2 + (w / nb) * (i + 0.5);
    const pg = pillowGeom(Math.min(0.72, w / nb - 0.03), 0.5, 0.2, rng);
    k.mesh(pg, back[i], { pos: [x, mTop + 0.24, -L / 2 + 0.17], rot: [-0.32, rng.range(-0.06, 0.06), rng.range(-0.04, 0.04)] });
  }
  const fr = o.front || [];
  for (let i = 0; i < fr.length; i++) {
    const x = -((fr.length - 1) * 0.5) * 0.5 + i * 0.5;
    const pg = pillowGeom(0.46, 0.4, 0.16, rng);
    k.mesh(pg, fr[i], { pos: [x, mTop + 0.2, -L / 2 + 0.38], rot: [-0.45, rng.range(-0.15, 0.15), rng.range(-0.1, 0.1)] });
  }
  k.collideRect(w + 0.1, L + 0.1);
  k.shadow(w + 0.3, L + 0.3, 0, 0, { soft: 0.2, k: 0.5 });
  return k;
}

// headboards (wall-mounted, local XY = wall, +z out of wall, bottom at y=0)
export function headboard(type, o = {}) {
  const k = new Kit('headboard');
  const w = o.w || 1.9, h = o.h || 1.2;
  if (type === 'panelsBrass') {
    const n = o.n || 5, pw = o.pw || 0.62, gap = 0.015, H = o.h || 2.7;
    const total = n * pw + (n - 1) * gap;
    for (let i = 0; i < n; i++) {
      const x = -total / 2 + pw / 2 + i * (pw + gap);
      k.box(tex('fabric', o.color || '#A9ACAE'), pw, H, 0.06, x, H / 2, 0.03, { r: 0.012 });
      if (i < n - 1) k.box(C.brass, gap, H, 0.05, x + pw / 2 + gap / 2, H / 2, 0.025, { r: 0.002 });
    }
  } else if (type === 'oakUpholstered') {
    const oak = tex('oak', '#ffffff');
    k.box(oak, w, h, 0.06, 0, h / 2 + 0.25, 0.03, { r: 0.008 });
    k.mesh(superEllipsoid(w - 0.14, h - 0.14, 0.08, 0.15, 0.15, 0.6, 24, 16), tex('fabric', o.color || '#D8CDBD'), { pos: [0, h / 2 + 0.25, 0.08] });
  } else if (type === 'quiltedLattice') {
    const s = roundRectShape(w, h, 0.22);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 4, curveSegments: 16 });
    k.mesh(g, tex('fabric', '#F2F1EE'), { pos: [0, h / 2 + 0.3, 0.02] });
    // diamond quilting: diagonal seams + buttons
    const seam = sol('#d8d6d1', 0.9, 0);
    const step = 0.2;
    for (let i = -10; i <= 10; i++) for (const dir of [1, -1]) {
      const pts = [];
      for (let t = -h / 2 + 0.06; t <= h / 2 - 0.06; t += 0.05) {
        const x = i * step + dir * t;
        if (Math.abs(x) < w / 2 - 0.08) pts.push([x, t + h / 2 + 0.3, 0.117]);
      }
      if (pts.length > 1) for (let j = 0; j < pts.length - 1; j++) k.rod(seam, pts[j], pts[j + 1], 0.0035, { seg: 4 });
    }
    for (let ix = -6; ix <= 6; ix++) for (let iy = -4; iy <= 4; iy++) {
      const x = ix * step / 2 * 2 + (iy % 2 ? step / 2 : 0) - step / 2, y = iy * step / 2;
      if (Math.abs(x) < w / 2 - 0.1 && Math.abs(y) < h / 2 - 0.1 && (Math.round((x + y) / step * 2) % 2 === 0)) k.sphere(seam, 0.009, x, y + h / 2 + 0.3, 0.118, { ws: 8, hs: 6 });
    }
  } else if (type === 'slatsLow') {
    const sp = slatPanel(w, h, { mat: 'oak', tint: o.tint || '#d1a674', slat: 0.035, gap: 0.01, depth: 0.025, back: true, seed: 'hbslat' });
    k.group.add(sp.group);
  } else if (type === 'padded2') {
    const m = tex('fabric', o.color || '#A7AAAD');
    k.box(m, w + 0.04, h + 0.04, 0.04, 0, h / 2 + 0.3, 0.02, { r: 0.015 });
    for (let i = 0; i < 2; i++) k.mesh(superEllipsoid(w, h / 2 - 0.02, 0.12, 0.12, 0.35, 0.6, 28, 14), m, { pos: [0, 0.3 + h / 4 + i * h / 2, 0.08] });
  } else if (type === 'channelTufted') {
    const m = tex('fabric', o.color || '#9A9DA0');
    const n = 8;
    k.box(m, w + 0.04, h + 0.04, 0.04, 0, h / 2 + 0.3, 0.02, { r: 0.015 });
    for (let i = 0; i < n; i++) k.mesh(superEllipsoid(w / n - 0.006, h, 0.11, 0.5, 0.12, 0.6, 16, 20), m, { pos: [-w / 2 + (w / n) * (i + 0.5), h / 2 + 0.3, 0.07] });
  }
  return k;
}

// nightstands: 'walnut2' (two drawers, brass pulls), 'walnutFloat' (open shelf), 'whiteFloat' (oak top + drawer)
export function nightstand(type, o = {}) {
  const k = new Kit('night');
  const w = o.w || 0.5, d = o.d || 0.4;
  if (type === 'walnut2') {
    const wal = tex('walnut', '#ffffff');
    k.boxB(wal, w, 0.5, d, 0, 0.06, 0, { r: 0.006, grain: 'x' });
    for (const x of [-w / 2 + 0.03, w / 2 - 0.03]) for (const z of [-d / 2 + 0.03, d / 2 - 0.03]) k.cyl(C.brass, 0.012, 0.012, 0.06, x, 0.03, z, { seg: 8 });
    for (const y of [0.2, 0.43]) {
      k.box(sol('#2c211a', 0.6, 0), w - 0.03, 0.004, 0.004, 0, y + 0.08, d / 2 + 0.001, { r: 0 });
      k.box(C.brass, 0.12, 0.012, 0.018, 0, y, d / 2 + 0.012, { r: 0.005 });
    }
    k.collideRect(w, d);
    k.shadow(w, d, 0, 0, { k: 0.4, soft: 0.06 });
  } else if (type === 'walnutFloat') {
    const wal = tex('walnut', '#ffffff');
    k.boxB(wal, w, 0.035, d, 0, 0.55, 0, { r: 0.004, grain: 'x' });
    k.boxB(wal, w, 0.03, d, 0, 0.32, 0, { r: 0.004, grain: 'x' });
    k.boxB(wal, 0.03, 0.26, d, -w / 2 + 0.015, 0.32, 0, { r: 0.003 });
    k.boxB(wal, 0.03, 0.26, d, w / 2 - 0.015, 0.32, 0, { r: 0.003 });
    k.shadow(w, d, 0, 0, { k: 0.18, soft: 0.2 });
  } else {
    k.boxB(C.whiteLacquer, w, 0.2, d, 0, 0.35, 0, { r: 0.004 });
    k.boxB(tex('oak', '#ffffff'), w + 0.01, 0.025, d + 0.01, 0, 0.55, 0, { r: 0.003, grain: 'x' });
    k.box(sol('#c9c9c7', 0.5, 0), w - 0.03, 0.003, 0.002, 0, 0.42, d / 2 + 0.001, { r: 0 });
    k.shadow(w, d, 0, 0, { k: 0.18, soft: 0.2 });
  }
  return k;
}
