// Properties of the offline software card (src/lib/cardoffline.js) over generated widths, texts,
// roles and buttons: what must hold of any card it draws, whatever the data. fast-check generates the
// inputs and shrinks a failure to the smallest that fails, with a seed to replay it
// (FC_SEED=… FC_PATH=…).
//
// That what it draws is what Chrome draws needs Chrome, so it is not here: `npm run check:cards`
// asks Chrome itself, in CI weekly and when the card's CSS, markup or the engine's version changes.
// FC_RUNS sets how many cases each property tries (100 by default).
import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';
import { items } from '../src/lib/data.js';
import { SITE_PRESETS } from '@nstarkman/card-builder/cards.js';
import { SITE, modelFor } from '../src/lib/cardoffline.js';
import { TIER_PRESET, cardLinks } from '@nstarkman/card-builder/cards.js';

const numRuns = +(process.env.FC_RUNS ?? 100);
const seed = process.env.FC_SEED ? +process.env.FC_SEED : undefined;
const path = process.env.FC_PATH;
// A property tries many cases, each a layout: its time is by how many.
vi.setConfig({ testTimeout: 30000 + numRuns * 400 });
const run = (prop, runs = numRuns) => fc.assert(prop, { numRuns: runs, seed, path });

// The least a button is, in CSS px: a touch target (the buttons' `--ib` is never below it).
const BUTTON_MIN = 24;
const LAYOUT_UNIT = 1 / 64;
const RELS = ['paper', 'preprint', 'doi', 'repo', 'syw', 'code', 'docs', 'data', 'slides', 'event', 'homepage'];
const astropy = items.find((i) => i.id === 'astropy');

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
const widths = fc.integer({ min: 200, max: 1200 });
const tiers = fc.constantFrom('flagship', 'major');
const themes = fc.constantFrom('light', 'dark');
const url = fc.stringMatching(/^[a-z0-9&=?\-_/]{0,30}$/).map((p) => `https://example.test/${p}`);
const links = fc.uniqueArray(fc.constantFrom(...RELS), { minLength: 0, maxLength: RELS.length })
  .chain((rels) => fc.tuple(...rels.map((rel) => fc.record({ rel: fc.constant(rel), url }))));
const inputs = fc.record({
  tier: tiers, title: fc.stringMatching(/^[A-Za-z_][A-Za-z0-9_-]{0,20}$/), role: fc.option(sentence, { nil: null }), text: sentence, links,
});
/** A card: its input at a width, in a theme. */
const cards = fc.record({ input: inputs, width: widths, theme: themes });

/** A package as the site holds one, with the words and buttons of `input` and nothing else to show. */
const itemOf = ({ title, role, text, links: l, tier }) => ({ ...astropy, tier, title, role: role ?? undefined, summary: text, details: text, links: l, refs: [], repo: undefined });
const draw = async ({ input, width, theme }) => {
  const item = itemOf(input);
  const { model } = await modelFor({ item, name: TIER_PRESET[input.tier], theme, width });
  return { model, item };
};
const texts = (m) => m.ops.filter((o) => o.k === 'text');
const buttons = (m) => m.ops.filter((o) => o.k === 'box' && o.href);
const squash = (s) => s.replace(/\s/g, '');

describe('whatever the data', () => {
  it('draws every card the same in either theme, but for colour', async () => {
    await run(fc.asyncProperty(inputs, widths, async (input, width) => {
      const { model: a } = await draw({ input, width, theme: 'light' });
      const { model: b } = await draw({ input, width, theme: 'dark' });
      expect(a.ops.length).toBe(b.ops.length);
      expect([a.w, a.h]).toEqual([b.w, b.h]);
      a.ops.forEach((o, i) => {
        for (const k of ['k', 'x', 'y', 'w', 'h', 's', 'href', 'font', 'weight', 'size']) expect(o[k], `op ${i} ${k}`).toEqual(b.ops[i][k]);
      });
    }));
  });

  it('keeps every word of the title, the role and the text, in order, none dropped or added', async () => {
    await run(fc.asyncProperty(cards, async (c) => {
      const { model } = await draw(c);
      // A line does not say whether a space was where it broke: the words, with the spaces left out.
      const all = squash(texts(model).map((o) => o.s).join(''));
      expect(all).toContain(squash(c.input.title));
      expect(all).toContain(squash(c.input.text));
      if (c.input.tier === 'flagship' && c.input.role) expect(all).toContain(squash(c.input.role.toUpperCase()));
    }));
  });

  it('breaks a title anywhere it must, a line below the one before', async () => {
    await run(fc.asyncProperty(cards, async (c) => {
      const { model } = await draw(c);
      const title = texts(model).filter((o) => o.weight === 500);
      expect(title.map((o) => o.s).join('')).toBe(c.input.title);
      title.slice(1).forEach((o, i) => expect(o.y).toBeGreaterThan(title[i].y));
      // …and always inside the card: a title is broken where it would run over.
      for (const o of title) expect(o.x + o.w, `title line "${o.s}"`).toBeLessThanOrEqual(model.w + 1e-6);
    }));
  });

  it('stays in its box: nothing above, left or below the card, and the card as high as what is in it', async () => {
    await run(fc.asyncProperty(cards, async (c) => {
      const { model } = await draw(c);
      expect(model.ops[0]).toMatchObject({ k: 'box', x: 0, y: 0, w: model.w, h: model.h });
      for (const o of model.ops.slice(2)) {
        expect(o.x, `${o.k} x`).toBeGreaterThanOrEqual(-0.01);
        expect(o.y, `${o.k} y`).toBeGreaterThanOrEqual(-0.01);
        expect(o.y + o.h, `${o.k} bottom`).toBeLessThanOrEqual(model.h + 0.01);
      }
      // Padding below the last button, and some of it.
      const last = Math.max(...buttons(model).map((o) => o.y + o.h + o.sw / 2), 0);
      if (last) expect(model.h - last).toBeGreaterThan(0);
    }));
  });

  it('draws each button once, in the order given, to its own address, no smaller than a button is', async () => {
    await run(fc.asyncProperty(cards, async (c) => {
      const { model, item } = await draw(c);
      const bs = buttons(model);
      expect(bs.map((o) => o.href)).toEqual(cardLinks(item).map((l) => new URL(l.url, SITE).href));
      // Layout is in units of 1/64 px, so a button the CSS makes 24px can come out one unit short of it.
      for (const o of bs) {
        expect(o.h + 1, 'height').toBeGreaterThanOrEqual(BUTTON_MIN - LAYOUT_UNIT);
        expect(o.w + 1, 'width').toBeGreaterThanOrEqual(BUTTON_MIN - LAYOUT_UNIT);
      }
      expect(model.ops.filter((o) => o.k === 'svg')).toHaveLength(cardLinks(item).length);
    }));
  });

  it('never overlaps two buttons', async () => {
    await run(fc.asyncProperty(cards, async (c) => {
      const { model } = await draw(c);
      const bs = buttons(model).map((o) => ({ x0: o.x - o.sw / 2, x1: o.x + o.w + o.sw / 2, y0: o.y - o.sw / 2, y1: o.y + o.h + o.sw / 2 }));
      for (let i = 0; i < bs.length; i += 1) {
        for (let j = i + 1; j < bs.length; j += 1) {
          const apart = bs[i].x1 <= bs[j].x0 + 1e-6 || bs[j].x1 <= bs[i].x0 + 1e-6 || bs[i].y1 <= bs[j].y0 + 1e-6 || bs[j].y1 <= bs[i].y0 + 1e-6;
          expect(apart, `buttons ${i} and ${j}`).toBe(true);
        }
      }
    }));
  });

  it('is no lower for more words', async () => {
    await run(fc.asyncProperty(inputs, widths, word, async (input, width, more) => {
      const h = async (i) => (await draw({ input: i, width, theme: 'light' })).model.h;
      expect(await h({ ...input, text: `${input.text} ${more}` })).toBeGreaterThanOrEqual((await h(input)) - 1e-9);
    }));
  });
});

describe('a card by name', () => {
  const flagship = TIER_PRESET.flagship;

  it('is as tall as the browser measured it: Astropy at 400 px', async () => {
    // 268.71875 is Chrome's, with the ten lines of text its measurement found (research E2).
    const { model } = await modelFor({ item: astropy, name: flagship, width: 400 });
    expect(model.w).toBe(400);
    expect(model.h).toBe(268.71875);
    expect(texts(model)).toHaveLength(10);
  });

  it('takes a preset key or the name it stands for, and a width only where the name fills one', async () => {
    const key = (await modelFor({ item: astropy, name: flagship, width: 400 })).model;
    const slug = (await import('@nstarkman/card-builder/cards.js')).SITE_PRESETS.find((p) => p.key === flagship).slug;
    expect((await modelFor({ item: astropy, name: slug, width: 400 })).model).toEqual(key);
    expect((await modelFor({ item: astropy, name: slug.replace('size:fill', 'size:400') })).model).toEqual(key);
    expect((await modelFor({ item: astropy, name: slug.replace('size:fill', 'size:400'), width: 999 })).model.w).toBe(400);
  });

  it('refuses a name it cannot read, and one that fills its width with none given, naming them', async () => {
    await expect(modelFor({ item: astropy, name: 'not-a-card-name', width: 400 })).rejects.toThrow(/cannot read the card name "not-a-card-name"/);
    await expect(modelFor({ item: astropy, name: flagship })).rejects.toThrow(new RegExp(`the card "${flagship}" fills its width: give one`));
  });

  it('is as tall as the tallest of its row, its buttons at the foot', async () => {
    const natural = (await modelFor({ item: astropy, name: flagship, width: 400 })).model;
    const tall = (await modelFor({ item: astropy, name: flagship, width: 400, minHeight: natural.h + 80 })).model;
    expect(tall.h).toBe(natural.h + 80);
    expect(tall.ops[0].h).toBe(tall.h);
    const foot = (m) => Math.max(...buttons(m).map((o) => o.y + o.h));
    expect(foot(tall) - foot(natural)).toBeCloseTo(80, 1);
    // a card already taller than the row is left as it is
    expect((await modelFor({ item: astropy, name: flagship, width: 400, minHeight: 10 })).model.h).toBe(natural.h);
  });
});

describe('the presets drawn offline', () => {
  it('are all in SITE_PRESETS, and a preset outside them is refused by name', async () => {
    const { OFFLINE_PRESETS, drawCard } = await import('../src/lib/cardoffline.js');
    const keys = SITE_PRESETS.map((p) => p.key);
    for (const k of OFFLINE_PRESETS) expect(keys).toContain(k);
    expect(OFFLINE_PRESETS).not.toContain('home');
    await expect(drawCard({ item: items.find((i) => i.id === 'astropy'), name: 'home', width: 400, format: 'svg' })).rejects.toThrow(/preset "home" is not drawn offline yet/);
  });

  it('refuses a name whose byline is fitted, which is not laid out offline', async () => {
    const { modelFor } = await import('../src/lib/cardoffline.js');
    await expect(modelFor({ item: items.find((i) => i.id === 'euclid-eggs-pilot'), name: SITE_PRESETS.find((p) => p.key === 'proceeding').slug.replace('authors:full:marked', 'authors:full:fit:marked').replace('size:fill', 'size:400'), width: 400 })).rejects.toThrow(/authors:…:fit/);
  });
});
