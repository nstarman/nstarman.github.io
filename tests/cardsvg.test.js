// The card's SVG: written from a measured card, so a fixed model stands in
// for the browser. sharp's renderer is the check that it is an SVG at all.

import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { modelToSvg, rrect, stack, faceOf, facesOf, withFonts } from '../src/lib/cardsvg.js';
import { file, themes } from '../src/lib/cardexport.js';
import { FORMATS } from '../src/lib/cardbuilder/settings.js';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const icon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#5a6472"><path d="M6 2h8l6 6v14H4V2Z"/></svg>';
const model = {
  title: 'A <card> & more', w: 320, h: 120, r: [16, 16, 16, 16],
  ops: [
    { k: 'box', x: 0, y: 0, w: 320, h: 120, r: [16, 16, 16, 16], fill: '#ffffffff', stroke: null, sw: 0, href: null },
    { k: 'img', x: 16, y: 16, w: 80, h: 60, r: [6, 6, 6, 6], src: '/img0.png', fit: 'contain', href: 'https://example.test/?a=1&b=2' },
    { k: 'box', x: 280, y: 16, w: 24, h: 24, r: [6, 6, 6, 6], fill: '#f5f7faff', stroke: '#cfd6e0ff', sw: 1, href: 'https://example.test/code' },
    { k: 'svg', x: 286, y: 22, w: 12, h: 12, svg: icon, href: 'https://example.test/code' },
    { k: 'text', x: 110, y: 16, w: 150, h: 18, s: 'Stream <Members> Only', font: 'IBM Plex Sans', weight: 500, size: 15, color: '#12161cff', ls: 0, href: null },
    { k: 'text', x: 110, y: 40, w: 60, h: 14, s: '1ST | 2025', font: 'IBM Plex Mono', weight: 400, size: 11, color: '#8a93a1b3', ls: 0.6, href: null },
    { k: 'text', x: 110, y: 60, w: 90, h: 14, s: 'The Journal', font: 'Newsreader', weight: 400, style: 'italic', size: 12, color: '#5a6472ff', ls: 0, href: null },
  ],
};
const svg = modelToSvg(model, { '/img0.png': PNG });

describe('modelToSvg', () => {
  it('is an SVG a renderer reads, at the card’s size', async () => {
    const m = await sharp(Buffer.from(svg)).metadata();
    expect([m.format, m.width, m.height]).toEqual(['svg', 320, 120]);
    await sharp(Buffer.from(svg)).png().toBuffer();
  }, 30000); // the first render loads librsvg: slow on a busy machine

  it('keeps every link, around what it was on, with its & escaped', () => {
    expect(svg).toContain('<a href="https://example.test/?a=1&amp;b=2"><image ');
    expect(svg.match(/<a href="https:\/\/example.test\/code">/g)).toHaveLength(2);
    expect(svg.match(/<a /g)).toHaveLength(3);
  });

  it('escapes text and the title, and sets text where it was measured', () => {
    expect(svg).toContain('aria-label="A &lt;card&gt; &amp; more"');
    expect(svg).toContain('>Stream &lt;Members&gt; Only</text>');
    expect(svg).toContain('x="110" y="16"');
    expect(svg).toContain('textLength="150"');
  });

  it('slants what the browser set in italic, and only that', () => {
    expect(svg.match(/font-style="italic"/g)).toHaveLength(1);
    expect(svg).toMatch(/font-family="'Newsreader'[^>]*font-style="italic"[^>]*>The Journal</);
  });

  it('draws a colour and its opacity apart, and a stroke only where there is one', () => {
    expect(svg).toContain('fill="#8a93a1" fill-opacity="0.702"');
    expect(svg).not.toMatch(/#[0-9a-f]{8}/);
    expect(svg.match(/stroke-width/g)).toHaveLength(1);
  });

  it('nests an icon at its place and embeds a figure it was given', () => {
    expect(svg).toContain('<svg x="286" y="22" width="12" height="12" xmlns=');
    expect(svg).toContain(`href="${PNG}"`);
  });

  it('refuses a figure with no image and an op it does not know', () => {
    expect(() => modelToSvg(model, {})).toThrow(/no image for \/img0.png/);
    expect(() => modelToSvg({ ...model, ops: [{ k: 'blob' }] })).toThrow(/no such op/);
  });
});

describe('the pieces', () => {
  it('rounds each corner on its own', () => {
    expect(rrect(0, 0, 10, 10, [0, 0, 0, 0])).toBe('M0 0H10A0 0 0 0 1 10 0V10A0 0 0 0 1 10 10H0A0 0 0 0 1 0 10V0A0 0 0 0 1 0 0Z');
    expect(rrect(0, 0, 10, 10, [1, 2, 3, 4])).toContain('A2 2 0 0 1 10 2');
  });

  it('falls back from a Plex face to what the reader has', () => {
    expect(stack('IBM Plex Mono')).toMatch(/monospace$/);
    expect(stack('IBM Plex Sans')).toMatch(/sans-serif$/);
    expect(stack('Newsreader')).toMatch(/^'Newsreader',.*serif$/);
  });

  it('is a format of the builder, named .svg, in both themes when following the reader', () => {
    expect(FORMATS).toContain('svg');
    const s = { id: 'unxt', slug: 'size:fill:fit', format: 'svg', theme: 'auto' };
    expect(themes(s)).toEqual(['light', 'dark']);
    expect(file(s, 'dark')).toMatch(/-dark\.svg$/);
  });
});

describe('the faces of a PNG', () => {
  it('are named from their files: family, weight and slant', () => {
    expect(faceOf('/fonts/card/IBMPlexSans-Regular.otf')).toEqual({ family: 'IBM Plex Sans', weight: 400, style: 'normal' });
    expect(faceOf('/fonts/card/IBMPlexSans-Medium.otf')).toEqual({ family: 'IBM Plex Sans', weight: 500, style: 'normal' });
    expect(faceOf('/fonts/card/IBMPlexSans-SemiBoldItalic.otf')).toEqual({ family: 'IBM Plex Sans', weight: 600, style: 'italic' });
    expect(faceOf('/fonts/card/IBMPlexMono-Italic.otf')).toEqual({ family: 'IBM Plex Mono', weight: 400, style: 'italic' });
    expect(faceOf('/fonts/card/Newsreader-Medium.ttf')).toEqual({ family: 'Newsreader', weight: 500, style: 'normal' });
    expect(() => faceOf('/fonts/card/Other-Regular.otf')).toThrow(/no face/);
    expect(() => faceOf('/fonts/card/Newsreader-.ttf')).toThrow(/no face/);
  });

  it('are every one the card names, and every one in public/fonts/card has a family and weight', () => {
    for (const f of fs.readdirSync('public/fonts/card').filter((x) => /\.(otf|ttf)$/.test(x))) expect(() => faceOf(f), f).not.toThrow();
    for (const o of model.ops.filter((x) => x.k === 'text')) expect(['IBM Plex Sans', 'IBM Plex Mono', 'Newsreader'], o.font).toContain(o.font);
  });

  it('are, for one card, the families and slants it draws text in, at every weight', () => {
    const files = fs.readdirSync('public/fonts/card').filter((x) => /\.(otf|ttf)$/.test(x)).sort();
    expect(facesOf(model, files)).toEqual([
      'IBMPlexMono-Medium.otf', 'IBMPlexMono-Regular.otf', 'IBMPlexMono-SemiBold.otf',
      'IBMPlexSans-Medium.otf', 'IBMPlexSans-Regular.otf', 'IBMPlexSans-SemiBold.otf',
      'Newsreader-Italic.ttf', 'Newsreader-MediumItalic.ttf', 'Newsreader-SemiBoldItalic.ttf',
    ]);
  });

  it('cover every family, weight and slant a card can ask for', () => {
    const files = fs.readdirSync('public/fonts/card').filter((x) => /\.(otf|ttf)$/.test(x));
    const have = new Set(files.map((f) => { const { family, weight, style } = faceOf(f); return `${family} ${weight} ${style}`; }));
    for (const family of ['IBM Plex Sans', 'IBM Plex Mono', 'Newsreader']) for (const weight of [400, 500, 600]) for (const style of ['normal', 'italic']) expect(have).toContain(`${family} ${weight} ${style}`);
  });

  it('are the faces the embed page lays a card out in, so the text is measured in the files it is drawn in', () => {
    const css = fs.readFileSync('src/styles/card-faces.css', 'utf8');
    // Each rule's family, weight, slant and file, whatever its spacing and quoting.
    const rules = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(([, body]) => ({
      family: body.match(/font-family\s*:\s*['"]?([^'";]+?)['"]?\s*;/)?.[1],
      weight: +body.match(/font-weight\s*:\s*(\d+)/)?.[1],
      style: body.match(/font-style\s*:\s*(\w+)/)?.[1] ?? 'normal',
      f: body.match(/url\(\s*['"]?\/fonts\/card\/([^'")\s]+)/)?.[1],
    }));
    const files = fs.readdirSync('public/fonts/card').filter((x) => /\.(otf|ttf)$/.test(x)).sort();
    expect(rules.map((r) => r.f).sort()).toEqual(files);
    for (const r of rules) expect({ family: r.family, weight: r.weight, style: r.style }, r.f).toEqual(faceOf(r.f));
    // and no other copy of them: a web font of the same name would win the layout.
    const embed = fs.readFileSync('src/layouts/Embed.astro', 'utf8');
    expect(embed).toContain("import '../styles/card-faces.css';");
    expect(embed).not.toMatch(/fonts\.googleapis\.com/);
  });

  it('go into the SVG as @font-face rules with data: URIs, still an SVG a renderer reads', async () => {
    const withIt = withFonts(svg, [{ file: 'IBMPlexSans-Regular.otf', uri: 'data:font/otf;base64,AAAA' }, { file: 'IBMPlexMono-Medium.otf', uri: 'data:font/otf;base64,BBBB' }]);
    expect(withIt).toContain("@font-face{font-family:'IBM Plex Sans';font-weight:400;font-style:normal;src:url(data:font/otf;base64,AAAA)}");
    expect(withIt).toContain("@font-face{font-family:'IBM Plex Mono';font-weight:500;font-style:normal;src:url(data:font/otf;base64,BBBB)}");
    expect(withFonts(svg, [{ file: 'Newsreader-Italic.ttf', uri: 'data:font/ttf;base64,CCCC' }])).toContain("@font-face{font-family:'Newsreader';font-weight:400;font-style:italic;src:url(data:font/ttf;base64,CCCC)}");
    expect(withIt.replace(/<style>[\s\S]*?<\/style>\n/, '')).toBe(svg);
    const meta = await sharp(Buffer.from(withIt)).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(['svg', 320, 120]);
  });
});
