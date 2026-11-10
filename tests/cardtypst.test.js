// A card model as a PDF by the typst binary (src/lib/cardtypst.js).
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { pdfFromModel } from '../src/lib/cardtypst.js';

const hasTypst = !spawnSync(process.env.TYPST ?? 'typst', ['--version']).error;
const model = { title: 'T', w: 200, h: 60, r: [8, 8, 8, 8], ops: [
  { k: 'box', x: 0, y: 0, w: 200, h: 60, r: [8, 8, 8, 8], fill: '#ffffffff', stroke: null, sw: 0, href: null },
  { k: 'text', x: 10, y: 10, w: 90, h: 20, s: 'Hello world', font: 'IBM Plex Sans', weight: 500, size: 16, color: '#12161cff', ls: 0, href: null },
] };

describe('pdfFromModel', () => {
  it.skipIf(!hasTypst)('returns a PDF', () => {
    expect(pdfFromModel(model).subarray(0, 4).toString()).toBe('%PDF');
  });

  it('names TYPST= when there is no binary', () => {
    expect(() => pdfFromModel(model, {}, { typst: '/nonexistent/typst' })).toThrow(/TYPST=/);
  });
});
