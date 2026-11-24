// Material library. Every zone gets its own clone of each material it uses,
// so per-zone uniforms (room box for analytic AO, probe box for box-projected
// reflections) and the zone's env map can differ while the GL programs are
// shared. A single onBeforeCompile patch adds:
//   ROOM_AO     analytic corner occlusion from the zone's bounding box
//   BOX_PROJ    box-projected env reflections (parallax-correct floors/mirrors)
//   LIGHT_MASK  per-light zone boxes so unshadowed lights never leak through walls
//   TILE        per-tile randomised sampling + procedural grout (no visible repeats)
//   UBER_RM     per-vertex roughness/metalness for the merged "solid" material
import * as THREE from 'three';
import { MAPSCALE } from './geom.js';

export const POOL = { rect: 6, point: 6 };

const inv = () => new THREE.Vector4(1e5, 1e5, -1e5, -1e5); // empty box: mask 0
export const LIGHT_U = {
  uRectBox: { value: Array.from({ length: POOL.rect }, inv) },
  uRectEx: { value: Array.from({ length: POOL.rect }, inv) },
  uPointBox: { value: Array.from({ length: POOL.point }, inv) },
  uPointEx: { value: Array.from({ length: POOL.point }, inv) },
  uDirBox: { value: inv() },
  uDirEx: { value: inv() },
};

const PARS_VERT = /* glsl */ `
varying vec3 vWPos;
varying vec3 vWNrm;
#ifdef UBER_RM
attribute vec2 aRM;
varying vec2 vRM;
#endif
`;

const MAIN_VERT = /* glsl */ `
{
  vec4 wp4 = vec4( transformed, 1.0 );
  #ifdef USE_INSTANCING
    wp4 = instanceMatrix * wp4;
  #endif
  wp4 = modelMatrix * wp4;
  vWPos = wp4.xyz;
  vWNrm = normalize( mat3( modelMatrix ) * objectNormal );
  #ifdef UBER_RM
    vRM = aRM;
  #endif
}
`;

const PARS_FRAG = /* glsl */ `
varying vec3 vWPos;
varying vec3 vWNrm;
#ifdef UBER_RM
varying vec2 vRM;
#endif
uniform vec3 uRoomMin;
uniform vec3 uRoomMax;
uniform vec4 uAO;
uniform vec3 uProbePos;
uniform vec3 uProbeMin;
uniform vec3 uProbeMax;
uniform vec4 uRectBox[ ${POOL.rect} ];
uniform vec4 uRectEx[ ${POOL.rect} ];
uniform vec4 uPointBox[ ${POOL.point} ];
uniform vec4 uPointEx[ ${POOL.point} ];
uniform vec4 uDirBox;
uniform vec4 uDirEx;
#ifdef TILE
uniform vec4 uTile;     // tileW, tileH, srcScale, groutW (metres)
uniform vec4 uTileVar;  // roughJitter, brightJitter, rowOffset, allowFlip
uniform vec3 uGrout;
float tileHash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
#endif

float lmask( vec4 b, vec4 e ) {
  vec2 p = vWPos.xz;
  float inb = step( b.x, p.x ) * step( p.x, b.z ) * step( b.y, p.y ) * step( p.y, b.w );
  float ine = step( e.x, p.x ) * step( p.x, e.z ) * step( e.y, p.y ) * step( p.y, e.w );
  return inb * ( 1.0 - ine );
}

vec3 boxProject( vec3 d ) {
  #ifdef BOX_PROJ
    vec3 p = clamp( vWPos, uProbeMin + 0.01, uProbeMax - 0.01 );
    vec3 r1 = ( uProbeMax - p ) / d;
    vec3 r2 = ( uProbeMin - p ) / d;
    vec3 r = max( r1, r2 );
    float t = min( min( r.x, r.y ), r.z );
    return normalize( p + d * t - uProbePos );
  #else
    return d;
  #endif
}

float roomAO( vec3 p, vec3 n ) {
  vec3 a = abs( n );
  float r = uAO.w;
  float wX = 1.0 - a.x, wY = 1.0 - a.y, wZ = 1.0 - a.z;
  float ao = 1.0;
  ao *= 1.0 - uAO.z * wX * exp( - abs( p.x - uRoomMin.x ) / r );
  ao *= 1.0 - uAO.z * wX * exp( - abs( uRoomMax.x - p.x ) / r );
  ao *= 1.0 - uAO.z * wZ * exp( - abs( p.z - uRoomMin.z ) / r );
  ao *= 1.0 - uAO.z * wZ * exp( - abs( uRoomMax.z - p.z ) / r );
  ao *= 1.0 - uAO.x * wY * exp( - abs( p.y - uRoomMin.y ) / ( r * 0.7 ) );
  ao *= 1.0 - uAO.y * wY * exp( - abs( uRoomMax.y - p.y ) / ( r * 1.2 ) );
  return ao;
}
`;

const TILE_MAP = /* glsl */ `
#ifdef TILE
  vec2 tUV = vMapUv;
  vec2 tSz = uTile.xy;
  float tRow = floor( tUV.y / tSz.y );
  tUV.x += uTileVar.z * tRow * tSz.x;
  vec2 tCell = floor( tUV / tSz );
  vec2 tLoc = tUV - tCell * tSz;
  vec2 tH = vec2( tileHash( tCell ), tileHash( tCell + 17.31 ) );
  vec2 tSl = tLoc;
  if ( uTileVar.w > 0.5 && tH.x > 0.5 ) tSl = tSz - tLoc;
  vec2 tSuv = ( tSl + tH * uTile.z * 3.7 ) / uTile.z;
  vec2 tDx = dFdx( vMapUv ) / uTile.z;
  vec2 tDy = dFdy( vMapUv ) / uTile.z;
  vec4 tTex = textureGrad( map, tSuv, tDx, tDy );
  float tE = min( min( tLoc.x, tSz.x - tLoc.x ), min( tLoc.y, tSz.y - tLoc.y ) );
  float tAA = max( length( fwidth( vMapUv ) ) * 0.75, 1e-5 );
  float tGrout = 1.0 - smoothstep( uTile.w * 0.5 - tAA, uTile.w * 0.5 + tAA, tE );
  tGrout *= 1.0 - smoothstep( 0.004, 0.02, tAA ); // fade grout lines far away
  float tB = 1.0 + uTileVar.y * ( tH.y - 0.5 );
  diffuseColor.rgb *= mix( tTex.rgb * tB, uGrout, tGrout );
  float tRough = 1.0 + uTileVar.x * ( tH.x * 2.0 - 1.0 );
#else
  #include <map_fragment>
#endif
`;

function patchShader(shader, mat) {
  const zu = mat.userData.zoneU;
  Object.assign(shader.uniforms, LIGHT_U);
  shader.uniforms.uRoomMin = zu.uRoomMin;
  shader.uniforms.uRoomMax = zu.uRoomMax;
  shader.uniforms.uAO = zu.uAO;
  shader.uniforms.uProbePos = zu.uProbePos;
  shader.uniforms.uProbeMin = zu.uProbeMin;
  shader.uniforms.uProbeMax = zu.uProbeMax;
  if (mat.userData.tileU) Object.assign(shader.uniforms, mat.userData.tileU);

  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\n' + PARS_VERT)
    .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n' + MAIN_VERT);

  let lightsBegin = THREE.ShaderChunk.lights_fragment_begin
    .replace('pointLight = pointLights[ i ];', 'pointLight = pointLights[ i ];\n\t\tpointLight.color *= lmask( uPointBox[ i ], uPointEx[ i ] );')
    .replace(
      'RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );',
      'if ( lmask( uRectBox[ i ], uRectEx[ i ] ) > 0.0 ) { RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight ); }'
    )
    .replace('directionalLight = directionalLights[ i ];', 'directionalLight = directionalLights[ i ];\n\t\tdirectionalLight.color *= lmask( uDirBox, uDirEx );');

  const envPars = THREE.ShaderChunk.envmap_physical_pars_fragment.replaceAll(
    'reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );',
    'reflectVec = boxProject( transformDirectionByInverseViewMatrix( reflectVec, viewMatrix ) );'
  );

  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\n' + PARS_FRAG)
    .replace('#include <envmap_physical_pars_fragment>', envPars)
    .replace('#include <map_fragment>', TILE_MAP)
    .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
#ifdef UBER_RM
  roughnessFactor *= vRM.x;
  metalnessFactor *= vRM.y;
#endif
#ifdef TILE
  roughnessFactor = mix( roughnessFactor * tRough, 0.7, tGrout );
#endif`)
    .replace('#include <lights_fragment_begin>', lightsBegin)
    .replace('#include <aomap_fragment>', `#include <aomap_fragment>
{
  float rAO = roomAO( vWPos, normalize( vWNrm ) );
  reflectedLight.indirectDiffuse *= rAO;
  reflectedLight.indirectSpecular *= mix( 1.0, rAO, 0.6 );
  reflectedLight.directDiffuse *= mix( 1.0, rAO, 0.45 );
}`);
}

// --- material templates ----------------------------------------------------

export class Materials {
  constructor(T, placeholderEnv) {
    this.T = T; // Textures
    this.env0 = placeholderEnv;
    this.templates = new Map();
    this.cache = new Map(); // `${zone}|${name}` -> material
    this.defineTemplates();
  }

  def(name, factory, opts = {}) {
    this.templates.set(name, { factory, ...opts });
    if (opts.mapScale) MAPSCALE[name] = opts.mapScale;
  }

  defineTemplates() {
    const T = this.T;
    const S = (p) => new THREE.MeshStandardMaterial(p);
    const P = (p) => new THREE.MeshPhysicalMaterial(p);
    const tile = (w, h, src, grout, gcol, rj, bj, row, flip) => ({
      uTile: { value: new THREE.Vector4(w, h, src, grout) },
      uTileVar: { value: new THREE.Vector4(rj, bj, row, flip) },
      uGrout: { value: new THREE.Color(gcol) },
    });

    this.def('solid', () => S({ vertexColors: true, roughness: 1, metalness: 1 }), { uber: true, color: true });
    this.def('solidDS', () => S({ vertexColors: true, roughness: 1, metalness: 1, side: THREE.DoubleSide }), { uber: true, color: true });
    this.def('emit', () => new THREE.MeshBasicMaterial({ vertexColors: true }), { unlit: true, color: true });
    this.def('glow', () => new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), { unlit: true, color: true });
    this.def('shadow', () => new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), { unlit: true, color: true, alpha: true });
    this.def('glass', () => S({ color: 0xeef3f3, transparent: true, opacity: 0.14, roughness: 0.04, metalness: 0.0, depthWrite: false, envMapIntensity: 1.2 }));
    this.def('glassDark', () => S({ color: 0x202224, transparent: true, opacity: 0.5, roughness: 0.05, metalness: 0.2, depthWrite: false }));
    this.def('mirror', () => S({ color: 0xd9dbdd, roughness: 0.0, metalness: 1.0, envMapIntensity: 1.0 }));

    this.def('marbleFloor', () => P({ map: T.marbleWhite, roughness: 0.2, clearcoat: 0.3, clearcoatRoughness: 0.08 }), {
      tile: () => tile(1.2, 0.6, 2.4, 0.0015, 0xd5d5d5, 0.15, 0.03, 0, 1),
    });
    this.def('marbleFloorL', () => P({ map: T.marbleWhite, roughness: 0.2, clearcoat: 0.3, clearcoatRoughness: 0.08 }), {
      tile: () => tile(0.6, 1.2, 2.4, 0.0015, 0xd5d5d5, 0.15, 0.03, 0, 1),
    });
    this.def('marbleSlab', () => P({ map: T.marbleWhite, roughness: 0.18, clearcoat: 0.3, clearcoatRoughness: 0.1 }), { mapScale: 2.4 });
    this.def('creamFloor', () => P({ map: T.creamPorcelain, roughness: 0.18, clearcoat: 0.15, clearcoatRoughness: 0.1 }), {
      tile: () => tile(1.2, 0.6, 2.4, 0.001, 0xcfc6b8, 0.12, 0.02, 0.5, 1),
    });
    this.def('recFloor', () => S({ map: T.recPorcelain, roughness: 0.5 }), {
      tile: () => tile(0.8, 0.8, 2.4, 0.002, 0xa9abae, 0.1, 0.02, 0, 1),
    });
    this.def('bathFloor', () => S({ map: T.bathGrey, roughness: 0.6 }), {
      tile: () => tile(0.6, 0.6, 2.4, 0.002, 0xa4a6a8, 0.1, 0.03, 0, 1),
    });
    this.def('wallTile', () => S({ map: T.wallWhite, roughness: 0.1 }), {
      tile: () => tile(0.6, 1.2, 2.4, 0.0015, 0xd8d8d6, 0.1, 0.015, 0, 1),
    });
    this.def('mintTile', () => P({ map: T.marbleMint, roughness: 0.12, clearcoat: 0.2 }), {
      tile: () => tile(0.6, 1.2, 2.4, 0.0015, 0xc9d6d3, 0.08, 0.02, 0, 1),
    });
    this.def('blackMarble', () => P({ map: T.marbleBlack, roughness: 0.15, clearcoat: 0.6, clearcoatRoughness: 0.05 }), { mapScale: 2.4 });
    this.def('plaster', () => S({ map: T.plaster, normalMap: T.plasterN, normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.92, vertexColors: true }), { mapScale: 2.0, color: true });
    this.def('cloudPlaster', () => S({ map: T.cloudPlaster, roughness: 0.85, vertexColors: true }), { mapScale: 2.4, color: true });
    this.def('leafPaper', () => S({ map: T.leafPaper, roughness: 0.85 }), { mapScale: 1.6 });
    this.def('wavy', () => S({ color: 0xececea, normalMap: T.wavyN, normalScale: new THREE.Vector2(3.2, 3.2), roughness: 0.5 }), { mapScale: 2.4 });
    this.def('walnut', () => S({ map: T.walnut, normalMap: T.walnutN, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.45, vertexColors: true }), { mapScale: 1.0, color: true });
    this.def('oak', () => S({ map: T.oak, normalMap: T.oakN, normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.5, vertexColors: true }), { mapScale: 1.0, color: true });
    this.def('fabric', () => S({ map: T.weave, normalMap: T.weaveN, normalScale: new THREE.Vector2(0.7, 0.7), roughness: 0.92, vertexColors: true }), { mapScale: 0.3, color: true });
    this.def('drape', () => S({ map: T.weave, normalMap: T.weaveN, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.95, vertexColors: true, side: THREE.DoubleSide }), { mapScale: 0.3, color: true });
    this.def('boucle', () => S({ map: T.boucle, normalMap: T.boucleN, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.95, vertexColors: true }), { mapScale: 0.15, color: true });
    this.def('velvet', () => P({ roughness: 0.75, sheen: 1.0, sheenRoughness: 0.35, sheenColor: new THREE.Color(0x9aa7c4), vertexColors: true }), { color: true });
    this.def('leather', () => S({ map: T.leather, normalMap: T.leatherN, normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.45, vertexColors: true }), { mapScale: 0.2, color: true });
    this.def('knit', () => S({ map: T.knit, normalMap: T.knitN, normalScale: new THREE.Vector2(0.8, 0.8), roughness: 1.0, vertexColors: true }), { mapScale: 0.3, color: true });
    this.def('shag', () => S({ map: T.shag, normalMap: T.shagN, normalScale: new THREE.Vector2(1, 1), roughness: 1.0, vertexColors: true }), { mapScale: 0.5, color: true });
    this.def('lowpile', () => S({ map: T.lowpile, normalMap: T.lowpileN, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 1.0, vertexColors: true }), { mapScale: 0.5, color: true });
    this.def('rugDiag', () => S({ map: T.rugDiag, normalMap: T.lowpileN, roughness: 1.0 }), { mapScale: 1.0 });
    this.def('rugTone', () => S({ map: T.rugTone, normalMap: T.lowpileN, roughness: 1.0 }), { mapScale: 1.0 });
    this.def('rugSquiggle', () => S({ map: T.squiggle, normalMap: T.lowpileN, roughness: 1.0 }), { mapScale: 1.0 });
    this.def('sheer', () => S({ color: 0xeeeeec, emissive: 0xffffff, emissiveIntensity: 0.22, transparent: true, opacity: 0.42, roughness: 0.9, side: THREE.DoubleSide, depthWrite: false }));
    this.def('exterior', () => new THREE.MeshBasicMaterial({ map: T.exterior, color: new THREE.Color(2.3, 2.3, 2.3) }), { unlit: true });
    this.def('foliage', () => S({ map: T.foliage, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.7, vertexColors: true }), { color: true });
    this.def('rattan', () => S({ map: T.rattan, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.8 }), { mapScale: 0.2 });
    this.def('brassScript', () => S({ color: 0xc9a35c, metalness: 1, roughness: 0.25, alphaMap: T.signature, alphaTest: 0.5, transparent: false }));
    this.def('chalk', () => S({ map: T.chalkboard, roughness: 0.95 }));
    // pattern fabrics and art: map only, no metric scale
    for (const k of ['gingham', 'tartan', 'floral', 'geoRunner']) {
      this.def('pat:' + k, () => S({ map: T[k], normalMap: T.weaveN, normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.92 }), { mapScale: k === 'geoRunner' ? 0.5 : 0.6 });
    }
    for (const k of Object.keys(T.art)) {
      this.def('art:' + k, () => S({ map: T.art[k], roughness: 0.8 }));
    }
    for (const k of Object.keys(T.screens)) {
      this.def('screen:' + k, () => new THREE.MeshBasicMaterial({ map: T.screens[k], color: new THREE.Color(1.15, 1.15, 1.15) }), { unlit: true });
    }
  }

  has(name) { return this.templates.has(name); }
  info(name) {
    const t = this.templates.get(name);
    if (!t) throw new Error('unknown material ' + name);
    return t;
  }

  forZone(name, zone) {
    const key = zone.id + '|' + name;
    let m = this.cache.get(key);
    if (m) return m;
    const t = this.info(name);
    m = t.factory();
    m.name = key;
    if (!t.unlit) {
      m.envMap = zone.env || this.env0;
      m.envMapIntensity = m.envMapIntensity === 1 ? 0.85 : m.envMapIntensity;
      m.userData.zoneU = zone.u;
      if (t.tile) m.userData.tileU = t.tile();
      m.defines = m.defines || {};
      m.defines.BOX_PROJ = '';
      if (t.tile) m.defines.TILE = '';
      if (t.uber) m.defines.UBER_RM = '';
      m.onBeforeCompile = (s) => patchShader(s, m);
      m.customProgramCacheKey = () => 'apt1' + (t.tile ? 'T' : '') + (t.uber ? 'U' : '');
    }
    this.cache.set(key, m);
    zone.materials.push(m);
    return m;
  }
}
