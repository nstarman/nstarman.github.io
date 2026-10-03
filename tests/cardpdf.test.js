// The card's PDF: the colours read off the preview, and the Typst template
// that draws the measured card again.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { hex } from '../src/lib/cardpdf.js';

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
      ],
    }));
    execFileSync('typst', ['compile', '--root', dir, '--font-path', 'public/fonts/card', '--ignore-system-fonts', path.join(dir, 'main.typ'), path.join(dir, 'card.pdf')]);
    const pdf = fs.readFileSync(path.join(dir, 'card.pdf'), 'latin1');
    expect(pdf.startsWith('%PDF')).toBe(true);
    // The medium weight is its own face, by its own name, not Regular.
    expect(pdf).toMatch(/IBMPlexSans-Medm/);
    expect(pdf).toMatch(/IBMPlexMono/);
    expect(pdf).toContain('https://example.test/');
  });
});
