// Records the Google Scholar h-indices in config/person.json, dated today.
// Scholar has no API and blocks CI runners, so the numbers are read off the
// profile by hand; .github/workflows/refresh-scholar-metrics.yml is the button
// that writes them down and opens the pull request.
//
//   node scripts/set-scholar-metrics.mjs <hIndex> <hIndexSince> <since>

import fs from 'node:fs';

const OUT = 'config/person.json';
const [hIndex, hIndexSince, since] = process.argv.slice(2).map(Number);
if (![hIndex, hIndexSince, since].every(Number.isInteger) || hIndex < 0 || hIndexSince < 0 || since < 1990) {
  console.error('usage: set-scholar-metrics.mjs <hIndex> <hIndexSince> <since year>');
  process.exit(1);
}
const doc = JSON.parse(fs.readFileSync(OUT, 'utf8'));
doc.metrics.googleScholar = { hIndex, hIndexSince, since, asOf: new Date().toISOString().slice(0, 10) };
fs.writeFileSync(OUT, JSON.stringify(doc, null, 2) + '\n');
console.log(`Scholar h-index ${hIndex} (${hIndexSince} since ${since}), as of ${doc.metrics.googleScholar.asOf}`);
