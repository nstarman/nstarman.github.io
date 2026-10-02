// What the schema cannot see. A ref at a missing id matches the id pattern, so
// ajv passes it; an `item:` target lives inside prose, out of the schema's
// reach. Both would render as a link to nothing. Run by `npm run test:schema`
// too, so an item PR that only runs that still gets these.
//
// Filenames are checked by the loader itself: src/lib/data.js throws on any
// file not named <date.start>-<id>.json, so importing it is the check.

import { describe, expect, it } from 'vitest';
import { items } from '../src/lib/data.js';

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
      [i.details, i.summary].flat()
        .filter((t) => typeof t === 'string')
        .flatMap((t) => [...t.matchAll(/\[[^\]]+\]\(item:([a-z0-9-]+)\)/g)])
        .filter((m) => !ids.has(m[1]))
        .map((m) => `${i.id} -> item:${m[1]}`));
    expect(dangling).toEqual([]);
  });
});
