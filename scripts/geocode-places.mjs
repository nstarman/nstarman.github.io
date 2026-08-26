// Resolves every place the site pins to a lat/lon, once: each institution in
// config/collaborators.json, and each `location` on a presentation in data/.
//
// Both live in one file because they are the same kind of fact — somewhere on
// Earth the site draws a dot for — and one committed answer per place means the
// two maps cannot disagree about where Cambridge is.
//
// Issue #22: geocoding at build time would make CI depend on a third-party
// API, which this repo avoids everywhere else. So this is run by hand and the
// answers are committed. It only looks up institutions that are missing, so
// re-running it is cheap and never overwrites a coordinate you corrected.
//
//   node scripts/geocode-places.mjs
//   node scripts/geocode-places.mjs --check   # exit 1 if anything is unplaced
//
// Nominatim asks for one request a second and a real User-Agent; both are
// honoured below.

import fs from 'node:fs';
import path from 'node:path';

const OUT = 'config/places.json';
const collaborators = JSON.parse(fs.readFileSync('config/collaborators.json', 'utf8'));

// A talk with no venue is not a place, and must never become a pin — see #22.
const ONLINE = 'Online';

// `City, ST, Country` for the US and Canada, `City, Country` elsewhere: the
// format settled in #67. Anything else is a leftover — `TO, CA` reads as
// California to a geocoder, and `MIT, USA` is an institution, not a place — so
// it is skipped rather than resolved into a confident wrong pin.
const SETTLED = /^[^,]+, (?:[A-Z]{2}, (?:USA|Canada)|[^,]+)$/;
const isPlaceable = (s) => s !== ONLINE && SETTLED.test(s) && !/^[^,]+, (?:USA|CA)$/.test(s);

const existing = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { $comment: '', places: {} };
const places = existing.places ?? {};

const wanted = new Map();
for (const p of collaborators.people) {
  for (const a of p.affiliations) {
    if (!a.organization) continue;
    wanted.set(a.organization, [a.organization, a.city, a.country].filter(Boolean).join(', '));
  }
}

// Presentation locations are already written as a place, so each one is its own
// query as well as its own key.
const skipped = new Set();
for (const f of fs.readdirSync('data').filter((n) => n.endsWith('.json'))) {
  const item = JSON.parse(fs.readFileSync(path.join('data', f), 'utf8'));
  if (item.type !== 'presentation' || !item.location) continue;
  if (isPlaceable(item.location)) wanted.set(item.location, item.location);
  else if (item.location !== ONLINE) skipped.add(item.location);
}
for (const s of [...skipped].sort()) {
  console.log(`  not a settled place, left unplaced: ${JSON.stringify(s)}`);
}

const missing = [...wanted.keys()].filter((k) => !places[k]);

if (process.argv.includes('--check')) {
  if (missing.length === 0) {
    console.log(`  ok       all ${wanted.size} place(s) placed`);
    process.exit(0);
  }
  console.log(`  ${missing.length} place(s) have no coordinates:`);
  for (const m of missing) console.log(`    ${m}`);
  console.log('  run: node scripts/geocode-places.mjs');
  process.exit(1);
}

for (const org of missing) {
  const q = encodeURIComponent(wanted.get(org));
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'nstarkman.space place resolver (starkman@mit.edu)' } });
    const hits = await res.json();
    if (!hits.length) { console.log(`  no match: ${org}`); continue; }
    places[org] = {
      lat: Number(Number(hits[0].lat).toFixed(4)),
      lon: Number(Number(hits[0].lon).toFixed(4)),
      // Kept so a wrong pin can be recognised as wrong without re-querying.
      matched: hits[0].display_name,
    };
    console.log(`  ${org} -> ${places[org].lat}, ${places[org].lon}`);
  } catch (err) {
    console.log(`  failed: ${org} (${err.message})`);
  }
  await new Promise((r) => setTimeout(r, 1100));
}

fs.writeFileSync(OUT, `${JSON.stringify({
  $comment: 'Coordinates for every place the site pins — collaborator institutions and '
    + 'presentation locations alike — resolved once with scripts/geocode-places.mjs and '
    + 'committed so the site and CI never call a geocoder. `matched` is what the geocoder '
    + 'thought it found — check it before trusting a pin. Safe to correct by hand: the '
    + 'script only fills in what is missing.',
  source: 'https://nominatim.openstreetmap.org (ODbL)',
  places: Object.fromEntries(Object.entries(places).sort(([a], [b]) => a.localeCompare(b))),
}, null, 2)}\n`);
console.log(`  ${Object.keys(places).length} place(s) placed`);
