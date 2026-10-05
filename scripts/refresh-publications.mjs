// Brings each publication up to date from NASA ADS: a missing abstract, bibcode
// or DOI, a preprint bibcode now superseded by the journal's, and the citation
// count. Where ADS has no abstract, arXiv and then Crossref are asked.
//
// Run by .github/workflows/refresh-publications.yml every six months (1 January
// and 1 July), which opens a pull request when anything moved. Locally:
//
//   ADS_API_TOKEN=… node scripts/refresh-publications.mjs           # rewrites data/
//   ADS_API_TOKEN=… node scripts/refresh-publications.mjs --check   # exits 1 if any would change
//
// Only fields that are missing or changed upstream are written. An existing
// abstract is never replaced, and ids and author lists are never touched.
// The token is read from the environment (a repo secret in CI), never stored.

import fs from 'node:fs';
import { readItems } from './lib/items.mjs';
import {
  adsQuery, changes, usable, arxivAbstract, crossrefAbstract, arxivByTitle,
} from './lib/ads.mjs';

const check = process.argv.includes('--check');
const token = process.env.ADS_API_TOKEN;
if (!token) {
  console.error('ADS_API_TOKEN is not set.');
  process.exit(2);
}

const UA = 'nstarkman.space publication refresh (mailto:starkman@mit.edu)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ads(q) {
  const url = new URL('https://api.adsabs.harvard.edu/v1/search/query');
  url.search = new URLSearchParams({ q, fl: 'bibcode,abstract,citation_count,doi', rows: '1' });
  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`ADS ${q}: HTTP ${res.status}`);
  return (await res.json()).response.docs[0] ?? null;
}

/** Text from a fallback source, or null; a failed request is not fatal. */
async function text(url, parse) {
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA } });
    return res.ok ? parse(await (url.includes('crossref') ? res.json() : res.text())) : null;
  } catch {
    return null;
  }
}

async function fallbackAbstract(item) {
  let a = null;
  if (item.arxiv) {
    a = await text(`https://export.arxiv.org/api/query?id_list=${item.arxiv}`, arxivAbstract);
    await sleep(3000); // arXiv asks for one request every few seconds
  }
  if (!usable(a) && item.doi) a = await text(`https://api.crossref.org/works/${item.doi}`, crossrefAbstract);
  if (!usable(a)) {
    const q = encodeURIComponent(`ti:"${item.title.replace(/[^A-Za-z0-9 ]+/g, ' ')}"`);
    a = await text(`https://export.arxiv.org/api/query?search_query=${q}&max_results=3`, (x) => arxivByTitle(x, item.title));
    await sleep(3000);
  }
  return usable(a) ? a : null;
}

let moved = 0;
for (const { path, item } of readItems()) {
  if (item.type !== 'publication') continue;
  const q = adsQuery(item);
  if (!q) continue;

  let diff;
  try {
    const doc = await ads(q);
    if (!doc) { console.log(`  not on ADS  ${item.id}`); continue; }
    diff = changes(item, doc);
  } catch (e) {
    console.log(`  failed      ${item.id}: ${e.message}`);
    continue;
  }
  if (!item.abstract && !diff.abstract) {
    const a = await fallbackAbstract(item);
    if (a) diff.abstract = a;
  }
  await sleep(200);

  const keys = Object.keys(diff);
  if (!keys.length) continue;
  moved++;
  console.log(`  ${item.id}: ${keys.join(', ')}`);
  if (!check) fs.writeFileSync(path, JSON.stringify({ ...item, ...diff }, null, 2) + '\n');
}
console.log(`\n${moved} publication(s) ${check ? 'would change' : 'updated'}.`);
if (check && moved) process.exit(1);
