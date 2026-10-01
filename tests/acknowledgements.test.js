// The acknowledgements list is generated from ADS but its tags are curated, so
// what is worth testing is the contract the publications page relies on: every
// paper can be rendered as a card and is reachable through the Topics filter.

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const doc = JSON.parse(fs.readFileSync('config/acknowledgements.json', 'utf8'));

// The topics his own papers use — the Topics filter's vocabulary.
const vocabulary = new Set();
for (const f of fs.readdirSync('data')) {
  if (!f.endsWith('.json')) continue;
  for (const t of JSON.parse(fs.readFileSync(`data/${f}`, 'utf8')).tags ?? []) vocabulary.add(t);
}

describe('the acknowledgements list', () => {
  it('gives every paper what its card shows', () => {
    for (const p of doc.papers) {
      expect(p.bibcode, JSON.stringify(p)).toMatch(/^\d{4}\S{15}$/);
      expect(p.title).toBeTruthy();
      expect(p.date).toMatch(/^\d{4}-\d{2}$/);
      expect(p.authors.length).toBeGreaterThan(0);
    }
  });

  it('files every paper under a topic his own papers use, so the filter finds it', () => {
    const lost = doc.papers.filter((p) => !p.tags.length || p.tags.some((t) => !vocabulary.has(t)));
    expect(lost.map((p) => `${p.bibcode} [${p.tags}]`)).toEqual([]);
  });

  it('lists each paper once', () => {
    const ids = doc.papers.map((p) => p.bibcode);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('contains nothing the exclude list drops', () => {
    const excluded = new Set(doc.exclude);
    expect(doc.papers.filter((p) => excluded.has(p.bibcode)).map((p) => p.bibcode)).toEqual([]);
  });

  it('is newest first, the order the page shows', () => {
    const dates = doc.papers.map((p) => p.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });
});
