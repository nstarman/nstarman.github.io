// The saved-selection file. Its input is a file the user picked, so the cases
// that matter most are the malformed ones: a wrong file chosen by accident has
// to say so, not throw from inside the DOM code that called it.

import { describe, expect, it } from 'vitest';
import { encode, decode, loadReport, SelectionError, FORMAT, VERSION } from '../src/lib/selection.js';

const site = { commit: 'a'.repeat(40), short: 'aaaaaaa', dirty: false };

describe('round trip', () => {
  it('keeps the entries and their kept lines', () => {
    const out = decode(JSON.stringify(encode({ items: ['x', 'y'], lines: { x: [0, 2] }, site })));
    expect([...out.items]).toEqual(['x', 'y']);
    expect([...out.lines.get('x')]).toEqual([0, 2]);
  });

  it('carries the commit, which is the point of the file', () => {
    const out = decode(JSON.stringify(encode({ items: ['x'], lines: {}, site })));
    expect(out.site.commit).toBe(site.commit);
    expect(out.site.dirty).toBe(false);
  });

  it('records a dirty build, so a commit is not trusted to reproduce it', () => {
    const out = decode(JSON.stringify(encode({ items: [], lines: {}, site: { ...site, dirty: true } })));
    expect(out.site.dirty).toBe(true);
  });

  it('deduplicates and sorts, so the file is stable to diff', () => {
    const e = encode({ items: ['b', 'a', 'b'], lines: { a: [3, 1, 1] }, site });
    expect(e.items).toEqual(['b', 'a']);
    expect(e.lines.a).toEqual([1, 3]);
  });

  it('drops entries whose lines are all unticked rather than writing empties', () => {
    expect(encode({ items: ['a'], lines: { a: [] }, site }).lines).toEqual({});
  });
});

describe('rejecting the wrong file', () => {
  const bad = (text, match) => {
    expect(() => decode(text)).toThrow(SelectionError);
    expect(() => decode(text)).toThrow(match);
  };

  it('refuses something that is not JSON', () => bad('not json at all', /not JSON/));
  it('refuses JSON that is not an object', () => bad('[1,2,3]', /not a saved selection/));
  it('refuses null', () => bad('null', /not a saved selection/));
  it('refuses another tool\'s JSON', () => bad('{"hello":"world"}', /not a CV selection file/));

  it('refuses a file from a newer version rather than half-honouring it', () => {
    bad(JSON.stringify({ format: FORMAT, version: VERSION + 1, items: [] }), /newer version/);
  });

  it('refuses a file with no entry list', () => {
    bad(JSON.stringify({ format: FORMAT, version: 1 }), /no entry list/);
  });

  it('refuses an implausibly large list rather than expanding it', () => {
    const items = Array.from({ length: 5001 }, (_, i) => `i${i}`);
    bad(JSON.stringify({ format: FORMAT, version: 1, items }), /implausibly large/);
  });

  it('refuses a malformed detail list', () => {
    bad(JSON.stringify({ format: FORMAT, version: 1, items: [], lines: [] }), /malformed detail list/);
  });
});

describe('tolerating the merely odd', () => {
  const read = (o) => decode(JSON.stringify({ format: FORMAT, version: 1, items: [], ...o }));

  it('accepts a file with no lines at all', () => {
    expect(read({}).lines.size).toBe(0);
  });

  it('skips non-string ids and non-integer line numbers', () => {
    const out = decode(JSON.stringify({
      format: FORMAT, version: 1, items: ['ok', 7, null], lines: { a: [0, 'x', -1, 2.5, 3] },
    }));
    expect([...out.items]).toEqual(['ok']);
    expect([...out.lines.get('a')]).toEqual([0, 3]);
  });

  it('survives a missing or malformed site block', () => {
    expect(read({ site: 'nope' }).site.commit).toBeNull();
    expect(read({}).site.commit).toBeNull();
  });

  it('ignores fields it does not know', () => {
    expect(read({ somethingNew: { a: 1 } }).items.size).toBe(0);
  });

  it('carries the sections with "Select" through a round trip', () => {
    const doc = encode({ items: [], prefix: { publications: 'select', talks: 'none', x: 3 } });
    expect(doc.prefix).toEqual({ publications: 'select' });
    expect(decode(JSON.stringify(doc)).prefix).toEqual({ publications: 'select' });
    expect(read({}).prefix).toEqual({});
  });

  it('carries the section order through a round trip', () => {
    const doc = encode({ items: [], order: ['b', 'a', 'b', 3] });
    expect(doc.order).toEqual(['b', 'a']);
    expect(decode(JSON.stringify(doc)).order).toEqual(['b', 'a']);
    expect(read({}).order).toEqual([]);
  });

  it('carries the style through a round trip', () => {
    const doc = encode({ items: ['a'], lines: {}, style: 'plain' });
    expect(doc.style).toBe('plain');
    expect(decode(JSON.stringify(doc)).style).toBe('plain');
  });

  it('reads no style as null, so a file saved before styles still loads', () => {
    // The builder turns null into the default; decode does not decide that.
    expect(encode({ items: [] }).style).toBeNull();
    expect(read({}).style).toBeNull();
    expect(read({ style: 42 }).style).toBeNull();
  });

  it('returns an unknown style rather than rejecting the file', () => {
    // A file from a build with a style this one lacks is still a good
    // selection; the caller says so and falls back.
    expect(read({ style: 'from-the-future' }).style).toBe('from-the-future');
  });

  it('carries the spacing through a round trip, dropping nonsense', () => {
    const doc = encode({ items: [], spacing: {
      publications: { value: 1.5, unit: 'x' }, 'talks.heading': { value: 12, unit: 'pt' },
      talks: 'x', grants: { value: 99, unit: 'x' }, media: { value: 2, unit: 'em' },
    } });
    expect(decode(JSON.stringify(doc)).spacing).toEqual({
      publications: { value: 1.5, unit: 'x' }, 'talks.heading': { value: 12, unit: 'pt' },
    });
    // Saved before points existed: a bare number is a multiple.
    expect(read({ spacing: { publications: 2 } }).spacing).toEqual({ publications: { value: 2, unit: 'x' } });
    expect(read({}).spacing).toEqual({});
    expect(read({ spacing: [2] }).spacing).toEqual({});
  });

  it('carries each section heading through a round trip, dropping nonsense', () => {
    const heading = { publications: 'none', talks: 'rule', grants: 42, media: 'x'.repeat(65) };
    expect(decode(JSON.stringify(encode({ items: [], heading }))).heading)
      .toEqual({ publications: 'none', talks: 'rule' });
    expect(read({}).heading).toEqual({});
    expect(read({ heading: 'rule' }).heading).toEqual({});
    // Which variants exist is the style's business, not the file reader's.
    expect(read({ heading: { talks: 'banner' } }).heading).toEqual({ talks: 'banner' });
  });

  it('carries where a part sits through a round trip', () => {
    const doc = encode({ items: [], place: { 'publications.legend': 'title', x: 3 } });
    expect(decode(JSON.stringify(doc)).place).toEqual({ 'publications.legend': 'title' });
    expect(read({}).place).toEqual({});
  });

  it('carries the columns of a grid through a round trip, leaving out the usual 3', () => {
    const doc = encode({ items: [], columns: { software: 4, x: 3, y: 9 } });
    expect(decode(JSON.stringify(doc)).columns).toEqual({ software: 4 });
    // One column is the List stop.
    expect(decode(JSON.stringify(encode({ items: [], columns: { software: 1, x: 0 } }))).columns).toEqual({ software: 1 });
    expect(read({}).columns).toEqual({});
  });

  it('carries the card through a round trip, dropping nonsense', () => {
    const card = { portrait: false, qr: true, ads: 'icon', orcid: 'text', zenodo: false,
      bogus: 'maybe', order: ['email', '/', 'website', '/', 'orcid', 7] };
    const back = decode(JSON.stringify(encode({ items: [], card }))).card;
    expect(back).toEqual({ portrait: false, qr: true, ads: 'icon', orcid: 'text', zenodo: false,
      order: ['email', '/', 'website', '/', 'orcid'] });
  });

  it('reads no card as null, so a file saved before the card loads the card as it comes', () => {
    expect(decode(JSON.stringify(encode({ items: [] }))).card).toBeNull();
    expect(decode(JSON.stringify({ format: FORMAT, version: VERSION, items: [], card: [1] })).card).toBeNull();
  });

  it('carries where each section prints its places through a round trip', () => {
    const back = decode(JSON.stringify(encode({ items: [], locationAt: { education: 'none', talks: 'title', y: 'below', z: 'right', x: 'no' } }))).locationAt;
    // `right` is the default, so it is absence; anything unknown is dropped.
    expect(back).toEqual({ education: 'none', talks: 'title', y: 'below' });
  });

  it('carries the page format through a round trip, and reads none as the style\'s own', () => {
    expect(decode(JSON.stringify(encode({ items: [], page: 'a4' }))).page).toBe('a4');
    expect(decode(JSON.stringify(encode({ items: [], page: 'us-letter' }))).page).toBe('us-letter');
    expect(decode(JSON.stringify(encode({ items: [] }))).page).toBeNull();
  });

  it("carries each entry's institution-name level, dropping nonsense", () => {
    const back = decode(JSON.stringify(encode({ items: [], namesFor: { a: 2, b: 1, c: 0, d: 9, e: 'x' } })));
    expect(back.namesFor).toEqual({ a: 2, b: 1 });
    expect(decode(JSON.stringify(encode({ items: [] }))).namesFor).toEqual({});
  });

  it('carries the currency style through a round trip, and reads none as codes', () => {
    expect(decode(JSON.stringify(encode({ items: [], currency: 'dollar' }))).currency).toBe('dollar');
    expect(decode(JSON.stringify(encode({ items: [], currency: 'us' }))).currency).toBe('us');
    expect(decode(JSON.stringify(encode({ items: [] }))).currency).toBeNull();
    expect(decode(JSON.stringify(encode({ items: [], currency: 'xx' }))).currency).toBeNull();
  });

  it('carries the entries whose institution is switched off, dropping nonsense', () => {
    const back = decode(JSON.stringify(encode({ items: [], funderOff: ['a', 'a', 'b', 7, null] })));
    expect(back.funderOff).toEqual(['a', 'b']);
    expect(decode(JSON.stringify(encode({ items: [] }))).funderOff).toEqual([]);
  });

  it('carries whether the middle column fills, and reads none as off', () => {
    expect(decode(JSON.stringify(encode({ items: [], fill: true }))).fill).toBe(true);
    expect(decode(JSON.stringify(encode({ items: [] }))).fill).toBe(false);
    expect(decode(JSON.stringify(encode({ items: [], fill: 'yes' }))).fill).toBe(false);
  });

  it("carries whether a mentee's papers are cited by identifier, and reads none as words", () => {
    expect(decode(JSON.stringify(encode({ items: [], paperIds: true }))).paperIds).toBe(true);
    expect(decode(JSON.stringify(encode({ items: [] }))).paperIds).toBe(false);
    expect(decode(JSON.stringify(encode({ items: [], paperIds: 'yes' }))).paperIds).toBe(false);
  });

  it('carries whether Education puts the university below, and reads none as off', () => {
    expect(decode(JSON.stringify(encode({ items: [], schoolBelow: true }))).schoolBelow).toBe(true);
    expect(decode(JSON.stringify(encode({ items: [] }))).schoolBelow).toBe(false);
    expect(decode(JSON.stringify(encode({ items: [], schoolBelow: 'yes' }))).schoolBelow).toBe(false);
    expect(decode(JSON.stringify(encode({ items: [], linkOnDegree: true }))).linkOnDegree).toBe(true);
    expect(decode(JSON.stringify(encode({ items: [] }))).linkOnDegree).toBe(false);
    expect(decode(JSON.stringify(encode({ items: [], linkOnDegree: 'yes' }))).linkOnDegree).toBe(false);
  });

  it('carries how a place prints, and reads none as written', () => {
    const back = (locationDetail) => decode(JSON.stringify(encode({ items: [], locationDetail }))).locationDetail;
    expect(back({ region: false, country: 'code' })).toEqual({ region: false, country: 'code' });
    expect(back({ region: false })).toEqual({ region: false });
    expect(back({ country: 'code' })).toEqual({ country: 'code' });
    expect(back(undefined)).toEqual({});
    // Only the two non-default values count.
    expect(back({ region: true, country: 'full', extra: 1 })).toEqual({});
    expect(back('no')).toEqual({});
    expect(decode(JSON.stringify({ format: 'starkman-cv-selection', version: 1, items: [] })).locationDetail).toEqual({});
  });

  it('reads no place setting as the right-hand column, and holds an id to its limit', () => {
    const file = (extra) => decode(JSON.stringify({ format: 'starkman-cv-selection', version: 1, items: [], ...extra })).locationAt;
    expect(file({})).toEqual({});
    expect(file({ locationAt: { ['x'.repeat(65)]: 'below', ok: 'below' } })).toEqual({ ok: 'below' });
  });

  it("reads an older file's places-off and below-the-title as the one setting", () => {
    const file = (extra) => decode(JSON.stringify({ format: 'starkman-cv-selection', version: 1, items: [], ...extra })).locationAt;
    expect(file({ location: { education: false, talks: true, x: 'no' } })).toEqual({ education: 'none' });
    expect(file({ locationBelow: { 'talks-invited': true, other: false } })).toEqual({ 'talks-invited': 'below' });
    // Leaving places out wins over below; an explicit setting wins over both.
    expect(file({ location: { a: false }, locationBelow: { a: true } })).toEqual({ a: 'none' });
    expect(file({ location: { a: false }, locationBelow: { a: true }, locationAt: { a: 'title' } })).toEqual({ a: 'title' });
    // And the old fields are no longer returned.
    const sel = decode(JSON.stringify({ format: 'starkman-cv-selection', version: 1, items: [], location: { a: false } }));
    expect(sel.location).toBeUndefined();
    expect(sel.locationBelow).toBeUndefined();
  });

  it("carries the capped column's width, holding it to its range and reading none as the usual", () => {
    const back = (trailcapWidth) => decode(JSON.stringify(encode({ items: [], trailcapWidth }))).trailcapWidth;
    expect(back(1.9)).toBe(1.9);
    expect(back(0.5)).toBe(0.5);
    expect(back(4)).toBe(4);
    // Out of range, not a number, and the usual width itself are all absence.
    for (const bad of [0.49, 4.01, -1, 0, 'wide', '1.9', NaN, Infinity, null, undefined, 1.45]) expect(back(bad), String(bad)).toBeNull();
    expect(decode(JSON.stringify({ format: 'starkman-cv-selection', version: 1, items: [], trailcapWidth: 9 })).trailcapWidth).toBeNull();
    expect(decode(JSON.stringify({ format: 'starkman-cv-selection', version: 1, items: [] })).trailcapWidth).toBeNull();
  });

  it('carries the entries whose recipient line is left out, and reads none as all printing', () => {
    const back = (recipientOff) => decode(JSON.stringify(encode({ items: [], recipientOff }))).recipientOff;
    expect(back(['a-award', 'b-award', 'a-award'])).toEqual(['a-award', 'b-award']);
    expect(back(undefined)).toEqual([]);
    expect(back([1, null, 'ok', 'x'.repeat(65)])).toEqual(['ok']);
    expect(decode(JSON.stringify({ format: 'starkman-cv-selection', version: 1, items: [] })).recipientOff).toEqual([]);
  });

  it('carries whether the right column is capped through a round trip, and reads none as not', () => {
    expect(decode(JSON.stringify(encode({ items: [], trailcap: true }))).trailcap).toBe(true);
    expect(decode(JSON.stringify(encode({ items: [] }))).trailcap).toBe(false);
    expect(decode(JSON.stringify(encode({ items: [], trailcap: 'yes' }))).trailcap).toBe(false);
  });

  it('carries the tallied lists and their h-index through a round trip, dropping nonsense', () => {
    const tally = { publications: { hIndex: 'scholar' }, other: true, bad: 'yes', worse: { hIndex: 3 } };
    expect(decode(JSON.stringify(encode({ items: [], tally }))).tally)
      .toEqual({ publications: { hIndex: 'scholar' }, other: true });
    expect(decode(JSON.stringify(encode({ items: [] }))).tally).toEqual({});
  });

  it('carries the space before a refereed run heading through a round trip', () => {
    const spacing = { 'publications.run': { value: 2, unit: 'x' } };
    expect(decode(JSON.stringify(encode({ items: [], spacing }))).spacing).toEqual(spacing);
  });

  it('carries the run headings\' size through a round trip, dropping one out of range', () => {
    const round = (runSize) => decode(JSON.stringify(encode({ items: [], runSize }))).runSize;
    expect(round({ publications: 1.3, a: 0.5, b: 2.5, c: '1.2' })).toEqual({ publications: 1.3 });
    expect(round(undefined)).toEqual({});
  });

  it('carries the refereed split through a round trip, dropping any other value', () => {
    const round = (refereed) => decode(JSON.stringify(encode({ items: [], refereed }))).refereed;
    expect(round({ publications: 'split', a: true, b: 'yes' })).toEqual({ publications: 'split' });
    expect(round(undefined)).toEqual({});
  });

  it('keeps a tally of the whole record, and drops any other `of`', () => {
    const round = (tally) => decode(JSON.stringify(encode({ items: [], tally }))).tally;
    expect(round({ a: { of: 'record' }, b: { of: 'record', hIndex: 'ads' } }))
      .toEqual({ a: { of: 'record' }, b: { of: 'record', hIndex: 'ads' } });
    expect(round({ a: { of: 'list' }, b: { of: 7, hIndex: 'ads' }, c: { of: '' } }))
      .toEqual({ a: true, b: { hIndex: 'ads' }, c: true });
  });

  it('keeps the short form and the count\'s place, and drops any other form', () => {
    const round = (sel) => decode(JSON.stringify(encode({ items: [], ...sel })));
    expect(round({ tally: { a: { form: 'short' }, b: { of: 'record', form: 'short', hIndex: 'ads' }, c: { form: 'tiny' } } }).tally)
      .toEqual({ a: { form: 'short' }, b: { of: 'record', form: 'short', hIndex: 'ads' }, c: true });
    expect(round({ place: { 'publications.tally': 'title' } }).place).toEqual({ 'publications.tally': 'title' });
  });

  it('refuses an absurdly long style name', () => {
    expect(read({ style: 'x'.repeat(65) }).style).toBeNull();
  });
});

describe('loadReport', () => {
  const here = { commit: 'b'.repeat(40), short: 'bbbbbbb' };
  const sel = (items, over = {}) => ({ items: new Set(items), style: null, site, ...over });
  const known = new Set(['x', 'y']);

  it('counts what was restored', () => {
    const r = loadReport(sel(['x']), known, site, true);
    expect(r.message).toBe('Loaded 1 entry.');
    expect(r.missing).toEqual([]);
  });

  it('says how to recover entries a newer build dropped', () => {
    const r = loadReport(sel(['x', 'gone', 'lost']), known, here, true);
    expect(r.missing).toEqual(['gone', 'lost']);
    expect(r.message).toBe('Loaded 1 entry. 2 entries no longer exist here. '
      + 'Saved from aaaaaaa; this site is bbbbbbb. '
      + `git checkout ${site.commit} && npm run build to recover them.`);
  });

  it('calls missing entries removed when the build is the same one', () => {
    expect(loadReport(sel(['gone']), known, site, true).message)
      .toBe('Loaded 0 entries. 1 entry no longer exists here. They were removed from the database.');
  });

  it('notes a different build even when everything resolves', () => {
    expect(loadReport(sel(['x', 'y']), known, here, true).message)
      .toBe('Loaded 2 entries. Saved from aaaaaaa; every entry still resolves.');
  });

  it('owns up to an unknown style and a dirty build', () => {
    const r = loadReport(sel(['x'], { style: 'neon', site: { ...site, dirty: true } }), known, site, false);
    expect(r.message).toBe('Loaded 1 entry. Its style "neon" is not one this page offers; using Default. '
      + 'That build had uncommitted changes.');
  });
});

describe('the preset it started from', () => {
  const round = (over) => decode(JSON.stringify(encode({ items: ['x'], lines: {}, site, ...over })));
  it('keeps a preset name, and none when absent or not a name', () => {
    expect(round({ preset: '1page' }).preset).toBe('1page');
    expect(round({}).preset).toBeNull();
    expect(round({ preset: 7 }).preset).toBeNull();
    expect(round({ preset: '' }).preset).toBeNull();
    expect(round({ preset: 'Not A Key' }).preset).toBeNull();
  });
  it('says when it names no preset', () => {
    const sel = { items: new Set(['x']), style: null, preset: 'nope', site };
    expect(loadReport(sel, new Set(['x']), site, true, false).message)
      .toBe('Loaded 1 entry. Its preset "nope" is not one this page has; laid out as the complete CV.');
    expect(loadReport(sel, new Set(['x']), site, true, true).message).toBe('Loaded 1 entry.');
  });
});

describe('section groups', () => {
  it('keeps the groups switched on, and none when absent', () => {
    expect(decode(JSON.stringify(encode({ items: ['x'], lines: {}, groups: ['professional'], site }))).groups).toEqual(['professional']);
    expect(decode(JSON.stringify(encode({ items: ['x'], lines: {}, site }))).groups).toEqual([]);
    expect(decode(JSON.stringify(encode({ items: ['x'], lines: {}, groups: ['Bad Id', 7, 'professional'], site }))).groups).toEqual(['professional']);
  });
});

// A file saved before an organized conference's role left its first detail line ("Role: SOC")
// must print the same lines now: its ticks move up with the lines (selection v2).
describe('a v1 file', () => {
  const v1 = (extra) => JSON.stringify({ format: FORMAT, version: 1, items: ['jaxtronomy-workshop', 'toronto-phd'], ...extra });

  it('is read as this version', () => expect(VERSION).toBe(2));

  it('moves the ticks of an entry whose first line left, and drops one that ticked only it', () => {
    const out = decode(v1({ lines: { 'jaxtronomy-workshop': [0, 1, 3], 'gaia-hackathon': [0], 'toronto-phd': [0, 2] } }));
    expect([...out.lines.get('jaxtronomy-workshop')]).toEqual([0, 2]);
    expect(out.lines.has('gaia-hackathon')).toBe(false);
    expect([...out.lines.get('toronto-phd')]).toEqual([0, 2]);
  });

  it('counts a talk\u2019s title as its line 0: the role line it drops is the one after', () => {
    const lines = (ns) => decode(v1({ lines: { 'astropy-core-developer-conference-talk': ns } })).lines.get('astropy-core-developer-conference-talk');
    expect(lines([1])).toBeUndefined();
    expect([...lines([0, 1])]).toEqual([0]);
  });

  it('gives Conferences’ settings and place to the three sections it split into, ungrouped', () => {
    const out = decode(v1({
      heading: { conferences: 'rule', service: 'rule' },
      locationAt: { conferences: 'none' },
      spacing: { 'conferences.heading': { value: 1.2, unit: 'x' } },
      order: ['education', 'conferences', 'service', 'peer-review'],
    }));
    for (const id of ['conferences-organized', 'conferences-attended', 'talks-professional']) {
      expect(out.heading[id]).toBe('rule');
      expect(out.locationAt[id]).toBe('none');
      expect(out.spacing[`${id}.heading`]).toEqual({ value: 1.2, unit: 'x' });
    }
    expect(out.heading.conferences).toBeUndefined();
    expect(out.order).toEqual(['education', 'conferences-organized', 'conferences-attended', 'talks-professional', 'service', 'peer-review']);
    expect(out.groups).toEqual([]);
  });

  it('leaves a v2 file as it is, and refuses a v3', () => {
    const v2 = JSON.stringify({ format: FORMAT, version: 2, items: ['x'], lines: { 'jaxtronomy-workshop': [0] }, order: ['conferences'] });
    expect([...decode(v2).lines.get('jaxtronomy-workshop')]).toEqual([0]);
    expect(() => decode(JSON.stringify({ format: FORMAT, version: 3, items: [] }))).toThrow(/newer version/);
  });
});
