// The tiny [text](url) syntax that `details` and `summary` carry.
//
// This is the one place prose turns into structure, and it feeds two renderers
// that cannot both be eyeballed — a mistake here prints raw markup in the PDF.

import { describe, expect, it } from 'vitest';
import { spans, plain, lines, detailLines, plural, ordinal } from '../src/lib/inline.js';

describe('spans', () => {
  it('leaves prose alone', () => {
    expect(spans('no links here')).toEqual([{ t: 'no links here' }]);
  });

  it('splits a link out of the surrounding text', () => {
    expect(spans('see [ADS](https://example.org/x) for more')).toEqual([
      { t: 'see ' },
      { t: 'ADS', url: 'https://example.org/x' },
      { t: ' for more' },
    ]);
  });

  it('turns an item: target into a same-page anchor', () => {
    expect(spans('[the award](item:brinson-prize-fellowship)')).toEqual([
      { t: 'the award', url: '#item-brinson-prize-fellowship', item: 'brinson-prize-fellowship' },
    ]);
  });

  it('prefixes item: anchors with a base, for pages that are not the CV', () => {
    expect(spans('[x](item:some-id)', '/cv/')).toEqual([
      { t: 'x', url: '/cv/#item-some-id', item: 'some-id' },
    ]);
  });

  it('accepts an item: link with no text, for the page to name', () => {
    expect(spans('in [](item:some-id) we')).toEqual([
      { t: 'in ' },
      { t: '', url: '#item-some-id', item: 'some-id' },
      { t: ' we' },
    ]);
  });

  it('handles several links in one line', () => {
    const out = spans('[a](https://a.test) and [b](https://b.test)');
    expect(out.filter((s) => s.url).map((s) => s.t)).toEqual(['a', 'b']);
  });

  it('is not fooled by a bracket that is not a link', () => {
    expect(spans('an [aside] here')).toEqual([{ t: 'an [aside] here' }]);
  });

  it('returns nothing for empty input', () => {
    expect(spans('')).toEqual([]);
    expect(spans(undefined)).toEqual([]);
  });
});

describe('plain', () => {
  it('strips the syntax but keeps the words', () => {
    expect(plain('see [ADS](https://example.org) now')).toBe('see ADS now');
  });
});

describe('lines', () => {
  it('treats a string as one line and an array as many', () => {
    expect(lines('one')).toHaveLength(1);
    expect(lines(['one', 'two'])).toHaveLength(2);
  });

  it('drops empties rather than emitting a blank line', () => {
    expect(lines(['one', '', null, 'two'])).toHaveLength(2);
  });
});

describe('detailLines', () => {
  // The builder ticks lines by index, so both renderers must agree on the
  // order — a mismatch would tick one line and drop another.
  it('puts details first, then thesis, then supervisors', () => {
    const out = detailLines({
      details: ['first', 'second'],
      thesis: 'A Thesis',
      supervisors: ['Jo Bovy', 'Jeremy Webb'],
    });
    expect(out.map((l) => l.map((s) => s.t).join(''))).toEqual([
      'first',
      'second',
      'Thesis: A Thesis',
      'Supervisors: Jo Bovy, Jeremy Webb',
    ]);
  });

  it('omits the parts an item does not have', () => {
    expect(detailLines({ details: 'only this' })).toHaveLength(1);
    expect(detailLines({})).toEqual([]);
  });
});

describe('ordinal', () => {
  it('suffixes 1st, 2nd, 3rd, and th for the rest and the teens', () => {
    expect([1, 2, 3, 4, 10, 11, 12, 13, 21, 22, 23, 101, 111].map(ordinal)).toEqual(
      ['1st', '2nd', '3rd', '4th', '10th', '11th', '12th', '13th', '21st', '22nd', '23rd', '101st', '111th']);
  });
});

describe('plural', () => {
  it('counts with a regular or given plural', () => {
    expect(plural(1, 'talk')).toBe('1 talk');
    expect(plural(3, 'talk')).toBe('3 talks');
    expect(plural(0, 'entry', 'entries')).toBe('0 entries');
  });
});
