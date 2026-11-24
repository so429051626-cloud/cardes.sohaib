// Player: camera rig with vertical lens shift, collision (0.25 m circle vs wall
// and furniture segments), touch joystick, drag-look, tap-to-walk with A*,
// pinch FOV, keyboard + mouse, and auto-tour playback.
import * as THREE from 'three';
import { BOUNDS } from './rooms/plan.js';
import { sampleTour, TOUR_END } from './tour.js';

const DEG = Math.PI / 180;
export const EYE = 1.55;
const R = 0.25;

export class ShiftCamera extends THREE.PerspectiveCamera {
  constructor(...a) { super(...a); this.shiftY = 0; }
  updateProjectionMatrix() {
    super.updateProjectionMatrix();
    this.projectionMatrix.elements[9] = this.shiftY;
    this.projectionMatrixInverse.copy(this.projectionMatrix).invert();
  }
}

// --- collision -----------------------------------------------------------------
export class Collision {
  constructor(segments, circles) {
    this.segs = segments;
    this.circles = circles;
    this.cell = 1.0;
    this.grid = new Map();
    segments.forEach((s, i) => {
      const x0 = Math.min(s[0], s[2]) - R - 0.1, x1 = Math.max(s[0], s[2]) + R + 0.1;
      const y0 = Math.min(s[1], s[3]) - R - 0.1, y1 = Math.max(s[1], s[3]) + R + 0.1;
      for (let cx = Math.floor(x0); cx <= Math.floor(x1); cx++) for (let cy = Math.floor(y0); cy <= Math.floor(y1); cy++) {
        const k = cx * 1000 + cy;
        if (!this.grid.has(k)) this.grid.set(k, []);
        this.grid.get(k).push(i);
      }
    });
  }
  near(x, y) { return this.grid.get(Math.floor(x) * 1000 + Math.floor(y)) || []; }

  // distance from point to nearest obstacle
  dist(x, y) {
    let d = 9;
    for (const i of this.near(x, y)) d = Math.min(d, segDist(x, y, this.segs[i]));
    for (const c of this.circles) d = Math.min(d, Math.hypot(x - c[0], y - c[1]) - c[2]);
    return d;
  }

  resolve(p, r = R) {
    for (let it = 0; it < 4; it++) {
      let moved = false;
      for (const i of this.near(p.x, p.y)) {
        const s = this.segs[i];
        const q = closest(p.x, p.y, s);
        const dx = p.x - q[0], dy = p.y - q[1];
        const d = Math.hypot(dx, dy);
        if (d < r) {
          if (d < 1e-6) continue;
          p.x += (dx / d) * (r - d); p.y += (dy / d) * (r - d);
          moved = true;
        }
      }
      for (const c of this.circles) {
        const dx = p.x - c[0], dy = p.y - c[1];
        const d = Math.hypot(dx, dy);
        if (d < r + c[2] && d > 1e-6) { p.x += (dx / d) * (r + c[2] - d); p.y += (dy / d) * (r + c[2] - d); moved = true; }
      }
      if (!moved) break;
    }
    return p;
  }

  // swept move: substeps so you can never tunnel through a thin wall
  move(p, dx, dy) {
    const len = Math.hypot(dx, dy);
    const n = Math.max(1, Math.ceil(len / 0.08));
    for (let i = 0; i < n; i++) {
      p.x += dx / n; p.y += dy / n;
      this.resolve(p);
    }
    return p;
  }
}

function closest(x, y, s) {
  const ax = s[0], ay = s[1], bx = s[2], by = s[3];
  const vx = bx - ax, vy = by - ay;
  const l2 = vx * vx + vy * vy;
  let t = l2 > 0 ? ((x - ax) * vx + (y - ay) * vy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return [ax + vx * t, ay + vy * t];
}
function segDist(x, y, s) { const q = closest(x, y, s); return Math.hypot(x - q[0], y - q[1]); }

// --- navigation grid --------------------------------------------------------------
export class NavGrid {
  constructor(world, col) {
    this.res = 0.1;
    this.x0 = BOUNDS.x0; this.y0 = BOUNDS.y0;
    this.w = Math.ceil((BOUNDS.x1 - BOUNDS.x0) / this.res);
    this.h = Math.ceil((BOUNDS.y1 - BOUNDS.y0) / this.res);
    const N = this.w * this.h;
    this.free = new Uint8Array(N);
    // inside any zone polygon or inside a doorway
    const zones = world.zones;
    for (let j = 0; j < this.h; j++) for (let i = 0; i < this.w; i++) {
      const X = this.x0 + (i + 0.5) * this.res, Y = this.y0 + (j + 0.5) * this.res;
      let ok = false;
      for (const z of zones) { const b = z.bbox; if (X < b.x0 || X > b.x1 || Y < b.y0 || Y > b.y1) continue; if (z.contains(X, Y)) { ok = true; break; } }
      if (!ok) for (const p of world.portals) {
        const o = p.o;
        if (o.axis === 'y') { if (X > o.from && X < o.to && Math.abs(Y - o.line) < 0.2) { ok = true; break; } }
        else if (Y > o.from && Y < o.to && Math.abs(X - o.line) < 0.2) { ok = true; break; }
      }
      this.free[j * this.w + i] = ok ? 1 : 0;
    }
    // clearance
    const clr = R + 0.06;
    const mark = (s) => {
      const x0 = Math.min(s[0], s[2]) - clr, x1 = Math.max(s[0], s[2]) + clr, y0 = Math.min(s[1], s[3]) - clr, y1 = Math.max(s[1], s[3]) + clr;
      for (let j = Math.max(0, this.cy(y0)); j <= Math.min(this.h - 1, this.cy(y1)); j++) for (let i = Math.max(0, this.cx(x0)); i <= Math.min(this.w - 1, this.cx(x1)); i++) {
        const X = this.x0 + (i + 0.5) * this.res, Y = this.y0 + (j + 0.5) * this.res;
        if (segDist(X, Y, s) < clr) this.free[j * this.w + i] = 0;
      }
    };
    col.segs.forEach(mark);
    for (const c of col.circles) {
      const rr = c[2] + clr;
      for (let j = Math.max(0, this.cy(c[1] - rr)); j <= Math.min(this.h - 1, this.cy(c[1] + rr)); j++) for (let i = Math.max(0, this.cx(c[0] - rr)); i <= Math.min(this.w - 1, this.cx(c[0] + rr)); i++) {
        const X = this.x0 + (i + 0.5) * this.res, Y = this.y0 + (j + 0.5) * this.res;
        if (Math.hypot(X - c[0], Y - c[1]) < rr) this.free[j * this.w + i] = 0;
      }
    }
  }
  cx(X) { return Math.floor((X - this.x0) / this.res); }
  cy(Y) { return Math.floor((Y - this.y0) / this.res); }
  ok(i, j) { return i >= 0 && j >= 0 && i < this.w && j < this.h && this.free[j * this.w + i] === 1; }

  nearestFree(i, j) {
    if (this.ok(i, j)) return [i, j];
    for (let r = 1; r < 12; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
      if (this.ok(i + di, j + dj)) return [i + di, j + dj];
    }
    return null;
  }

  path(ax, ay, bx, by) {
    const s = this.nearestFree(this.cx(ax), this.cy(ay));
    const g = this.nearestFree(this.cx(bx), this.cy(by));
    if (!s || !g) return null;
    const W = this.w, N = W * this.h;
    const gs = new Float32Array(N).fill(Infinity);
    const from = new Int32Array(N).fill(-1);
    const closed = new Uint8Array(N);
    const heap = [];
    const push = (node, f) => { heap.push([f, node]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0]; const last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    const si = s[1] * W + s[0], gi = g[1] * W + g[0];
    const hh = (n) => { const x = n % W, y = (n / W) | 0; return Math.hypot(x - g[0], y - g[1]); };
    gs[si] = 0; push(si, hh(si));
    let iter = 0;
    while (heap.length && iter++ < 300000) {
      const [, n] = pop();
      if (n === gi) break;
      if (closed[n]) continue;
      closed[n] = 1;
      const x = n % W, y = (n / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (!this.ok(nx, ny)) continue;
        if (dx && dy && (!this.ok(x + dx, y) || !this.ok(x, y + dy))) continue;
        const m = ny * W + nx;
        const c = gs[n] + (dx && dy ? 1.4142 : 1);
        if (c < gs[m]) { gs[m] = c; from[m] = n; push(m, c + hh(m)); }
      }
    }
    if (from[gi] < 0 && gi !== si) return null;
    const cells = [];
    for (let n = gi; n !== -1; n = from[n]) cells.push(n);
    cells.reverse();
    const pts = cells.map((n) => [this.x0 + ((n % W) + 0.5) * this.res, this.y0 + (((n / W) | 0) + 0.5) * this.res]);
    // string pulling
    const out = [pts[0]];
    let i = 0;
    while (i < pts.length - 1) {
      let j = pts.length - 1;
      while (j > i + 1 && !this.los(pts[i], pts[j])) j--;
      out.push(pts[j]);
      i = j;
    }
    return out;
  }
  los(a, b) {
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.ceil(d / (this.res * 0.5));
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      if (!this.ok(this.cx(a[0] + (b[0] - a[0]) * t), this.cy(a[1] + (b[1] - a[1]) * t))) return false;
    }
    return true;
  }
}

// --- player -----------------------------------------------------------------------
export class Player {
  constructor(camera, dom, world, col, nav, ui) {
    this.cam = camera;
    this.dom = dom;
    this.world = world;
    this.col = col;
    this.nav = nav;
    this.ui = ui;
    this.pos = new THREE.Vector2(4.4, -4.6);
    this.vel = new THREE.Vector2();
    this.yaw = 0; this.pitch = 0;
    this.tYaw = 0; this.tPitch = 0;
    this.fov = null; this.tFov = null;
    this.shift = 0;
    this.keys = new Set();
    this.joy = { id: null, x: 0, y: 0, cx: 0, cy: 0 };
    this.look = new Map();
    this.pinch = null;
    this.path = null;
    this.mode = 'free'; // free | tour
    this.tourT = 0;
    this.tourPaused = false;
    this.onInteract = () => {};
    this.bind();
  }

  baseFov() {
    const a = window.innerWidth / window.innerHeight;
    if (a >= 1) return 60;
    // keep >= ~46 deg horizontal on tall phones
    const v = (2 * Math.atan(Math.tan((46 * DEG) / 2) / a)) / DEG;
    return Math.min(92, Math.max(75, v));
  }

  setPose(X, Y, yaw, pitch = 0) {
    this.pos.set(X, Y); this.yaw = this.tYaw = yaw; this.pitch = this.tPitch = pitch; this.vel.set(0, 0);
  }

  bind() {
    const el = this.dom;
    const joyEl = this.ui.joy;
    const knob = this.ui.knob;
    const isUI = (t) => t && t.closest && t.closest('.ui-block');
    const rectJ = () => joyEl.getBoundingClientRect();
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    const start = (e) => {
      for (const t of e.changedTouches) {
        if (isUI(t.target)) continue;
        this.onInteract();
        const r = rectJ();
        const inJoy = t.clientX > r.left - 30 && t.clientX < r.right + 30 && t.clientY > r.top - 30 && t.clientY < r.bottom + 30;
        if (inJoy && this.joy.id === null) {
          this.joy.id = t.identifier; this.joy.cx = r.left + r.width / 2; this.joy.cy = r.top + r.height / 2;
          this.updJoy(t.clientX, t.clientY);
        } else {
          this.look.set(t.identifier, { x: t.clientX, y: t.clientY, sx: t.clientX, sy: t.clientY, t0: performance.now() });
        }
      }
      if (this.look.size === 2) {
        const [a, b] = [...this.look.values()];
        this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), fov: this.tFov };
      }
      e.preventDefault();
    };
    const move = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.joy.id) { this.updJoy(t.clientX, t.clientY); continue; }
        const L = this.look.get(t.identifier);
        if (!L) continue;
        const dx = t.clientX - L.x, dy = t.clientY - L.y;
        L.x = t.clientX; L.y = t.clientY;
        if (this.look.size === 1) this.turn(dx, dy, 0.28);
      }
      if (this.look.size === 2 && this.pinch) {
        const [a, b] = [...this.look.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        this.tFov = Math.max(55, Math.min(95, this.pinch.fov * (this.pinch.d / Math.max(10, d))));
      }
      e.preventDefault();
    };
    const end = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.joy.id) { this.joy.id = null; this.joy.x = this.joy.y = 0; knob.style.transform = 'translate(-50%,-50%)'; continue; }
        const L = this.look.get(t.identifier);
        if (L) {
          const moved = Math.hypot(t.clientX - L.sx, t.clientY - L.sy);
          if (moved < 12 && performance.now() - L.t0 < 350 && this.look.size === 1) this.tap(t.clientX, t.clientY);
          this.look.delete(t.identifier);
        }
      }
      if (this.look.size < 2) this.pinch = null;
    };
    el.addEventListener('touchstart', start, { passive: false });
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);
    // mouse
    let md = null;
    el.addEventListener('mousedown', (e) => { if (isUI(e.target)) return; md = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t0: performance.now() }; this.onInteract(); });
    window.addEventListener('mousemove', (e) => { if (!md) return; this.turn(e.clientX - md.x, e.clientY - md.y, 0.2); md.x = e.clientX; md.y = e.clientY; });
    window.addEventListener('mouseup', (e) => {
      if (!md) return;
      if (Math.hypot(e.clientX - md.sx, e.clientY - md.sy) < 5 && performance.now() - md.t0 < 400) this.tap(e.clientX, e.clientY);
      md = null;
    });
    el.addEventListener('wheel', (e) => { this.tFov = Math.max(55, Math.min(95, this.tFov + e.deltaY * 0.03)); this.onInteract(); e.preventDefault(); }, { passive: false });
    window.addEventListener('keydown', (e) => {
      if (e.target && e.target.tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift', 'q', 'e'].includes(k)) { this.keys.add(k); this.onInteract(); if (k.startsWith('arrow')) e.preventDefault(); }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());
  }

  updJoy(x, y) {
    const dx = x - this.joy.cx, dy = y - this.joy.cy;
    const r = 46;
    const d = Math.hypot(dx, dy);
    const k = d > r ? r / d : 1;
    this.joy.x = (dx * k) / r; this.joy.y = (-dy * k) / r;
    this.ui.knob.style.transform = `translate(calc(-50% + ${dx * k}px), calc(-50% + ${dy * k}px))`;
    this.path = null;
  }

  turn(dx, dy, s) {
    const f = this.tFov / 75;
    // "grab the scene" semantics, like most walkthrough viewers
    this.tYaw -= dx * s * f;
    this.tPitch = Math.max(-60, Math.min(60, this.tPitch + dy * s * f));
  }

  tap(x, y) {
    // ray against visible zone meshes; walk if it hits a floor
    const ndc = new THREE.Vector2((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
    const rc = new THREE.Raycaster();
    rc.setFromCamera(ndc, this.cam);
    const objs = [];
    for (const z of this.world.zones) if (z.group.visible) z.group.children.forEach((m) => { if (m.material && !m.material.transparent && m.material.type !== 'MeshBasicMaterial') objs.push(m); });
    const hit = rc.intersectObjects(objs, false)[0];
    if (!hit) return;
    let tx = hit.point.x, ty = -hit.point.z;
    if (hit.face && hit.face.normal.y < 0.7 || hit.point.y > 0.6) {
      // tapped furniture or a wall: walk to the floor point just in front of it
      const back = rc.ray.direction.clone().multiplyScalar(-0.45);
      tx += back.x; ty -= back.z;
    }
    this.goTo(tx, ty);
  }

  goTo(X, Y, speed = 1.3, faceYaw = null) {
    const p = this.nav.path(this.pos.x, this.pos.y, X, Y);
    if (p && p.length > 1) { this.path = { pts: p.slice(1), speed, faceYaw }; this.ui.marker(X, Y); }
  }

  startTour(t = 0) {
    this.mode = 'tour';
    this.tourT = t;
    this.tourPaused = false;
    this.path = null;
  }
  pauseTour() { if (this.mode === 'tour') { this.mode = 'free'; this.tourPaused = true; const s = sampleTour(this.tourT); this.tPitch = this.pitch = 0; this.shift = (2 * s.H) / 100 - 1; } }

  update(dt) {
    const fov0 = this.baseFov();
    if (this.tFov === null) { this.tFov = this.fov = fov0; }
    if (this.mode === 'tour') {
      this.tourT += dt;
      if (this.tourT >= TOUR_END) { this.tourT = TOUR_END; this.mode = 'free'; this.tourPaused = false; this.ui.tourEnded(); }
      const s = sampleTour(this.tourT);
      this.pos.set(s.X, s.Y);
      this.yaw = this.tYaw = s.yaw;
      this.pitch = this.tPitch = 0;
      this.shift = (2 * s.H) / 100 - 1;
      this.fov += (fov0 - this.fov) * Math.min(1, dt * 3);
      this.tFov = this.fov;
    } else {
      // shift eases back to 0 in free mode
      this.shift += (0 - this.shift) * Math.min(1, dt * 2);
      // look smoothing
      const k = Math.min(1, dt * 14);
      this.yaw += (this.tYaw - this.yaw) * k;
      this.pitch += (this.tPitch - this.pitch) * k;
      this.fov += (this.tFov - this.fov) * Math.min(1, dt * 8);
      // keyboard turning
      if (this.keys.has('q')) this.tYaw -= 90 * dt;
      if (this.keys.has('e')) this.tYaw += 90 * dt;
      // input direction
      let ix = this.joy.x, iy = this.joy.y;
      if (this.keys.has('w') || this.keys.has('arrowup')) iy += 1;
      if (this.keys.has('s') || this.keys.has('arrowdown')) iy -= 1;
      if (this.keys.has('a')) ix -= 1;
      if (this.keys.has('d')) ix += 1;
      if (this.keys.has('arrowleft')) this.tYaw -= 100 * dt;
      if (this.keys.has('arrowright')) this.tYaw += 100 * dt;
      const il = Math.hypot(ix, iy);
      if (il > 1) { ix /= il; iy /= il; }
      const fast = this.keys.has('shift') ? 2.2 : 1;
      const yr = this.yaw * DEG;
      const fx = Math.sin(yr), fy = Math.cos(yr), rx = Math.cos(yr), ry = -Math.sin(yr);
      let dvx = (fx * iy + rx * ix) * 1.4 * fast, dvy = (fy * iy + ry * ix) * 1.4 * fast;
      if (il > 0.05) this.path = null;
      // path following
      if (this.path && il <= 0.05) {
        const tgt = this.path.pts[0];
        const ddx = tgt[0] - this.pos.x, ddy = tgt[1] - this.pos.y;
        const d = Math.hypot(ddx, ddy);
        const last = this.path.pts.length === 1;
        if (d < (last ? 0.06 : 0.25)) {
          this.path.pts.shift();
          if (!this.path.pts.length) { if (this.path.faceYaw !== null) this.tYaw = this.nearestAngle(this.path.faceYaw); this.path = null; this.ui.marker(null); }
        } else {
          const sp = Math.min(this.path.speed, last ? d * 2.2 + 0.15 : this.path.speed);
          dvx = (ddx / d) * sp; dvy = (ddy / d) * sp;
          // turn gently towards the walking direction
          const want = Math.atan2(ddx, ddy) / DEG;
          if (d > 0.4 && !this.look.size) this.tYaw += angDiff(want, this.tYaw) * Math.min(1, dt * 2.2);
        }
      }
      const acc = Math.min(1, dt * 6);
      this.vel.x += (dvx - this.vel.x) * acc;
      this.vel.y += (dvy - this.vel.y) * acc;
      this.col.move(this.pos, this.vel.x * dt, this.vel.y * dt);
    }
    // camera
    const c = this.cam;
    c.position.set(this.pos.x, EYE, -this.pos.y);
    c.rotation.order = 'YXZ';
    c.rotation.y = -this.yaw * DEG;
    c.rotation.x = this.pitch * DEG;
    c.fov = this.fov;
    c.shiftY = this.shift;
    c.updateProjectionMatrix();
    c.updateMatrixWorld();
  }

  nearestAngle(a) { return this.tYaw + angDiff(a, this.tYaw); }
}

export function angDiff(a, b) {
  let d = (a - b) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}
