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
});

describe('authors:…:fit', () => {
  const byline = (w, authors) => `size:${w}:fit-figure:none-title:full:whole:link-authors:${authors}:marked-text:none-extras:venue-buttons:all:fit:right`;
  const paper = (id) => items.find((i) => i.id === id);
  // The fitted card is the card with that many names, and which count it is is read by finding it.
  async function names(id, w, length = 'full') {
    const { model } = await modelFor({ item: paper(id), name: byline(w, `${length}:fit`), width: w });
    const most = length === 'full' ? 8 : length === 'short' ? 3 : +length;
    for (let k = 1; k <= most; k += 1) {
      const counted = await modelFor({ item: paper(id), name: byline(w, k), width: w });
      if (JSON.stringify(counted.model) === JSON.stringify(model)) return k;
    }
    throw new Error(`${id} at ${w}: the fitted card is not the card of any count`);
  }

  it('draws a card with fewer names where it is narrower, and never more than the name allows', async () => {
    for (const id of ['potamides-apj', 'pinns-neurips', 'euclid-eggs-pilot']) {
      const ks = [];
      for (const w of [240, 320, 400, 600, 808]) ks.push(await names(id, w));
      expect(ks, id).toEqual([...ks].sort((x, y) => x - y));
      expect(Math.max(...ks)).toBeLessThanOrEqual(8);
      expect(Math.min(...ks)).toBeGreaterThanOrEqual(1);
      expect(ks[0], `${id}: narrower than wider`).toBeLessThan(ks.at(-1));
    }
  }, 120000);

  it('keeps to the length the name asks: short is three, a number is that many', async () => {
    expect(await names('pinns-neurips', 808, 'short')).toBeLessThanOrEqual(3);
    expect(await names('pinns-neurips', 808, '2')).toBeLessThanOrEqual(2);
  }, 60000);

  it('shows one name where none makes one line', async () => {
    expect(await names('euclid-eggs-pilot', 120)).toBe(1);
  }, 60000);

  it('is the card without :fit where the whole list fits', async () => {
    const few = items.find((i) => i.type === 'publication' && i.authors?.length === 2 && !i.collaboration);
    if (!few) return;
    const [fit, plain] = await Promise.all([byline(808, 'full:fit'), byline(808, 'full')].map((name) => modelFor({ item: few, name, width: 808 })));
    expect(fit.model).toEqual(plain.model);
  });

  it('is drawn in SVG, PNG and PDF alike', async () => {
    const { drawCard } = await import('../src/lib/cardoffline.js');
    for (const format of ['svg', 'png', 'pdf']) {
      const r = await drawCard({ item: paper('pinns-neurips'), name: byline(400, 'full:fit'), width: 400, format });
      expect(r[format].length).toBeGreaterThan(500);
    }
  }, 60000);
});

describe('figures in a PNG and a circle photo', () => {
  it('draws a WebP figure, which resvg cannot read itself, and clips a student photo to its circle', async () => {
    const { drawCard } = await import('../src/lib/cardoffline.js');
    const sharp = (await import('sharp')).default;
    const fig = await drawCard({ item: items.find((i) => i.id === 'potamides-apj'), name: 'paperHighlight', width: 640, format: 'png' });
    const img = fig.model.ops.find((o) => o.k === 'img');
    const { channels } = await sharp(fig.png).extract({ left: Math.round(img.x * 2), top: Math.round(img.y * 2), width: Math.round(img.w * 2), height: Math.round(img.h * 2) }).stats();
    expect(Math.max(...channels.map((c) => c.stdev)), 'the figure is not drawn').toBeGreaterThan(5);
    const photo = (await modelFor({ item: items.find((i) => i.id === 'pinns-neurips'), name: 'carousel', width: 400 })).model.ops.find((o) => o.k === 'img');
    expect(photo.r.every((v) => v > 5)).toBe(true);
  }, 60_000);
});

describe('a figure that cannot be drawn', () => {
  it('is an error naming its file, in every format, rather than a blank box', async () => {
    const { drawCard } = await import('../src/lib/cardoffline.js');
    const fs = await import('node:fs');
    const base = items.find((i) => i.id === 'potamides-apj');
    const draw = (image, format) => drawCard({ item: { ...base, highlight: { ...base.highlight, image } }, name: 'paperHighlight', width: 500, format });
    fs.writeFileSync('public/highlights/zz-corrupt.webp', 'not an image');
    try {
      for (const format of ['svg', 'png', 'pdf']) {
        await expect(draw('highlights/zz-corrupt.webp', format)).rejects.toThrow(/zz-corrupt\.webp is not a readable image/);
        await expect(draw('highlights/zz-missing.webp', format)).rejects.toThrow(/no figure at .*zz-missing\.webp/);
      }
    } finally {
      fs.rmSync('public/highlights/zz-corrupt.webp', { force: true });
    }
  }, 60_000);

  it('draws an SVG figure in a PNG, and an SVG that needs no file beside it', async () => {
    const { drawCard } = await import('../src/lib/cardoffline.js');
    const sharp = (await import('sharp')).default;
    const item = items.find((i) => i.id === 'astropy');
    const { svg, png, model } = await drawCard({ item, name: 'paperHighlight', width: 500, format: 'png' });
    expect([...svg.matchAll(/<image href="([^"]{0,20})/g)].every((m) => m[1].startsWith('data:'))).toBe(true);
    const f = model.ops.find((o) => o.k === 'img');
    const { channels } = await sharp(png).extract({ left: Math.round(f.x * 2), top: Math.round(f.y * 2), width: Math.round(f.w * 2), height: Math.round(f.h * 2) }).stats();
    expect(Math.max(...channels.map((c) => c.stdev)), 'the logo is not drawn').toBeGreaterThan(5);
  }, 60_000);
});
