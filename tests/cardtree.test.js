// The card model written from the layout engine's paint tree (src/lib/cardtree.js), on small
// documents laid out by the engine alone: no browser. That the model agrees with what Chrome
// measures for the real cards is `npm run check:cards`'s to say.
import { describe, expect, it } from 'vitest';
import { engineFonts } from '../src/lib/cardfonts.js';
import { withLayout } from '../src/lib/cardengine.js';
import { modelFromTree } from '../src/lib/cardtree.js';

const SITE = 'https://nstarkman.space';
const GROUND = '<i class="x-ground" style="position:absolute;width:1px;height:1px;background:rgb(10,20,30)"></i>';
const SYMBOLS = new Map([['i-test', { viewBox: '0 0 24 24', body: '<path fill="currentColor" d="M3 5h18v14H3z"/>' }]]);
const css = '*{box-sizing:border-box} p{margin:0} .card{display:block;width:200px;font:16px/20px "IBM Plex Sans"}';

/** A card of `inner`, laid out, with what the tree holds as well as the model. */
const run = (inner, { links = [], icons = [], symbols = SYMBOLS, extraCss = '', read = (t) => t } = {}) => {
  const html = `<html><body style="margin:0"><main><article class="card">${inner}</article>${GROUND}</main></body></html>`;
  return withLayout({ html, css: css + extraCss, fonts: engineFonts() }, (tree) => ({ ...modelFromTree(tree, { title: 'T', site: SITE, links, icons, symbols }), tree: read(tree) }));
};
const ops = async (inner, o) => (await run(inner, o)).model.ops;

describe('the card', () => {
  it('is the model\'s size and shape, with the ground first, in the colour of its probe', async () => {
    const { model } = await run('<p>Hello</p>', { extraCss: '.card{border-radius:8px;background:rgba(1,2,3,.5)}' });
    expect(model).toMatchObject({ title: 'T', w: 200, h: 20, r: [8, 8, 8, 8] });
    expect(model.ops[0]).toEqual({ k: 'box', x: 0, y: 0, w: 200, h: 20, r: [8, 8, 8, 8], fill: '#0a141eff', stroke: null, sw: 0, href: null });
    // and then the card's own tint, as the browser's measurement has it
    expect(model.ops[1]).toMatchObject({ k: 'box', x: 0, y: 0, w: 200, fill: '#01020380' });
  });

  it('has no corner rounder than half of it, as the browser\'s measurement clamps them', async () => {
    expect((await run('<p>Hello</p>', { extraCss: '.card{border-radius:12px;background:#eee}' })).model.r).toEqual([10, 10, 10, 10]);
  });

  it('throws without a card, or a ground probe, rather than guessing', async () => {
    await expect(withLayout({ html: '<div>x</div>', css, fonts: engineFonts() }, (t) => modelFromTree(t, { title: 'T', site: SITE, links: [], icons: [], symbols: SYMBOLS }))).rejects.toThrow(/no card/);
    await expect(withLayout({ html: '<article class="card">x</article>', css, fonts: engineFonts() }, (t) => modelFromTree(t, { title: 'T', site: SITE, links: [], icons: [], symbols: SYMBOLS }))).rejects.toThrow(/ground/);
  });
});

describe('a box', () => {
  const box = '<div style="width:60px;height:30px;border:1px solid #cfd6e0;border-radius:8px;background:#f5f7fa"></div>';

  it('with a border is inset by half of it and carries the stroke and its width', async () => {
    const op = (await ops(box)).find((o) => o.stroke);
    expect(op).toEqual({ k: 'box', x: 0.5, y: 0.5, w: 59, h: 29, r: [8, 8, 8, 8], fill: '#f5f7faff', stroke: '#cfd6e0ff', sw: 1, href: null });
  });

  it('reads the width of a square border, a translucent one and a thick one', async () => {
    const stroke = async (css) => (await ops(`<div style="width:60px;height:30px;${css}"></div>`)).find((o) => o.stroke);
    expect(await stroke('border:2px solid red')).toMatchObject({ x: 1, y: 1, w: 58, h: 28, sw: 2, stroke: '#ff0000ff', fill: null, r: [0, 0, 0, 0] });
    expect(await stroke('border:1px solid rgba(10,20,30,.4);border-radius:6px')).toMatchObject({ sw: 1, stroke: '#0a141e66', r: [6, 6, 6, 6] });
  });

  it('with a border on one side only has no stroke, as the browser\'s measurement has none', async () => {
    const all = await ops('<div style="width:60px;height:30px;border-top:2px solid red;background:#eee"></div>');
    expect(all.find((o) => o.fill === '#eeeeeeff')).toMatchObject({ stroke: null, sw: 0, w: 60, h: 30 });
  });

  it('with neither a fill nor a border is not drawn', async () => {
    expect((await ops('<div style="width:60px;height:30px"></div>')).filter((o) => o.k === 'box')).toHaveLength(1); // the ground
  });

  it('refuses a background it cannot write rather than leaving it out', async () => {
    await expect(ops('<div style="width:60px;height:30px;background:linear-gradient(red,blue)"></div>')).rejects.toThrow(/cannot draw a .*background/);
  });
});

describe('a line of text', () => {
  it('carries its face, size and colour, and sits where the engine put it', async () => {
    const { model, tree } = await run('<p style="font-weight:500;color:#112233">Hello there</p>', {
      read: (t) => { const n = t.nodes.find((x) => x.type === 'text'); const r = n.runs[0]; return { baseline: n.transform[5] + r.y, ascent: Math.round(r.ascent), x: n.transform[4] + r.x, width: r.width }; },
    });
    const t = model.ops.find((o) => o.k === 'text');
    expect(t).toMatchObject({ s: 'Hello there', font: 'IBM Plex Sans', weight: 500, style: 'normal', size: 16, color: '#112233ff', ls: 0, href: null, x: tree.x, w: tree.width });
    // y is the top of the content area: the baseline less the ascent rounded to a whole pixel, as Chrome reports it
    expect(t.y).toBe(tree.baseline - tree.ascent);
    expect(t.h).toBeGreaterThan(14);
  });

  it('is upper-case where the CSS says so, and italic where it is', async () => {
    const t = (await ops('<p style="text-transform:uppercase;font-style:italic">Hello</p>')).find((o) => o.k === 'text');
    expect(t).toMatchObject({ s: 'HELLO', style: 'italic' });
  });

  it('starts at its first visible glyph, not at a leading space', async () => {
    const [bar] = (await ops('<p><span>1st</span><span> | </span><span>4th</span></p>')).filter((o) => o.k === 'text' && o.s === '|');
    const [first] = (await ops('<p><span>1st</span><span>|</span><span>4th</span></p>')).filter((o) => o.k === 'text' && o.s === '|');
    expect(bar).toBeDefined();
    // one space further along, which is what cost 7.5px when the run's origin was used (research E5)
    expect(bar.x).toBeGreaterThan(first.x + 3);
    expect(bar.s).toBe('|');
  });

  it('is one operation for each line, each with its own place', async () => {
    const lines = (await ops('<p>The community core package for astronomy in Python and more words besides</p>')).filter((o) => o.k === 'text');
    expect(lines.length).toBeGreaterThan(1);
    expect(new Set(lines.map((l) => l.y)).size).toBe(lines.length);
    expect(lines.every((l) => l.x === 0)).toBe(true);
  });

  it('ends a clamped last line with the ellipsis the engine drew, and has no empty line', async () => {
    const lines = (await ops('<p style="display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden">The community core package for astronomy in Python. The collaboration received the 2025 AAS Lancelot M. Berkeley Prize and more words follow here to force it.</p>')).filter((o) => o.k === 'text');
    expect(lines).toHaveLength(2);
    expect(lines[1].s).toMatch(/…$/);
    expect(lines[0].s).not.toMatch(/…/);
    expect(lines.every((l) => l.s.trim() !== '')).toBe(true);
  });
});

describe('a link', () => {
  it('goes with the box and the text inside it, written against the site\'s own origin', async () => {
    const all = await ops('<a class="x-link-0" style="display:block;padding:4px;background:#eee"><span>Go</span></a><p class="x-link-1">Out</p><p>Plain</p>', { links: ['/software/#sw-x', 'https://example.org'] });
    expect(all.find((o) => o.k === 'box' && o.fill === '#eeeeeeff').href).toBe('https://nstarkman.space/software/#sw-x');
    expect(all.find((o) => o.s === 'Go').href).toBe('https://nstarkman.space/software/#sw-x');
    // a bare origin gains its slash, as the browser reads it
    expect(all.find((o) => o.s === 'Out').href).toBe('https://example.org/');
    expect(all.find((o) => o.s === 'Plain').href).toBeNull();
  });
});

describe('an icon', () => {
  const icon = '<div style="display:flex;color:rgb(42,93,168)"><svg class="x-ico-0 ico" style="width:15px;height:15px"><use href="#i-test"></use></svg><i class="x-ink-0" style="position:absolute;width:1px;height:1px;background:currentColor"></i></div>';

  it('is its symbol, filled with the colour of its probe, at the place the engine put it', async () => {
    const svg = (await ops(icon, { icons: [{ symbol: 'i-test' }] })).find((o) => o.k === 'svg');
    expect(svg).toMatchObject({ k: 'svg', x: 0, w: 15, h: 15, href: null });
    expect(svg.svg).toBe('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#2a5da8" stroke="none" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter"><path fill="#2a5da8" d="M3 5h18v14H3z"/></svg>');
  });

  it('is not drawn, and the draw fails, without its symbol or its probe', async () => {
    await expect(ops(icon, { icons: [{ symbol: 'i-nope' }] })).rejects.toThrow(/no symbol i-nope/);
    await expect(ops(icon.replace('x-ink-0', 'x-other'), { icons: [{ symbol: 'i-test' }] })).rejects.toThrow(/probe/);
  });
});

describe('an icon that is not drawn', () => {
  it('does not move the next one onto its symbol: each names itself', async () => {
    const one = (n, hidden) => `<div style="display:flex;color:rgb(42,93,168)${hidden ? ';display:none' : ''}"><svg class="x-ico-${n} ico" style="width:15px;height:15px"><use href="#i-test"></use></svg><i class="x-ink-${n}" style="position:absolute;width:1px;height:1px;background:currentColor"></i></div>`;
    const drawn = (await ops(one(0, true) + one(1, false), { icons: [{ symbol: 'i-nope' }, { symbol: 'i-test' }] })).filter((o) => o.k === 'svg');
    expect(drawn).toHaveLength(1);
  });
});

describe('text with no colour', () => {
  it('keeps its line with no colour: it draws nothing, as in the browser\'s measurement', async () => {
    const t = (await ops('<p style="color:transparent">Hi</p>')).find((o) => o.s === 'Hi');
    expect(t).toMatchObject({ s: 'Hi', color: null });
  });
});

describe('a figure', () => {
  // A 40x20 PNG, drawn in 60x60 boxes by each object-fit.
  const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAUCAIAAABwJOjsAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAALklEQVRIie3VwQkAMBACwem/aVPGQVjwL4i6xolkrKhXuTQnHci6TEFCWPQ/Fh99+h0OPLImvgAAAABJRU5ErkJggg==';
  const img = async (style, wrap = (s) => s, o) => (await ops(wrap(`<img src="${PNG}" style="width:60px;height:60px;${style}">`), o)).find((x) => x.k === 'img');

  it('is told how it fits by the rectangle it is drawn in', async () => {
    expect((await img('object-fit:contain')).fit).toBe('contain');
    expect((await img('object-fit:cover')).fit).toBe('cover');
    expect((await img('')).fit).toBe('stretch');
  });

  it('is rounded by its own border-radius where no box stands behind it, and by the box where one does', async () => {
    expect((await img('border-radius:30px;object-fit:cover')).r).toEqual([30, 30, 30, 30]);
    expect((await img('border:3px solid #0a0;border-radius:30px;object-fit:cover')).r).toEqual([27, 27, 27, 27]);
    // the card's own figure: a padded, white, rounded img, the corners inside its padding
    expect((await img('border-radius:10px;background:#fff;padding:4px;object-fit:contain')).r).toEqual([6, 6, 6, 6]);
  });

  it('carries the link it stands in', async () => {
    const wrap = (s) => `<a href="x" class="x-link-0">${s.replace('<img', '<img class="x-link-0"')}</a>`;
    expect((await img('', wrap, { links: ['/p'] })).href).toBe('https://nstarkman.space/p');
    expect((await img('')).href).toBeNull();
  });
});

describe('a line followed by another run', () => {
  it('ends at its last visible glyph, so textLength does not squeeze the letters over the space before the next run', async () => {
    const t = (await ops('<p style="margin:0;font:16px \'IBM Plex Sans\'">are unit-aware via <a href="#x" style="font:16px \'IBM Plex Sans\'">unxt</a>.</p>')).filter((o) => o.k === 'text');
    const via = t.find((o) => o.s.endsWith('via'));
    const next = t.find((o) => o.s === 'unxt');
    // a space's width, about 4 px, lies between them
    expect(next.x - (via.x + via.w)).toBeGreaterThan(2.5);
  });
});
