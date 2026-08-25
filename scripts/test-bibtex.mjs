// Smoke test for lib/bibtex.js. Reads data/ directly so it runs without Astro.
import fs from 'node:fs';
import { toBibtex, toBibliography } from '../src/lib/bibtex.js';

const items = fs.readdirSync('data').filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(fs.readFileSync(`data/${f}`, 'utf8')));
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

console.log(fails ? `\n${fails} failure(s)` : '\nbibtex checks passed');
process.exit(fails);
