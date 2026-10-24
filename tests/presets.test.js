// Preset resolution: which items a CV variant contains, and what its headings
// are allowed to claim. This is the logic that replaced the LaTeX CV's
// `% SKIP: (*)` preprocessor, and the page counts depend on it.

import { describe, expect, it } from 'vitest';
import { presetNames, preset, resolve, memberIds, CARD_PARTS, tally, H_INDEX_SOURCES, SCHOLAR_STALE_DAYS } from '../src/lib/presets.js';
import person from '../config/person.json';
import { items } from '../src/lib/data.js';

describe('the presets', () => {
  it('are the four the site offers', () => {
    expect(presetNames).toEqual(['complete', 'np', '2page', '1page']);
  });

  it('show every part of the card, and its links in the usual order, unless they say otherwise', () => {
    for (const name of presetNames) {
      const { card } = resolve(name);
      expect(Object.keys(card)).toEqual([...CARD_PARTS, 'order']);
      expect(CARD_PARTS.every((k) => card[k] === true)).toBe(true);
      // The email and the website share a line, and the profiles take the next.
      expect(card.order.slice(0, 3)).toEqual(['email', 'website', '/']);
    }
  });

  it('print every entry\'s place unless a preset or a section says not to', () => {
    for (const name of presetNames) {
      // A list section prints its entries as written, so has no places to leave out.
      for (const s of resolve(name).sections.filter((x) => !x.key)) expect(s.location).toBe(true);
    }
  });

  it('reject a name that does not exist, rather than rendering nothing', () => {
    expect(() => preset('nope')).toThrow(/Unknown CV preset/);
  });
});

describe('tally', () => {
  const me = { me: true };
  const mentee = { mentee: 'someone' };
  const pubs = [
    { authors: [me], status: 'published' },
    { authors: [mentee, me], status: 'published' },
    { authors: [{}, me], status: 'submitted' },
    { authors: [me] },
  ];

  it('counts first-author and student-led papers, and no h-index unless asked', () => {
    expect(tally(pubs)).toEqual({ total: 4, submitted: 1, first: 2, student: 1, h: null });
  });

  it('adds the h-index from the source asked for, saying which', () => {
    const gs = person.metrics.googleScholar;
    expect(tally(pubs, { hIndex: 'scholar' }).h).toEqual({ value: gs.hIndex, source: 'Google Scholar' });
    expect(tally(pubs, { hIndex: 'scholar-since' }).h).toEqual({ value: gs.hIndexSince, source: `Google Scholar, since ${gs.since}` });
    const ads = tally(pubs, { hIndex: 'ads' }).h;
    expect(ads.source).toBe('ADS');
    expect(Number.isInteger(ads.value) && ads.value >= 0).toBe(true);
    expect(tally(pubs, { hIndex: 'nope' }).h).toBeNull();
    expect(H_INDEX_SOURCES).toEqual(['ads', 'scholar', 'scholar-since']);
  });

  it('says how long Scholar numbers stand, and keeps a date to judge by', () => {
    expect(SCHOLAR_STALE_DAYS).toBe(183);
    expect(Date.parse(person.metrics.googleScholar.asOf)).not.toBeNaN();
  });

  it('tallies a publication list where asked: by a section, or the builder over it', () => {
    const pubsOf = (opts) => resolve('np', undefined, opts).sections.find((s) => s.id === 'publications');
    expect(pubsOf().tally).toBeNull();
    expect(pubsOf({ tally: { publications: true } }).tally.total).toBe(pubsOf().items.length);
    expect(pubsOf({ tally: { publications: { hIndex: 'ads' } } }).tally.h.source).toBe('ADS');
  });
});

describe('resolve', () => {
  it('takes everything for the complete CV, and a subset for the rest', () => {
    const complete = resolve('complete');
    const np = resolve('np');
    const count = (cv) => cv.sections.reduce((n, s) => n + s.items.length, 0);
    // A synthesis highlight is the research page's, not a fact a CV states.
    expect(count(complete)).toBe(items.filter((i) => i.type !== 'highlight').length);
    expect(count(np)).toBeLessThan(count(complete));
  });

  it('only includes an item whose cvs list names the preset', () => {
    for (const s of resolve('2page').sections) {
      for (const i of s.items) expect(i.cvs ?? []).toContain('2page');
    }
  });

  it('drops a section that resolves to nothing', () => {
    for (const cv of presetNames.map((n) => resolve(n))) {
      for (const s of cv.sections) {
        expect(s.items.length + (s.entries?.length ?? 0)).toBeGreaterThan(0);
      }
    }
  });

  it('honours a section limit, keeping the newest', () => {
    const pubs = resolve('1page').sections.find((s) => s.id === 'publications');
    expect(pubs.items.length).toBeLessThanOrEqual(preset('1page').sections
      .find((s) => s.id === 'publications').limit);
  });

  it('says "Select" only where asked, and only on a selection', () => {
    for (const name of presetNames) {
      expect(resolve(name).sections.some((s) => s.heading.startsWith('Select '))).toBe(false);
      const ids = Object.fromEntries(resolve(name).sections.map((s) => [s.id, 'select']));
      for (const s of resolve(name, undefined, { prefix: ids }).sections) {
        // `dropped` counts everything left out, however it was left out.
        expect(s.heading.startsWith('Select ')).toBe(s.dropped > 0);
      }
    }
  });

  it('counts what it leaves out', () => {
    const sw = resolve('2page').sections.find((s) => s.id === 'software');
    const all = items.filter((i) => i.type === 'software').length;
    expect(sw.items.length + sw.dropped).toBe(all);
  });

  it('orders software by tier, so the flagship package starts', () => {
    const tiers = ['flagship', 'major', 'minor', 'utility'];
    for (const name of ['complete', 'np', '1page']) {
      const sw = resolve(name).sections.find((s) => s.id === 'software').items;
      expect(sw[0].id).toBe('astropy');
      const ranks = sw.map((i) => tiers.indexOf(i.tier));
      expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    }
  });

  it('narrows to an explicit id list, for the builder', () => {
    const only = new Set(['mit-postdoc']);
    const picked = resolve('complete', only).sections.flatMap((s) => s.items);
    expect(picked.map((i) => i.id)).toEqual(['mit-postdoc']);
  });

  it('selects a list section whole, by its list: key', () => {
    const ids = (only) => resolve('complete', only).sections.map((s) => s.id);
    expect(ids(new Set(['mit-postdoc']))).not.toContain('peer-review');
    expect(ids(new Set(['list:peer-review']))).toContain('peer-review');
  });
});

describe('memberIds', () => {
  it('reports what a preset renders, not what merely opted in', () => {
    // Filtering on `cvs` alone would pre-check items a limit then discards, and
    // "start from 2P, compile" would not reproduce the two-page CV.
    for (const name of presetNames) {
      const rendered = resolve(name).sections.flatMap((s) => (s.key ? [s.key] : s.items.map((i) => i.id)));
      expect(memberIds(name)).toEqual(rendered);
    }
  });
});

describe('shared sections', () => {
  const pubs = (name) => preset(name).sections.find((s) => s.id === 'publications');

  it('gives every preset the one shared definition', () => {
    for (const name of presetNames) {
      expect(pubs(name).heading).toBe('Publications');
      expect(pubs(name).match).toEqual({ type: 'publication' });
    }
  });

  it('lets a preset override a key, and null remove one', () => {
    expect(pubs('np').limit).toBeUndefined();
    expect(pubs('1page').limit).toBe(5);
    expect(pubs('np').groupBy).toBe('status');
    expect(pubs('1page').groupBy).toBeNull();
    expect(resolve('1page').sections.find((s) => s.id === 'publications').groupBy).toBeNull();
  });
});

describe('places', () => {
  it('lets the builder leave a section\'s places out, over the preset', () => {
    const at = (opts) => resolve('np', undefined, opts).sections.find((s) => s.id === 'education').location;
    expect(at()).toBe(true);
    expect(at({ location: { education: false } })).toBe(false);
  });
});

describe('section order', () => {
  const ids = (opts) => resolve('complete', undefined, opts).sections.map((s) => s.id);

  it('puts the named sections first, in that order, and keeps the rest where they were', () => {
    const was = ids();
    const [a, b] = [was[3], was[1]];
    expect(ids({ order: [a, b] })).toEqual([a, b, ...was.filter((id) => id !== a && id !== b)]);
  });

  it('ignores an id no section has', () => {
    expect(ids({ order: ['nope'] })).toEqual(ids());
  });
});

describe('a fellowship', () => {
  it('is a position that sits with Grants & Fellowships, not Professional Appointments', () => {
    const where = (id) => resolve('complete').sections.find((s) => s.items.some((i) => i.id === id))?.id;
    for (const id of ['massey-junior-fellow', 'brinson-prize-fellowship', 'pacific-postdoc-program']) {
      expect(where(id)).toBe('grants-major');
    }
    expect(where('mit-postdoc')).toBe('positions');
  });
});
