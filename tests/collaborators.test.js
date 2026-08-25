import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { affiliationAt } from '../src/lib/data.js';

const doc = JSON.parse(fs.readFileSync('config/collaborators.json', 'utf8'));

describe('the collaborator database', () => {
  it('has one entry per ORCID', () => {
    const ids = doc.people.map((p) => p.orcid);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it('only lists people who actually appear as authors', () => {
    // The database is derived from data/; an entry with no paper behind it
    // means someone was removed and the database was not rebuilt.
    const authored = new Set();
    for (const f of fs.readdirSync('data')) {
      if (!f.endsWith('.json')) continue;
      const rec = JSON.parse(fs.readFileSync(`data/${f}`, 'utf8'));
      for (const a of rec.authors ?? []) if (a.orcid && !a.me) authored.add(a.orcid);
    }
    expect(doc.people.filter((p) => !authored.has(p.orcid)).map((p) => p.name)).toEqual([]);
  });

  it('never lists him as his own collaborator', () => {
    expect(doc.people.some((p) => p.orcid === '0000-0003-3954-3291')).toBe(false);
  });

  it('has no affiliation that ends before it starts', () => {
    const bad = doc.people.flatMap((p) => p.affiliations
      .filter((a) => a.start && a.end && a.end < a.start)
      .map((a) => `${p.name}: ${a.start}..${a.end}`));
    expect(bad).toEqual([]);
  });

  it('gives each institution exactly one place', () => {
    // ORCID's address fields are free text: the same employer arrived as
    // "New York" and "NY", and Toronto as both "Toronto" and "ON". On a map
    // that is several pins where there should be one.
    const places = new Map();
    for (const p of doc.people) {
      for (const a of p.affiliations) {
        if (!a.organization) continue;
        const here = `${a.city}|${a.region}|${a.country}`;
        const seen = places.get(a.organization);
        if (seen && seen !== here) {
          throw new Error(`${a.organization} appears as both ${seen} and ${here}`);
        }
        places.set(a.organization, here);
      }
    }
    expect(places.size).toBeGreaterThan(0);
  });

  it('spells each institution one way', () => {
    // Case, trailing spaces and punctuation all produced duplicates:
    // "Rutgers University " and "University College, London".
    const byKey = new Map();
    for (const p of doc.people) {
      for (const a of p.affiliations) {
        if (!a.organization) continue;
        const k = a.organization.toLowerCase().replace(/[^a-z0-9]/g, '');
        const seen = byKey.get(k);
        if (seen && seen !== a.organization) {
          throw new Error(`spelled both "${seen}" and "${a.organization}"`);
        }
        byKey.set(k, a.organization);
      }
    }
  });

  it('keeps distinct posts at one employer distinct', () => {
    // Normalising the place must not collapse a career into one row: two
    // Simons Foundation posts share an address and differ in role and dates.
    const apw = doc.people.find((p) => p.orcid === '0000-0003-0872-7098');
    const simons = apw.affiliations.filter((a) => a.organization === 'Simons Foundation');
    expect(simons.length).toBe(2);
    expect(new Set(simons.map((a) => a.role)).size).toBe(2);
  });

  it('sorts each history newest first', () => {
    for (const p of doc.people) {
      const starts = p.affiliations.map((a) => a.start ?? '');
      expect([...starts].sort().reverse()).toEqual(starts);
    }
  });
});

describe('affiliationAt', () => {
  // A real history, so the test breaks if the shape of the database changes.
  const apw = '0000-0003-0872-7098';

  it('finds the post held on a given date', () => {
    expect(affiliationAt(apw, '2018-01').organization).toBe('Princeton University');
  });

  it('follows a move', () => {
    expect(affiliationAt(apw, '2017-01').organization).toBe('Princeton University');
    expect(affiliationAt(apw, '2022-01').organization).toBe('Simons Foundation');
  });

  it('treats a post with no end date as current', () => {
    expect(affiliationAt(apw, '2026-01')).not.toBeNull();
  });

  it('returns null before the record starts rather than guessing', () => {
    expect(affiliationAt(apw, '2000-01')).toBeNull();
  });

  it('returns null for an unknown ORCID, and for no ORCID at all', () => {
    expect(affiliationAt('0000-0000-0000-0000', '2020-01')).toBeNull();
    expect(affiliationAt(null, '2020-01')).toBeNull();
    expect(affiliationAt(apw, null)).toBeNull();
  });

  it('ignores undated posts, which cannot be said to cover any date', () => {
    // Ana Bonaca's single entry has no start date.
    expect(affiliationAt('0000-0002-7846-9787', '2020-01')).toBeNull();
  });
});
