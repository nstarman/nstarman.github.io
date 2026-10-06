// A software card laid out without a browser: the same list of boxes, icons
// and lines of text that src/lib/cardpdf.js measures from the page, so
// src/lib/cardsvg.js can write it as an SVG from plain node — at build, in an
// endpoint, with no browser anywhere.
//
// It is a second implementation of the CSS for one family of cards: the
// software lead and headline presets at a set width. Two things keep it
// honest, both in tests/cardlayout.test.js:
//
//   - it throws on a name that asks for anything it does not draw, so a
//     preset that moves past it fails a test rather than drawing wrong;
//   - it is held to the browser's own measurement of every such card,
//     recorded by scripts/record-card-layouts.mjs, and that recording is
//     stamped with a hash of the card's CSS (scripts/lib/cardsync.mjs), so a
//     change to the CSS fails the test until it has been re-measured.
//
// Pure: text is measured by a function it is given, so the browser, node and
// the tests each bring their own. The browser rounds a font's ascent and
// descent to whole px and floors the half-leading it adds to a line, which
// is why those two things are done here, and why the numbers come out where
// the browser put them rather than near them.

import sprite from '../components/IconSprite.astro?raw';
import { ownLink, cardLinks, cardText, parseName } from './cards.js';
import { REL_ICON, relKey } from './data.js';

/** The root font size the browser has at 1280 px wide and over, the one the
 *  site is drawn at where the viewport has not scaled it. */
export const REM = 16;

/** The site's colours, from the tokens on :root in global.css — a test reads
 *  them from there and holds these to them. [light, dark]. */
export const TOKENS = {
  ground: ['#FFFFFF', '#0B0E14'], surface: ['#F5F7FA', '#131923'], ink: ['#12161C', '#E5E9F0'],
  mute: ['#5A6472', '#8B96A8'], ruleStrong: ['#CFD6E0', '#313B4B'], accent: ['#2A5DA8', '#84AEEC'],
};

/** The look's steps, as global.css has them, in rem unless noted. A test reads
 *  the stylesheet and holds this to it. */
export const STEPS = {
  textsize: { minor: 0.72, compact: 0.78, standard: 0.88, feature: 1, display: 1.15 },
  padding: { minor: [0.5, 0.6, 0.55], compact: [0.7, 0.8, 0.75], standard: [0.95, 1.05, 1], feature: [1.2, 1.35, 1.25], display: [1.5, 1.7, 1.55] },
  corners: { minor: 10, compact: 12, standard: 16, feature: 18, display: 22 }, // px
  buttons: { minor: [1.3, 0.68], compact: [1.45, 0.75], standard: [1.6, 0.8], feature: [1.9, 0.94], display: [2.2, 1.08] },
  titlesize: { minor: 0.72 * 1.08, compact: 0.78 * 1.08, standard: 0.88 * 1.08, feature: 1.08, display: 1.15 * 1.08 },
};

// Chrome's metrics for IBM Plex, as the font's hhea table has them, per em.
const ASCENT = 1.025;
const DESCENT = 0.275;

const SUPPORTED = { figure: 'none', foot: 'center', authors: 'none', links: 'all', background: 'normal', height: 'fit', rest: 'whole', title: 'full', perRow: 'fit' };

/** What a name must be, for this to draw it; anything else throws. Returns
 *  the look's dials, the width, and what the card shows. */
function read(slug) {
  const spec = parseName(slug);
  for (const [k, v] of Object.entries(SUPPORTED)) if (spec[k] !== v) throw new Error(`cardlayout cannot draw ${k}:${spec[k]} (only ${v}), in ${slug}`);
  if (typeof spec.width !== 'number') throw new Error(`cardlayout needs a set width, in ${slug}`);
  if (spec.titleLink !== 'link') throw new Error(`cardlayout draws the title as a link, in ${slug}`);
  if (!['details', 'summary'].includes(spec.text)) throw new Error(`cardlayout draws details or summary, in ${slug}`);
  if (spec.extras.some((e) => e !== 'role')) throw new Error(`cardlayout draws only the role extra, in ${slug}`);
  for (const k of Object.keys(spec.dials)) if (!(k in STEPS)) throw new Error(`cardlayout cannot draw look:${k}, in ${slug}`);
  // A name that is anything else — a part moved, a space, an area — leaves a
  // key the checks above do not name.
  const known = new Set([...Object.keys(SUPPORTED), 'dials', 'width', 'titleLink', 'titleAt', 'text', 'extras']);
  for (const k of Object.keys(spec)) if (!known.has(k)) throw new Error(`cardlayout does not know ${k}, in ${slug}`);
  return { dials: spec.dials, width: spec.width, text: spec.text, role: spec.extras.includes('role') };
}

/** The lengths a card takes from its look: a step where it names one, and the
 *  formulas of a card of set width where it does not. */
export function lengths({ dials, width }) {
  const u = width / 1; // the card is not both set in width and height, so its stretch is 1
  const px = { fs: 7.2 + 0.0216 * u, pad: [0.06 * u - 4, 0.064 * u - 3.2, 0.06 * u - 4], rad: 2.5 + 0.0375 * u, ib: 11.8 + 0.045 * u, ii: 6.9 + 0.02 * u };
  const fs = dials.textsize ? STEPS.textsize[dials.textsize] * REM : px.fs;
  const pad = dials.padding ? STEPS.padding[dials.padding].map((r) => r * REM) : px.pad;
  const [ib, ii] = dials.buttons ? STEPS.buttons[dials.buttons].map((r) => r * REM) : [px.ib, px.ii];
  return {
    fs, pad, ib, ii,
    rad: dials.corners ? STEPS.corners[dials.corners] : px.rad,
    ts: dials.titlesize ? STEPS.titlesize[dials.titlesize] * REM : 1.08 * fs,
  };
}

/** The input a card takes from an item: everything the card shows, so a card
 *  can be drawn, and compared, without the database. */
export const softwareInput = (item) => ({
  id: item.id, tier: item.tier, title: item.title, href: ownLink(item)?.url ?? null, role: item.role ?? null, text: cardText(item).details ?? '',
  links: cardLinks(item).map((l) => ({ key: relKey(l), url: l.url, label: l.label ?? null, year: l.year ?? null, count: l.count ?? null })),
});

/** A card's text as lines no wider than `width`, broken as a browser does:
 *  after a space or a hyphen between letters, and either side of a dash. */
export function wrap(text, width, widthOf) {
  const words = text.match(/[^\s-—]*-(?=[A-Za-z])|[^\s—]+-?|—|\s+/g) ?? [];
  const lines = [];
  let line = '';
  for (const w of words) {
    if (/^\s+$/.test(w)) { line += line ? ' ' : ''; continue; }
    const trial = line + w;
    if (!line || widthOf(trial.trimEnd()) <= width) line = trial;
    else { lines.push(line.trimEnd()); line = w; }
  }
  if (line) lines.push(line.trimEnd());
  return lines;
}

const symbol = (id) => {
  const m = sprite.match(new RegExp(`<symbol id="i-${id}" viewBox="([^"]+)">([\\s\\S]*?)</symbol>`));
  if (!m) throw new Error(`no icon i-${id}`);
  // As the browser writes an element out: no self-closing tags.
  return { viewBox: m[1], body: m[2].replace(/<(\w+)([^>]*?)\s*\/>/g, '<$1$2></$1>') };
};

/** A line of text a browser lays out in a box of height `lh`: its content area
 *  is the font's rounded ascent and descent, and the half-leading above it is
 *  floored. Returns the rect the text sits in. */
function line(top, lh, size) {
  const h = Math.round(ASCENT * size) + Math.round(DESCENT * size);
  return { y: top + Math.floor((lh - h) / 2), h };
}

/**
 * @param {ReturnType<typeof softwareInput>} input
 * @param {{ slug: string, theme: 'light'|'dark', measure: (text: string, f: { font: string, weight: number, size: number, ls: number }) => number }} o
 *   measure: the advance width of text in a face, letter-spacing included
 * @returns the model src/lib/cardsvg.js writes: { title, w, h, r, ops }
 */
export function softwareModel(input, { slug, theme, measure }) {
  const card = read(slug);
  const L = lengths(card);
  const t = theme === 'dark' ? 1 : 0;
  const c = Object.fromEntries(Object.entries(TOKENS).map(([k, v]) => [k, `${v[t].toLowerCase()}ff`]));
  const W = card.width;
  const [padT, padX, padB] = L.pad;
  const cw = W - 2 * padX;
  const ops = [];
  // A link as the browser reads it: a bare origin gains its /.
  const href = (u) => (u ? new URL(u).href : null);
  const text = (x, y, h, s, w, o) => ops.push({ k: 'text', x, y, w, h, s, font: o.font, weight: o.weight, size: o.size, color: o.color, ls: o.ls ?? 0, href: href(o.href) });
  const widthOf = (o) => (s) => measure(s, o);

  // The title, a link to the package: the card's own top.
  let y = padT;
  const name = { font: 'IBM Plex Mono', weight: 500, size: L.ts, ls: 0, color: c.ink, href: input.href };
  const nameLH = 1.35 * L.ts;
  const nr = line(y, nameLH, L.ts);
  text(padX, nr.y, nr.h, input.title, measure(input.title, name), name);
  y += nameLH;

  // Then the words, a block of their own: the role, where the card has one,
  // above the text.
  y += 0.35 * L.fs;
  let first = true;
  if (card.role && input.role) {
    const rs = 0.78 * L.fs;
    const o = { font: 'IBM Plex Mono', weight: 400, size: rs, ls: 0.09 * rs, color: c.accent };
    const lh = 1.5 * rs;
    for (const s of wrap(input.role.toUpperCase(), cw, widthOf(o))) {
      const r = line(y, lh, rs);
      text(padX, r.y, r.h, s, measure(s, o), o);
      y += lh;
    }
    first = false;
  }
  const body = { font: 'IBM Plex Sans', weight: 400, size: L.fs, ls: 0, color: c.mute };
  if (!first) y += 0.15 * L.fs;
  for (const s of wrap(input.text, cw, widthOf(body))) {
    const r = line(y, 1.5 * L.fs, L.fs);
    text(padX, r.y, r.h, s, measure(s, body), body);
    y += 1.5 * L.fs;
  }

  // The buttons, under the words, as many to a row as fit.
  y += 0.35 * L.fs + 0.3 * L.fs;
  const gap = 0.3 * L.fs;
  const small = { font: 'IBM Plex Sans', weight: 400, size: 0.72 * REM, ls: 0, color: c.mute };
  let x = padX;
  let rowTop = y;
  for (const l of input.links) {
    const label = l.year ?? l.count;
    const lw = label ? measure(label, small) : 0;
    // A button with a label is its padding, the mark, a gap and the label, in a border.
    const w = label ? 2 * 0.4 * REM + L.ii + 0.25 * REM + lw + 2 : L.ib;
    if (x > padX && x + w > padX + cw + 1e-6) { x = padX; rowTop += L.ib + gap; }
    const icon = symbol(REL_ICON[l.key] ?? 'link');
    ops.push({ k: 'box', x: x + 0.5, y: rowTop + 0.5, w: w - 1, h: L.ib - 1, r: Array(4).fill(L.ib * 0.25), fill: c.surface, stroke: c.ruleStrong, sw: 1, href: href(l.url) });
    const ix = x + (label ? 1 + 0.4 * REM : (w - L.ii) / 2);
    ops.push({
      k: 'svg', x: ix, y: rowTop + (L.ib - L.ii) / 2, w: L.ii, h: L.ii, href: href(l.url),
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${icon.viewBox}" fill="${c.mute.slice(0, 7)}" stroke="none" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter">${icon.body}</svg>`,
    });
    if (label) {
      const r = line(rowTop + L.ib / 2 - small.size / 2, small.size, small.size);
      text(ix + L.ii + 0.25 * REM, r.y, r.h, label, lw, { ...small, href: l.url });
    }
    x += w + gap;
  }
  const H = rowTop + L.ib + padB;

  const radii = Array(4).fill(L.rad);
  // The page's ground, then the card's tint of ink over it.
  return {
    title: input.title, w: W, h: H, r: radii,
    ops: [
      { k: 'box', x: 0, y: 0, w: W, h: H, r: radii, fill: c.ground, stroke: null, sw: 0, href: null },
      { k: 'box', x: 0, y: 0, w: W, h: H, r: radii, fill: `${c.ink.slice(0, 7)}06`, stroke: null, sw: 0, href: null },
      ...ops,
    ],
  };
}
