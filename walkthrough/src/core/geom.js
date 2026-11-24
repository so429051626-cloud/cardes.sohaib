// Geometry kit: every furniture builder and the architecture builder emit
// parts through a Kit. Parts carry a material spec; per-vertex attributes
// (colour tint, roughness/metalness for the merged "solid" material) are
// written here so a whole zone can be merged into a few draw calls.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { smoothstep } from './prng.js';

export const MAPSCALE = {}; // filled by Materials (metres covered by one texture repeat)

export const sol = (c, r = 0.6, m = 0) => ({ n: 'solid', c, r, m });
export const solDS = (c, r = 0.6, m = 0) => ({ n: 'solidDS', c, r, m });
export const emit = (c, i = 1) => ({ n: 'emit', c, i });
export const glow = (c, i = 1) => ({ n: 'glow', c, i });
export const tex = (n, c = '#ffffff', grain = 'y') => ({ n, c, grain });

// shared palette (albedo per section 4.7)
export const C = {
  brass: sol('#C9A35C', 0.3, 1),
  brassBrushed: sol('#BF9A55', 0.42, 1),
  black: sol('#121314', 0.6, 0),
  blackGloss: sol('#0d0e0f', 0.12, 0),
  blackSteel: sol('#141516', 0.45, 0.6),
  chrome: sol('#e4e6e8', 0.2, 1),
  steel: sol('#b9bcbf', 0.35, 1),
  white: sol('#f1f1ef', 0.35, 0),
  whiteLacquer: sol('#f3f3f1', 0.18, 0),
  whiteMatte: sol('#eeeeec', 0.7, 0),
  ceramic: sol('#f4f4f2', 0.12, 0),
  grey: sol('#9c9fa2', 0.6, 0),
  darkGrey: sol('#3c3f42', 0.5, 0),
  wallWhite: sol('#EAE9E6', 0.85, 0),
  fridge: sol('#4A5059', 0.35, 0.8),
  kitBase: sol('#858A8F', 0.45, 0),
  kitUpper: sol('#DADCDD', 0.35, 0),
  opal: emit('#fff3e0', 2.2),
};

const _c = new THREE.Color();
function linColor(hex) { return _c.set(hex).clone(); }

function ensureUV(g) {
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
}

// metric box-projected UVs in part-local space; grain = axis the v coordinate follows
export function uvBox(g, scale = 1, grain = 'y', off = [0, 0]) {
  const p = g.attributes.position, n = g.attributes.normal;
  ensureUV(g);
  const uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v;
    if (ax >= ay && ax >= az) { if (grain === 'z') { u = y; v = z; } else { u = z; v = y; } }
    else if (ay >= ax && ay >= az) { if (grain === 'x') { u = z; v = x; } else { u = x; v = z; } }
    else { if (grain === 'x') { u = y; v = x; } else { u = x; v = y; } }
    uv.setXY(i, u / scale + off[0], v / scale + off[1]);
  }
  uv.needsUpdate = true;
  return g;
}

export function rbox(w, h, d, r = 0.006, seg = 2) {
  r = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
  if (r <= 0.0005) return new THREE.BoxGeometry(w, h, d);
  return new RoundedBoxGeometry(w, h, d, seg, r);
}

// plane in XZ with vertex alpha (contact shadows), y up
function shadowGeom(hw, hd, soft, strength, round) {
  const ex = soft;
  const nx = 18, nz = 18;
  const g = new THREE.PlaneGeometry(2 * (hw + ex), 2 * (hd + ex), nx, nz);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  const col = new Float32Array(p.count * 4);
  const rr = round ? Math.min(hw, hd) : Math.min(hw, hd) * 0.25;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    let sd;
    if (round) sd = Math.hypot(x, z) - hw;
    else {
      const qx = Math.abs(x) - (hw - rr), qz = Math.abs(z) - (hd - rr);
      sd = Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - rr;
    }
    const a = strength * (1 - smoothstep(-soft * 0.7, soft, sd));
    col[i * 4 + 3] = a;
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
  return g;
}

export class Kit {
  constructor(name = 'kit') {
    this.name = name;
    this.group = new THREE.Group();
    this.group.name = name;
    this.colliders = [];
    this.lights = [];
    this.probeHints = [];
  }

  // core: add a geometry with a material spec and an optional transform
  mesh(geom, spec, o = {}) {
    if (typeof spec === 'string') spec = { n: spec };
    const g = geom;
    if (!g.attributes.normal) g.computeVertexNormals();
    const scale = MAPSCALE[spec.n];
    if (o.uv !== false && scale && !o.keepUV) uvBox(g, scale * (o.uvScale || 1), spec.grain || o.grain || 'y', o.uvOff || [0, 0]);
    else if (o.uvScale && !scale) {
      const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * o.uvScale, uv.getY(i) * o.uvScale);
    }
    ensureUV(g);
    const n = g.attributes.position.count;
    if (spec.n === 'shadow') {
      // colour already rgba
    } else if (spec.c !== undefined || spec.n === 'solid' || spec.n === 'solidDS' || spec.n === 'emit' || spec.n === 'glow') {
      const c = linColor(spec.c || '#ffffff');
      const k = spec.i !== undefined ? spec.i : 1;
      const col = new Float32Array(n * 3);
      const w = g.attributes.gw;
      for (let i = 0; i < n; i++) {
        const f = w ? w.getX(i) * k : k;
        col[i * 3] = c.r * f; col[i * 3 + 1] = c.g * f; col[i * 3 + 2] = c.b * f;
      }
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      if (w) g.deleteAttribute('gw');
    }
    if (spec.n === 'solid' || spec.n === 'solidDS') {
      const rm = new Float32Array(n * 2);
      for (let i = 0; i < n; i++) { rm[i * 2] = spec.r; rm[i * 2 + 1] = spec.m; }
      g.setAttribute('aRM', new THREE.Float32BufferAttribute(rm, 2));
    }
    const m = new THREE.Mesh(g);
    m.userData.mat = spec.n;
    if (o.noMerge) m.userData.noMerge = true;
    if (o.material) m.userData.material = o.material;
    if (o.pos) m.position.set(o.pos[0], o.pos[1], o.pos[2]);
    if (o.rot) m.rotation.set(o.rot[0], o.rot[1], o.rot[2], o.order || 'XYZ');
    if (o.scl) m.scale.set(o.scl[0], o.scl[1], o.scl[2]);
    (o.parent || this.group).add(m);
    return m;
  }

  // centred rounded box
  box(spec, w, h, d, x = 0, y = 0, z = 0, o = {}) {
    return this.mesh(rbox(w, h, d, o.r === undefined ? 0.006 : o.r, o.seg || 2), spec, { ...o, pos: [x, y, z] });
  }
  // box standing on y0
  boxB(spec, w, h, d, x, y0, z, o = {}) { return this.box(spec, w, h, d, x, y0 + h / 2, z, o); }

  cyl(spec, rt, rb, h, x = 0, y = 0, z = 0, o = {}) {
    const g = new THREE.CylinderGeometry(rt, rb, h, o.seg || 24, 1, !!o.open, o.ts || 0, o.tl || Math.PI * 2);
    return this.mesh(g, spec, { ...o, pos: [x, y, z] });
  }
  sphere(spec, r, x = 0, y = 0, z = 0, o = {}) {
    const g = new THREE.SphereGeometry(r, o.ws || 20, o.hs || 14, 0, Math.PI * 2, o.t0 || 0, o.tl || Math.PI);
    return this.mesh(g, spec, { ...o, pos: [x, y, z] });
  }
  torus(spec, R, r, x = 0, y = 0, z = 0, o = {}) {
    const g = new THREE.TorusGeometry(R, r, o.rs || 8, o.ts || 48, o.arc || Math.PI * 2);
    return this.mesh(g, spec, { ...o, pos: [x, y, z] });
  }
  lathe(spec, pts, x = 0, y = 0, z = 0, o = {}) {
    const g = new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), o.seg || 32, o.phi0 || 0, o.phi || Math.PI * 2);
    return this.mesh(g, spec, { ...o, pos: [x, y, z] });
  }
  tube(spec, points, r, o = {}) {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], p[1], p[2])), !!o.closed, 'centripetal');
    const g = new THREE.TubeGeometry(curve, o.ts || Math.max(8, points.length * 6), r, o.rs || 6, !!o.closed);
    return this.mesh(g, spec, o);
  }
  // straight rod between two points
  rod(spec, a, b, r, o = {}) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const len = A.distanceTo(B);
    const g = new THREE.CylinderGeometry(r, o.r2 === undefined ? r : o.r2, len, o.seg || 6, 1, !!o.open);
    g.translate(0, len / 2, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
    g.applyQuaternion(q);
    g.translate(A.x, A.y, A.z);
    return this.mesh(g, spec, o);
  }
  extrude(spec, shape, depth, o = {}) {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: !!o.bevel, bevelThickness: o.bevel || 0, bevelSize: o.bevel || 0, bevelSegments: 2, curveSegments: o.curve || 16 });
    if (o.center) g.translate(0, 0, -depth / 2);
    return this.mesh(g, spec, o);
  }
  plane(spec, w, h, o = {}) {
    const g = new THREE.PlaneGeometry(w, h, o.ws || 1, o.hs || 1);
    return this.mesh(g, spec, o);
  }

  // contact shadow decal on the floor (local x,z centre)
  shadow(w, d, x = 0, z = 0, o = {}) {
    const g = shadowGeom(w / 2, d / 2, o.soft || 0.12, o.k === undefined ? 0.45 : o.k, false);
    g.translate(x, (o.y || 0) + 0.0025, z);
    if (o.ry) g.rotateY(o.ry);
    return this.mesh(g, { n: 'shadow' }, { uv: false });
  }
  shadowRound(r, x = 0, z = 0, o = {}) {
    const g = shadowGeom(r, r, o.soft || 0.1, o.k === undefined ? 0.45 : o.k, true);
    g.translate(x, (o.y || 0) + 0.0025, z);
    return this.mesh(g, { n: 'shadow' }, { uv: false });
  }

  // additive glow: plane w x h in local XY, falloff profile per vertex
  // kind 'edge' (bright at y=0 fading to y=h), 'halo' (around inner rect), 'disc'
  glowPlane(c, i, w, h, kind, o = {}) {
    let g;
    if (kind === 'edge') {
      g = new THREE.PlaneGeometry(w, h, 1, 14);
      g.translate(0, h / 2, 0);
      const p = g.attributes.position, gw = new Float32Array(p.count);
      for (let k = 0; k < p.count; k++) {
        const t = p.getY(k) / h;
        let f = Math.exp(-t * (o.fall || 3.5)) * (1 - t);
        if (o.ends) { const ux = Math.abs(p.getX(k)) / (w / 2); f *= 1 - smoothstep(0.85, 1.0, ux); }
        gw[k] = f;
      }
      g.setAttribute('gw', new THREE.Float32BufferAttribute(gw, 1));
    } else if (kind === 'halo') {
      const s = o.spread || 0.3;
      g = new THREE.PlaneGeometry(w + 2 * s, h + 2 * s, 20, 20);
      const p = g.attributes.position, gw = new Float32Array(p.count);
      for (let k = 0; k < p.count; k++) {
        const dx = Math.max(Math.abs(p.getX(k)) - w / 2, 0), dy = Math.max(Math.abs(p.getY(k)) - h / 2, 0);
        const d = Math.hypot(dx, dy) / s;
        gw[k] = d <= 0 ? (o.inner === undefined ? 1 : o.inner) : Math.exp(-d * 3.2) * (1 - Math.min(d, 1));
      }
      g.setAttribute('gw', new THREE.Float32BufferAttribute(gw, 1));
    } else {
      const s = o.spread || 0.3;
      g = new THREE.CircleGeometry(w + s, 48, 0, Math.PI * 2);
      // rebuild as ring grid for smooth falloff
      g = new THREE.RingGeometry(o.r0 || 0.0001, w + s, 48, 8);
      const p = g.attributes.position, gw = new Float32Array(p.count);
      for (let k = 0; k < p.count; k++) {
        const r = Math.hypot(p.getX(k), p.getY(k));
        const d = Math.max(r - w, 0) / s;
        gw[k] = r <= w ? (o.inner === undefined ? 1 : o.inner) : Math.exp(-d * 3.2) * (1 - Math.min(d, 1));
      }
      g.setAttribute('gw', new THREE.Float32BufferAttribute(gw, 1));
    }
    return this.mesh(g, glow(c, i), { ...o, uv: false });
  }

  collideRect(w, d, x = 0, z = 0, ry = 0) { this.colliders.push({ t: 'rect', w, d, x, z, ry }); }
  collideCircle(r, x = 0, z = 0) { this.colliders.push({ t: 'circle', r, x, z }); }
  light(l) { this.lights.push(l); }
}

// geometry utilities ---------------------------------------------------------

export function ensureIndexed(g) {
  if (!g.index) {
    const n = g.attributes.position.count;
    const idx = new (n > 65535 ? Uint32Array : Uint16Array)(n);
    for (let i = 0; i < n; i++) idx[i] = i;
    g.setIndex(new THREE.BufferAttribute(idx, 1));
  }
  return g;
}

// displace a grid along its normal with seeded noise (wrinkles)
export function wrinkle(g, rng, amp, freq) {
  const p = g.attributes.position;
  const ph = [rng.range(0, 6.28), rng.range(0, 6.28), rng.range(0, 6.28), rng.range(0, 6.28)];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = Math.sin(x * freq + ph[0]) * Math.cos(z * freq * 1.3 + ph[1]) * 0.6 + Math.sin((x + z) * freq * 2.1 + ph[2]) * 0.3 + Math.sin((x - z) * freq * 3.7 + ph[3]) * 0.1;
    p.setY(i, y + n * amp);
  }
  g.computeVertexNormals();
  return g;
}

// superellipsoid (boxy-round cushions, pillows, mattresses)
export function superEllipsoid(w, h, d, ex = 0.4, ey = 0.6, ez = 0.4, ws = 24, hs = 16) {
  const g = new THREE.SphereGeometry(1, ws, hs);
  const p = g.attributes.position;
  const f = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);
  for (let i = 0; i < p.count; i++) {
    p.setXYZ(i, f(p.getX(i), ex) * w / 2, f(p.getY(i), ey) * h / 2, f(p.getZ(i), ez) * d / 2);
  }
  g.computeVertexNormals();
  return g;
}

// throw pillow: puffy square, thinner at the edges
export function pillowGeom(w, h, t, rng) {
  const g = superEllipsoid(w, h, t, 0.32, 0.32, 0.9, 28, 20);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i) / (w / 2), v = p.getY(i) / (h / 2);
    const pinch = (1 - 0.12 * v * v) ;
    p.setX(i, p.getX(i) * pinch);
    p.setY(i, p.getY(i) * (1 - 0.12 * u * u));
    const crown = 1 - 0.55 * Math.pow(Math.max(Math.abs(u), Math.abs(v)), 4);
    p.setZ(i, p.getZ(i) * crown);
  }
  if (rng) {
    for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) * (1 + 0.04 * Math.sin(p.getX(i) * 31 + p.getY(i) * 17 + rng.range(0, 6))));
  }
  g.computeVertexNormals();
  return g;
}

// annular sector extruded upward (tub/barrel chair shells), opening centred on +z
export function shellGeom(R, t, h, openDeg, bevel = 0.025, seg = 40) {
  const open = (openDeg * Math.PI) / 180;
  const a0 = Math.PI / 2 + open / 2, a1 = Math.PI / 2 + 2 * Math.PI - open / 2;
  const s = new THREE.Shape();
  const r = R - t;
  for (let i = 0; i <= seg; i++) { const a = a0 + ((a1 - a0) * i) / seg; s.lineTo(Math.cos(a) * R, Math.sin(a) * R); }
  for (let i = seg; i >= 0; i--) { const a = a0 + ((a1 - a0) * i) / seg; s.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  const g = new THREE.ExtrudeGeometry(s, { depth: h - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.9, bevelSegments: 4, curveSegments: 12 });
  // shape is in XY (y = depth direction); map to XZ with height up
  g.rotateX(-Math.PI / 2);
  g.translate(0, bevel, 0);
  // shape +y (front) -> after rotateX(-90): -z; flip so the opening faces +z
  g.rotateY(Math.PI);
  return g;
}

// rounded rectangle shape (plan tops)
export function roundRectShape(w, d, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -d / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

// horizontal slab from a plan shape: thickness t, bottom at y0 (shape y -> -z)
export function slabGeom(shape, t, y0, bevel = 0.004) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: t - 2 * bevel, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 24 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0 + bevel, 0);
  return g;
}
