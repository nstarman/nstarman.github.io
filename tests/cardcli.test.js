// build-card.mjs's command line (scripts/lib/cardargs.mjs). The draw itself is the
// Card Builder's downloadCard, run in a browser; see specs/cards/spec.md.
import { describe, expect, it } from 'vitest';
import { readArgs } from '../scripts/lib/cardargs.mjs';

describe('build:card arguments', () => {
  it('defaults to the default card, light, as a PNG under the builder\'s name', () => {
    expect(readArgs(['macro-lightning'])).toEqual({ id: 'macro-lightning', name: null, theme: 'light', width: null, out: null, format: 'png' });
  });
  it('takes the format from the output', () => {
    for (const f of ['svg', 'png', 'pdf']) expect(readArgs(['x', `a/card.${f}`])).toMatchObject({ out: `a/card.${f}`, format: f });
    expect(readArgs(['x', 'CARD.SVG']).format).toBe('svg');
  });
  it('tells a name from an output, in either order', () => {
    expect(readArgs(['x', 'carousel', 'c.svg'])).toMatchObject({ name: 'carousel', out: 'c.svg' });
    expect(readArgs(['x', 'c.svg', 'carousel'])).toMatchObject({ name: 'carousel', out: 'c.svg' });
    // a size to a tenth is not an extension
    expect(readArgs(['x', 'size:320:400-look:textsize=15.5'])).toMatchObject({ name: 'size:320:400-look:textsize=15.5', out: null });
  });
  it('reads the theme and the width', () => {
    expect(readArgs(['x', '--theme', 'dark', '--width', '480'])).toMatchObject({ theme: 'dark', width: 480 });
  });
  it.each([
    [[], /no item id/],
    [['x', 'c.gif'], /\.svg, \.png or \.pdf/],
    [['x', '--theme', 'blue'], /light or dark/],
    [['x', '--theme'], /needs a value/],
    [['x', '--width', '100'], /120–1600/],
    [['x', '--width', '4.5'], /whole number/],
    [['x', '--size', '3'], /no such option/],
    [['x', 'a', 'b'], /two names/],
    [['x', 'a.png', 'b.png'], /two outputs/],
  ])('rejects %j', (argv, msg) => {
    expect(() => readArgs(argv)).toThrow(msg);
  });
});
