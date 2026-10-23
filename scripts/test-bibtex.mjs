// Smoke test for lib/bibtex.js. Reads data/ directly so it runs without Astro.
import { toBibtex, toBibliography } from '@nstarkman/data-resolver/bibtex.js';
import fs from 'node:fs';
import { compareToArchive } from '../src/lib/bibcompare.js';
import { isPreprintBibcode } from './lib/ads.mjs';
import { readItems } from './lib/items.mjs';

const items = readItems().map((r) => r.item);
const pubs = items.filter((i) => i.type === 'publication');
const bib = toBibliography(items);

let fails = 0;
const check = (name, ok) => {
  console.log(`  ${ok ? 'ok      ' : 'FAILED  '} ${name}`);
  if (!ok) fails++;
};

check('one entry per publication',
  (bib.match(/^@/gm) ?? []).length === pubs.length);
check('braces balanced',
  (bib.match(/{/g) ?? []).length === (bib.match(/}/g) ?? []).length);
check('ampersands escaped',
  !/[^\\]&/.test(bib));
check('no raw em/en dash',
  !/[–—]/.test(bib));
check('titles brace-protected against case flattening',
  pubs.every((p) => toBibtex(p).includes(`title`) && /title\s+= \{\{/.test(toBibtex(p))));
const withCollab = pubs.filter((p) => p.collaboration);
check('collaboration byline braced as one name, and leads',
  withCollab.length > 0 &&
  withCollab.every((p) => toBibtex(p).includes(`author`) &&
    /author\s+= \{\{[^}]+\} and /.test(toBibtex(p))));
check('preprint is @misc, not @article',
  toBibtex(pubs.find((p) => p.status === 'submitted')).startsWith('@misc{'));
check('unpublished status reaches the reader via note',
  toBibtex(pubs.find((p) => p.status === 'submitted')).includes('note'));
check('LaTeX maths in abstracts survives intact',
  !/textbackslash/.test(bib) && (!/abstract/.test(bib) || /\$M_\\star\$/.test(bib)));
check('bare ampersands in abstracts are escaped',
  !/[^\\]&(?!amp;)/.test(bib));

check('every author is "Family, Given"',
  pubs.every((p) => (p.authors ?? []).every((a) =>
    a.literal || toBibtex(p).includes(`${a.family}, ${a.given}`))));

// Each paper with a bibcode agrees with ADS's own BibTeX, snapshotted by
// scripts/refresh-publications.mjs, in every field both carry but the citekey.
const archive = JSON.parse(fs.readFileSync('config/bibtex-reference.json', 'utf8'));
for (const p of pubs.filter((i) => i.bibcode)) {
  const there = p.bibcode in archive;
  check(`${p.id} is in config/bibtex-reference.json`, there);
  if (!there) continue;
  const diffs = compareToArchive(toBibtex(p), archive[p.bibcode], { preprint: isPreprintBibcode(p.bibcode) });
  check(`${p.id} matches ADS`, diffs.length === 0);
  for (const d of diffs) console.log(`    ${d.field}: ours "${d.ours}" · ADS "${d.theirs}"`);
}

console.log(fails ? `\n${fails} failure(s)` : '\nbibtex checks passed');
process.exit(fails);
