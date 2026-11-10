// A card's SVG as a PNG by resvg (src/lib/cardraster.js).
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { modelToSvg } from '../src/lib/cardsvg.js';
import { pngFromSvg } from '../src/lib/cardraster.js';

const model = { title: 'T', w: 200, h: 60, r: [8, 8, 8, 8], ops: [
  { k: 'box', x: 0, y: 0, w: 200, h: 60, r: [8, 8, 8, 8], fill: '#ffffffff', stroke: null, sw: 0, href: null },
  { k: 'text', x: 10, y: 10, w: 90, h: 20, s: 'Hello world', font: 'IBM Plex Sans', weight: 500, size: 16, color: '#12161cff', ls: 0, href: null },
] };

describe('pngFromSvg', () => {
  it('draws at twice the card\'s size, in the card\'s own face and not the one sharp falls back to', async () => {
    const svg = modelToSvg(model);
    const png = pngFromSvg(svg, model);
    const meta = await sharp(png).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(['png', 400, 120]);
    const other = await sharp(Buffer.from(svg), { density: 144 }).png().toBuffer();
    expect(Buffer.compare(png, other)).not.toBe(0);
  });

  it('throws when a face the card names has no file', () => {
    expect(() => pngFromSvg(modelToSvg({ ...model, ops: [{ ...model.ops[1], font: 'Comic Sans' }] }), { ...model, ops: [{ ...model.ops[1], font: 'Comic Sans' }] })).toThrow(/no font file/);
  });
});
