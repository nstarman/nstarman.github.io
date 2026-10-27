// Preset resolution: which items a CV variant contains, and what its headings
// are allowed to claim. This is the logic that replaced the LaTeX CV's
// `% SKIP: (*)` preprocessor, and the page counts depend on it.

import { describe, expect, it } from 'vitest';
import { presetNames, preset, resolve, memberIds, CARD_PARTS, cardOrder, tally, H_INDEX_SOURCES, SCHOLAR_STALE_DAYS } from '../src/lib/presets.js';
import person from '../config/person.json';
import { items, byType, resolve as itemById } from '../src/lib/data.js';

describe('the presets', () => {
  it('are the four lengths the site offers; the page is a choice apart', () => {
    expect(presetNames).toEqual(['complete', 'np', '2page', '1page']);
  });

  it('show every part of the card, and leave its links\' order to the page, unless they say otherwise', () => {
    for (const name of presetNames.filter((n) => !preset(n).card)) {
      const { card } = resolve(name);
      // No order: the template's usual one follows the page.
      expect(Object.keys(card)).toEqual(CARD_PARTS);
      expect(CARD_PARTS.every((k) => card[k] === true)).toBe(true);
    }
  });

  it('put the email and the website on one line, or on US Letter a line each', () => {
    expect(cardOrder().slice(0, 3)).toEqual(['email', 'website', '/']);
    expect(cardOrder(true).slice(0, 3)).toEqual(['email', '/', 'website']);
  });

  it('print every entry\'s place unless a preset or a section says not to', () => {
    for (const name of presetNames.filter((n) => preset(n).location === undefined)) {
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

describe('funderOff', () => {
  it('is what a preset lists, and empty where it lists none', () => {
    expect(resolve('2page').funderOff).toEqual(['nserc-cgs-d', 'nserc-cgs-m']);
    expect(resolve('1page').funderOff).toEqual(['nserc-cgs-d', 'nserc-cgs-m']);
    expect(resolve('np').funderOff).toEqual([]);
    expect(resolve('complete').funderOff).toEqual([]);
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
  const FELLOWSHIPS = ['brinson-prize-fellowship', 'pacific-postdoc-program', 'massey-junior-fellow', 'nserc-cgs-d', 'nserc-cgs-m', 'nserc-pdf', 'university-of-toronto-graduate-fellowship-per-annum'];

  it('is its own type, with Grants & Fellowships, not Professional Appointments', () => {
    const where = (id) => resolve('complete').sections.find((s) => s.items.some((i) => i.id === id))?.id;
    for (const id of FELLOWSHIPS) {
      expect(itemById(id).type, id).toBe('fellowship');
      expect(where(id), id).toBe('grants-major');
    }
    expect(where('mit-postdoc')).toBe('positions');
  });

  it('leaves no position carrying a tier: a post is not awarded', () => {
    expect(byType('position').filter((i) => i.tier).map((i) => i.id)).toEqual([]);
  });
});

// A section group prints its members under one heading. Presets never group; the builder switches
// one on (`groups`), and its members gather where the first of them stands, in the group's order.
describe('a section group', () => {
  const MEMBERS = ['conferences-organized', 'conferences-attended', 'talks-professional', 'peer-review', 'service'];
  const ids = (name, opts) => resolve(name, undefined, opts).sections.map((s) => s.id);

  it('is on by default only where a preset says so: np, 2page and 1page, not complete', () => {
    expect(resolve('complete').sections.filter((s) => s.group)).toEqual([]);
    for (const name of ['np', '2page', '1page']) {
      expect(preset(name).groups).toEqual(['professional']);
      // Grouped wherever two or more members hold something; one alone stays a plain section.
      const members = resolve(name).sections.filter((s) => MEMBERS.includes(s.id));
      expect(members.every((s) => (members.length > 1 ? s.group?.id === 'professional' : !s.group)), name).toBe(true);
    }
    expect(resolve('np').sections.filter((s) => s.group).length).toBeGreaterThan(1);
    // The builder's choice wins, either way.
    expect(resolve('np', undefined, { groups: [] }).sections.some((s) => s.group)).toBe(false);
  });

  it('gathers its members, in its order, where the first of them stands', () => {
    const on = resolve('complete', undefined, { groups: ['professional'] }).sections;
    const shown = MEMBERS.filter((id) => on.some((s) => s.id === id));
    const at = on.findIndex((s) => s.group);
    expect(on.slice(at, at + shown.length).map((s) => s.id)).toEqual(shown);
    expect(on.slice(at, at + shown.length).every((s) => s.group.id === 'professional' && s.group.heading === 'Professional Activities')).toBe(true);
    // Where the first member stood with grouping off.
    expect(at).toBe(ids('complete').findIndex((id) => MEMBERS.includes(id)));
  });

  it('is just its one member when only one is left: no umbrella over a single sub-heading', () => {
    const one = resolve('complete', new Set(['list:peer-review']), { groups: ['professional'] }).sections;
    expect(one.map((s) => s.id)).toEqual(['peer-review']);
    expect(one[0].group).toBeUndefined();
  });

  it('groups only the members a preset lists and holds', () => {
    const on = resolve('np', undefined, { groups: ['professional'] }).sections.filter((s) => s.group).map((s) => s.id);
    expect(on).toEqual(ids('np', { groups: [] }).filter((id) => MEMBERS.includes(id)));
    // 2page lists peer review and service but holds no service, so one member is left: no group.
    expect(resolve('2page', undefined, { groups: ['professional'] }).sections.some((s) => s.group)).toBe(false);
  });

  it('moves as one when the builder orders it, and its members only among themselves', () => {
    const first = ids('complete', { groups: ['professional'], order: ['professional'] });
    expect(first.slice(0, 1)).toEqual([MEMBERS.find((id) => first.includes(id))]);
    const inside = ids('complete', { groups: ['professional'], order: ['service'] });
    const g = resolve('complete', undefined, { groups: ['professional'], order: ['service'] }).sections.filter((s) => s.group).map((s) => s.id);
    expect(g[0]).toBe('service');
    // A member named in `order` pulls its whole group, not just itself, to the front.
    expect(inside.slice(0, g.length)).toEqual(g);
  });

  it('ignores a group id it does not know', () => {
    expect(ids('complete', { groups: ['nope'] })).toEqual(ids('complete', { groups: [] }));
  });
});

describe('a professional talk', () => {
  const where = (id) => resolve('complete').sections.filter((s) => s.items.some((i) => i.id === id)).map((s) => s.id);
  it('lists under Professional & Software Talks, and nowhere else', () => {
    for (const id of ['from-jax-to-galax', 'astropy-core-developer-conference-talk', 'astropy-conference-talk']) expect(where(id)).toEqual(['talks-professional']);
  });
  it('is never among the science talks or the conferences attended', () => {
    const science = resolve('complete').sections.filter((s) => ['talks-invited', 'talks-contributed', 'conferences-attended'].includes(s.id));
    expect(science.flatMap((s) => s.items).filter((i) => i.professional).map((i) => i.id)).toEqual([]);
  });
});
