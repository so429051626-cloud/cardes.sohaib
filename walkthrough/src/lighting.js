// Light pool + per-zone env probes.
// A fixed pool (6 RectAreaLights, 6 PointLights, 1 shadowed DirectionalLight,
// 1 HemisphereLight) is re-assigned when the active zone set changes, so the
// light count never changes and shaders never recompile while walking.
// Unshadowed lights are clipped to their zone box in the shader (LIGHT_MASK).
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { POOL, LIGHT_U } from './core/materials.js';

export function kelvin(t) {
  // Tanner Helland approximation, returned in linear working space
  t /= 100;
  let r, g, b;
  if (t <= 66) { r = 255; g = 99.47 * Math.log(t) - 161.12; b = t <= 19 ? 0 : 138.52 * Math.log(t - 10) - 305.04; }
  else { r = 329.7 * Math.pow(t - 60, -0.1332); g = 288.12 * Math.pow(t - 60, -0.0755); b = 255; }
  const c = (v) => Math.min(255, Math.max(0, v)) / 255;
  return new THREE.Color().setRGB(c(r), c(g), c(b), THREE.SRGBColorSpace);
}

const boxOf = (z, m = 0.06) => new THREE.Vector4(z.bbox.x0 - m, -z.bbox.y1 - m, z.bbox.x1 + m, -z.bbox.y0 + m);
const NONE = () => new THREE.Vector4(1e5, 1e5, -1e5, -1e5);

export class Lighting {
  constructor(renderer, scene, world) {
    RectAreaLightUniformsLib.init();
    this.renderer = renderer;
    this.scene = scene;
    this.world = world;
    this.rects = [];
    this.points = [];
    this.slots = [];
    for (let i = 0; i < POOL.rect; i++) {
      const l = new THREE.RectAreaLight(0xffffff, 0, 1, 1);
      scene.add(l);
      this.rects.push(l);
    }
    for (let i = 0; i < POOL.point; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 6, 2);
      scene.add(l);
      this.points.push(l);
    }
    this.sun = new THREE.DirectionalLight(0xfffaf2, 0);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.02;
    this.sun.shadow.radius = 6;
    this.sun.shadow.intensity = 0.85;
    scene.add(this.sun);
    scene.add(this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xdfe6ee, 0xb9b2a8, 0.35);
    scene.add(this.hemi);
    this.cur = null;
    this.state = { rect: Array(POOL.rect).fill(null), point: Array(POOL.point).fill(null) };
    this.fade = { rect: Array(POOL.rect).fill(1), point: Array(POOL.point).fill(1) };
    this.sunFade = 1;
    this.scale = 1;
  }

  setShadowSize(n) {
    if (this.sun.shadow.mapSize.x === n) return;
    this.sun.shadow.mapSize.set(n, n);
    if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
    this.renderer.shadowMap.needsUpdate = true;
  }

  // assign pool lights: current zone first, then neighbours by distance
  assign(cur, others, camPos, instant = false) {
    const lists = { rect: [], point: [] };
    const push = (z, pri) => {
      for (const l of z.lights) {
        const kind = l.type === 'rect' ? 'rect' : 'point';
        const d = camPos ? camPos.distanceTo(l.pos) : 0;
        lists[kind].push({ l, z, pri: pri * 100 + d + (l.prio || 0) });
      }
    };
    push(cur, 0);
    for (const z of others) if (z !== cur) push(z, 1);
    for (const kind of ['rect', 'point']) {
      const L = lists[kind].sort((a, b) => a.pri - b.pri);
      const pool = kind === 'rect' ? this.rects : this.points;
      const want = L.slice(0, pool.length);
      // keep lights that stay in the same slot
      const next = Array(pool.length).fill(null);
      const left = [];
      for (const w of want) {
        const idx = this.state[kind].findIndex((s, i) => s === w.l && next[i] === null);
        if (idx >= 0) next[idx] = w.l; else left.push(w.l);
      }
      for (const l of left) { const i = next.indexOf(null); next[i] = l; if (!instant) this.fade[kind][i] = 0; }
      for (let i = 0; i < pool.length; i++) {
        const l = next[i];
        const light = pool[i];
        const boxU = kind === 'rect' ? LIGHT_U.uRectBox.value[i] : LIGHT_U.uPointBox.value[i];
        const exU = kind === 'rect' ? LIGHT_U.uRectEx.value[i] : LIGHT_U.uPointEx.value[i];
        if (!l) { light.userData.target = 0; boxU.copy(NONE()); exU.copy(NONE()); continue; }
        const z = this.world.byId[l.zone];
        boxU.copy(l.box ? new THREE.Vector4(l.box[0], -l.box[3], l.box[1], -l.box[2]) : boxOf(z));
        if (l.ex) exU.set(l.ex[0], -l.ex[3], l.ex[1], -l.ex[2]); else exU.copy(NONE());
        light.color.copy(l.color);
        light.userData.target = l.intensity;
        light.position.copy(l.pos);
        if (kind === 'rect') {
          light.width = l.w; light.height = l.h;
          if (l.rotFix !== undefined) light.up.set(-Math.sin(l.rotFix), 0, -Math.cos(l.rotFix));
          else light.up.set(0, 1, 0);
          light.lookAt(l.target);
        } else {
          light.distance = l.distance || 7;
          light.decay = 2;
        }
        if (instant) { this.fade[kind][i] = 1; light.intensity = l.intensity * this.scale; }
      }
      this.state[kind] = next;
    }
    // sun for the current zone only
    const s = cur.def.sun || cur.sun;
    if (s) {
      this.sun.color.copy(s.color || kelvin(6200));
      this.sun.userData.target = s.intensity;
      const tgt = new THREE.Vector3(s.target[0], s.target[2] || 0, -s.target[1]);
      const dir = new THREE.Vector3(s.dir[0], s.dir[2], -s.dir[1]).normalize();
      this.sun.target.position.copy(tgt);
      this.sun.position.copy(tgt).addScaledVector(dir, -14);
      this.sun.target.updateMatrixWorld();
      const b = cur.bbox;
      const ext = Math.max(b.x1 - b.x0, b.y1 - b.y0) * 0.75 + 1.5;
      const cam = this.sun.shadow.camera;
      cam.left = -ext; cam.right = ext; cam.top = ext; cam.bottom = -ext;
      cam.near = 2; cam.far = 34;
      cam.updateProjectionMatrix();
      LIGHT_U.uDirBox.value.copy(boxOf(cur, 0.05));
      if (instant) this.sun.intensity = s.intensity * this.scale;
    } else {
      this.sun.userData.target = 0;
      LIGHT_U.uDirBox.value.copy(NONE());
      if (instant) this.sun.intensity = 0;
    }
    this.renderer.shadowMap.needsUpdate = true;
    this.cur = cur;
  }

  update(dt) {
    const k = Math.min(1, dt * 3.5);
    for (const [kind, pool] of [['rect', this.rects], ['point', this.points]]) {
      for (let i = 0; i < pool.length; i++) {
        this.fade[kind][i] = Math.min(1, this.fade[kind][i] + dt * 2.5);
        const t = (pool[i].userData.target || 0) * this.fade[kind][i] * this.scale;
        pool[i].intensity += (t - pool[i].intensity) * k;
      }
    }
    const st = (this.sun.userData.target || 0) * this.scale;
    this.sun.intensity += (st - this.sun.intensity) * k;
  }
}

// Env probes ------------------------------------------------------------------
export class Probes {
  constructor(renderer, scene, size = 256) {
    this.renderer = renderer;
    this.scene = scene;
    this.size = size;
    this.cubeRT = new THREE.WebGLCubeRenderTarget(size, { type: THREE.HalfFloatType, generateMipmaps: false });
    this.cam = new THREE.CubeCamera(0.05, 80, this.cubeRT);
    scene.add(this.cam);
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.pmrem.compileCubemapShader();
  }

  // neutral placeholder env of identical size (keeps shader defines constant)
  placeholder() {
    const s = new THREE.Scene();
    const geo = new THREE.BoxGeometry(10, 4, 10);
    const mat = new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true });
    const pos = geo.attributes.position;
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const v = y > 0 ? 0.75 : 0.45;
      col[i * 3] = v; col[i * 3 + 1] = v; col[i * 3 + 2] = v * 1.02;
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    s.add(new THREE.Mesh(geo, mat));
    const rt = this.pmrem.fromScene(s, 0.04, 0.1, 50, { size: this.size });
    this.env0 = rt.texture;
    return rt.texture;
  }

  capture(zone) {
    this.cam.position.copy(zone.probe);
    this.cam.updateMatrixWorld(true);
    const prevTM = this.renderer.toneMapping;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.cam.update(this.renderer, this.scene);
    this.renderer.toneMapping = prevTM;
    const rt = this.pmrem.fromCubemap(this.cubeRT.texture, zone.pmremRT || null);
    zone.pmremRT = rt;
    zone.env = rt.texture;
    for (const m of zone.materials) if (m.envMap !== undefined && m.userData.zoneU) m.envMap = zone.env;
  }
}
