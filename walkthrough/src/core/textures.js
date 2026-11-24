// Builds every texture once at load: GPU recipes + 2D canvas drawings.
import * as THREE from 'three';
import { TexGen } from './texgen.js';
import { R, porcelain, wood } from './recipes.js';
import * as A from './canvasart.js';

export async function buildTextures(renderer, onStep, tier = 'high') {
  const g = new TexGen(renderer);
  const T = { gen: g, art: {}, screens: {} };
  const big = tier === 'low' ? 1024 : 2048;
  const mid = tier === 'low' ? 512 : 1024;
  const sml = 512;
  // strength for normals: s = size / (2 * domain metres)
  const ns = (size, dom) => size / (2 * dom);

  const steps = [
    () => { T.marbleWhite = g.make(R.marbleWhite, 'albedo', big, { seed: 11, name: 'marbleWhite' }); },
    () => { T.marbleBlack = g.make(R.marbleBlack, 'albedo', mid, { seed: 12, name: 'marbleBlack' }); },
    () => { T.marbleMint = g.make(R.marbleMint, 'albedo', mid, { seed: 13, name: 'marbleMint' }); },
    () => {
      T.creamPorcelain = g.make(porcelain('#E9E1D4', 0.022, 0.012), 'albedo', mid, { seed: 14, name: 'cream' });
      T.recPorcelain = g.make(porcelain('#E4E5E7', 0.018, 0.012), 'albedo', mid, { seed: 15, name: 'recPorc' });
      T.bathGrey = g.make(porcelain('#C9CBCD', 0.03, 0.05), 'albedo', sml, { seed: 16, name: 'bathGrey' });
      T.wallWhite = g.make(porcelain('#F2F2F0', 0.012, 0.01), 'albedo', sml, { seed: 17, name: 'wallWhite' });
    },
    () => {
      T.plaster = g.make(R.plaster, 'albedo', sml, { seed: 18, name: 'plaster' });
      T.plasterN = g.make(R.plaster, 'normal', sml, { seed: 18, name: 'plasterN', strength: ns(sml, 2.0) });
      T.cloudPlaster = g.make(R.cloudPlaster, 'albedo', mid, { seed: 19, name: 'cloudPlaster' });
      T.wavyN = g.make(R.wavy, 'normal', mid, { seed: 20, name: 'wavyN', strength: ns(mid, 2.4) });
    },
    () => {
      const wal = wood('#3B2A1F', '#5E4636', '#7C5D45', 22, 0.35);
      T.walnut = g.make(wal, 'albedo', mid, { seed: 21, name: 'walnut' });
      T.walnutN = g.make(wal, 'normal', sml, { seed: 21, name: 'walnutN', strength: ns(sml, 1.0) });
      const oak = wood('#8E6A48', '#B38D66', '#C9A37A', 30, 0.45);
      T.oak = g.make(oak, 'albedo', mid, { seed: 22, name: 'oak' });
      T.oakN = g.make(oak, 'normal', sml, { seed: 22, name: 'oakN', strength: ns(sml, 1.0) });
    },
    () => {
      T.weave = g.make(R.weave, 'albedo', sml, { seed: 23, name: 'weave' });
      T.weaveN = g.make(R.weave, 'normal', sml, { seed: 23, name: 'weaveN', strength: ns(sml, 0.3) });
      T.boucle = g.make(R.boucle, 'albedo', sml, { seed: 24, name: 'boucle' });
      T.boucleN = g.make(R.boucle, 'normal', sml, { seed: 24, name: 'boucleN', strength: ns(sml, 0.15) });
      T.leather = g.make(R.leather, 'albedo', sml, { seed: 25, name: 'leather' });
      T.leatherN = g.make(R.leather, 'normal', sml, { seed: 25, name: 'leatherN', strength: ns(sml, 0.2) });
      T.knit = g.make(R.knit, 'albedo', sml, { seed: 26, name: 'knit' });
      T.knitN = g.make(R.knit, 'normal', sml, { seed: 26, name: 'knitN', strength: ns(sml, 0.3) });
    },
    () => {
      T.shag = g.make(R.shag, 'albedo', sml, { seed: 27, name: 'shag' });
      T.shagN = g.make(R.shag, 'normal', sml, { seed: 27, name: 'shagN', strength: ns(sml, 0.5) });
      T.lowpile = g.make(R.lowpile, 'albedo', sml, { seed: 28, name: 'lowpile' });
      T.lowpileN = g.make(R.lowpile, 'normal', sml, { seed: 28, name: 'lowpileN', strength: ns(sml, 0.5) });
      T.rugDiag = g.make(R.rugDiag, 'albedo', mid, { seed: 29, name: 'rugDiag' });
      T.rugTone = g.make(R.rugTone, 'albedo', mid, { seed: 30, name: 'rugTone' });
    },
    () => {
      T.exterior = g.canvas(2048, 1024, A.drawExterior, { name: 'exterior', clamp: true });
      T.exterior.wrapS = THREE.RepeatWrapping;
      T.leafPaper = g.canvas(1024, 1024, A.drawLeafWallpaper, { name: 'leafPaper' });
      T.squiggle = g.canvas(1024, 1024, A.drawSquiggle, { name: 'squiggle' });
      T.gingham = g.canvas(512, 512, A.drawGingham, { name: 'gingham' });
      T.tartan = g.canvas(512, 512, A.drawTartan, { name: 'tartan' });
      T.floral = g.canvas(512, 512, A.drawFloral, { name: 'floral' });
      T.geoRunner = g.canvas(512, 512, A.drawGeoRunner, { name: 'geoRunner' });
      T.foliage = g.canvas(512, 512, A.drawFoliage, { name: 'foliage' });
      T.rattan = g.canvas(256, 256, A.drawRattan, { name: 'rattan' });
      T.chalkboard = g.canvas(1024, 683, A.drawChalkboard, { name: 'chalk', clamp: true });
    },
    () => {
      const art = (k, w, h, fn) => { T.art[k] = g.canvas(w, h, fn, { name: 'art_' + k, clamp: true }); };
      art('arcsHall', 512, 768, (c, w, h) => A.drawArtArcs(c, w, h, 'arcs1'));
      art('arcsLobby', 512, 796, (c, w, h) => A.drawArtArcs(c, w, h, 'arcs2'));
      art('copper1', 256, 1024, (c, w, h) => A.drawArtCopper(c, w, h, 'cu1'));
      art('copper2', 256, 1024, (c, w, h) => A.drawArtCopper(c, w, h, 'cu2'));
      art('strokes', 640, 816, (c, w, h) => A.drawArtStrokes(c, w, h, 'st1'));
      art('night0', 512, 716, (c, w, h) => A.drawArtNight(c, w, h, 0));
      art('night1', 512, 716, (c, w, h) => A.drawArtNight(c, w, h, 1));
      art('night2', 512, 716, (c, w, h) => A.drawArtNight(c, w, h, 2));
      art('navyGold', 384, 1024, A.drawArtNavyGold);
      art('contour', 512, 768, A.drawArtContour);
      art('photos', 512, 384, A.drawPhotos);
      T.screens.violet = g.canvas(256, 160, (c, w, h) => A.drawMonitor(c, w, h, '#3b1d6e', '#7a3fc4', '#c79bf0'), { name: 'scrViolet', clamp: true });
      T.screens.ice = g.canvas(256, 160, (c, w, h) => A.drawMonitor(c, w, h, '#a9cdee', '#dcecf8', '#ffffff'), { name: 'scrIce', clamp: true });
    },
    () => {
      T.signature = g.canvas(2048, 384, (c, w, h) => A.drawSignature(c, w, h), { name: 'signature', linear: true, clamp: true });
    },
  ];
  for (let i = 0; i < steps.length; i++) {
    steps[i]();
    onStep && (await onStep((i + 1) / steps.length));
  }
  return T;
}
