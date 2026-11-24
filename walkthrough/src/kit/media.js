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
void main() {
  vec2 uv = vUv;
  float x = uv.x * uAspect;
  float t = uTime;
  // flame tongues: height field driven by scrolling noise
  float n1 = fbm(vec2(x * 3.0, t * 0.9), vec2(1e4), 4);
  float n2 = fbm(vec2(x * 7.0 + 3.0, uv.y * 2.5 - t * 2.2), vec2(1e4), 4);
  float tongue = 0.45 + 0.35 * n1 + 0.2 * sin(x * 9.0 + t * 1.7) * 0.5;
  float y = uv.y + 0.12 * n2;
  float f = smoothstep(tongue, tongue - 0.42, y);
  // edge fade along the burner
  float ex = smoothstep(0.0, 0.06, uv.x) * smoothstep(1.0, 0.94, uv.x);
  f *= ex;
  float core = smoothstep(tongue - 0.2, tongue - 0.65, y);
  vec3 col = mix(vec3(1.0, 0.32, 0.05), vec3(1.0, 0.72, 0.28), core);
  col = mix(col, vec3(1.0, 0.92, 0.75), core * core * 0.7);
  float a = f * (0.75 + 0.25 * n2);
  gl_FragColor = vec4(col * a * 4.5, a);
}`;

export function fireplace(len, h) {
  const k = new Kit('fire');
  // black glass box with a bed of glowing embers
  k.box(sol('#060707', 0.08, 0.2), len, h, 0.12, 0, h / 2, -0.06, { r: 0.003 });
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
