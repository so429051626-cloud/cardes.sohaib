// 2D canvas drawings: exterior view, original artworks, chalkboard, patterns.
// All seeded, all original abstract compositions (no brands, no people).
import { RNG } from './prng.js';

const TAU = Math.PI * 2;

export function drawExterior(ctx, w, h) {
  // paint small, then upscale = soft blur that every browser supports
  const s = document.createElement('canvas');
  const sw = 512, sh = 256;
  s.width = sw; s.height = sh;
  const c = s.getContext('2d');
  const rng = new RNG('exterior');
  let g = c.createLinearGradient(0, 0, 0, sh);
  g.addColorStop(0, '#dfe9f1');
  g.addColorStop(0.45, '#eaf1f6');
  g.addColorStop(0.62, '#f7f9fa');
  g.addColorStop(1, '#f2f5f3');
  c.fillStyle = g; c.fillRect(0, 0, sw, sh);
  // soft clouds
  for (let i = 0; i < 26; i++) {
    const x = rng.range(0, sw), y = rng.range(10, sh * 0.35), r = rng.range(14, 40);
    const rg = c.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, 'rgba(255,255,255,0.55)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = rg; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  }
  // far tree line
  const tree = (cx, base, rad, col) => {
    for (let k = 0; k < 9; k++) {
      const x = cx + rng.range(-rad, rad) * 0.9;
      const y = base - rng.range(0, rad * 1.4);
      const r = rad * rng.range(0.45, 0.85);
      c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    }
  };
  for (let i = 0; i < 18; i++) tree(i * 30 + rng.range(-8, 8), sh * 0.6, rng.range(14, 22), i % 2 ? '#86a86a' : '#7d9f63');
  for (let i = 0; i < 11; i++) tree(i * 50 + rng.range(-12, 12), sh * 0.66, rng.range(22, 34), i % 3 ? '#5e7f4e' : '#6b8c57');
  // trunks
  c.fillStyle = 'rgba(70,60,50,0.5)';
  for (let i = 0; i < 14; i++) c.fillRect(rng.range(0, sw), sh * 0.6, 2, sh * 0.08);
  // hedge + lawn
  g = c.createLinearGradient(0, sh * 0.66, 0, sh);
  g.addColorStop(0, '#78985a'); g.addColorStop(0.25, '#7fa35e'); g.addColorStop(1, '#8cad6a');
  c.fillStyle = g; c.fillRect(0, sh * 0.68, sw, sh * 0.32);
  for (let i = 0; i < 40; i++) {
    c.fillStyle = `rgba(110,150,80,${rng.range(0.1, 0.3)})`;
    c.beginPath(); c.ellipse(rng.range(0, sw), rng.range(sh * 0.72, sh), rng.range(10, 40), rng.range(2, 6), 0, 0, TAU); c.fill();
  }
  // a low garden wall line
  c.fillStyle = 'rgba(235,232,225,0.9)'; c.fillRect(0, sh * 0.665, sw, 3);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(s, 0, 0, w, h);
}

// B/W semicircles + concentric arcs (hall west wall, lobby)
export function drawArtArcs(ctx, w, h, seed) {
  const rng = new RNG(seed);
  ctx.fillStyle = '#f1f0ec'; ctx.fillRect(0, 0, w, h);
  const cells = [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]];
  const cw = w / 2, ch = h / 3;
  for (const [i, j] of cells) {
    const x = i * cw, y = j * ch;
    const kind = rng.int(0, 3);
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, cw, ch); ctx.clip();
    const dark = rng.next() < 0.5;
    if (dark) { ctx.fillStyle = '#151515'; ctx.fillRect(x, y, cw, ch); }
    const fg = dark ? '#f1f0ec' : '#151515';
    const ang = rng.int(0, 3) * Math.PI / 2;
    const cx = x + (ang === 0 || ang === Math.PI * 1.5 ? 0 : cw);
    const cy = y + (ang < Math.PI ? ch : 0);
    if (kind === 0) {
      ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(x + cw / 2, y + ch, cw * 0.48, Math.PI, TAU); ctx.fill();
    } else if (kind === 1) {
      ctx.strokeStyle = fg; ctx.lineWidth = cw * 0.045;
      for (let r = cw * 0.15; r < cw * 1.1; r += cw * 0.12) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke(); }
    } else if (kind === 2) {
      ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(x + cw / 2, y, cw * 0.48, 0, Math.PI); ctx.fill();
      ctx.fillStyle = dark ? '#151515' : '#f1f0ec'; ctx.beginPath(); ctx.arc(x + cw / 2, y, cw * 0.22, 0, Math.PI); ctx.fill();
    } else {
      ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, cw * 0.95, 0, TAU); ctx.fill();
      ctx.fillStyle = dark ? '#151515' : '#f1f0ec'; ctx.beginPath(); ctx.arc(cx, cy, cw * 0.55, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 2;
  for (let i = 1; i < 2; i++) { ctx.beginPath(); ctx.moveTo(i * cw, 0); ctx.lineTo(i * cw, h); ctx.stroke(); }
  paper(ctx, w, h, rng, 0.05);
}

function paper(ctx, w, h, rng, a) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rng.next() - 0.5) * 255 * a;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

// copper-brown narrow abstract
export function drawArtCopper(ctx, w, h, seed) {
  const rng = new RNG(seed);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#e9e2d8'); g.addColorStop(1, '#ddd2c4');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 7; i++) {
    const y = rng.range(0.05, 0.9) * h, hh = rng.range(0.05, 0.22) * h;
    ctx.fillStyle = rng.pick(['#8a5634', '#a8683d', '#6e4128', '#c08a5c', '#3d2a20']);
    ctx.globalAlpha = rng.range(0.55, 0.95);
    ctx.beginPath();
    ctx.ellipse(w * rng.range(0.3, 0.7), y, w * rng.range(0.2, 0.45), hh / 2, rng.range(-0.3, 0.3), 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#2b201a'; ctx.lineWidth = w * 0.02;
  ctx.beginPath(); ctx.moveTo(w * 0.5, h * 0.05);
  for (let i = 1; i <= 10; i++) ctx.lineTo(w * (0.5 + rng.range(-0.25, 0.25)), h * (0.05 + i * 0.09));
  ctx.stroke();
  paper(ctx, w, h, rng, 0.06);
}

// grey/black brush strokes on white (bedroom 4)
export function drawArtStrokes(ctx, w, h, seed) {
  const rng = new RNG(seed);
  ctx.fillStyle = '#efefed'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = `rgba(200,200,198,${rng.range(0.2, 0.5)})`;
    ctx.fillRect(rng.range(0, w), rng.range(0, h), rng.range(30, 160), rng.range(20, 120));
  }
  for (let i = 0; i < 14; i++) {
    const col = rng.pick(['#111', '#2a2a2a', '#6b6b6b', '#8d8d8d', '#444']);
    ctx.strokeStyle = col; ctx.lineCap = 'round';
    ctx.lineWidth = rng.range(6, 38);
    ctx.globalAlpha = rng.range(0.6, 0.95);
    ctx.beginPath();
    let x = rng.range(0, w), y = rng.range(0, h);
    ctx.moveTo(x, y);
    for (let k = 0; k < 3; k++) {
      const x2 = x + rng.range(-w * 0.5, w * 0.5), y2 = y + rng.range(-h * 0.3, h * 0.3);
      ctx.quadraticCurveTo(rng.range(0, w), rng.range(0, h), x2, y2);
      x = x2; y = y2;
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  paper(ctx, w, h, rng, 0.05);
}

// navy night sky with white hills (triptych panel i of 3)
export function drawArtNight(ctx, w, h, i) {
  const rng = new RNG('night' + i);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#0f1a33'); g.addColorStop(0.7, '#1d2c4e'); g.addColorStop(1, '#2b3c62');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  for (let k = 0; k < 140; k++) {
    ctx.fillStyle = `rgba(255,255,255,${rng.range(0.3, 0.95)})`;
    const r = rng.range(0.5, 1.8);
    ctx.beginPath(); ctx.arc(rng.range(0, w), rng.range(0, h * 0.6), r, 0, TAU); ctx.fill();
  }
  if (i === 1) {
    ctx.fillStyle = '#f2efe6'; ctx.beginPath(); ctx.arc(w * 0.6, h * 0.25, w * 0.09, 0, TAU); ctx.fill();
  }
  const layers = [['#e9edf2', 0.72], ['#cfd6e0', 0.8], ['#ffffff', 0.9]];
  for (const [col, base] of layers) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, h);
    const ph = rng.range(0, TAU) + i * 1.7;
    for (let x = 0; x <= w; x += 4) {
      const y = h * base - Math.sin(x / w * 3.0 + ph) * h * 0.06 - Math.sin(x / w * 7.0 + ph * 2) * h * 0.02;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h); ctx.fill();
  }
}

// navy panel with fine gold line drawing
export function drawArtNavyGold(ctx, w, h) {
  const rng = new RNG('navygold');
  ctx.fillStyle = '#1c2a45'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#c9a35c'; ctx.lineWidth = 2.2;
  ctx.beginPath();
  let x = w * 0.5, y = h * 0.1;
  ctx.moveTo(x, y);
  for (let i = 0; i < 9; i++) {
    const nx = w * rng.range(0.2, 0.8), ny = y + h * 0.09;
    ctx.bezierCurveTo(w * rng.range(0, 1), y + h * 0.03, w * rng.range(0, 1), ny - h * 0.03, nx, ny);
    x = nx; y = ny;
  }
  ctx.stroke();
  ctx.beginPath(); ctx.arc(w * 0.5, h * 0.3, w * 0.22, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.arc(w * 0.42, h * 0.62, w * 0.12, 0, TAU); ctx.stroke();
}

// white panel with a black single-line contour
export function drawArtContour(ctx, w, h) {
  const rng = new RNG('contour');
  ctx.fillStyle = '#f3f2ee'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#141414'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  const pts = [];
  for (let i = 0; i < 14; i++) pts.push([w * rng.range(0.15, 0.85), h * (0.12 + i * 0.055 + rng.range(-0.02, 0.02))]);
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  ctx.stroke();
  ctx.fillStyle = '#c9a35c'; ctx.beginPath(); ctx.arc(w * 0.64, h * 0.3, w * 0.05, 0, TAU); ctx.fill();
}

export function drawChalkboard(ctx, w, h) {
  const rng = new RNG('chalk');
  ctx.fillStyle = '#1d2021'; ctx.fillRect(0, 0, w, h);
  // dusty wipes
  for (let i = 0; i < 20; i++) {
    ctx.fillStyle = `rgba(220,220,215,${rng.range(0.015, 0.05)})`;
    ctx.beginPath(); ctx.ellipse(rng.range(0, w), rng.range(0, h), rng.range(40, 180), rng.range(15, 50), rng.range(0, 3), 0, TAU); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(235,235,228,0.85)'; ctx.fillStyle = 'rgba(235,235,228,0.85)';
  ctx.lineCap = 'round'; ctx.lineWidth = 2.4;
  const glyph = (x, y, s) => {
    const k = rng.int(0, 7);
    ctx.beginPath();
    if (k === 0) { ctx.arc(x + s / 2, y + s / 2, s / 2.4, 0, TAU); }
    else if (k === 1) { ctx.moveTo(x, y + s); ctx.lineTo(x + s / 2, y); ctx.lineTo(x + s, y + s); ctx.moveTo(x + s * 0.25, y + s * 0.55); ctx.lineTo(x + s * 0.75, y + s * 0.55); }
    else if (k === 2) { ctx.moveTo(x, y + s / 2); ctx.lineTo(x + s, y + s / 2); ctx.moveTo(x + s / 2, y); ctx.lineTo(x + s / 2, y + s); }
    else if (k === 3) { ctx.moveTo(x, y); ctx.bezierCurveTo(x + s, y, x, y + s, x + s, y + s); }
    else if (k === 4) { ctx.moveTo(x, y + s * 0.3); ctx.lineTo(x + s, y + s * 0.3); ctx.moveTo(x, y + s * 0.7); ctx.lineTo(x + s, y + s * 0.7); }
    else if (k === 5) { ctx.moveTo(x, y + s); ctx.quadraticCurveTo(x + s / 2, y - s * 0.6, x + s, y + s); }
    else if (k === 6) { ctx.moveTo(x + s, y); ctx.lineTo(x, y + s); ctx.moveTo(x, y); ctx.lineTo(x + s, y + s); }
    else { ctx.moveTo(x, y + s); ctx.lineTo(x + s * 0.3, y); ctx.lineTo(x + s * 0.6, y + s); ctx.lineTo(x + s, y); }
    ctx.stroke();
  };
  let y = h * 0.1;
  while (y < h * 0.82) {
    let x = w * rng.range(0.05, 0.12);
    const s = rng.range(14, 24);
    const len = rng.int(6, 18);
    for (let i = 0; i < len && x < w * 0.9; i++) {
      if (rng.next() < 0.12) { x += s * 0.8; continue; }
      glyph(x, y, s);
      x += s * rng.range(1.0, 1.35);
    }
    y += s * rng.range(1.8, 2.4);
  }
  // a big diagram circle with axes
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(w * 0.78, h * 0.62, h * 0.18, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w * 0.6, h * 0.62); ctx.lineTo(w * 0.96, h * 0.62); ctx.moveTo(w * 0.78, h * 0.4); ctx.lineTo(w * 0.78, h * 0.85); ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i <= 60; i++) { const t = i / 60; ctx.lineTo(w * (0.6 + 0.36 * t), h * (0.62 - Math.sin(t * TAU) * 0.12)); }
  ctx.stroke();
}

export function drawLeafWallpaper(ctx, w, h) {
  const rng = new RNG('leaves');
  ctx.fillStyle = '#f4f4f2'; ctx.fillRect(0, 0, w, h);
  const leaf = (x, y, s, a) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = `rgba(150,155,158,${rng.range(0.16, 0.3)})`;
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.bezierCurveTo(s * 0.45, -s * 0.25, s * 0.55, -s * 0.9, 0, -s * 1.4);
    ctx.bezierCurveTo(-s * 0.55, -s * 0.9, -s * 0.45, -s * 0.25, 0, 0);
    ctx.fill();
    ctx.strokeStyle = 'rgba(244,244,242,0.8)'; ctx.lineWidth = s * 0.03;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -s * 1.35); ctx.stroke();
    for (let k = 1; k < 7; k++) {
      const yy = -s * 0.18 * k;
      ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(s * 0.32, yy - s * 0.18); ctx.moveTo(0, yy); ctx.lineTo(-s * 0.32, yy - s * 0.18); ctx.stroke();
    }
    ctx.restore();
  };
  // draw with wrap-around so it tiles
  for (let i = 0; i < 16; i++) {
    const x = rng.range(0, w), y = rng.range(0, h), s = rng.range(90, 170), a = rng.range(-0.9, 0.9);
    for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) leaf(x + dx, y + dy, s, a);
  }
}

export function drawGingham(ctx, w, h) {
  ctx.fillStyle = '#f4f4f3'; ctx.fillRect(0, 0, w, h);
  const n = 16, s = w / n;
  ctx.fillStyle = 'rgba(120,124,128,0.45)';
  for (let i = 0; i < n; i += 2) { ctx.fillRect(i * s, 0, s, h); ctx.fillRect(0, i * s, w, s); }
  ctx.fillStyle = 'rgba(90,94,98,0.35)';
  for (let i = 0; i < n; i += 2) for (let j = 0; j < n; j += 2) ctx.fillRect(i * s, j * s, s, s);
  // quilting stitch lines
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
  for (let i = 0; i <= n; i += 4) { ctx.beginPath(); ctx.moveTo(i * s, 0); ctx.lineTo(i * s, h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * s); ctx.lineTo(w, i * s); ctx.stroke(); }
}

export function drawTartan(ctx, w, h) {
  ctx.fillStyle = '#8f9295'; ctx.fillRect(0, 0, w, h);
  const bands = [[0.0, 0.18, 'rgba(60,62,66,0.55)'], [0.3, 0.06, 'rgba(230,230,228,0.5)'], [0.5, 0.22, 'rgba(70,72,76,0.5)'], [0.82, 0.04, 'rgba(200,200,198,0.6)']];
  for (const [p, s, col] of bands) { ctx.fillStyle = col; ctx.fillRect(p * w, 0, s * w, h); ctx.fillRect(0, p * h, w, s * h); }
  ctx.strokeStyle = 'rgba(20,20,22,0.25)'; ctx.lineWidth = 1;
  for (let i = 0; i < w; i += 4) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + h, h); ctx.stroke(); }
}

export function drawFloral(ctx, w, h) {
  const rng = new RNG('floral');
  ctx.fillStyle = '#c4d3e0'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 26; i++) {
    const x = rng.range(0, w), y = rng.range(0, h), s = rng.range(14, 30);
    for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) {
      ctx.save(); ctx.translate(x + dx, y + dy);
      for (let p = 0; p < 5; p++) {
        ctx.rotate(TAU / 5);
        ctx.fillStyle = 'rgba(245,248,252,0.85)';
        ctx.beginPath(); ctx.ellipse(0, -s * 0.6, s * 0.35, s * 0.6, 0, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = 'rgba(140,160,185,0.9)'; ctx.beginPath(); ctx.arc(0, 0, s * 0.25, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = 'rgba(150,172,196,0.5)';
    ctx.beginPath(); ctx.ellipse(rng.range(0, w), rng.range(0, h), 8, 3, rng.range(0, 3), 0, TAU); ctx.fill();
  }
}

export function drawGeoRunner(ctx, w, h) {
  ctx.fillStyle = '#f2f2f0'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#161616';
  const n = 10, s = w / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < Math.ceil(h / s); j++) {
    const x = i * s, y = j * s;
    ctx.beginPath();
    if ((i + j) % 2 === 0) { ctx.moveTo(x, y); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); }
    else { ctx.moveTo(x + s, y + s); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); }
    ctx.fill();
  }
  ctx.fillStyle = '#f2f2f0';
  for (let i = 0; i < n; i++) for (let j = 0; j < Math.ceil(h / s); j++) {
    ctx.beginPath(); ctx.arc(i * s + s / 2, j * s + s / 2, s * 0.12, 0, TAU); ctx.fill();
  }
}

export function drawSquiggle(ctx, w, h) {
  const rng = new RNG('squiggle');
  ctx.fillStyle = '#f1f1ef'; ctx.fillRect(0, 0, w, h);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let i = 0; i < 34; i++) {
    ctx.strokeStyle = rng.next() < 0.7 ? 'rgba(25,25,25,0.85)' : 'rgba(120,120,120,0.8)';
    ctx.lineWidth = rng.range(5, 14);
    let x = rng.range(0, w), y = rng.range(0, h), a = rng.range(0, TAU);
    ctx.beginPath(); ctx.moveTo(x, y);
    const n = rng.int(8, 20);
    for (let k = 0; k < n; k++) {
      a += rng.range(-1.2, 1.2);
      x += Math.cos(a) * 14; y += Math.sin(a) * 14;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

export function drawMonitor(ctx, w, h, a, b, c) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, a); g.addColorStop(0.55, b); g.addColorStop(1, c);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  const r = ctx.createRadialGradient(w * 0.7, h * 0.35, 0, w * 0.7, h * 0.35, w * 0.6);
  r.addColorStop(0, 'rgba(255,255,255,0.35)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = r; ctx.fillRect(0, 0, w, h);
}

export function drawPhotos(ctx, w, h) {
  const rng = new RNG('photos');
  ctx.fillStyle = '#c8b9a2'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 400; i++) { ctx.fillStyle = `rgba(90,70,50,${rng.range(0.05, 0.15)})`; ctx.fillRect(rng.range(0, w), rng.range(0, h), 2, 2); }
  for (let i = 0; i < 9; i++) {
    ctx.save(); ctx.translate(rng.range(w * 0.1, w * 0.9), rng.range(h * 0.15, h * 0.85)); ctx.rotate(rng.range(-0.25, 0.25));
    const pw = rng.range(40, 70), ph = pw * 0.75;
    ctx.fillStyle = '#fafafa'; ctx.fillRect(-pw / 2 - 4, -ph / 2 - 4, pw + 8, ph + 12);
    const g = ctx.createLinearGradient(0, -ph / 2, 0, ph / 2);
    const hue = rng.range(0, 360);
    g.addColorStop(0, `hsl(${hue},35%,70%)`); g.addColorStop(1, `hsl(${(hue + 40) % 360},30%,45%)`);
    ctx.fillStyle = g; ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
    ctx.fillStyle = '#b33'; ctx.beginPath(); ctx.arc(0, -ph / 2 - 1, 3, 0, TAU); ctx.fill();
    ctx.restore();
  }
}

// foliage atlas: 4 cells (ficus leaf, pampas plume, grass blade, small leaf)
export function drawFoliage(ctx, w, h) {
  const rng = new RNG('foliage');
  ctx.clearRect(0, 0, w, h);
  const cw = w / 2, ch = h / 2;
  // ficus leaf (cell 0,0)
  ctx.save(); ctx.translate(cw / 2, ch * 0.95);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.moveTo(0, 0);
  ctx.bezierCurveTo(cw * 0.42, -ch * 0.2, cw * 0.38, -ch * 0.7, 0, -ch * 0.9);
  ctx.bezierCurveTo(-cw * 0.38, -ch * 0.7, -cw * 0.42, -ch * 0.2, 0, 0);
  ctx.fill();
  ctx.strokeStyle = 'rgba(160,160,160,1)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -ch * 0.86); ctx.stroke();
  ctx.restore();
  // pampas plume (cell 1,0): many fine strands
  ctx.save(); ctx.translate(cw * 1.5, ch * 0.97);
  for (let i = 0; i < 900; i++) {
    const t = rng.next();
    const y = -t * ch * 0.92;
    const spread = Math.sin(Math.min(1, t * 1.3) * Math.PI) * cw * 0.32 + cw * 0.02;
    const x = rng.range(-spread, spread);
    ctx.strokeStyle = `rgba(255,255,255,${rng.range(0.3, 0.9)})`;
    ctx.lineWidth = rng.range(0.6, 1.6);
    ctx.beginPath(); ctx.moveTo(x * 0.2, y + 8); ctx.lineTo(x, y - rng.range(4, 14)); ctx.stroke();
  }
  ctx.restore();
  // grass blade (cell 0,1)
  ctx.save(); ctx.translate(cw * 0.5, ch * 1.98);
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.moveTo(-cw * 0.06, 0); ctx.quadraticCurveTo(-cw * 0.02, -ch * 0.6, cw * 0.05, -ch * 0.95); ctx.quadraticCurveTo(cw * 0.04, -ch * 0.5, cw * 0.06, 0); ctx.fill();
  ctx.restore();
  // small round leaf (cell 1,1)
  ctx.save(); ctx.translate(cw * 1.5, ch * 1.95);
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(0, -ch * 0.45, cw * 0.3, ch * 0.42, 0, 0, TAU); ctx.fill();
  ctx.restore();
}

// rattan weave for woven shades: white = fibre (used as alpha + colour)
export function drawRattan(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  const n = 18, s = w / n;
  ctx.lineWidth = s * 0.28; ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const x = i * s, y = j * s;
      const g = ctx.createLinearGradient(x, y, x + s, y + s);
      g.addColorStop(0, '#d8b98a'); g.addColorStop(0.5, '#f0d9b0'); g.addColorStop(1, '#b8915c');
      ctx.strokeStyle = g;
      ctx.beginPath();
      if ((i + j) % 2) { ctx.moveTo(x + s * 0.1, y + s * 0.1); ctx.lineTo(x + s * 0.9, y + s * 0.9); }
      else { ctx.moveTo(x + s * 0.9, y + s * 0.1); ctx.lineTo(x + s * 0.1, y + s * 0.9); }
      ctx.stroke();
    }
  }
  ctx.strokeStyle = '#c9a56e'; ctx.lineWidth = s * 0.12;
  for (let j = 0; j <= n; j += 3) { ctx.beginPath(); ctx.moveTo(0, j * s); ctx.lineTo(w, j * s); ctx.stroke(); }
}

// signature script: white on transparent, used as alpha for the brass letters.
// "Py", an upright thin bar, then "Sohaib Qudeih" (the script font slants "|")
export function drawSignature(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  const fam = '"Sig Script", "Brush Script MT", cursive';
  let size = h * 0.66;
  const parts = ['Py', 'Sohaib Qudeih'];
  let wA, wB, gap;
  for (;;) {
    ctx.font = `${size}px ${fam}`;
    wA = ctx.measureText(parts[0]).width; wB = ctx.measureText(parts[1]).width; gap = size * 0.55;
    if (wA + wB + gap * 2 < w * 0.94 || size < 10) break;
    size *= 0.95;
  }
  const total = wA + wB + gap * 2;
  let x = (w - total) / 2;
  const y = h * 0.5;
  ctx.textAlign = 'left';
  ctx.fillText(parts[0], x, y);
  x += wA + gap;
  ctx.fillRect(x - size * 0.022, y - size * 0.36, size * 0.044, size * 0.62);
  x += gap;
  ctx.fillText(parts[1], x, y);
}

export function drawBooksBack(ctx, w, h) {
  ctx.fillStyle = '#3a2a1f'; ctx.fillRect(0, 0, w, h);
}
