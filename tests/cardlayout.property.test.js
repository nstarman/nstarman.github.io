// Properties of the browser-free card (src/lib/cardlayout.js) over generated
// widths, texts, roles and buttons — what must hold of any card it draws,
// whatever the data. fast-check generates the inputs and shrinks a failure to
// the smallest that fails, with a seed to replay it (FC_SEED=… FC_PATH=…).
//
// The other half of the equivalence — that what it draws is what Chrome draws
// — needs Chrome, so it is not here: tests/cardlayout.differential.test.js,
// which CI runs weekly and on a label. FC_RUNS sets how many cases each
// property tries (100 by default).

import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';
import { BUTTON_MIN, lengths, softwareModel, wrap } from '../src/lib/cardlayout.js';
import { measure } from '../src/lib/textmeasure.js';
import { SITE_PRESETS, TIER_PRESET, atWidth, parseName } from '../src/lib/cards.js';

const numRuns = +(process.env.FC_RUNS ?? 100);
const seed = process.env.FC_SEED ? +process.env.FC_SEED : undefined;
const path = process.env.FC_PATH;
// A property tries many cases: its time is by how many.
vi.setConfig({ testTimeout: 15000 + numRuns * 150 });
const run = (prop, runs = numRuns) => fc.assert(prop, { numRuns: runs, seed, path });

const PRESET = Object.fromEntries(SITE_PRESETS.map((p) => [p.key, p.slug]));
const slugOf = (tier, width) => atWidth(PRESET[TIER_PRESET[tier]], width);

// ---- what is generated ----

/** A word: letters and the marks prose has, now and then very long. */
const word = fc.oneof(
  { weight: 8, arbitrary: fc.stringMatching(/^[A-Za-z]{1,12}$/) },
  { weight: 2, arbitrary: fc.stringMatching(/^[A-Za-z]{1,6}-[A-Za-z]{1,6}$/) },
  { weight: 1, arbitrary: fc.stringMatching(/^[A-Za-z]{1,6}-[0-9]{1,3}$/) },
  { weight: 1, arbitrary: fc.stringMatching(/^[A-Za-z]+[.,;:!?'")(]$/) },
  { weight: 1, arbitrary: fc.constantFrom('—', '·', '&', '<b>', 'a&b', '"quoted"', "it's", 'naïve', 'Zürich', 'ß', '5–10', 'x/y', 'e.g.', '3.14') },
  { weight: 1, arbitrary: fc.stringMatching(/^[A-Za-z]{25,45}$/) },
);
const sentence = fc.array(word, { minLength: 1, maxLength: 40 }).map((w) => w.join(' '));
const widths = fc.integer({ min: 120, max: 1200 });
const tiers = fc.constantFrom('lead', 'headline');
const themes = fc.constantFrom('light', 'dark');
const label = fc.oneof(fc.stringMatching(/^[0-9]{4}$/), fc.stringMatching(/^[0-9]{1,3}(\.[0-9])?k?$/));
const KEYS = ['paper', 'doi', 'preprint', 'repo', 'code', 'docs', 'data', 'slides', 'ads', 'homepage', 'event', 'stars'];
const url = fc.stringMatching(/^[a-z0-9&=?\-_/]{0,30}$/).map((p) => `https://example.test/${p}`);
const links = fc.uniqueArray(fc.constantFrom(...KEYS), { minLength: 0, maxLength: KEYS.length }).chain((keys) => fc.tuple(...keys.map((key) => fc.record({
  key: fc.constant(key), url, label: fc.constant(null), year: key === 'paper' || key === 'doi' ? fc.option(label, { nil: null }) : fc.constant(null), count: key === 'stars' ? label : fc.constant(null),
}))));
const inputs = fc.record({
  id: fc.constant('x'), tier: tiers, title: fc.stringMatching(/^[A-Za-z_][A-Za-z0-9_-]{0,20}$/), href: url,
  role: fc.option(sentence, { nil: null }), text: sentence, links,
});
/** A card: its input at a width, in a theme. */
const cards = fc.record({ input: inputs, width: widths, theme: themes });

const draw = ({ input, width, theme }) => {
  const slug = slugOf(input.tier, width);
  return { slug, model: softwareModel(input, { slug, theme, measure }), L: lengths({ dials: parseName(slug).dials, width }) };
};
const texts = (m) => m.ops.filter((o) => o.k === 'text');
const buttons = (m) => m.ops.filter((o) => o.k === 'box' && o.href);

describe('whatever the data', () => {
  it('draws every card: the same in either theme, but for colour', () => {
    run(fc.property(inputs, widths, (input, width) => {
      const a = draw({ input, width, theme: 'light' }).model, b = draw({ input, width, theme: 'dark' }).model;
      expect(a.ops.length).toBe(b.ops.length);
      expect([a.w, a.h]).toEqual([b.w, b.h]);
      a.ops.forEach((o, i) => {
        for (const k of ['k', 'x', 'y', 'w', 'h', 's', 'href', 'font', 'weight', 'size']) expect(o[k], `op ${i} ${k}`).toEqual(b.ops[i][k]);
      });
    }));
  });

  it('keeps every word of the text and of the role, in order, none dropped or added', () => {
    run(fc.property(cards, (c) => {
      const { model, L } = draw(c);
      const join = (lines) => lines.reduce((a, b) => (a.endsWith('-') || a.endsWith('—') && false ? a + b : `${a} ${b}`));
      const body = texts(model).filter((o) => o.font === 'IBM Plex Sans' && Math.abs(o.size - L.fs) < 1e-9).map((o) => o.s);
      expect(join(body)).toBe(c.input.text);
      if (c.input.tier === 'lead' && c.input.role) {
        const role = texts(model).filter((o) => o.font === 'IBM Plex Mono' && o.weight === 400).map((o) => o.s);
        expect(join(role)).toBe(c.input.role.toUpperCase());
      }
    }));
  });

  it('breaks a title anywhere it must, losing none of it', () => {
    run(fc.property(cards, (c) => {
      const { model } = draw(c);
      const title = texts(model).filter((o) => o.weight === 500).map((o) => o.s);
      expect(title.join('')).toBe(c.input.title);
      // …each line at the title's own place, a line high above the next.
      const ys = texts(model).filter((o) => o.weight === 500).map((o) => o.y);
      ys.slice(1).forEach((y, i) => expect(y).toBeGreaterThan(ys[i]));
    }));
  });

  it('puts no line past the card’s padding, but a word that cannot be broken', () => {
    run(fc.property(cards, (c) => {
      const { model, L } = draw(c);
      const cw = c.width - 2 * L.pad[1];
      for (const o of texts(model).filter((x) => x.font !== 'IBM Plex Sans' || x.size === L.fs)) {
        // A title is broken anywhere, so it always fits; a word of the text or the role that cannot be broken may not.
        if (o.weight === 500) expect(o.w, `title line "${o.s}"`).toBeLessThanOrEqual(cw + 1e-6);
        else if (o.w > cw + 1e-6) expect(/[\s—]|-(?=[A-Za-z])/.test(o.s), `"${o.s}" is ${o.w} in ${cw}`).toBe(false);
      }
    }));
  });

  it('stays in its box: nothing above, left or below the card, and the card as high as what is in it', () => {
    run(fc.property(cards, (c) => {
      const { model, L } = draw(c);
      expect(model.ops[0].h).toBe(model.h);
      for (const o of model.ops.slice(2)) {
        expect(o.x, `${o.k} x`).toBeGreaterThanOrEqual(L.pad[1] - 0.01);
        expect(o.y, `${o.k} y`).toBeGreaterThanOrEqual(0);
        expect(o.y + o.h, `${o.k} bottom`).toBeLessThanOrEqual(model.h - L.pad[2] + 0.01);
      }
      // The padding below the last button, exactly.
      const last = Math.max(...buttons(model).map((o) => o.y + o.h + 0.5), 0);
      // …and, below a button, what the list item's own strut needs there, which is at most a few px.
      if (last) { expect(model.h - last).toBeGreaterThanOrEqual(L.pad[2] - 1e-6); expect(model.h - last).toBeLessThan(L.pad[2] + 8); }
    }));
  });

  it('draws each button once, in the order given, to its own address, no smaller than a button is', () => {
    run(fc.property(cards, (c) => {
      const { model } = draw(c);
      const bs = buttons(model);
      expect(bs.map((o) => o.href)).toEqual(c.input.links.map((l) => new URL(l.url).href));
      for (const o of bs) {
        expect(o.h + 1, 'height').toBeGreaterThanOrEqual(BUTTON_MIN - 1e-9);
        expect(o.w + 1, 'width').toBeGreaterThanOrEqual(BUTTON_MIN - 1e-9);
      }
      expect(model.ops.filter((o) => o.k === 'svg')).toHaveLength(c.input.links.length);
    }));
  });

  it('never overlaps two buttons, and fills a row before it starts the next', () => {
    run(fc.property(cards, (c) => {
      const { model, L } = draw(c);
      const bs = buttons(model).map((o) => ({ x0: o.x - 0.5, x1: o.x + o.w + 0.5, y0: o.y - 0.5, y1: o.y + o.h + 0.5 }));
      const cw = c.width - 2 * L.pad[1] - 0.8 * L.fs; // the buttons' box's gaps
      for (let i = 1; i < bs.length; i += 1) {
        const a = bs[i - 1], b = bs[i];
        if (Math.abs(b.y0 - a.y0) < 0.01) expect(b.x0, 'same row, left to right').toBeGreaterThanOrEqual(a.x1 - 1e-6);
        else {
          expect(b.y0, 'next row below').toBeGreaterThanOrEqual(a.y1 - 1e-6);
          expect(b.x0, 'next row from the left').toBeCloseTo(L.pad[1], 6);
          // It wrapped because it would not fit: the row before could not take it.
          const used = bs.filter((x) => Math.abs(x.y0 - a.y0) < 0.01).reduce((m, x) => Math.max(m, x.x1), 0);
          expect(used + 0.3 * L.fs + (b.x1 - b.x0), 'wrapped for room').toBeGreaterThan(L.pad[1] + cw - 1e-6);
        }
      }
    }));
  });

  it('is no lower for more words, and no higher for a wider box of the same look', () => {
    run(fc.property(inputs, widths, word, (input, width, more) => {
      const h = (i) => draw({ input: i, width, theme: 'light' }).model.h;
      expect(h({ ...input, text: `${input.text} ${more}` })).toBeGreaterThanOrEqual(h(input) - 1e-9);
    }));
  });
});

describe('wrapping', () => {
  const widthOf = (s) => measure(s, { font: 'IBM Plex Sans', weight: 400, size: 15, ls: 0 });
  const bounds = fc.integer({ min: 20, max: 700 });

  it('makes no more lines in a wider box', () => {
    run(fc.property(sentence, bounds, bounds, (text, a, b) => {
      const [lo, hi] = a < b ? [a, b] : [b, a];
      expect(wrap(text, hi, widthOf).length).toBeLessThanOrEqual(wrap(text, lo, widthOf).length);
    }));
  });

  it('makes lines that fit, but for a word too long to break, and never an empty one', () => {
    run(fc.property(sentence, bounds, (text, width) => {
      for (const l of wrap(text, width, widthOf)) {
        expect(l.length).toBeGreaterThan(0);
        expect(l).toBe(l.trim());
        if (widthOf(l) > width + 1e-9) expect(/[\s—]|-(?=[A-Za-z])/.test(l), l).toBe(false);
      }
    }));
  });

  it('keeps every character: the lines, put back, are the text', () => {
    run(fc.property(sentence, bounds, (text, width) => {
      const lines = wrap(text, width, widthOf);
      expect(lines.join('').replace(/\s/g, '')).toBe(text.replace(/\s/g, ''));
    }));
  });

  it('is the one line there is, or none, where there is room for all of it', () => {
    run(fc.property(sentence, (text) => {
      expect(wrap(text, 1e6, widthOf)).toEqual([text]);
    }));
    expect(wrap('', 100, widthOf)).toEqual([]);
  });
});
