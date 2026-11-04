// Compiles a CV from a saved builder selection, without the website:
//
//   node scripts/build-cv.mjs <selection.json> [out.pdf]
//   node scripts/build-cv.mjs <selection.json> --model     # print the render model, compile nothing
//   node scripts/build-cv.mjs <selection.json> --header [out.pdf|.svg|.png]   # the header card alone
//
// The input may instead be a built render model, dist/cv/<preset>.json, compiled as it is.
//
// The model comes from src/lib/selectionmodel.js, the function the builder page
// calls, so the PDF is the builder's — same entries, same settings. The template
// is compiled with the Typst CLI as scripts/build-cv-pdfs.sh does it (the faces
// vendored in public/fonts/, no system fonts). Set TYPST=/path/to/typst to choose one.
//
// Vite loads the modules because src/lib/data.js reads the database with
// import.meta.glob, which plain node cannot do. Only Vite itself is needed: the
// modules loaded import no .astro files.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createServer } from 'vite';

const cwd = process.cwd();
const [file, ...rest] = process.argv.slice(2);
const modelOnly = rest.includes('--model');
const header = rest.includes('--header');
const out = rest.find((a) => !a.startsWith('--'))
  ?? (file && file.replace(/\.json$/, '') + (header ? '-header.pdf' : '.pdf'));
if (!file) {
  console.error('usage: build-cv.mjs <selection.json | model.json> [out.pdf | --model | --header [out.pdf|.svg|.png]]');
  process.exit(2);
}
if (header && modelOnly) {
  console.error('--header compiles and --model prints the model: use one.');
  process.exit(2);
}
// Typst picks the format by the extension; the header may be any of its three.
const ext = path.extname(out).toLowerCase();
if (header && !['.pdf', '.svg', '.png'].includes(ext)) {
  console.error(`${out}: use .pdf, .svg or .png`);
  process.exit(2);
}

const root = path.resolve(import.meta.dirname, '..');
process.chdir(root);

const vite = await createServer({
  root, configFile: false,
  // As astro.config.mjs: the packages read the database through the site's store.
  resolve: { alias: { '@nstarkman/research-store': path.join(root, 'src/lib/data.js') } },
  ssr: { noExternal: [/^@nstarkman\//] },
  optimizeDeps: { noDiscovery: true }, logLevel: 'error', appType: 'custom',
  server: { middlewareMode: true, hmr: false, watch: null },
});
let model;
try {
  const { decode } = await vite.ssrLoadModule('/src/lib/selection.js');
  const { modelFromSelection } = await vite.ssrLoadModule('/src/lib/selectionmodel.js');
  const text = fs.readFileSync(path.resolve(cwd, file), 'utf8');
  let raw = null;
  try { raw = JSON.parse(text); } catch { /* decode says so */ }
  if (raw?.person && raw?.sections) {
    model = raw; // a built render model, as dist/cv/<preset>.json
  } else {
    const sel = decode(text);
    // The header needs no entries, only the person and the card.
    if (!sel.items.size && !header) throw new Error('Nothing selected.');
    model = modelFromSelection(sel);
  }
} catch (err) {
  console.error(err?.message ?? err);
  process.exitCode = 1;
} finally {
  await vite.close();
}
if (process.exitCode) process.exit();

if (modelOnly) {
  // Left to flush on its own: process.exit would cut off a piped stdout this large.
  process.stdout.write(JSON.stringify(model));
} else {
  const typst = process.env.TYPST ?? 'typst';
  const outPath = path.resolve(cwd, out);
  // cv.typ always reads cv/cv.json, as it does for the preset PDFs.
  fs.writeFileSync('cv/cv.json', JSON.stringify(model));
  try {
    const r = spawnSync(typst, ['compile', '--root', '.', '--font-path', 'public/fonts', '--ignore-system-fonts',
      ...(header ? ['--input', 'part=header', ...(ext === '.png' ? ['--ppi', '300'] : [])] : []),
      'cv/cv.typ', outPath], { encoding: 'utf8' });
    if (r.error) throw new Error(`could not run ${typst}: ${r.error.message} (set TYPST=/path/to/typst)`);
    if (r.stderr) process.stderr.write(r.stderr);
    if (r.status !== 0 || /unknown font family/.test(r.stderr)) { process.exitCode = 1; fs.rmSync(outPath, { force: true }); }
    else {
      // Typst writes a link's `&` into the SVG unescaped (the ADS search URL has one), which is
      // not XML, and a browser shows such an SVG in an <img> as a broken image.
      if (ext === '.svg' && fs.existsSync(outPath)) {
        fs.writeFileSync(outPath, fs.readFileSync(outPath, 'utf8').replace(/&(?!(?:amp|lt|gt|apos|quot|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;'));
      }
      console.log(`${out}  ${fs.statSync(outPath).size} bytes`);
    }
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    fs.rmSync('cv/cv.json', { force: true });
  }
}
