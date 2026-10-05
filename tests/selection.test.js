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
    expect(read({}).columns).toEqual({});
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
