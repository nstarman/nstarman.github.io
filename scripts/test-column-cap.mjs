// The right-hand column's usual cap (TRAILCAP_DEFAULT in cv/cv.typ) must hold two bounds, at the US Letter size:
//   - the widest place in the records written shortest (no province or state, the country as its
//     code) fits, so a CV that abbreviates its places keeps each on one line;
//   - the widest written in full does not, so the cap still stops a long place taking the width.
// Only the Typst compiler can measure the text, so this runs with the PDF gates in `npm run build:pdf`.
// Set TYPST=/path/to/typst to choose the binary.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createServer } from 'vite';

const root = path.resolve(import.meta.dirname, '..');
process.chdir(root);

const cap = Number(fs.readFileSync('cv/cv.typ', 'utf8').match(/#let TRAILCAP_DEFAULT = ([0-9.]+)in/)?.[1]);
if (!cap) { console.error('column cap: TRAILCAP_DEFAULT not found in cv/cv.typ'); process.exit(1); }

const vite = await createServer({
  root, configFile: false, logLevel: 'error', appType: 'custom',
  server: { middlewareMode: true, hmr: false, watch: null }, optimizeDeps: { noDiscovery: true },
});
const { formatPlace } = await vite.ssrLoadModule('/src/lib/placefmt.js');
await vite.close();

const places = [...new Set(fs.readdirSync('data').filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(fs.readFileSync(`data/${f}`, 'utf8')).location).filter(Boolean))];
const shortest = places.map((l) => formatPlace(l, { region: false, country: 'code' }));

// The body size and face the Letter format uses for the column, 12 pt in the CV's own font.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cap-'));
fs.writeFileSync(path.join(dir, 'places.json'), JSON.stringify([...new Set([...places, ...shortest])]));
fs.writeFileSync(path.join(dir, 'w.typ'), `#set text(size: 12pt, font: "New Computer Modern")
#for s in json("places.json") [#context [#metadata((s, measure(s).width / 1in)) <w>]]
`);
const typst = process.env.TYPST ?? 'typst';
const r = spawnSync(typst, ['query', '--root', dir, '--font-path', path.join(root, 'public/fonts'), '--ignore-system-fonts',
  path.join(dir, 'w.typ'), '<w>', '--field', 'value'], { encoding: 'utf8', maxBuffer: 1 << 24 });
fs.rmSync(dir, { recursive: true, force: true });
if (r.error || r.status !== 0) { console.error(`column cap: could not measure with ${typst}: ${r.error?.message ?? r.stderr}`); process.exit(1); }

const width = new Map(JSON.parse(r.stdout));
const widest = (list) => list.map((s) => [s, width.get(s)]).sort((a, b) => b[1] - a[1])[0];
const [short, shortW] = widest(shortest);
const [full, fullW] = widest(places);
console.log(`  column cap                   ${cap} in; widest shortened "${short}" ${shortW.toFixed(3)} in, widest in full "${full}" ${fullW.toFixed(3)} in`);
if (shortW > cap) { console.error(`  the cap is too narrow: "${short}" (${shortW.toFixed(3)} in) wraps`); process.exit(1); }
if (fullW <= cap) { console.error(`  the cap no longer caps: "${full}" (${fullW.toFixed(3)} in) fits`); process.exit(1); }
