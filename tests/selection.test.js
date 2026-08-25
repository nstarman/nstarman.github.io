// The saved-selection file. Its input is a file the user picked, so the cases
// that matter most are the malformed ones: a wrong file chosen by accident has
// to say so, not throw from inside the DOM code that called it.

import { describe, expect, it } from 'vitest';
import { encode, decode, SelectionError, FORMAT, VERSION } from '../src/lib/selection.js';

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
});
