// TV (off, glossy black) and a linear fireplace with a deterministic flame shader.
import * as THREE from 'three';
import { Kit, sol, emit, C } from '../core/geom.js';
import { NOISE_GLSL } from '../core/texgen.js';

export function tv(w, h, o = {}) {
  const k = new Kit('tv');
  k.box(sol('#0b0c0d', 0.3, 0.3), w, h, 0.03, 0, 0, -0.015, { r: 0.004 });
  k.box(sol('#050607', 0.06, 0.0), w - 0.012, h - 0.012, 0.002, 0, 0, 0.001, { r: 0 });
  return k;
}

const FLAME_FRAG = NOISE_GLSL + /* glsl */ `
varying vec2 vUv;
uniform float uTime;
uniform float uAspect;
// two layers of irregular flame tongues; each wobbles and flickers with its own noise
float tongue(vec2 p, float id, float t, float sz) {
  float r1 = fract(sin(id * 12.9898) * 43758.5453);
  float h = (0.35 + 0.55 * (0.5 + 0.5 * gnoise(vec2(id * 3.7, t * (1.1 + r1)), vec2(1e4)))) * sz;
  float y = clamp(p.y / h, 0.0, 1.5);
  float wob = (0.25 + 0.2 * r1) * gnoise(vec2(id * 5.1, p.y * 2.5 - t * (2.0 + r1)), vec2(1e4)) * y;
  float w = (0.3 + 0.25 * r1) * pow(max(1.0 - y, 0.0), 0.8) * smoothstep(-0.05, 0.2, y);
  float d = abs(p.x + wob) - w;
  return (1.0 - smoothstep(-0.12, 0.1, d)) * smoothstep(1.0, 0.6, y);
}
float layer(vec2 uv, float cells, float t, float sz, float seed) {
  float cx = uv.x * cells;
  float id = floor(cx);
  float f = 0.0;
  for (int k = -1; k <= 1; k++) {
    float i2 = id + float(k);
    float jit = fract(sin((i2 + seed) * 7.13) * 917.3) - 0.5;
    vec2 p = vec2(cx - i2 - 0.5 + 0.35 * jit, uv.y);
    f += tongue(p, i2 + seed, t, sz);
  }
  return f;
}
void main() {
  vec2 uv = vUv;
  float t = uTime;
  float f = layer(uv, floor(uAspect * 1.1), t, 1.0, 0.0) * 0.8 + layer(uv, floor(uAspect * 2.3), t * 1.3, 0.6, 31.0) * 0.6;
  float n = fbm(vec2(uv.x * 9.0, uv.y * 4.0 - t * 3.0), vec2(1e4), 3);
  f *= 0.7 + 0.4 * n;
  f = min(f, 1.4);
  f *= smoothstep(0.0, 0.05, uv.x) * smoothstep(1.0, 0.95, uv.x);
  float core = smoothstep(0.3, 0.0, uv.y);
  vec3 col = mix(vec3(1.0, 0.3, 0.05), vec3(1.0, 0.62, 0.22), smoothstep(0.7, 0.15, uv.y));
  col = mix(col, vec3(1.0, 0.86, 0.62), core * 0.55);
  gl_FragColor = vec4(col * f * 3.0, min(f, 1.0));
}`;

export function fireplace(len, h) {
  const k = new Kit('fire');
  // black glass box with a bed of glowing embers
  const bl = sol('#060707', 0.08, 0.2);
  k.box(bl, len, h, 0.01, 0, h / 2, -0.115, { r: 0 });
  k.box(bl, len, 0.01, 0.12, 0, h - 0.005, -0.06, { r: 0 });
  for (const s of [-1, 1]) k.box(bl, 0.01, h, 0.12, s * (len / 2 - 0.005), h / 2, -0.06, { r: 0 });
  k.box(emit('#ff6a1a', 1.6), len - 0.1, 0.012, 0.05, 0, 0.025, -0.06, { r: 0 });
  k.box(sol('#1c1b1a', 0.9, 0), len - 0.06, 0.02, 0.08, 0, 0.012, -0.06, { r: 0.004 });
  const mat = new THREE.ShaderMaterial({
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: FLAME_FRAG,
    uniforms: { uTime: { value: 0 }, uAspect: { value: len / h }, uSeed: { value: 7 }, uTexel: { value: new THREE.Vector2() } },
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: true,
  });
  const g = new THREE.PlaneGeometry(len - 0.08, h * 0.85);
  g.translate(0, h * 0.85 / 2 + 0.02, -0.05);
  const m = k.mesh(g, { n: 'emit' }, { noMerge: true, material: mat, keepUV: true });
  m.userData.tick = (frame) => { mat.uniforms.uTime.value = frame / 30; };
  m.renderOrder = 4;
  // glass front
  k.box('glass', len, h, 0.006, 0, h / 2, 0.003, { r: 0 });
  k.light({ type: 'point', p: [0, h * 0.6, 0.25], color: new THREE.Color(1.0, 0.45, 0.15), intensity: 0.5, distance: 2.5 });
  return k;
}
