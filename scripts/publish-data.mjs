// Publishes every record at /records/<id>.json, alongside the schema they
// declare.
//
// Not /data/ and not an endpoint, for one reason each. Vite's dev server maps
// URLs onto the project root, so /data/… and /schema/… are shadowed by the
// repo's own directories and a browser navigation to them 404s while the built
// site is fine. And Astro's dev server will not hand an endpoint route to a
// request that prefers HTML, which is what clicking a link is. public/ under a
// name no root directory claims is the one arrangement that behaves the same in
// dev and in the build.
//
// Runs from predev and prebuild so the copy cannot drift from the source, and
// is git-ignored for the same reason.
import fs from 'node:fs';
import path from 'node:path';

const OUT = 'public/records';
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const items = fs.readdirSync('data').filter((f) => f.endsWith('.json'));
for (const f of items) {
  const item = JSON.parse(fs.readFileSync(path.join('data', f), 'utf8'));
  // the source path is relative to data/; here the schema sits alongside
  if (item.$schema) item.$schema = './item.schema.json';
  // named by id, not by the source filename: the id is what links point at,
  // and it does not move when a date is corrected
  fs.writeFileSync(path.join(OUT, `${item.id}.json`), `${JSON.stringify(item, null, 2)}\n`);
}
fs.copyFileSync('schema/item.schema.json', path.join(OUT, 'item.schema.json'));
console.log(`  ${items.length} record(s) + schema -> ${OUT}`);
