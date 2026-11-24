// GLSL recipes for the GPU texture generator. Colours are authored in sRGB
// and converted to linear at the end of albedo(). Heights are in metres.
// Every recipe is periodic over [0,1]^2 so it tiles without seams.

const LIN = 'return srgb2lin(c);';

export const R = {};

// Carrara-look white marble slab, domain = 2.4 m
R.marbleWhite = /* glsl */ `
vec3 albedo(vec2 uv) {
  vec2 per = vec2(2.0, 3.0);
  vec2 p = uv * per;
  vec2 q = vec2(fbm(p, per, 4), fbm(p + vec2(3.1, 7.7), per, 4));
  float cloud = fbm(p * 2.0 + q, per * 2.0, 5);
  float n1 = fbm(p + 0.9 * q + vec2(1.3, 0.0), per, 7);
  float n2 = fbm(p * 2.0 + 1.3 * q + vec2(3.0, 1.0), per * 2.0, 6);
  float band = smoothstep(0.05, 0.35, fbm(p + q * 0.5 + vec2(11.0, 5.0), per, 3));
  float band2 = smoothstep(0.15, 0.4, fbm(p * 2.0 + vec2(4.0, 2.0), per * 2.0, 3));
  float halo = (1.0 - smoothstep(0.0, 0.06, abs(n1))) * 0.10 * band;
  float thin = (1.0 - smoothstep(0.001, 0.012, abs(n1))) * 0.48 * band;
  float fine = (1.0 - smoothstep(0.0, 0.006, abs(n2))) * 0.26 * band2;
  vec3 base = vec3(0.935) * (1.0 - 0.018 * smoothstep(-0.4, 0.6, cloud));
  vec3 vein = vec3(0.6, 0.615, 0.635);
  float a = clamp(halo + thin + fine, 0.0, 0.62);
  vec3 c = mix(base, vein, a);
  ${LIN}
}
float height(vec2 uv) { return 0.0; }
float rough(vec2 uv) { return 0.2; }
`;

R.marbleBlack = /* glsl */ `
vec3 albedo(vec2 uv) {
  vec2 per = vec2(2.0);
  vec2 p = uv * per;
  vec2 q = vec2(fbm(p, per, 4), fbm(p + vec2(5.1, 2.7), per, 4));
  float n1 = fbm(p + 2.2 * q, per, 7);
  float n2 = fbm(p * 2.0 + 3.0 * q + vec2(7.0, 3.0), per * 2.0, 6);
  float gate = smoothstep(0.05, 0.35, fbm(p + q + vec2(2.0, 9.0), per, 3));
  float thin = (1.0 - smoothstep(0.0, 0.012, abs(n1))) * 0.85 * gate;
  float fine = (1.0 - smoothstep(0.0, 0.006, abs(n2))) * 0.45 * gate;
  float cloud = fbm(p * 2.0 + q, per * 2.0, 5);
  vec3 base = vec3(0.106, 0.118, 0.129) * (1.0 + 0.10 * cloud);
  vec3 c = mix(base, vec3(0.86, 0.87, 0.88), clamp(thin + fine, 0.0, 0.9));
  ${LIN}
}
float height(vec2 uv) { return 0.0; }
float rough(vec2 uv) { return 0.15; }
`;

R.marbleMint = /* glsl */ `
vec3 albedo(vec2 uv) {
  vec2 per = vec2(2.0);
  vec2 p = uv * per;
  vec2 q = vec2(fbm(p, per, 4), fbm(p + vec2(1.3, 6.1), per, 4));
  float cloud = fbm(p * 2.0 + 1.8 * q, per * 2.0, 6);
  float n1 = fbm(p + 2.0 * q + vec2(4.0, 4.0), per, 6);
  float v = (1.0 - smoothstep(0.0, 0.05, abs(n1))) * 0.45 + (1.0 - smoothstep(0.0, 0.012, abs(n1))) * 0.35;
  vec3 base = vec3(0.725, 0.831, 0.812) * (1.0 + 0.06 * cloud);
  vec3 c = mix(base, vec3(0.93, 0.96, 0.95), clamp(v, 0.0, 0.8));
  ${LIN}
}
float height(vec2 uv) { return 0.0; }
float rough(vec2 uv) { return 0.12; }
`;

// cloudy porcelain / stone, parametrised by base colour and amount
export function porcelain(hex, amount, speck) {
  const c = hexToVec(hex);
  return /* glsl */ `
vec3 albedo(vec2 uv) {
  vec2 per = vec2(3.0);
  vec2 p = uv * per;
  float cl = fbm(p + 0.8 * vec2(fbm(p, per, 3), fbm(p + 4.0, per, 3)), per, 6);
  float sp = vnoise(uv * 700.0, vec2(700.0));
  vec3 c = ${c} * (1.0 + ${amount.toFixed(4)} * cl + ${speck.toFixed(4)} * (sp - 0.5));
  ${LIN}
}
float height(vec2 uv) { return 0.0; }
float rough(vec2 uv) { return 0.3; }
`;
}

// neutral plaster (tinted by the material colour); domain 2 m
R.plaster = /* glsl */ `
vec3 albedo(vec2 uv) {
  vec2 per = vec2(2.0);
  float n = fbm(uv * per, per, 5);
  float m = fbm(uv * per * 8.0 + 3.0, per * 8.0, 3);
  vec3 c = vec3(0.975 + 0.02 * n + 0.006 * m);
  ${LIN}
}
float height(vec2 uv) {
  vec2 per = vec2(16.0);
  return 0.0006 * fbm(uv * per, per, 4) + 0.0002 * gnoise(uv * 160.0, vec2(160.0));
}
float rough(vec2 uv) { return 0.9; }
`;

// plaster with a faint marble cloud (bedrooms 4 and 5); domain 2.4 m
R.cloudPlaster = /* glsl */ `
vec3 albedo(vec2 uv) {
  vec2 per = vec2(2.0);
  vec2 p = uv * per;
  vec2 q = vec2(fbm(p, per, 4), fbm(p + vec2(2.1, 8.3), per, 4));
  float cl = fbm(p * 2.0 + 2.0 * q, per * 2.0, 6);
  float v = 1.0 - smoothstep(0.0, 0.08, abs(fbm(p + 1.8 * q, per, 6)));
  vec3 c = vec3(0.97) * (1.0 - 0.05 * smoothstep(-0.2, 0.6, cl) - 0.06 * v);
  ${LIN}
}
float height(vec2 uv) { return 0.0; }
float rough(vec2 uv) { return 0.85; }
`;

// wavy 3D relief, domain 2.4 m, height in metres (amplitude ~12 mm)
R.wavy = /* glsl */ `
float height(vec2 uv) {
  vec2 per = vec2(3.0);
  float w = 0.9 * fbm(uv * per, per, 3);
  float a = sin(6.2831853 * (3.0 * uv.x + 4.0 * uv.y) + w * 3.0);
  float b = sin(6.2831853 * (2.0 * uv.x + 5.0 * uv.y) + w * 2.0 + 1.3);
  float c = sin(6.2831853 * (5.0 * uv.x + 3.0 * uv.y) - w * 2.5 + 2.1);
  return 0.012 * (0.55 * a + 0.3 * b + 0.15 * c);
}
vec3 albedo(vec2 uv) { return srgb2lin(vec3(0.925)); }
float rough(vec2 uv) { return 0.55; }
`;

// woods: grain runs along v. domain 1 m
export function wood(dark, mid, light, ringFreq, fineAmt) {
  return /* glsl */ `
float grainT(vec2 uv) {
  float n = fbm(vec2(uv.x * 6.0, uv.y * 1.0), vec2(6.0, 1.0), 5);
  float n2 = fbm(vec2(uv.x * 3.0, uv.y * 2.0) + 7.0, vec2(3.0, 2.0), 4);
  float rings = 0.5 + 0.5 * sin((uv.x * ${ringFreq.toFixed(1)} + n * 3.0 + n2 * 1.5) * 6.2831853);
  rings = pow(rings, 2.2);
  float fine = 0.5 + 0.5 * gnoise(vec2(uv.x * 420.0, uv.y * 4.0), vec2(420.0, 4.0));
  float fine2 = 0.5 + 0.5 * gnoise(vec2(uv.x * 900.0, uv.y * 9.0), vec2(900.0, 9.0));
  return clamp(0.55 * rings + ${fineAmt.toFixed(3)} * (fine - 0.5) + 0.12 * (fine2 - 0.5) + 0.2 * n2, 0.0, 1.0);
}
vec3 albedo(vec2 uv) {
  float t = grainT(uv);
  vec3 c = t < 0.5 ? mix(${hexToVec(dark)}, ${hexToVec(mid)}, t * 2.0) : mix(${hexToVec(mid)}, ${hexToVec(light)}, t * 2.0 - 1.0);
  float pores = smoothstep(0.62, 0.9, 0.5 + 0.5 * gnoise(vec2(uv.x * 1400.0, uv.y * 30.0), vec2(1400.0, 30.0)));
  c *= 1.0 - 0.18 * pores;
  ${LIN}
}
float height(vec2 uv) {
  float pores = smoothstep(0.6, 0.9, 0.5 + 0.5 * gnoise(vec2(uv.x * 1400.0, uv.y * 30.0), vec2(1400.0, 30.0)));
  return -0.00012 * pores - 0.00008 * grainT(uv);
}
float rough(vec2 uv) { return 0.45 + 0.08 * (grainT(uv) - 0.5); }
`;
}

// plain weave fabric, neutral (tinted by vertex colour), domain 0.3 m
R.weave = /* glsl */ `
float th(vec2 uv) {
  vec2 p = uv * 110.0;
  vec2 f = fract(p); vec2 c = floor(p);
  float warp = sin(f.x * 3.14159);
  float weft = sin(f.y * 3.14159);
  float over = mod(c.x + c.y, 2.0);
  float slub = 0.15 * gnoise(vec2(uv.x * 9.0, uv.y * 110.0), vec2(9.0, 110.0));
  return mix(warp * (0.7 + 0.3 * weft), weft * (0.7 + 0.3 * warp), over) + slub;
}
vec3 albedo(vec2 uv) {
  float n = fbm(uv * 4.0, vec2(4.0), 4);
  vec3 c = vec3(0.86 + 0.12 * th(uv) + 0.03 * n);
  ${LIN}
}
float height(vec2 uv) { return 0.00045 * th(uv); }
float rough(vec2 uv) { return 0.85; }
`;

// boucle: curly loops, neutral, domain 0.15 m
R.boucle = /* glsl */ `
float loops(vec2 uv) {
  vec3 w1 = worley(uv * 38.0, vec2(38.0));
  vec3 w2 = worley(uv * 61.0 + 0.37, vec2(61.0));
  float r1 = 1.0 - smoothstep(0.0, 0.16, abs(w1.x - 0.33));
  float r2 = 1.0 - smoothstep(0.0, 0.18, abs(w2.x - 0.30));
  return max(r1 * 0.9, r2 * 0.75) + 0.25 * (1.0 - w1.x);
}
vec3 albedo(vec2 uv) { vec3 c = vec3(0.90 + 0.10 * loops(uv)); ${LIN} }
float height(vec2 uv) { return 0.0012 * loops(uv); }
float rough(vec2 uv) { return 0.95; }
`;

// long-pile shag, neutral, domain 0.5 m
R.shag = /* glsl */ `
float pile(vec2 uv) {
  vec2 per = vec2(48.0);
  vec2 q = vec2(fbm(uv * 8.0, vec2(8.0), 3), fbm(uv * 8.0 + 5.0, vec2(8.0), 3));
  float a = fbm(uv * per + q * 3.0, per, 3);
  vec3 w = worley(uv * 140.0 + q * 4.0, vec2(140.0));
  return 0.5 + 0.35 * a + 0.35 * (w.y - w.x);
}
vec3 albedo(vec2 uv) { vec3 c = vec3(0.80 + 0.2 * pile(uv)); ${LIN} }
float height(vec2 uv) { return 0.004 * pile(uv); }
float rough(vec2 uv) { return 1.0; }
`;

// low pile (felt-like), neutral, domain 0.5 m
R.lowpile = /* glsl */ `
float lp(vec2 uv) { return 0.5 + 0.5 * fbm(uv * 90.0, vec2(90.0), 3); }
vec3 albedo(vec2 uv) { vec3 c = vec3(0.9 + 0.1 * lp(uv) + 0.03 * fbm(uv * 6.0, vec2(6.0), 3)); ${LIN} }
float height(vec2 uv) { return 0.0008 * lp(uv); }
float rough(vec2 uv) { return 1.0; }
`;

// grey rug with fine parallel diagonal stripes, domain 1 m
R.rugDiag = /* glsl */ `
vec3 albedo(vec2 uv) {
  float s = 0.5 + 0.5 * sin(6.2831853 * (uv.x + uv.y) * 46.0);
  float s2 = 0.5 + 0.5 * sin(6.2831853 * (uv.x + uv.y) * 7.0 + 1.0);
  float n = vnoise(uv * 300.0, vec2(300.0));
  vec3 c = mix(vec3(0.47, 0.48, 0.49), vec3(0.62, 0.63, 0.64), smoothstep(0.3, 0.7, s) * (0.7 + 0.3 * s2));
  c *= 0.95 + 0.1 * n;
  ${LIN}
}
float height(vec2 uv) { return 0.0006 * sin(6.2831853 * (uv.x + uv.y) * 46.0) + 0.0005 * vnoise(uv * 300.0, vec2(300.0)); }
float rough(vec2 uv) { return 1.0; }
`;

// light grey rug with linear tone stripes (dining), domain 1 m
R.rugTone = /* glsl */ `
vec3 albedo(vec2 uv) {
  float w = 0.04 * fbm(vec2(uv.y * 3.0, uv.x), vec2(3.0, 1.0), 3);
  float k = floor((uv.x + w) * 22.0);
  float tone = h21(vec2(mod(k, 22.0), 3.0));
  float n = vnoise(uv * 350.0, vec2(350.0));
  vec3 c = mix(vec3(0.70, 0.71, 0.71), vec3(0.83, 0.835, 0.835), tone);
  c *= 0.96 + 0.08 * n;
  ${LIN}
}
float height(vec2 uv) { return 0.0006 * vnoise(uv * 350.0, vec2(350.0)); }
float rough(vec2 uv) { return 1.0; }
`;

// leather grain, neutral, domain 0.2 m
R.leather = /* glsl */ `
float gr(vec2 uv) { vec3 w = worley(uv * 70.0, vec2(70.0)); return smoothstep(0.0, 0.25, w.y - w.x); }
vec3 albedo(vec2 uv) { vec3 c = vec3(0.9 + 0.1 * gr(uv) + 0.05 * fbm(uv * 5.0, vec2(5.0), 3)); ${LIN} }
float height(vec2 uv) { return 0.0003 * gr(uv); }
float rough(vec2 uv) { return 0.45 + 0.1 * (1.0 - gr(uv)); }
`;

// chunky knit, neutral, domain 0.3 m
R.knit = /* glsl */ `
float st(vec2 uv) {
  vec2 p = uv * vec2(14.0, 20.0);
  vec2 f = fract(p);
  float x = f.x * 2.0 - 1.0;
  float v = fract(f.y + abs(x) * 0.6);
  float bump = sin(v * 3.14159) * (1.0 - 0.5 * abs(x));
  return bump;
}
vec3 albedo(vec2 uv) { vec3 c = vec3(0.78 + 0.22 * st(uv)); ${LIN} }
float height(vec2 uv) { return 0.004 * st(uv); }
float rough(vec2 uv) { return 1.0; }
`;

// rattan weave colour + alpha (alpha in .a written through height mode is
// not possible, so rattan uses a canvas texture instead)

export function hexToVec(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  return `vec3(${r.toFixed(4)}, ${g.toFixed(4)}, ${b.toFixed(4)})`;
}
