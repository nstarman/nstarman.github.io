// `npm run build:cv -- <input> --header [out]` draws the CV's header card alone
// (specs/renderers/spec.md, FR-028): from a selection or a built render model, as
// PDF, SVG or PNG by the extension, cut to the card.

import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
import { encode } from '../src/lib/selection.js';
import { memberIds } from '../src/lib/presets.js';

const root = path.resolve(import.meta.dirname, '..');
const script = path.join(root, 'scripts/build-cv.mjs');
const haveTypst = spawnSync(process.env.TYPST ?? 'typst', ['--version']).status === 0;
const run = (dir, ...args) => spawnSync('node', [script, ...args], { encoding: 'utf8', cwd: dir, maxBuffer: 1 << 28 });

describe('build:cv --header', () => {
  let dir;
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cv-header-'));
    // Nothing ticked: the header needs no entries.
    fs.writeFileSync(path.join(dir, 'empty.json'), JSON.stringify(encode({ items: [], card: { portrait: false, qr: false } })));
  });

  it('refuses --header with --model', () => {
    const r = run(dir, 'empty.json', '--header', '--model');
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain('use one');
  });

  it('refuses an extension Typst cannot write, before compiling', () => {
    const r = run(dir, 'empty.json', '--header', 'out.jpg');
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain('use .pdf, .svg or .png');
    expect(fs.existsSync(path.join(dir, 'out.jpg'))).toBe(false);
  });

  it.skipIf(!haveTypst)('draws the header of an empty selection, cut to the card, as a PNG', async () => {
    const r = run(dir, 'empty.json', '--header', 'h.png');
    expect(r.status, r.stderr).toBe(0);
    const { width, height } = await sharp(path.join(dir, 'h.png')).metadata();
    // A4's text width (210mm − 2 × 1.05cm) plus the 9pt border each side, at 300 ppi.
    expect(width).toBeCloseTo(((210 - 21) / 25.4 + 18 / 72) * 300, -1);
    expect(height).toBeLessThan(width / 5);
    expect(fs.existsSync(path.join(root, 'cv/cv.json'))).toBe(false);
  }, 120_000);

  it.skipIf(!haveTypst)('defaults to <input>-header.pdf, and writes SVG by extension', () => {
    expect(run(dir, 'empty.json', '--header').status).toBe(0);
    expect(fs.readFileSync(path.join(dir, 'empty-header.pdf')).subarray(0, 4).toString()).toBe('%PDF');
    expect(run(dir, 'empty.json', '--header', 'h.svg').status).toBe(0);
    const svg = fs.readFileSync(path.join(dir, 'h.svg'), 'utf8');
    expect(svg).toMatch(/^<svg/);
    // Well-formed XML, or a browser will not draw it: no `&` but in one of XML's five entities or a number.
    expect(svg).not.toMatch(/&(?!(?:amp|lt|gt|apos|quot|#\d+|#x[0-9a-fA-F]+);)/);
    expect(svg).toContain('&amp;sort='); // the ADS link, which has one
  }, 120_000);

  it.skipIf(!haveTypst)('takes a built render model as its input', () => {
    // --model prints the shape npm run build writes to dist/cv/<preset>.json.
    fs.writeFileSync(path.join(dir, 'np.json'), JSON.stringify(encode({ items: memberIds('np') })));
    const model = run(dir, 'np.json', '--model');
    expect(model.status, model.stderr).toBe(0);
    fs.writeFileSync(path.join(dir, 'model.json'), model.stdout);
    const r = run(dir, 'model.json', '--header', 'model.png');
    expect(r.status, r.stderr).toBe(0);
  }, 120_000);
});
