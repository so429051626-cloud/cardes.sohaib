// Renderer, post-processing chain and quality presets.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';

export const GRADE = {
  tone: 'neutral', exposure: 0.86, lift: 0.035, sat: 0.78, cool: [-0.006, 0.0, 0.012],
};

// final grade inside the tone-mapping function: used by OutputPass and, on the
// Low preset, by every material directly (same look on every preset)
export function installGrade(params = {}) {
  Object.assign(GRADE, params);
  const g = GRADE;
  const base = g.tone === 'aces' ? 'ACESFilmicToneMapping( color )' : 'NeutralToneMapping( color )';
  const f = (x) => Number(x).toFixed(4);
  const code = `vec3 CustomToneMapping( vec3 color ) {
  vec3 c = ${base};
  vec3 d = pow( max( c, vec3( 0.0 ) ), vec3( 1.0 / 2.2 ) );
  float l = dot( d, vec3( 0.2126, 0.7152, 0.0722 ) );
  d = mix( vec3( l ), d, ${f(g.sat)} );
  float sh = 1.0 - smoothstep( 0.0, 0.55, l );
  d += vec3( ${f(g.cool[0])}, ${f(g.cool[1])}, ${f(g.cool[2])} ) * sh;
  d = ${f(g.lift)} + d * ( 1.0 - ${f(g.lift)} );
  return pow( clamp( d, 0.0, 1.0 ), vec3( 2.2 ) );
}`;
  THREE.ShaderChunk.tonemapping_pars_fragment = THREE.ShaderChunk.tonemapping_pars_fragment.replace(
    /vec3 CustomToneMapping\( vec3 color \) \{[\s\S]*?\n?\}\s*$/,
    code + '\n'
  );
}

export const PRESETS = {
  high: { name: 'high', label: 'عالية', pr: 2, shadows: true, shadowSize: 2048, post: true, gtao: true, bloom: true },
  medium: { name: 'medium', label: 'متوسطة', pr: 1.25, shadows: true, shadowSize: 1024, post: true, gtao: false, bloom: true },
  low: { name: 'low', label: 'منخفضة', pr: 1, shadows: false, shadowSize: 1024, post: false, gtao: false, bloom: false },
};
export const ORDER = ['low', 'medium', 'high'];

export class Renderer {
  constructor(canvas) {
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', stencil: false });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.CustomToneMapping;
    r.toneMappingExposure = GRADE.exposure;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    r.shadowMap.autoUpdate = false;
    r.info.autoReset = false;
    this.r = r;
    this.preset = PRESETS.medium;
    this.composer = null;
  }

  setup(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    const r = this.r;
    const size = r.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType });
    this.composer = new EffectComposer(r, rt);
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);
    this.gtao = null;
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.32, 0.45, 1.6);
    this.composer.addPass(this.bloom);
    this.output = new OutputPass();
    this.composer.addPass(this.output);
    this.smaa = new SMAAPass();
    this.composer.addPass(this.smaa);
  }

  ensureGTAO(on) {
    if (on && !this.gtao) {
      const s = this.r.getDrawingBufferSize(new THREE.Vector2());
      this.gtao = new GTAOPass(this.scene, this.camera, s.x, s.y);
      this.gtao.output = GTAOPass.OUTPUT.Default;
      this.gtao.blendIntensity = 0.85;
      this.gtao.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1.5, thickness: 1.0, scale: 1.0, samples: 12, screenSpaceRadius: false });
      this.gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
      // half resolution
      this.gtao.setSize(Math.floor(s.x / 2), Math.floor(s.y / 2));
      this.composer.insertPass(this.gtao, 1);
    }
    if (this.gtao) this.gtao.enabled = on;
  }

  apply(preset, lighting) {
    this.preset = preset;
    const r = this.r;
    const dpr = Math.min(window.devicePixelRatio || 1, preset.pr);
    r.setPixelRatio(dpr);
    this.resize();
    if (r.shadowMap.enabled !== preset.shadows) {
      r.shadowMap.enabled = preset.shadows;
      // materials need to recompile once when shadows toggle
      this.scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
    }
    lighting && lighting.setShadowSize(preset.shadowSize);
    r.shadowMap.needsUpdate = true;
    if (this.composer) {
      this.bloom.enabled = preset.bloom;
      this.ensureGTAO(preset.gtao);
    }
  }

  resize() {
    const r = this.r;
    const w = window.innerWidth, h = window.innerHeight;
    r.setSize(w, h, false);
    if (this.composer) {
      this.composer.setPixelRatio(r.getPixelRatio());
      this.composer.setSize(w, h);
      const s = r.getDrawingBufferSize(new THREE.Vector2());
      this.bloom.setSize(Math.floor(s.x / 2), Math.floor(s.y / 2));
      if (this.gtao) this.gtao.setSize(Math.floor(s.x / 2), Math.floor(s.y / 2));
    }
  }

  render(dt) {
    this.r.info.reset();
    if (this.preset.post) this.composer.render(dt);
    else this.r.render(this.scene, this.camera);
  }
}
