// What the schema cannot see. A ref at a missing id matches the id pattern, so
// ajv passes it; an `item:` target lives inside prose, out of the schema's
// reach. Both would render as a link to nothing. Run by `npm run test:schema`
// too, so an item PR that only runs that still gets these.
//
// Filenames are checked by the loader itself: src/lib/data.js throws on any
// file not named <date.start>-<id>.json, so importing it is the check.

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { items } from '../src/lib/data.js';
import { locate } from '../src/lib/places.js';

const ids = new Set(items.map((i) => i.id));

describe('the database', () => {
  it('resolves every ref', () => {
    const dangling = items.flatMap((i) =>
      (i.refs ?? []).filter((r) => !ids.has(r)).map((r) => `${i.id} -> ${r}`));
    expect(dangling).toEqual([]);
  });

  it('resolves every preliminaryOf to a publication', () => {
    const bad = items.filter((i) => i.preliminaryOf
      && items.find((j) => j.id === i.preliminaryOf)?.type !== 'publication');
    expect(bad.map((i) => i.id)).toEqual([]);
  });

  it('resolves every [text](item:id) cross-link', () => {
    const dangling = items.flatMap((i) =>
      [i.details, i.summary, i.research].flat()
        .filter((t) => typeof t === 'string')
        .flatMap((t) => [...t.matchAll(/\[[^\]]+\]\(item:([a-z0-9-]+)\)/g)])
        .filter((m) => !ids.has(m[1]))
        .map((m) => `${i.id} -> item:${m[1]}`));
    expect(dangling).toEqual([]);
  });

  describe('mentees', () => {
    const mentees = items.filter((i) => i.type === 'mentoring' && i.person);
    const byId = new Map(mentees.map((m) => [m.id, m]));
    const authors = items.flatMap((i) => (i.authors ?? []).map((a) => [i.id, a]));
    const presets = Object.keys(JSON.parse(fs.readFileSync('config/presets.json', 'utf8')))
      .filter((k) => !k.startsWith('$'));

    it('resolves every authors[].mentee to a mentoring item with a person', () => {
      const bad = authors.filter(([, a]) => a.mentee && !byId.has(a.mentee));
      expect(bad.map(([id, a]) => `${id} -> ${a.mentee}`)).toEqual([]);
    });

    it("agrees an author's student level with the mentee's own", () => {
      const bad = authors.filter(([, a]) => a.mentee && a.student && byId.get(a.mentee)
        && a.student !== byId.get(a.mentee).person.level);
      expect(bad.map(([id, a]) => `${id}: ${a.mentee} is ${a.student}`)).toEqual([]);
    });

    it('gives every mentee a slug of their own', () => {
      const slugs = mentees.map((m) => m.slug);
      expect(slugs.filter((s, i) => slugs.indexOf(s) !== i)).toEqual([]);
    });

    it('gives every mentee ORCID once', () => {
      const ids = mentees.map((m) => m.person.orcid).filter(Boolean);
      expect(ids.filter((o, i) => ids.indexOf(o) !== i)).toEqual([]);
    });

    it("keeps an achievement's cvs within its mentoring item's own", () => {
      const bad = mentees.flatMap((m) => (m.achievements ?? [])
        .flatMap((a) => (a.cvs ?? []).filter((c) => !(m.cvs ?? []).includes(c)).map((c) => `${m.id}: ${c}`)));
      expect(bad).toEqual([]);
    });

    it('places every journey stop', () => {
      const bad = mentees.flatMap((m) => (m.journey ?? [])
        .filter((j) => !locate(j.organization)).map((j) => `${m.id}: ${j.organization}`));
      expect(bad).toEqual([]);
    });

    it('names only real presets in achievements[].cvs', () => {
      const bad = mentees.flatMap((m) => (m.achievements ?? [])
        .flatMap((a) => (a.cvs ?? []).filter((c) => !presets.includes(c)).map((c) => `${m.id}: ${c}`)));
      expect(bad).toEqual([]);
    });
  });
});
