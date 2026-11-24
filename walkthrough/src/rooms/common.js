// Shared room helpers: daylight from windows, ceiling LED lines, track
// profiles with modules, downlights, wall art, placement shortcuts.
import * as THREE from 'three';
import { Kit, sol, emit, tex, C } from '../core/geom.js';
import { facePoint } from '../arch/shell.js';
import { kelvin } from '../lighting.js';

export const W3 = (X, y, Y) => new THREE.Vector3(X, y, -Y);

// sky light through every window (RectAreaLight facing in) + sun through the main one
export function daylight(z, o = {}) {
  const wl = z.windowLights.slice().sort((a, b) => (b.B - b.A) * (b.H - b.S) - (a.B - a.A) * (a.H - a.S));
  const sky = o.sky === undefined ? 2.6 : o.sky;
  wl.slice(0, o.max || 2).forEach((w, i) => {
    const mid = (w.A + w.B) / 2, yc = (w.S + w.H) / 2;
    z.lights.push({
      type: 'rect', zone: z.id, prio: -5 + i,
      pos: facePoint(w.e, mid, yc, 0.03), target: facePoint(w.e, mid, yc - 0.45, 2.5),
      w: w.B - w.A, h: w.H - w.S, color: kelvin(o.skyK || 7200), intensity: sky * (o.skyMul ? o.skyMul[i] || 1 : 1),
    });
  });
  if (wl.length && o.sun !== false) {
    const w = wl[0];
    const inward = [-w.e.out[0], -w.e.out[1]];
    const side = o.sunSide === undefined ? 0.45 : o.sunSide;
    const perp = [inward[1], -inward[0]];
    const b = z.bbox;
    z.sun = {
      dir: [inward[0] + perp[0] * side, inward[1] + perp[1] * side, -(o.sunDown || 0.75)],
      target: o.sunTarget || [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, 0],
      intensity: o.sunI === undefined ? 1.6 : o.sunI,
      color: kelvin(o.sunK || 5600),
    };
  }
}

// recessed linear LED along a plan segment at ceiling height h
export function ledLine(z, k, x0, y0, x1, y1, h, o = {}) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const w = o.w || 0.02;
  const ang = Math.atan2(y1 - y0, x1 - x0);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const K = o.K || 4000;
  const col = '#' + kelvin(K).getHexString();
  const g = new THREE.BoxGeometry(len, 0.004, w);
  g.rotateY(ang);
  g.translate(cx, h - 0.003, -cy);
  k.mesh(g, emit(col, o.e || 5.5), { uv: false });
  const rim = new THREE.BoxGeometry(len + 0.02, 0.003, w + 0.016);
  rim.rotateY(ang);
  rim.translate(cx, h - 0.0015, -cy);
  k.mesh(rim, sol('#2a2c2e', 0.5, 0.3), { uv: false });
  if (o.light !== false) {
    z.lights.push({
      type: 'rect', zone: z.id, prio: o.prio || 0,
      pos: W3(cx, h - 0.012, cy), target: W3(cx, 0, cy).add(new THREE.Vector3(0, 0, 0)),
      w: len, h: Math.max(0.05, w * 3), color: kelvin(K), intensity: o.i || 5, rotFix: ang,
      box: o.box, ex: o.ex,
    });
  }
}

// black magnetic track (30 mm) with alternating linear LED bars and spots
export function track(z, k, x0, y0, x1, y1, h, o = {}) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const ang = Math.atan2(y1 - y0, x1 - x0);
  const dx = (x1 - x0) / len, dy = (y1 - y0) / len;
  const g = new THREE.BoxGeometry(len, 0.012, 0.03);
  g.rotateY(ang);
  g.translate((x0 + x1) / 2, h - 0.006, -(y0 + y1) / 2);
  k.mesh(g, C.black, { uv: false });
  const K = o.K || 4000;
  const col = '#' + kelvin(K).getHexString();
  const step = o.step || 0.95;
  const n = Math.max(1, Math.floor(len / step));
  const pad = (len - (n - 1) * step) / 2;
  for (let i = 0; i < n; i++) {
    const t = pad + i * step;
    const X = x0 + dx * t, Y = y0 + dy * t;
    if ((i + (o.phase || 0)) % 2 === 0) {
      // linear module 0.6 m
      const b = new THREE.BoxGeometry(0.6, 0.022, 0.026);
      b.rotateY(ang); b.translate(X, h - 0.023, -Y);
      k.mesh(b, C.black, { uv: false });
      const e = new THREE.BoxGeometry(0.58, 0.003, 0.018);
      e.rotateY(ang); e.translate(X, h - 0.0345, -Y);
      k.mesh(e, emit(col, o.e || 4.5), { uv: false });
    } else {
      // cylinder spot, 55 mm
      k.cyl(C.black, 0.0275, 0.0275, 0.11, X, h - 0.068, -Y, { seg: 16 });
      k.cyl(emit(col, 3), 0.016, 0.016, 0.002, X, h - 0.124, -Y, { seg: 14 });
    }
  }
  if (o.light) {
    z.lights.push({ type: 'rect', zone: z.id, prio: o.prio || 1, pos: W3((x0 + x1) / 2, h - 0.04, (y0 + y1) / 2), target: W3((x0 + x1) / 2, 0, (y0 + y1) / 2), w: len, h: 0.12, color: kelvin(K), intensity: o.i || 3.5, rotFix: ang, box: o.box });
  }
}

// rectangle of track inset from a field
export function trackRect(z, k, x0, x1, y0, y1, h, o = {}) {
  track(z, k, x0, y0, x1, y0, h, { ...o, light: o.light, phase: 0 });
  track(z, k, x0, y1, x1, y1, h, { ...o, light: o.light, phase: 1 });
  track(z, k, x0, y0 + 0.03, x0, y1 - 0.03, h, { ...o, light: false, phase: 1 });
  track(z, k, x1, y0 + 0.03, x1, y1 - 0.03, h, { ...o, light: false, phase: 0 });
}

export function downlight(k, X, Y, h, o = {}) {
  const sq = o.square;
  const col = '#' + kelvin(o.K || 3500).getHexString();
  if (sq) {
    k.boxB(C.black, 0.09, 0.012, 0.09, X, h - 0.012, -Y, { r: 0.004 });
    k.box(emit(col, 2.5), 0.05, 0.002, 0.05, X, h - 0.013, -Y, { r: 0 });
  } else {
    k.cyl(sol('#e9e9e7', 0.5, 0), 0.045, 0.045, 0.01, X, h - 0.005, -Y, { seg: 20 });
    k.cyl(emit(col, 2.5), 0.03, 0.03, 0.002, X, h - 0.011, -Y, { seg: 20 });
  }
}

// framed artwork on a wall edge (plan): along = centre along-wall coordinate
export function artOnWall(z, k, e, along, yc, w, h, art, o = {}) {
  const fw = o.frame === undefined ? 0.025 : o.frame;
  const d = o.depth || 0.03;
  const fcol = o.fcol || C.black;
  const grp = new Kit('art');
  grp.box(fcol, w + fw * 2, h + fw * 2, d, 0, 0, d / 2, { r: 0.003 });
  const pg = new THREE.PlaneGeometry(w, h);
  grp.mesh(pg, 'art:' + art, { pos: [0, 0, d + 0.0015], keepUV: true });
  if (o.mat) grp.box(sol('#f4f3ef', 0.8, 0), w + 0.001, h + 0.001, 0.002, 0, 0, d + 0.0005, { r: 0 });
  const p = facePoint(e, along, yc, 0.002);
  grp.group.position.copy(p);
  grp.group.rotation.y = { S: Math.PI, N: 0, E: -Math.PI / 2, W: Math.PI / 2 }[e.side];
  k.group.add(grp.group);
  return grp;
}

export function edge(z, side, at) {
  return z.edges.find((e) => e.side === side && (at === undefined || (at >= e.a0 - 1e-3 && at <= e.a1 + 1e-3)));
}
