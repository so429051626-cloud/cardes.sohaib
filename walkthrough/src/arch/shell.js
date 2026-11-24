// Room shells: walls (half-thickness slabs decomposed into boxes around
// openings), floor, thresholds, tray/cove ceilings, skirting, windows with
// exterior views, curtains, door casings, door leaves, colliders and portals.
import * as THREE from 'three';
import { uvBox, sol, emit, tex, C, MAPSCALE } from '../core/geom.js';
import { RNG } from '../core/prng.js';
import { doorLeaf, pivotLeaf } from '../kit/doors.js';

const HALF = 0.075;
const EXT = 0.3;

// plan box -> world BoxGeometry
export function planBox(X0, X1, Y0, Y1, y0, y1) {
  const g = new THREE.BoxGeometry(X1 - X0, y1 - y0, Y1 - Y0);
  g.translate((X0 + X1) / 2, (y0 + y1) / 2, -(Y0 + Y1) / 2);
  return g;
}

function sideOf(dx, dy) { return dy === 0 ? (dx > 0 ? 'S' : 'N') : (dy > 0 ? 'E' : 'W'); }
const OUT = { S: [0, -1], N: [0, 1], E: [1, 0], W: [-1, 0] };

export function edgesOf(def) {
  const P = def.poly, n = P.length, E = [];
  for (let i = 0; i < n; i++) {
    const p0 = P[i], p1 = P[(i + 1) % n];
    const dx = Math.sign(p1[0] - p0[0]), dy = Math.sign(p1[1] - p0[1]);
    const side = sideOf(dx, dy);
    const t = def.ext.includes(side) ? EXT : HALF;
    E.push({ i, p0, p1, dx, dy, side, t });
  }
  for (let i = 0; i < n; i++) {
    const e = E[i], prev = E[(i - 1 + n) % n], next = E[(i + 1) % n];
    const convexStart = prev.dx * e.dy - prev.dy * e.dx > 0;
    const convexEnd = e.dx * next.dy - e.dy * next.dx > 0;
    const horiz = e.dy === 0;
    e.fixed = horiz ? e.p0[1] : e.p0[0];
    const s0 = horiz ? e.p0[0] : e.p0[1], s1 = horiz ? e.p1[0] : e.p1[1];
    const extS = convexStart ? prev.t : 0, extE = convexEnd ? next.t : 0;
    if (s0 < s1) { e.a0 = s0; e.a1 = s1; e.A0 = s0 - extS; e.A1 = s1 + extE; }
    else { e.a0 = s1; e.a1 = s0; e.A0 = s1 - extE; e.A1 = s0 + extS; }
    e.horiz = horiz;
    e.out = OUT[e.side];
    e.holes = [];
  }
  return E;
}

// box of a wall piece: along-range [u0,u1], height [v0,v1], depth from face outward [d0,d1]
function wallPieceGeom(e, u0, u1, v0, v1, d0 = 0, d1 = e.t) {
  const f = e.fixed;
  if (e.horiz) {
    const Ya = f + e.out[1] * d0, Yb = f + e.out[1] * d1;
    return planBox(u0, u1, Math.min(Ya, Yb), Math.max(Ya, Yb), v0, v1);
  }
  const Xa = f + e.out[0] * d0, Xb = f + e.out[0] * d1;
  return planBox(Math.min(Xa, Xb), Math.max(Xa, Xb), u0, u1, v0, v1);
}

// point on the inner face plane: along coord a, height y, offset inward (into room) by d
export function facePoint(e, a, y, d = 0) {
  if (e.horiz) return new THREE.Vector3(a, y, -(e.fixed - e.out[1] * d));
  return new THREE.Vector3(e.fixed - e.out[0] * d, y, -a);
}
// yaw (plan, deg) of the inward normal of an edge, for placing things against it
export function inwardFace(e) { return { S: 0, N: 180, E: 270, W: 90 }[e.side]; }

export function buildShell(Z, def, openings, closedDoors) {
  const k = Z.k;
  const rng = new RNG('shell' + def.id);
  const E = edgesOf(def);
  Z.edges = E;
  const top = def.h + 0.1;
  const wallMat = def.wallMat || 'plaster';
  const wallSpec = tex(wallMat, def.wallC || '#EAE9E6');
  const ceilSpec = tex('plaster', def.ceilC || '#F3F3F1');

  // attach openings & windows to edges
  const findEdge = (side, from, to, line) => E.find((e) => e.side === side && e.a0 - 1e-3 <= from && to <= e.a1 + 1e-3 && (line === undefined || Math.abs(e.fixed - line) < 0.2));
  for (const o of openings) {
    const sides = o.axis === 'y' ? ['S', 'N'] : ['W', 'E'];
    let e = null;
    for (const s of sides) { e = findEdge(s, o.from, o.to, o.line); if (e) break; }
    if (!e) { console.warn('opening edge not found', def.id, o); continue; }
    e.holes.push({ from: o.from, to: o.to, sill: 0, head: o.head, kind: 'door', o });
    o['edge_' + def.id] = e;
  }
  for (const w of def.windows) {
    const e = findEdge(w.side, w.a, w.b);
    if (!e) { console.warn('window edge not found', def.id, w); continue; }
    e.holes.push({ from: w.a, to: w.b, sill: w.sill, head: w.head, kind: 'window', w });
  }

  // walls
  for (const e of E) {
    e.holes.sort((p, q) => p.from - q.from);
    let cur = e.A0;
    const pieces = [];
    for (const h of e.holes) {
      if (h.from > cur + 1e-4) pieces.push([cur, h.from, 0, top]);
      if (h.sill > 0) pieces.push([h.from, h.to, 0, h.sill]);
      if (h.head < top) pieces.push([h.from, h.to, h.head, top]);
      cur = Math.max(cur, h.to);
    }
    if (cur < e.A1 - 1e-4) pieces.push([cur, e.A1, 0, top]);
    for (const [u0, u1, v0, v1] of pieces) {
      const g = wallPieceGeom(e, u0, u1, v0, v1);
      uvBox(g, MAPSCALE[wallMat] || 1, 'y');
      k.mesh(g, wallSpec, { keepUV: true });
    }
    // collision: solid intervals of the inner face (door openings are passable)
    let c = e.a0;
    const doors = e.holes.filter((h) => h.kind === 'door' && h.sill === 0).sort((p, q) => p.from - q.from);
    for (const h of doors) {
      if (h.from > c) Z.segment(e, c, h.from);
      c = Math.max(c, h.to);
    }
    if (c < e.a1) Z.segment(e, c, e.a1);
    // skirting (not in tiled bathrooms)
    if (wallMat === 'plaster' && !def.noSkirt) {
      let s = e.a0;
      for (const h of doors) { if (h.from > s) skirting(k, e, s, h.from); s = Math.max(s, h.to); }
      if (s < e.a1) skirting(k, e, s, e.a1);
    }
  }

  // floor
  const shape = new THREE.Shape(def.poly.map((p) => new THREE.Vector2(p[0], p[1])));
  const fg = new THREE.ShapeGeometry(shape);
  fg.rotateX(-Math.PI / 2);
  k.mesh(fg, def.floor, { keepUV: true });
  Z.floorPoly = def.poly;

  // ceilings
  buildCeiling(Z, def, E, ceilSpec);

  // windows
  for (const e of E) for (const h of e.holes) if (h.kind === 'window') buildWindow(Z, def, e, h, rng);

  // openings: thresholds, linings, casings, leaves, portals
  for (const o of openings) {
    const e = o['edge_' + def.id];
    if (!e) continue;
    buildOpening(Z, def, e, o);
  }
  for (const cd of closedDoors) {
    const e = findEdge(cd.side, cd.from, cd.to);
    if (!e) { console.warn('closed door edge', cd); continue; }
    closedDoor(Z, e, cd);
  }
  return E;
}

function skirting(k, e, a, b) {
  if (b - a < 0.02) return;
  const g = wallPieceGeom(e, a, b, 0, 0.1, -0.012, 0.0);
  k.mesh(g, sol('#ECEBE8', 0.4, 0));
}

function buildCeiling(Z, def, E, spec) {
  const k = Z.k;
  const c = def.ceil;
  const n = def.poly.length;
  // offset polygon outward so the slab overlaps the walls
  const off = def.poly.map((p, i) => {
    const eNext = E[i], ePrev = E[(i - 1 + n) % n];
    return new THREE.Vector2(p[0] + eNext.out[0] * eNext.t + ePrev.out[0] * ePrev.t, p[1] + eNext.out[1] * eNext.t + ePrev.out[1] * ePrev.t);
  });
  const shape = new THREE.Shape(off);
  const fields = (c.fields || []).map((f) => {
    let r = f.rect;
    if (!r) {
      const xs = def.poly.map((p) => p[0]), ys = def.poly.map((p) => p[1]);
      r = [Math.min(...xs) + f.inset, Math.max(...xs) - f.inset, Math.min(...ys) + f.inset, Math.max(...ys) - f.inset];
    }
    return { ...f, r };
  });
  for (const f of fields) {
    const [x0, x1, y0, y1] = f.r;
    shape.holes.push(new THREE.Path([new THREE.Vector2(x0, y0), new THREE.Vector2(x0, y1), new THREE.Vector2(x1, y1), new THREE.Vector2(x1, y0)]));
  }
  const thick = fields.length ? Math.max(...fields.map((f) => f.h1 - c.h0)) + 0.06 : 0.12;
  const g = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  g.translate(0, c.h0, 0);
  k.mesh(g, spec, { keepUV: true });
  Z.ceil = { h0: c.h0, fields };
  for (const f of fields) {
    const [x0, x1, y0, y1] = f.r;
    const fg = planBox(x0 - 0.05, x1 + 0.05, y0 - 0.05, y1 + 0.05, f.h1, f.h1 + 0.08);
    uvBox(fg, MAPSCALE.plaster, 'y');
    k.mesh(fg, spec, { keepUV: true });
    if (f.cove) {
      const sides = f.coveSides || ['S', 'N', 'W', 'E'];
      for (const s of sides) coveSide(k, f, s, c.h0);
    }
  }
}

// cove: bright LED line hidden at the step + soft wash on the raised field
function coveSide(k, f, s, h0) {
  const [x0, x1, y0, y1] = f.r;
  const cv = f.cove;
  const h1 = f.h1;
  const horiz = s === 'S' || s === 'N';
  const len = horiz ? x1 - x0 : y1 - y0;
  const mid = horiz ? (x0 + x1) / 2 : (y0 + y1) / 2;
  const fix = { S: y0, N: y1, W: x0, E: x1 }[s];
  // wash plane: local XY, falloff along +Y, then laid on the ceiling facing down
  const m = k.glowPlane(cv.c, cv.i * 0.55, len, 0.75, 'edge', { fall: 3.2, ends: true, noMerge: false });
  m.rotation.x = Math.PI / 2; // local +Y -> world +z
  // orient falloff inward
  const yaw = { S: Math.PI, N: 0, W: Math.PI / 2, E: -Math.PI / 2 }[s];
  m.rotation.order = 'YXZ';
  m.rotation.y = yaw;
  if (horiz) m.position.set(mid, h1 - 0.004, -fix);
  else m.position.set(fix, h1 - 0.004, -mid);
  // the visible LED lip just under the field edge
  const lip = horiz ? planBox(x0 + 0.02, x1 - 0.02, fix - 0.008, fix + 0.008, h1 - 0.03, h1 - 0.012) : planBox(fix - 0.008, fix + 0.008, y0 + 0.02, y1 - 0.02, h1 - 0.03, h1 - 0.012);
  k.mesh(lip, emit(cv.c, cv.i * 2.2), { uv: false });
  // soft glow down the step face
  const st = k.glowPlane(cv.c, cv.i * 0.25, len, Math.max(0.12, f.h1 - h0 - 0.03), 'edge', { fall: 2.5, ends: true });
  st.rotation.order = 'YXZ';
  st.rotation.y = yaw + Math.PI;
  st.rotation.x = Math.PI; // flip so falloff runs downward
  const inset = 0.004;
  const off = { S: inset, N: -inset, W: inset, E: -inset }[s];
  if (horiz) st.position.set(mid, h1 - 0.03, -(fix + off));
  else st.position.set(fix + off, h1 - 0.03, -mid);
}

function buildWindow(Z, def, e, h, rng) {
  const k = Z.k;
  const w = h.w;
  const depth = e.t;
  const fd = depth * 0.62; // frame plane depth from inner face
  const A = h.from, B = h.to, S = h.sill, H = h.head;
  const black = C.black;
  const fw = 0.05;
  // frame
  const bar = (u0, u1, v0, v1, d0, d1) => k.mesh(wallPieceGeom(e, u0, u1, v0, v1, d0, d1), black, { uv: false });
  bar(A, B, H - fw, H, fd - 0.03, fd + 0.03);
  bar(A, B, S, S + fw * (S > 0 ? 1 : 0.6), fd - 0.03, fd + 0.03);
  bar(A, A + fw, S, H, fd - 0.03, fd + 0.03);
  bar(B - fw, B, S, H, fd - 0.03, fd + 0.03);
  const width = B - A;
  const panels = w.mull > 0 ? Math.max(1, Math.round(width / w.mull)) : 1;
  for (let i = 1; i < panels; i++) {
    const u = A + (width * i) / panels;
    bar(u - fw / 2, u + fw / 2, S, H, fd - 0.03, fd + 0.03);
  }
  // inner sill board for raised windows
  if (S > 0.05) k.mesh(wallPieceGeom(e, A - 0.02, B + 0.02, S - 0.02, S, -0.02, fd), sol('#f0efec', 0.3, 0), { uv: false });
  // glass
  const glass = wallPieceGeom(e, A + fw, B - fw, S, H, fd - 0.004, fd + 0.004);
  k.mesh(glass, 'glass', { uv: false });
  // exterior view plane (unlit, bright), 6 m outside
  const D = 6 + depth;
  const ew = width + 2 * D * 1.9;
  const eh0 = -3.5, eh1 = 9;
  const pg = new THREE.PlaneGeometry(ew, eh1 - eh0, 1, 1);
  const uv = pg.attributes.uv;
  const mid = (A + B) / 2;
  const u0 = (mid - ew / 2) / 26 + (e.side.charCodeAt(0) * 0.137), u1 = (mid + ew / 2) / 26 + (e.side.charCodeAt(0) * 0.137);
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) < 0.5 ? u0 : u1, uv.getY(i));
  const yawIn = Math.atan2(-e.out[0], e.out[1]);
  // plane faces +z by default; we need it to face into the room (towards -out)
  pg.rotateY(yawIn);
  const c = facePoint(e, mid, (eh0 + eh1) / 2, -D);
  pg.translate(c.x, c.y, c.z);
  // horizontal mirroring fix for planes facing away from +z
  k.mesh(pg, 'exterior', { keepUV: true });
  // light hint for daylight (rect area light through this window)
  Z.windowLights.push({ e, A, B, S, H, fd });
  // curtains
  if (w.sheer || w.drape) curtains(Z, e, A, B, S, H, w, rng);
}

function curtains(Z, e, A, B, S, H, w, rng) {
  const k = Z.k;
  const top = Math.min(H + 0.12, Z.def.ceil.h0 - 0.01);
  const ht = top - 0.01;
  const width = B - A;
  const ext = 0.12;
  // ceiling track
  k.mesh(wallPieceGeom(e, A - ext - 0.25, B + ext + 0.25, top - 0.02, top + 0.02, -0.3, -0.1), C.black, { uv: false });
  if (w.sheer) {
    const g = pleated(width + 2 * ext, ht - 0.015, 0.024, 0.075, rng, 0.004);
    placeCurtain(g, e, A - ext, -0.13, 0.012);
    k.mesh(g, 'sheer', { keepUV: true });
  }
  if (w.drape) {
    const n = w.drapeCount || (width > 4 ? 5 : 2);
    const pw = Math.min(0.55, Math.max(0.35, width * 0.12));
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      const u = A - ext - 0.15 + t * (width + 2 * ext + 0.3 - pw);
      const g = pleated(pw, ht - 0.01, 0.05, 0.13, rng, 0.012);
      placeCurtain(g, e, u, -0.24, 0.01);
      k.mesh(g, tex('drape', '#3A3B3F'), { keepUV: true });
    }
  }
}

// sine-pleated panel in local space: x along width, y up from 0, z pleat depth
function pleated(w, h, amp, lam, rng, flare) {
  const nx = Math.max(8, Math.ceil(w / (lam / 10))), ny = 8;
  const g = new THREE.PlaneGeometry(w, h, nx, ny);
  g.translate(w / 2, h / 2, 0);
  const p = g.attributes.position, uv = g.attributes.uv;
  const ph = rng.range(0, 6.28);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    const t = 1 - y / h;
    const a = amp * (1 + 0.25 * Math.sin(x * 7.3 + ph)) * (1 + t * 0.35);
    p.setZ(i, a * Math.sin((x / lam) * Math.PI * 2 + ph) + flare * t * t * Math.sin(x * 11 + ph));
    uv.setXY(i, x / 0.3, y / 0.3);
  }
  g.computeVertexNormals();
  return g;
}

// map local curtain (x along wall from u, z outward-ish) onto the edge
function placeCurtain(g, e, u, d, z0) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const v = facePoint(e, u + x, y + 0.01, -d + z + z0);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
}

function buildOpening(Z, def, e, o) {
  const k = Z.k;
  const A = o.from, B = o.to, H = o.head;
  const t = e.t;
  // threshold (white marble strip across this zone's half of the reveal)
  k.mesh(wallPieceGeom(e, A, B, -0.03, 0.0, 0, t), 'marbleSlab');
  // lining across the reveal
  const lin = o.casing === 'plain' ? tex('plaster', def.wallC || '#EAE9E6') : tex('oak', '#ffffff');
  if (o.casing !== 'plain') {
    k.mesh(wallPieceGeom(e, A, A + 0.02, 0, H, -0.001, t), lin, { grain: 'y' });
    k.mesh(wallPieceGeom(e, B - 0.02, B, 0, H, -0.001, t), lin, { grain: 'y' });
    k.mesh(wallPieceGeom(e, A, B, H - 0.02, H, -0.001, t), lin, { grain: e.horiz ? 'x' : 'z' });
    // architrave 70 mm on this zone's face
    const aw = 0.07, ad = 0.016;
    const arch = o.leaf === 'pivot' ? C.black : tex('oak', '#ffffff');
    k.mesh(wallPieceGeom(e, A - aw, A, 0, H + aw, -ad, 0), arch, { grain: 'y' });
    k.mesh(wallPieceGeom(e, B, B + aw, 0, H + aw, -ad, 0), arch, { grain: 'y' });
    k.mesh(wallPieceGeom(e, A - aw, B + aw, H, H + aw, -ad, 0), arch, { grain: e.horiz ? 'x' : 'z' });
  }
  if (o.into === def.id && o.leaf && o.leaf !== 'none') {
    // door leaf swinging into this zone
    const inward = [-e.out[0], -e.out[1]];
    const ang = ((o.angle || 95) * Math.PI) / 180;
    if (o.leaf === 'pivot') {
      const half = (B - A) / 2;
      for (const side of [0, 1]) {
        const hingeA = side === 0 ? A + 0.005 : B - 0.005;
        const cdir = side === 0 ? 1 : -1;
        const leaf = pivotLeaf(half - 0.01, H - 0.01, side === 0);
        placeLeaf(Z, e, leaf, hingeA, cdir, inward, ang, half - 0.01);
      }
    } else {
      const hingeA = o.hinge === 'max' ? B - 0.005 : A + 0.005;
      const cdir = o.hinge === 'max' ? -1 : 1;
      const w = B - A - 0.01;
      const leaf = doorLeaf(w, H - 0.01, o.leaf);
      placeLeaf(Z, e, leaf, hingeA, cdir, inward, ang, w);
    }
  }
  if (o.a === def.id) Z.portalOut(o, e);
}

// leaf group built along local +X from the hinge; hinge at the inner face
function placeLeaf(Z, e, leafKit, hingeA, cdir, inward, ang, w) {
  // closed direction along the wall in plan coords
  const c = e.horiz ? [cdir, 0] : [0, cdir];
  const s = inward; // swing side (into room)
  const dir = [c[0] * Math.cos(ang) + s[0] * Math.sin(ang), c[1] * Math.cos(ang) + s[1] * Math.sin(ang)];
  const hp = facePoint(e, hingeA, 0, 0.03);
  const g = leafKit.group;
  g.position.copy(hp);
  g.rotation.y = Math.atan2(dir[1], dir[0]);
  Z.k.group.add(g);
  Z.addKitExtras(leafKit, g);
  // collider in plan coords
  const hx = hp.x, hy = -hp.z;
  Z.rectCollider(hx + dir[0] * w / 2, hy + dir[1] * w / 2, w, 0.06, Math.atan2(dir[1], dir[0]));
}

function closedDoor(Z, e, cd) {
  const k = Z.k;
  const A = cd.from, B = cd.to, H = 2.2;
  const aw = 0.07, ad = 0.016;
  const arch = tex('oak', '#ffffff');
  k.mesh(wallPieceGeom(e, A - aw, A, 0, H + aw, -ad, 0), arch, { grain: 'y' });
  k.mesh(wallPieceGeom(e, B, B + aw, 0, H + aw, -ad, 0), arch, { grain: 'y' });
  k.mesh(wallPieceGeom(e, A - aw, B + aw, H, H + aw, -ad, 0), arch, { grain: e.horiz ? 'x' : 'z' });
  const leaf = doorLeaf(B - A, H, cd.leaf);
  const g = leaf.group;
  const hp = facePoint(e, A, 0, 0.026);
  g.position.copy(hp);
  const dir = e.horiz ? [1, 0] : [0, 1];
  g.rotation.y = Math.atan2(dir[1], dir[0]);
  // leaf front faces local +z; make sure it faces into the room
  const inward = [-e.out[0], -e.out[1]];
  const fz = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), g.rotation.y);
  if (fz.x * inward[0] + -fz.z * inward[1] < 0) { g.rotation.y += Math.PI; g.position.copy(facePoint(e, B, 0, 0.026)); }
  k.group.add(g);
  Z.addKitExtras(leaf, g);
}
