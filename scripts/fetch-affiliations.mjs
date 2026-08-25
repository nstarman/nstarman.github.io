// Fill in `affiliation` on publication authors, from what the paper printed.
//
// Crossref carries the affiliation each author gave that publisher at the time,
// which is the strongest possible answer to "where were they when we wrote
// this" — stronger than the employment history in config/collaborators.json,
// because it is what the paper itself claimed rather than what the person's
// ORCID says about that period.
//
// Only writes authors that have no affiliation yet, and only when Crossref
// actually names one. A paper whose record carries none is left alone and
// reported, rather than filled in with something approximate.
//
//   node scripts/fetch-affiliations.mjs           # fill what is missing
//   node scripts/fetch-affiliations.mjs --dry-run # say what it would do
//
// Matching is on family name, case-folded and stripped of accents: Crossref
// gives no ORCID for most authors, and initials vary between the two sources.

import fs from 'node:fs';

const dry = process.argv.includes('--dry-run');
const fold = (s) => (s ?? '')
  .normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

let filled = 0;
let noRecord = 0;
const skipped = [];

for (const f of fs.readdirSync('data').sort()) {
  if (!f.endsWith('.json')) continue;
  const path = `data/${f}`;
  const text = fs.readFileSync(path, 'utf8');
  const rec = JSON.parse(text);
  if (rec.type !== 'publication' || !rec.doi) continue;
  const missing = (rec.authors ?? []).filter((a) => !a.me && !a.affiliation);
  if (missing.length === 0) continue;

  let message;
  try {
    const res = await fetch(`https://api.crossref.org/works/${rec.doi}`, {
      headers: { 'User-Agent': 'nstarkman.space affiliation sync (mailto:starkman@mit.edu)' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    ({ message } = await res.json());
  } catch (err) {
    skipped.push(`${rec.id}: ${err.message}`);
    continue;
  }

  const byFamily = new Map();
  for (const a of message.author ?? []) {
    const aff = (a.affiliation ?? []).map((x) => x.name).filter(Boolean);
    if (aff.length) byFamily.set(fold(a.family), aff[0]);
  }
  if (byFamily.size === 0) { noRecord += 1; continue; }

  let next = text;
  for (const a of missing) {
    const aff = byFamily.get(fold(a.family));
    if (!aff) continue;
    // Textual insertion after the author's orcid (or family) line, so the rest
    // of the file keeps its formatting and the diff stays readable.
    const key = a.orcid ? `"orcid": "${a.orcid}"` : `"family": "${a.family}"`;
    const i = next.indexOf(key);
    if (i === -1) continue;
    const indent = next.slice(0, i).split('\n').pop().match(/^\s*/)[0];
    next = `${next.slice(0, i + key.length)},\n${indent}"affiliation": ${JSON.stringify(aff)}${next.slice(i + key.length)}`;
    filled += 1;
  }
  if (next !== text && !dry) fs.writeFileSync(path, next);
  await new Promise((r) => setTimeout(r, 300));
}

console.log(`  ${dry ? 'would fill' : 'filled'} ${filled} author affiliation(s)`);
if (noRecord) console.log(`  ${noRecord} paper(s) have a Crossref record that names no affiliations`);
for (const s of skipped) console.log(`  skipped ${s}`);
