// The card's PDF: the colours read off the preview, and the Typst template
// that draws the measured card again.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { hex } from '../src/lib/cardpdf.js';
import { faceOf } from '../src/lib/cardsvg.js';

describe('hex', () => {
  it('reads each form a browser computes a colour in', () => {
    expect(hex('rgb(18, 22, 28)')).toBe('#12161cff');
    expect(hex('rgba(207, 214, 224, 0.5)')).toBe('#cfd6e080');
    // A tint mixed with color-mix() comes back in color(); --ground's is 2.5% ink.
    expect(hex('color(srgb 0.0705882 0.0862745 0.109804 / 0.025)')).toBe('#12161c06');
  });

  it('drops what is transparent, and refuses what it cannot read', () => {
    expect(hex('rgba(0, 0, 0, 0)')).toBeNull();
    expect(() => hex('oklch(0.5 0.1 200)')).toThrow(/cannot read/);
  });
});

const typst = (() => { try { execFileSync('typst', ['--version']); return true; } catch { return false; } })();

// The top of a line in card.typ is each family's hhea ascent, which the browser
// measures a line's box from; read here from every face of it.
describe('card.typ line tops', () => {
  const hhea = (file) => {
    const b = fs.readFileSync(`public/fonts/card/${file}`);
    const table = (tag) => { for (let i = 0; i < b.readUInt16BE(4); i++) if (b.toString('latin1', 12 + 16 * i, 16 + 16 * i) === tag) return b.readUInt32BE(20 + 16 * i); throw new Error(`no ${tag} in ${file}`); };
    return b.readInt16BE(table('hhea') + 4) / b.readUInt16BE(table('head') + 18);
  };
  it('are the ascent of every file of each family', () => {
    const typ = fs.readFileSync('src/lib/card.typ', 'utf8');
    const ascent = Object.fromEntries([...typ.match(/#let ascent = \(([^)]*)\)/)[1].matchAll(/"([^"]+)": ([\d.]+)em/g)].map(([, f, v]) => [f, +v]));
    const files = fs.readdirSync('public/fonts/card').filter((f) => /\.(otf|ttf)$/.test(f));
    expect(Object.keys(ascent).sort()).toEqual([...new Set(files.map((f) => faceOf(f).family))].sort());
    for (const f of files) expect(hhea(f), f).toBeCloseTo(ascent[faceOf(f).family], 3);
  });
});

// CI installs Typst after the unit tests, for the CV PDFs; this runs wherever
// it is already on the path.
describe.skipIf(!typst)('card.typ', () => {
  it('draws a box, a figure, an icon and a line of text in the card faces', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'card-'));
    fs.copyFileSync('src/lib/card.typ', path.join(dir, 'main.typ'));
    fs.copyFileSync('public/highlights/spexial.svg', path.join(dir, 'img0.svg'));
    const icon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#5a6472"><path d="M6 2h8l6 6v14H4V2Z"/></svg>';
    fs.writeFileSync(path.join(dir, 'card.json'), JSON.stringify({
      title: 'A card', w: 320, h: 120, r: [16, 16, 16, 16],
      ops: [
        { k: 'box', x: 0, y: 0, w: 320, h: 120, r: [16, 16, 16, 16], fill: '#ffffffff', stroke: null, sw: 0, href: null },
        { k: 'img', x: 16, y: 16, w: 80, h: 60, r: [6, 6, 6, 6], src: '/img0.svg', fit: 'contain', href: 'https://example.test/' },
        { k: 'box', x: 280, y: 16, w: 24, h: 24, r: [6, 6, 6, 6], fill: '#f5f7faff', stroke: '#cfd6e0ff', sw: 1, href: null },
        { k: 'svg', x: 286, y: 22, w: 12, h: 12, svg: icon, href: null },
        { k: 'text', x: 110, y: 16, s: 'Stream Members Only', font: 'IBM Plex Sans', weight: 500, size: 15, color: '#12161cff', ls: 0, href: null },
        { k: 'text', x: 110, y: 40, s: '1ST | 2025', font: 'IBM Plex Mono', weight: 400, size: 11, color: '#8a93a1b3', ls: 0.6, href: null },
        { k: 'text', x: 110, y: 60, s: 'S. Wu', font: 'IBM Plex Sans', weight: 400, style: 'italic', size: 12, color: '#5a6472ff', ls: 0, href: null },
        { k: 'text', x: 110, y: 80, s: 'The Journal', font: 'Newsreader', weight: 500, style: 'italic', size: 12, color: '#5a6472ff', ls: 0, href: null },
      ],
    }));
    execFileSync('typst', ['compile', '--root', dir, '--font-path', 'public/fonts/card', '--ignore-system-fonts', path.join(dir, 'main.typ'), path.join(dir, 'card.pdf')]);
    const pdf = fs.readFileSync(path.join(dir, 'card.pdf'), 'latin1');
    expect(pdf.startsWith('%PDF')).toBe(true);
    // The medium weight is its own face, by its own name, not Regular.
    expect(pdf).toMatch(/IBMPlexSans-Medm/);
    expect(pdf).toMatch(/IBMPlexMono/);
    // Italic and serif in their own faces, not the upright sans set in their place.
    expect(pdf).toMatch(/IBMPlexSans-Italic/);
    expect(pdf).toMatch(/Newsreader-MediumItalic/);
    expect(pdf).toContain('https://example.test/');
  });
});
