// Arabic RTL interface: loading screen, room label, tour button, joystick,
// menu with rooms / auto-tour / quality / fullscreen / mini plan.
import { ZONES } from '../rooms/plan.js';

export const SIGNATURE = 'Py | Sohaib Qudeih';

export const DESTS = [
  { id: 'A', label: 'الاستقبال', p: [4.4, -3.6, 330] },
  { id: 'B', label: 'الصالة', p: [4.6, 1.6, 10] },
  { id: 'B', label: 'السفرة', p: [5.2, 9.1, 330] },
  { id: 'C', label: 'المطبخ', p: [-1.0, 10.8, 280] },
  { id: 'D', label: 'غرفة المؤونة', p: [-3.6, 16.2, 80] },
  { id: 'F', label: 'الجناح الرئيسي', p: [-5.3, 3.6, 260] },
  { id: 'F1', label: 'حمام الجناح', p: [-7.3, 6.9, 330] },
  { id: 'G', label: 'الممر', p: [8.6, 9.4, 90] },
  { id: 'H', label: 'غرفة نوم 2', p: [8.4, 6.9, 200] },
  { id: 'I', label: 'غرفة نوم 3', p: [11.0, 11.6, 0] },
  { id: 'K', label: 'غرفة نوم 4', p: [18.4, 7.2, 170] },
  { id: 'M', label: 'غرفة نوم 5', p: [26.4, 6.8, 190] },
  { id: 'N', label: 'غرفة نوم 6', p: [27.6, 11.4, 330] },
  { id: 'L', label: 'المكتب', p: [18.0, 11.5, 60] },
];

const $ = (s, r = document) => r.querySelector(s);

export class UI {
  constructor() {
    this.root = $('#ui');
    this.loading = $('#loading');
    this.bar = $('#ld-bar');
    this.ldText = $('#ld-text');
    this.ldPct = $('#ld-pct');
    this.label = $('#room-label');
    this.joy = $('#joy');
    this.knob = $('#joy-knob');
    this.tourBtn = $('#tour-btn');
    this.menuBtn = $('#menu-btn');
    this.menu = $('#menu');
    this.map = $('#map');
    this.qual = $('#quality');
    this.hint = $('#hint');
    this.drawPlanSketch();
    this.labelTimer = null;
    this.handlers = {};
    this.menuBtn.addEventListener('click', () => this.toggleMenu());
    $('#menu-close').addEventListener('click', () => this.toggleMenu(false));
    this.tourBtn.addEventListener('click', () => this.handlers.tour && this.handlers.tour());
    $('#menu-tour').addEventListener('click', () => { this.toggleMenu(false); this.handlers.tourStart && this.handlers.tourStart(); });
    $('#menu-fs').addEventListener('click', () => this.fullscreen());
    const list = $('#rooms');
    for (const d of DESTS) {
      const b = document.createElement('button');
      b.className = 'room-btn';
      b.type = 'button';
      b.textContent = d.label;
      b.addEventListener('click', () => { this.toggleMenu(false); this.handlers.go && this.handlers.go(d); });
      list.appendChild(b);
    }
    this.qual.addEventListener('change', () => this.handlers.quality && this.handlers.quality(this.qual.value));
    this.map.addEventListener('click', (e) => {
      const r = this.map.getBoundingClientRect();
      const p = this.unmap(e.clientX - r.left, e.clientY - r.top);
      this.toggleMenu(false);
      this.handlers.goPoint && this.handlers.goPoint(p[0], p[1]);
    });
  }

  on(name, fn) { this.handlers[name] = fn; }

  progress(p, text) {
    const v = Math.max(0, Math.min(1, p));
    this.bar.style.transform = `scaleX(${v})`;
    this.ldPct.textContent = Math.round(v * 100).toLocaleString('ar-EG') + '٪';
    if (text) this.ldText.textContent = text;
    const sk = $('#ld-plan');
    if (sk) sk.style.setProperty('--draw', String(1 - v));
  }

  hideLoading(instant) {
    if (instant) { this.loading.hidden = true; this.root.classList.add('ready'); return; }
    this.loading.classList.add('done');
    setTimeout(() => { this.loading.hidden = true; }, 900);
    this.root.classList.add('ready');
    this.hint.classList.add('show');
    setTimeout(() => this.hint.classList.remove('show'), 6500);
  }

  error(msg) {
    this.ldText.textContent = msg;
    this.loading.classList.add('err');
  }

  showRoom(name) {
    if (!name || name === this.lastRoom) return;
    this.lastRoom = name;
    this.label.textContent = name;
    this.label.classList.remove('show');
    void this.label.offsetWidth;
    this.label.classList.add('show');
    clearTimeout(this.labelTimer);
    this.labelTimer = setTimeout(() => this.label.classList.remove('show'), 2200);
  }

  setTourState(s) {
    // s: 'idle' | 'playing' | 'paused'
    this.tourBtn.dataset.state = s;
    this.tourBtn.textContent = s === 'playing' ? 'إيقاف الجولة' : s === 'paused' ? 'استئناف الجولة' : 'جولة تلقائية';
  }
  tourEnded() { this.handlers.tourEnded && this.handlers.tourEnded(); }

  toggleMenu(force) {
    const open = force === undefined ? this.menu.hidden : force;
    this.menu.hidden = !open;
    this.menuBtn.setAttribute('aria-expanded', String(open));
    if (open) this.handlers.menuOpen && this.handlers.menuOpen();
  }

  fullscreen() {
    const d = document;
    try {
      if (!d.fullscreenElement) (d.documentElement.requestFullscreen ? d.documentElement.requestFullscreen() : Promise.reject()).catch(() => {});
      else d.exitFullscreen().catch(() => {});
    } catch (e) { /* not available in this view */ }
  }

  marker() {}

  // --- mini plan ---------------------------------------------------------------
  mapXf() {
    const c = this.map;
    const W = c.clientWidth || 300, H = c.clientHeight || 180;
    const x0 = -10, x1 = 31.5, y0 = -6.5, y1 = 17.6;
    const s = Math.min(W / (x1 - x0), H / (y1 - y0));
    const ox = (W - (x1 - x0) * s) / 2, oy = (H - (y1 - y0) * s) / 2;
    return { s, f: (X, Y) => [ox + (X - x0) * s, oy + (y1 - Y) * s], g: (px, py) => [x0 + (px - ox) / s, y1 - (py - oy) / s], W, H };
  }
  unmap(px, py) { return this.mapXf().g(px, py); }

  drawMap(pos, yaw, curId) {
    const c = this.map;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = c.clientWidth, H = c.clientHeight;
    if (!W) return;
    if (c.width !== W * dpr) { c.width = W * dpr; c.height = H * dpr; }
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const { f, s } = this.mapXf();
    for (const z of ZONES) {
      ctx.beginPath();
      z.poly.forEach((p, i) => { const q = f(p[0], p[1]); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); });
      ctx.closePath();
      ctx.fillStyle = z.id === curId ? 'rgba(201,163,92,0.35)' : 'rgba(40,44,48,0.07)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(30,32,36,0.55)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    if (pos) {
      const q = f(pos.x, pos.y);
      const a = (yaw * Math.PI) / 180;
      ctx.fillStyle = 'rgba(201,163,92,0.35)';
      ctx.beginPath(); ctx.moveTo(q[0], q[1]);
      ctx.arc(q[0], q[1], 22, a - Math.PI / 2 - 0.55, a - Math.PI / 2 + 0.55);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#b8862f';
      ctx.beginPath(); ctx.arc(q[0], q[1], 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    }
  }

  // faint floor-plan line drawing on the loading screen, revealed as it loads
  drawPlanSketch() {
    const svg = $('#ld-plan');
    if (!svg) return;
    const x0 = -10, y1 = 17.6;
    const paths = ZONES.map((z) => 'M' + z.poly.map((p) => `${(p[0] - x0).toFixed(2)} ${(y1 - p[1]).toFixed(2)}`).join(' L') + ' Z').join(' ');
    svg.innerHTML = `<path d="${paths}" pathLength="1"></path>`;
  }
}
