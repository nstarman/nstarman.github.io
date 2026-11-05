import { describe, it, expect } from 'vitest';
import doc from '/config/collaborators.json';
import acknowledgements from '/config/acknowledgements.json';
import { affiliationAt, items } from '../src/lib/data.js';
import { paperAffiliations } from '../scripts/lib/paper-affiliations.mjs';


describe('the collaborator database', () => {
  it('has one entry per ORCID', () => {
    const ids = doc.people.map((p) => p.orcid);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it('only lists people who actually appear as authors', () => {
    // The database is derived from data/ and from the papers that thank him;
    // an entry with no paper behind it means someone was removed and the
    // database was not rebuilt.
    const authored = new Set();
    const acks = acknowledgements.papers;
    for (const rec of items) {
      for (const a of rec.authors ?? []) if (a.orcid) authored.add(a.orcid);
    }
    for (const rec of acks) for (const a of rec.authors) if (a.orcid) authored.add(a.orcid);
    expect(doc.people.filter((p) => !authored.has(p.orcid)).map((p) => p.name)).toEqual([]);
  });

  it('lists the site\'s author once, marked `me`, for the maps to place beside the co-authors', () => {
    expect(doc.people.filter((p) => p.me).map((p) => p.orcid)).toEqual(['0000-0003-3954-3291']);
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
    // Normalising the place must not collapse a career into one row: the Simons
    // Foundation posts share an address and differ in role and dates.
    //
    // Counted rather than fixed at a number. This file is regenerated from
    // ORCID, so a hard-coded two became wrong the day Price-Whelan was promoted
    // — and a test that fails on someone else's promotion is testing the world,
    // not the normaliser. The property is that the rows stay separate.
    const apw = doc.people.find((p) => p.orcid === '0000-0003-0872-7098');
    const simons = apw.affiliations.filter((a) => a.organization === 'Simons Foundation');
    expect(simons.length).toBeGreaterThan(1);
    expect(new Set(simons.map((a) => a.role)).size).toBe(simons.length);
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

describe('paperAffiliations', () => {
  // A collaborator whose ORCID lists nothing is placed from the affiliation printed on the
  // site's items — but only at an institution some ORCID history already names.
  const known = { orcid: 'K', affiliations: [{ organization: 'Case Western Reserve University', city: 'Cleveland', region: 'OH', country: 'US', kind: 'employment' }] };
  const empty = { orcid: 'E', affiliations: [] };
  const item = (start, affiliation, orcid = 'E') => ({ date: { start }, authors: [{ orcid, affiliation }] });
  const run = (items, people = [known, empty], flagged = new Set(['E'])) => paperAffiliations(people, items, flagged);
  const CWRU = 'Physics Department/CERCA/ISO, Case Western Reserve University, Cleveland, Ohio 44106-7079, USA';

  it('places an empty record at the institution one item prints, where ORCID places it, dated by that item', () => {
    expect(run([item('2020-06', CWRU)]).byOrcid.get('E')).toEqual([{
      organization: 'Case Western Reserve University', city: 'Cleveland', region: 'OH', country: 'US',
      role: null, kind: 'paper', start: '2020-06', end: '2020-06',
    }]);
  });

  it('matches whatever the case and punctuation, keeping the known spelling', () => {
    expect(run([item('2020', 'Dept. of Physics; case western reserve university')]).byOrcid.get('E')[0].organization)
      .toBe('Case Western Reserve University');
  });

  it('merges one institution across items, from the earliest to the latest', () => {
    const [e] = run([item('2021-03', CWRU), item('2019', CWRU), item('2020-06', CWRU)]).byOrcid.get('E');
    expect([e.start, e.end]).toEqual(['2019', '2021-03']);
  });

  it('keeps two institutions apart, newest first', () => {
    const other = { orcid: 'O', affiliations: [{ organization: 'University of Toronto', kind: 'education' }] };
    const out = run([item('2018', 'University of Toronto, Toronto, Canada'), item('2020', CWRU)], [known, other, empty]);
    expect(out.byOrcid.get('E').map((e) => e.organization)).toEqual(['Case Western Reserve University', 'University of Toronto']);
  });

  it('gives nothing to a person whose ORCID record is not empty', () => {
    expect(run([item('2020', CWRU, 'K')], [known, empty], new Set(['E'])).byOrcid.has('K')).toBe(false);
  });

  it('leaves a person empty when no item prints an affiliation for them', () => {
    expect(run([item('2020', undefined)]).byOrcid.has('E')).toBe(false);
  });

  it('reports an affiliation that names no known institution, and places nothing for it', () => {
    const out = run([item('2020', 'Department of Physics, Nowhere University, Atlantis')]);
    expect(out.byOrcid.has('E')).toBe(false);
    expect(out.unmatched).toEqual([{ orcid: 'E', affiliation: 'Department of Physics, Nowhere University, Atlantis' }]);
  });

  it('never matches a part against a paper-derived entry, only against ORCID ones', () => {
    const paperOnly = { orcid: 'P', affiliations: [{ organization: 'Nowhere University', kind: 'paper' }] };
    expect(run([item('2020', 'Nowhere University')], [paperOnly, empty]).byOrcid.has('E')).toBe(false);
  });
});

describe('the collaborator database and paper affiliations', () => {
  it('never mixes paper-derived entries with ORCID ones for one person', () => {
    const mixed = doc.people.filter((p) => p.affiliations.some((a) => a.kind === 'paper')
      && p.affiliations.some((a) => a.kind !== 'paper'));
    expect(mixed.map((p) => p.name)).toEqual([]);
  });
});
