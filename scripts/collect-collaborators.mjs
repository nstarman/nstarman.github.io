// The collaborator database: where each co-author worked, and when.
//
// Built from public ORCID records — the employments section, which carries an
// organisation, a city, a country and a dated range. That is enough to answer
// "where was this person when we wrote that paper" for any paper, without
// storing the answer once per paper and watching the copies drift.
//
// Only people already named in data/*.json are looked up, and only their ORCID
// is sent — no key, no token, nothing about them goes the other way.
//
//   node scripts/collect-collaborators.mjs           # rewrite the database
//   node scripts/collect-collaborators.mjs --check   # exit 1 if it would change
//
// ORCID is self-reported and often incomplete: a person may list nothing at
// all. That is recorded as an empty history rather than guessed at, and the
// summary says how many are in that position.

import fs from 'node:fs';

const OUT = 'config/collaborators.json';
const API = 'https://pub.orcid.org/v3.0';

/** Every ORCID that appears as an author in the database, with a display name. */
function collaborators() {
  const found = new Map();
  for (const f of fs.readdirSync('data')) {
    if (!f.endsWith('.json')) continue;
    const rec = JSON.parse(fs.readFileSync(`data/${f}`, 'utf8'));
    for (const a of rec.authors ?? []) {
      // His own record is the site's, not a collaborator's.
      if (a.me || !a.orcid) continue;
      const name = [a.given, a.family].filter(Boolean).join(' ');
      // Longest spelling wins: bylines abbreviate ("F. Lelli") and the fuller
      // form is the more useful label.
      if (!found.has(a.orcid) || name.length > found.get(a.orcid).length) {
        found.set(a.orcid, name);
      }
    }
  }
  return found;
}

async function orcid(path) {
  const res = await fetch(`${API}${path}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'nstarkman.space collaborator sync' },
  });
  if (!res.ok) throw new Error(`${res.status} on ${path}`);
  return res.json();
}

// ── normalising what ORCID gives back ──────────────────────────────────────
// The address fields are free text a person typed years ago, so the same place
// arrives spelled several ways: "New York" and "NY", "Toronto" and "ON",
// "University College London" and "University College, London", and one
// institution with a trailing space. For a map that is three pins where there
// should be one, so the same institution is made to agree with itself.

const clean = (s) => (typeof s === 'string' ? s.trim() : null) || null;

/** Case, punctuation and spacing removed — two spellings of one name collide. */
const orgKey = (name) => (name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * One spelling per institution, chosen from the spellings actually present.
 *
 * Exact key match handles case, trailing spaces and punctuation. Containment
 * handles "Columbia University" against "Columbia University in the City of
 * New York", but only when the country agrees — two unrelated institutions can
 * share a prefix, and merging those would put a person in the wrong place.
 * The shorter spelling wins: it is the one a map can label.
 */
function canonicalOrganizations(rows) {
  const byKey = new Map();
  for (const r of rows) {
    if (!r.organization) continue;
    const k = orgKey(r.organization);
    const seen = byKey.get(k);
    if (!seen || r.organization.length < seen.name.length) {
      byKey.set(k, { name: r.organization, country: r.country });
    }
  }
  const keys = [...byKey.keys()].sort((a, b) => a.length - b.length);
  const canon = new Map();
  for (const k of keys) {
    const hit = keys.find((other) => other !== k && other.length < k.length && k.startsWith(other)
      && byKey.get(other).country === byKey.get(k).country);
    canon.set(k, byKey.get(hit ?? k).name);
  }
  return canon;
}

/**
 * One place per institution. A city field holding a state code — "NY" with
 * region "NY", "ON" with region "ON" — is not a city, so a spelling that
 * differs from its own region is preferred, and the longest such wins:
 * "New York" over "NY", "Toronto" over "ON".
 */
function canonicalPlaces(rows, canon) {
  const best = new Map();
  for (const r of rows) {
    if (!r.organization) continue;
    const k = canon.get(orgKey(r.organization));
    const isCity = r.city && r.city !== r.region;
    const cur = best.get(k);
    const score = (isCity ? 1000 : 0) + (r.city?.length ?? 0) + (r.region ? 1 : 0);
    if (!cur || score > cur.score) best.set(k, { score, city: r.city, region: r.region });
  }
  return best;
}

/** An ORCID fuzzy date -> "YYYY-MM", "YYYY", or null. */
const when = (d) => {
  if (!d?.year?.value) return null;
  const y = d.year.value;
  const m = d.month?.value;
  return m ? `${y}-${String(m).padStart(2, '0')}` : `${y}`;
};

async function history(id) {
  const groups = (await orcid(`/${id}/employments`))['affiliation-group'] ?? [];
  const out = [];
  for (const g of groups) {
    for (const s of g.summaries ?? []) {
      const e = s['employment-summary'];
      if (!e) continue;
      const org = e.organization ?? {};
      const addr = org.address ?? {};
      out.push({
        organization: clean(org.name),
        city: clean(addr.city),
        region: clean(addr.region),
        country: clean(addr.country),
        role: clean(e['role-title']),
        start: when(e['start-date']),
        // Absent end means the post is current, which is a fact worth keeping
        // distinct from "we do not know".
        end: when(e['end-date']),
      });
    }
  }
  // Newest first, undated last — the same order ORCID shows them in.
  return out.sort((a, b) => (b.start ?? '').localeCompare(a.start ?? ''));
}

const people = [];
const found = collaborators();
for (const [id, name] of [...found].sort((a, b) => a[1].localeCompare(b[1]))) {
  let affiliations = [];
  try {
    affiliations = await history(id);
  } catch (err) {
    console.error(`  ${name}: ${err.message}`);
  }
  people.push({ orcid: id, name, affiliations });
  await new Promise((r) => setTimeout(r, 250));
}

// Make every institution agree with itself, across everyone's history.
const rows = people.flatMap((p) => p.affiliations);
const canonOrg = canonicalOrganizations(rows);
const canonPlace = canonicalPlaces(rows, canonOrg);
let tidied = 0;
for (const r of rows) {
  if (!r.organization) continue;
  const name = canonOrg.get(orgKey(r.organization));
  const place = canonPlace.get(name) ?? {};
  const before = `${r.organization}|${r.city}|${r.region}`;
  r.organization = name;
  r.city = place.city ?? r.city;
  r.region = place.region ?? r.region;
  if (before !== `${r.organization}|${r.city}|${r.region}`) tidied += 1;
}

const doc = {
  $comment:
    'Generated by scripts/collect-collaborators.mjs from public ORCID employment records. '
    + 'Do not edit by hand — run the script. An empty `affiliations` means that person lists '
    + 'no employment on ORCID, not that they have none.',
  source: 'https://orcid.org',
  people,
};

const next = `${JSON.stringify(doc, null, 2)}\n`;
const prev = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';

if (process.argv.includes('--check')) {
  if (next === prev) {
    console.log(`  ok       ${people.length} collaborators, unchanged`);
    process.exit(0);
  }
  console.log('  the collaborator database is out of date — run:');
  console.log('    node scripts/collect-collaborators.mjs');
  process.exit(1);
}

fs.writeFileSync(OUT, next);
const empty = people.filter((p) => p.affiliations.length === 0);
console.log(`  wrote ${OUT}: ${people.length} collaborators, `
  + `${people.length - empty.length} with a dated history`);
console.log(`  ${new Set([...canonOrg.values()]).size} institutions after normalising `
  + `(${tidied} record(s) made to agree with their institution's other entries)`);
if (empty.length) {
  console.log(`  ${empty.length} list no employment on ORCID: ${empty.map((p) => p.name).join(', ')}`);
}
