// build-card.mjs's command line (scripts/lib/cardargs.mjs), and the command itself, which draws
// with the offline engine (src/lib/cardoffline.js): no browser.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
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

describe('build:card', () => {
  const script = path.resolve('scripts/build-card.mjs');
  const go = (argv) => { const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'bc-')); return { cwd, ...spawnSync(process.execPath, [script, ...argv], { encoding: 'utf8', cwd, env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: '/nonexistent' } }) }; };

  it('exits 2 with the usage for no arguments', () => {
    const r = go([]);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/usage: build-card/);
  }, 60_000);
  it('exits 1, naming an unknown item, and writes no file', () => {
    const r = go(['no-such-item', 'x.svg']);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/no item no-such-item/);
    expect(fs.readdirSync(r.cwd)).toEqual([]);
  }, 60_000);
  it('writes an SVG of a software card in the dark, with no browser', () => {
    const r = go(['astropy', 'softwareMajor', '--width', '400', '--theme', 'dark', 'out.svg']);
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
    expect(fs.readFileSync(path.join(r.cwd, 'out.svg'), 'utf8').startsWith('<svg')).toBe(true);
  }, 60_000);
  it('writes a paper\'s card with a fitted byline, narrower with fewer names', () => {
    const name = (w) => `size:${w}:fit-figure:none-title:full:whole:link-authors:full:fit:marked-text:none-extras:venue-buttons:all:fit:right`;
    const names = (w) => { const r = go(['pinns-neurips', name(w), 'out.svg']); expect(r.stderr).toBe(''); expect(r.status).toBe(0); return (fs.readFileSync(path.join(r.cwd, 'out.svg'), 'utf8').match(/>[A-Z]\. [A-Z][^<]*</g) ?? []).length; };
    expect(names(808)).toBeGreaterThan(names(240));
  }, 120_000);
});
