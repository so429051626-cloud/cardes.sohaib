// Build: bundle src/main.js with esbuild and inline it, the CSS and the fonts
// (as data: URIs) into one self-contained HTML file.
//   dist/index.html     full standalone document (works offline, file://)
//   dist/artifact.html  same page without <html>/<head>/<body> wrappers
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const root = path.dirname(new URL(import.meta.url).pathname);
const dev = process.argv.includes('--dev');

const res = await esbuild.build({
  entryPoints: [path.join(root, 'src/main.js')],
  bundle: true,
  format: 'iife',
  minify: !dev,
  sourcemap: false,
  target: ['es2020', 'chrome90', 'safari15'],
  write: false,
  legalComments: 'none',
  logLevel: 'warning',
});
let js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

const b64 = (f) => fs.readFileSync(path.join(root, 'src/assets', f)).toString('base64');
const AR = 'U+0600-06FF, U+0750-077F, U+0870-08FF, U+200C-200E, U+2010-2011, U+FB50-FDFF, U+FE70-FEFC';
const LA = 'U+0000-00FF, U+0131, U+0152-0153, U+2000-206F, U+20AC, U+2122, U+2212';
const face = (fam, file, w, range) => `@font-face{font-family:'${fam}';src:url(data:font/woff2;base64,${b64(file)}) format('woff2');font-weight:${w};font-style:normal;font-display:swap;${range ? `unicode-range:${range};` : ''}}`;
const fonts = [
  face('Sig Script', 'greatvibes-sub.woff2', 400),
  face('Tajawal', 'tajawal-500-ar.woff2', 500, AR),
  face('Tajawal', 'tajawal-500-la.woff2', 500, LA),
  face('Tajawal', 'tajawal-700-ar.woff2', 700, AR),
  face('Tajawal', 'tajawal-700-la.woff2', 700, LA),
].join('\n');

const tpl = fs.readFileSync(path.join(root, 'src/ui/page.html'), 'utf8');
const [, headRaw, bodyRaw] = tpl.split(/<!--HEAD-->|<!--BODY-->/);
const head = headRaw.replace('{{FONTS_CSS}}', () => fonts).trim();
const body = bodyRaw.replace('{{APP_JS}}', () => js).trim();

const full = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
${head}
</head>
<body>
${body}
</body>
</html>
`;
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/index.html'), full);
fs.writeFileSync(path.join(root, 'dist/artifact.html'), head + '\n' + body + '\n');
const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(0) + ' KB';
console.log('dist/index.html', kb(full), '| js', kb(js));
