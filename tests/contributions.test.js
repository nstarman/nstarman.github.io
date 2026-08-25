// The contributions list is generated, not written, so what is worth testing is
// that the generator's contract holds: the file the site renders is sorted,
// unique, and does not contain anything the exclude list says to drop.

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const doc = JSON.parse(fs.readFileSync('config/contributions.json', 'utf8'));
const excluded = new Set(JSON.parse(fs.readFileSync('config/contributions-exclude.json', 'utf8')).exclude);

describe('the contributions list', () => {
  it('has repositories', () => {
    expect(doc.repos.length).toBeGreaterThan(0);
  });

  it('gives every entry a repo, a url and a first-contribution date', () => {
    for (const r of doc.repos) {
      expect(r.repo, JSON.stringify(r)).toMatch(/^[^/]+\/[^/]+$/);
      expect(r.url).toBe(`https://github.com/${r.repo}`);
      expect(r.first).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.prs).toBeGreaterThan(0);
    }
  });

  it('lists each repository once', () => {
    const ids = doc.repos.map((r) => r.repo);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('is sorted oldest first, so a rerun produces the same file', () => {
    const keys = doc.repos.map((r) => `${r.first} ${r.repo}`);
    expect(keys).toEqual([...keys].sort());
  });

  it('contains nothing the exclude list drops', () => {
    const leaked = doc.repos.map((r) => r.repo).filter((r) => excluded.has(r));
    expect(leaked).toEqual([]);
  });

  it('does not repeat a package that already has a Software card', () => {
    // Those are rendered as cards in the tiers above; listing them again as
    // "also contributed to" would say the same thing twice.
    const carded = new Set();
    for (const f of fs.readdirSync('data')) {
      if (!f.endsWith('.json')) continue;
      const rec = JSON.parse(fs.readFileSync(`data/${f}`, 'utf8'));
      if (rec.type !== 'software') continue;
      for (const l of rec.links ?? []) {
        const m = /^https:\/\/github\.com\/([^/]+\/[^/#?]+)/.exec(l.url ?? '');
        if (m) carded.add(m[1].replace(/\/$/, ''));
      }
    }
    expect(doc.repos.map((r) => r.repo).filter((r) => carded.has(r))).toEqual([]);
  });

  it('lists no repository of his own', () => {
    // His own repositories are the Software tiers' business: one that earns a
    // card is shown as a card, and one that has not earned a card is not an
    // "other open-source contribution" either.
    expect(doc.repos.map((r) => r.repo).filter((r) => r.startsWith('nstarman/'))).toEqual([]);
  });
});
