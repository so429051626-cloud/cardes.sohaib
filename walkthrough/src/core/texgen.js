// GPU procedural texture generator. Each recipe is GLSL that defines
//   vec3 albedo(vec2 uv), float height(vec2 uv), float rough(vec2 uv)
// over a periodic [0,1]^2 domain. The generator renders the requested
// channel into a mip-mapped render target once at load time.
import * as THREE from 'three';

export const NOISE_GLSL = /* glsl */ `
precision highp float;
precision highp int;
uniform float uSeed;
uniform vec2 uTexel;

uint pcg(uint v) {
  uint state = v * 747796405u + 2891336453u;
  uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}
float h21(vec2 p) {
  uvec2 q = uvec2(ivec2(p) + 32768);
  return float(pcg(q.x + pcg(q.y + pcg(uint(uSeed))))) / 4294967295.0;
}
vec2 h22(vec2 p) { return vec2(h21(p), h21(p + vec2(1931.0, 4217.0))); }
vec2 grad2(vec2 p) { float a = h21(p) * 6.2831853; return vec2(cos(a), sin(a)); }

// periodic gradient noise, period in lattice cells, range ~[-1,1]
float gnoise(vec2 x, vec2 per) {
  vec2 i = floor(x); vec2 f = fract(x);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 i00 = mod(i, per);
  vec2 i10 = mod(i + vec2(1.0, 0.0), per);
  vec2 i01 = mod(i + vec2(0.0, 1.0), per);
  vec2 i11 = mod(i + vec2(1.0, 1.0), per);
  float a = dot(grad2(i00), f);
  float b = dot(grad2(i10), f - vec2(1.0, 0.0));
  float c = dot(grad2(i01), f - vec2(0.0, 1.0));
  float d = dot(grad2(i11), f - vec2(1.0, 1.0));
  return 1.41 * mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 x, vec2 per, int oct) {
  float s = 0.0, a = 0.5, n = 0.0;
  for (int k = 0; k < 9; k++) {
    if (k >= oct) break;
    s += a * gnoise(x, per); n += a;
    x *= 2.0; per *= 2.0; a *= 0.5;
  }
  return s / n;
}
// periodic value noise
float vnoise(vec2 x, vec2 per) {
  vec2 i = floor(x); vec2 f = fract(x);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = h21(mod(i, per));
  float b = h21(mod(i + vec2(1.0, 0.0), per));
  float c = h21(mod(i + vec2(0.0, 1.0), per));
  float d = h21(mod(i + vec2(1.0, 1.0), per));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
// periodic worley: returns (F1, F2, cell hash)
vec3 worley(vec2 x, vec2 per) {
  vec2 i = floor(x); vec2 f = fract(x);
  float d1 = 9.0, d2 = 9.0, id = 0.0;
  for (int y = -1; y <= 1; y++) for (int xx = -1; xx <= 1; xx++) {
    vec2 g = vec2(float(xx), float(y));
    vec2 c = mod(i + g, per);
    vec2 o = h22(c);
    float d = length(g + o - f);
    if (d < d1) { d2 = d1; d1 = d; id = h21(c + 7.0); } else if (d < d2) { d2 = d; }
  }
  return vec3(d1, d2, id);
}
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec3 srgb2lin(vec3 c) { return pow(c, vec3(2.2)); }
`;

const VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

function fragFor(recipe, mode, strength) {
  return NOISE_GLSL + `
varying vec2 vUv;
${recipe}
void main() {
  vec2 uv = vUv;
  #if MODE == 0
    gl_FragColor = vec4(albedo(uv), 1.0);
  #elif MODE == 1
    float s = ${strength.toFixed(4)};
    float hl = height(uv - vec2(uTexel.x, 0.0));
    float hr = height(uv + vec2(uTexel.x, 0.0));
    float hd = height(uv - vec2(0.0, uTexel.y));
    float hu = height(uv + vec2(0.0, uTexel.y));
    vec3 n = normalize(vec3((hl - hr) * s, (hd - hu) * s, 1.0));
    gl_FragColor = vec4(n * 0.5 + 0.5, 1.0);
  #else
    gl_FragColor = vec4(1.0, rough(uv), 0.0, 1.0);
  #endif
}`;
}

export class TexGen {
  constructor(renderer) {
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
    this.bytes = 0;
    this.list = [];
    this.aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  }

  // mode: 'albedo' | 'normal' | 'rough'
  make(recipe, mode, size, opts = {}) {
    const m = mode === 'albedo' ? 0 : mode === 'normal' ? 1 : 2;
    const w = opts.width || size, h = opts.height || size;
    const rt = new THREE.WebGLRenderTarget(w, h, {
      type: THREE.UnsignedByteType,
      format: THREE.RGBAFormat,
      colorSpace: m === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
      anisotropy: this.aniso,
      depthBuffer: false,
    });
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: fragFor(recipe, m, opts.strength || 1),
      defines: { MODE: m },
      uniforms: {
        uSeed: { value: opts.seed || 1 },
        uTexel: { value: new THREE.Vector2(1 / w, 1 / h) },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.quad.material = mat;
    const prevRT = this.renderer.getRenderTarget();
    const prevTM = this.renderer.toneMapping;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.setRenderTarget(rt);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(prevRT);
    this.renderer.toneMapping = prevTM;
    mat.dispose();
    const tex = rt.texture;
    tex.name = opts.name || 'gen';
    tex.userData.rt = rt;
    this.bytes += w * h * 4 * 1.333;
    this.list.push({ name: tex.name, w, h });
    return tex;
  }

  // canvas texture helper (2D drawn), registered for memory accounting
  canvas(w, h, draw, opts = {}) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    draw(ctx, w, h);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = opts.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = opts.clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
    tex.anisotropy = this.aniso;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.name = opts.name || 'canvas';
    this.bytes += w * h * 4 * 1.333;
    this.list.push({ name: tex.name, w, h });
    return tex;
  }
}
