// Assembles every zone: shell + furniture from room data, then merges static
// geometry by material per zone (static batching) and registers colliders,
// lights and portals.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Kit, ensureIndexed } from './core/geom.js';
import { buildShell } from './arch/shell.js';
import { ZONES, OPENINGS, CLOSED_DOORS } from './rooms/plan.js';

const NO_SHADOW = new Set(['glass', 'glassDark', 'sheer', 'glow', 'shadow', 'exterior', 'emit', 'mirror']);
// materials that make up a room's shell: what you see through a thin, distant door sliver
const SHELL = new Set(['plaster', 'wallTile', 'mintTile', 'cloudPlaster', 'leafPaper', 'marbleFloor', 'marbleFloorL', 'creamFloor', 'recFloor', 'bathFloor', 'exterior', 'wavy']);

export class Zone {
  constructor(def, world) {
    this.def = def;
    this.id = def.id;
    this.name = def.name;
    this.world = world;
    this.k = new Kit('zone-' + def.id);
    this.group = new THREE.Group();
    this.group.name = 'Z' + def.id;
    this.materials = [];
    this.lights = [];
    this.windowLights = [];
    this.portals = [];
    this.neighbors = new Set();
    this.env = null;
    const xs = def.poly.map((p) => p[0]), ys = def.poly.map((p) => p[1]);
    this.bbox = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
    const b = this.bbox;
    const pr = def.probe || [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, 1.5];
    this.probe = new THREE.Vector3(pr[0], pr[2] || 1.5, -pr[1]);
    const top = def.ceil.fields && def.ceil.fields.length ? Math.max(...def.ceil.fields.map((f) => f.h1)) : def.ceil.h0;
    this.top = top;
    this.u = {
      uRoomMin: { value: new THREE.Vector3(b.x0, 0, -b.y1) },
      uRoomMax: { value: new THREE.Vector3(b.x1, def.ceil.h0, -b.y0) },
      uAO: { value: new THREE.Vector4(0.32, 0.28, 0.26, 0.32) },
      uProbePos: { value: this.probe.clone() },
      uProbeMin: { value: new THREE.Vector3(b.x0 - 0.02, -0.02, -b.y1 - 0.02) },
      uProbeMax: { value: new THREE.Vector3(b.x1 + 0.02, top + 0.02, -b.y0 + 0.02) },
    };
    this.stats = { tris: 0, draws: 0 };
  }

  // 'full' renders everything, 'shell' only walls/floor/ceiling/windows
  setLod(mode) {
    if (this.lod === mode) return;
    this.lod = mode;
    for (const m of this.group.children) m.visible = mode === 'full' || !!m.userData.shell;
  }

  contains(X, Y) {
    const P = this.def.poly;
    let inside = false;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
      const [xi, yi] = P[i], [xj, yj] = P[j];
      if ((yi > Y) !== (yj > Y) && X < ((xj - xi) * (Y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  // collision segment along an edge's inner face
  segment(e, a, b) {
    if (e.horiz) this.world.segments.push([a, e.fixed, b, e.fixed]);
    else this.world.segments.push([e.fixed, a, e.fixed, b]);
  }
  rectCollider(cx, cy, w, d, ang) { this.world.addRect(cx, cy, w, d, ang); }

  portalOut(o, e) {
    const A = o.from, B = o.to, L = o.line, H = o.head;
    const pts = o.axis === 'y'
      ? [[A, 0, L], [B, 0, L], [B, H, L], [A, H, L]]
      : [[L, 0, A], [L, 0, B], [L, H, B], [L, H, A]];
    const p = { a: o.a, b: o.b, pts: pts.map(([x, y, Y]) => new THREE.Vector3(x, y, -Y)), o };
    p.center = p.pts.reduce((s, v) => s.add(v), new THREE.Vector3()).multiplyScalar(0.25);
    this.world.portals.push(p);
  }

  // place a furniture kit: plan X, Y, front facing yaw (deg, 0 = north)
  place(kit, X, Y, face = 180, o = {}) {
    const g = kit.group;
    g.position.set(X, o.y || 0, -Y);
    g.rotation.y = Math.PI - (face * Math.PI) / 180;
    if (o.scale) g.scale.setScalar(o.scale);
    this.k.group.add(g);
    this.addKitExtras(kit, g);
    return g;
  }

  addKitExtras(kit, g) {
    g.updateMatrixWorld(true);
    const m = g.matrixWorld;
    const rotY = new THREE.Euler().setFromRotationMatrix(m, 'YXZ').y;
    for (const c of kit.colliders) {
      const v = new THREE.Vector3(c.x, 0, c.z).applyMatrix4(m);
      if (c.t === 'rect') this.world.addRect(v.x, -v.z, c.w, c.d, rotY + (c.ry || 0));
      else this.world.circles.push([v.x, -v.z, c.r]);
    }
    for (const l of kit.lights) {
      const L = { ...l, zone: this.id };
      L.pos = new THREE.Vector3(...l.p).applyMatrix4(m);
      if (l.t) L.target = new THREE.Vector3(...l.t).applyMatrix4(m);
      if (l.type === 'rect' && l.down !== false) L.rotFix = rotY + (l.rot || 0);
      if (l.w) L.dirTo = L.target;
      this.lights.push(L);
    }
  }

  finalize(M) {
    const root = this.k.group;
    root.updateMatrixWorld(true);
    const buckets = new Map();
    const keep = [];
    root.traverse((o) => {
      if (!o.isMesh) return;
      if (o.userData.noMerge) { keep.push(o); return; }
      const g = o.geometry.clone();
      g.applyMatrix4(o.matrixWorld);
      const name = o.userData.mat;
      if (!buckets.has(name)) buckets.set(name, []);
      buckets.get(name).push(g);
      o.geometry.dispose();
    });
    for (const [name, list] of buckets) {
      const info = M.info(name);
      const needColor = info.color || name === 'shadow';
      const csize = name === 'shadow' ? 4 : 3;
      for (const g of list) {
        for (const key of Object.keys(g.attributes)) {
          if (!['position', 'normal', 'uv', 'color', 'aRM'].includes(key)) g.deleteAttribute(key);
        }
        if (!g.attributes.normal) g.computeVertexNormals();
        if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
        if (needColor && !g.attributes.color) {
          const a = new Float32Array(g.attributes.position.count * csize).fill(1);
          g.setAttribute('color', new THREE.Float32BufferAttribute(a, csize));
        }
        if (!needColor && g.attributes.color) g.deleteAttribute('color');
        if (!info.uber && g.attributes.aRM) g.deleteAttribute('aRM');
        if (info.uber && !g.attributes.aRM) {
          const a = new Float32Array(g.attributes.position.count * 2).fill(0.6);
          g.setAttribute('aRM', new THREE.Float32BufferAttribute(a, 2));
        }
        ensureIndexed(g);
        g.morphAttributes = {};
      }
      const merged = mergeGeometries(list, false);
      if (!merged) { console.warn('merge failed', this.id, name); continue; }
      list.forEach((g) => g.dispose());
      const mat = M.forZone(name, this);
      const mesh = new THREE.Mesh(merged, mat);
      mesh.name = this.id + ':' + name;
      mesh.userData.shell = SHELL.has(name);
      mesh.castShadow = !NO_SHADOW.has(name) && !info.unlit;
      mesh.receiveShadow = !info.unlit;
      if (name === 'shadow') mesh.renderOrder = 1;
      if (name === 'glow') mesh.renderOrder = 3;
      this.group.add(mesh);
      this.stats.tris += (merged.index ? merged.index.count : merged.attributes.position.count) / 3;
      this.stats.draws++;
    }
    for (const o of keep) {
      o.updateMatrixWorld(true);
      const m = o.userData.material || M.forZone(o.userData.mat, this);
      o.material = m;
      const p = o.matrixWorld.clone();
      o.removeFromParent();
      p.decompose(o.position, o.quaternion, o.scale);
      this.group.add(o);
      this.stats.draws++;
    }
    this.k = null;
  }
}

export class World {
  constructor() {
    this.zones = [];
    this.byId = {};
    this.segments = [];
    this.circles = [];
    this.portals = [];
  }

  addRect(cx, cy, w, d, ang) {
    // ang = rotation of the local x axis in three's Y-rotation sense; convert to plan
    const ca = Math.cos(ang), sa = Math.sin(ang);
    // local x axis in plan: (cos, sin); local z axis in plan: (sin, -cos)
    const ux = [ca, sa], uz = [sa, -ca];
    const hw = w / 2, hd = d / 2;
    const c = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([a, b]) => [cx + ux[0] * a + uz[0] * b, cy + ux[1] * a + uz[1] * b]);
    for (let i = 0; i < 4; i++) this.segments.push([c[i][0], c[i][1], c[(i + 1) % 4][0], c[(i + 1) % 4][1]]);
  }

  async build(M, roomBuilders, onProgress) {
    for (const def of ZONES) {
      const z = new Zone(def, this);
      this.zones.push(z);
      this.byId[def.id] = z;
    }
    const n = this.zones.length;
    for (let i = 0; i < n; i++) {
      const z = this.zones[i];
      const ops = OPENINGS.filter((o) => o.a === z.id || o.b === z.id);
      const cds = CLOSED_DOORS.filter((c) => c.zone === z.id);
      buildShell(z, z.def, ops, cds);
      const rb = roomBuilders[z.id];
      if (rb) rb(z);
      z.finalize(M);
      onProgress && (await onProgress((i + 1) / n, z));
    }
    for (const p of this.portals) {
      this.byId[p.a].portals.push(p);
      this.byId[p.b].portals.push(p);
      this.byId[p.a].neighbors.add(p.b);
      this.byId[p.b].neighbors.add(p.a);
    }
  }

  zoneAt(X, Y, prev) {
    if (prev && prev.contains(X, Y)) return prev;
    for (const z of this.zones) if (z.contains(X, Y)) return z;
    return prev || null;
  }
}
