// The browser-free card (src/lib/cardlayout.js) held to the card the browser
// draws. Three ways, so a change to either side shows up here:
//
//   1. the numbers it uses are the stylesheet's: the colours, the look's
//      steps, the formulas of a card of set width, the line heights;
//   2. it reproduces what the browser measured for every lead and headline
//      package (tests/fixtures/software-cards.json, from
//      scripts/record-card-layouts.mjs) — and that measurement is stamped
//      with a hash of the card's CSS and markup, so a change to them fails
//      until it is measured again;
//   3. what it draws is what the site holds: every package, its links, its
//      star count, and the presets it is asked for.

import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { REM, STEPS, TOKENS, lengths, softwareInput, softwareModel, wrap } from '../src/lib/cardlayout.js';
import { measure } from '../src/lib/textmeasure.js';
import { modelToSvg } from '../src/lib/cardsvg.js';
import { softwareCards, THEMES, drawCard, cardFile } from '../src/lib/softwarecards.js';
import { SITE_PRESETS, TIER_PRESET, CARD_SVG_WIDTH, atWidth, parseName, cardFace, cardFacts, cardLinks, linkKeys, LOOKS } from '../src/lib/cards.js';
import { items } from '../src/lib/data.js';
import { syncKey, cardRules } from '../scripts/lib/cardsync.mjs';

const css = fs.readFileSync('src/styles/global.css', 'utf8');
const fixture = JSON.parse(fs.readFileSync('tests/fixtures/software-cards.json', 'utf8'));
const num = (expr, u) => Function(`return (${expr.replace(/var\(--u\)/g, u).replace(/(\d)(rem|px)/g, (_, d, unit) => (unit === 'rem' ? `${d}*${REM}` : d)).replace(/calc/g, '')})`)();
const rule = (selector) => css.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`))?.[1];
const decl = (body, prop) => body.match(new RegExp(`${prop}:\\s*([^;]+)`))?.[1].trim();

describe('the numbers are the stylesheet’s', () => {
  it('colours, from the tokens on :root', () => {
    const root = css.match(/:root\{([\s\S]*?)\n\}/)[1];
    const tok = (name) => root.match(new RegExp(`--${name}:light-dark\\((#[0-9A-Fa-f]{6}),(#[0-9A-Fa-f]{6})\\)`)).slice(1);
    expect(TOKENS).toEqual({ ground: tok('ground'), surface: tok('surface'), ink: tok('ink'), mute: tok('ink-mute'), ruleStrong: tok('rule-strong'), accent: tok('accent') });
  });

  it('the root font size is the 16px the lengths are written for, at 1280px wide', () => {
    expect(css).toMatch(/html\{font-size:clamp\(100%, \.6rem \+ \.5vw, 125%\)\}/);
    expect(Math.max(REM, 0.6 * REM + 0.005 * 1280)).toBe(REM);
  });

  it('every step of the look', () => {
    for (const step of LOOKS) {
      const one = (dial, prop) => decl(css.match(new RegExp(`\\.card\\[data-${dial}="${step}"\\]\\{([^}]*)\\}`))[1], prop);
      expect(STEPS.textsize[step], `textsize ${step}`).toBeCloseTo(num(one('textsize', '--fs')) / REM, 6);
      expect(STEPS.padding[step], `padding ${step}`).toEqual(['--pad-t', '--pad-x', '--pad-b'].map((p) => num(one('padding', p)) / REM));
      expect(STEPS.corners[step], `corners ${step}`).toBe(num(one('corners', '--rad')));
      expect(STEPS.buttons[step], `buttons ${step}`).toEqual(['--ib', '--ii'].map((p) => num(one('buttons', p)) / REM));
      expect(STEPS.titlesize[step], `titlesize ${step}`).toBeCloseTo(num(one('titlesize', '--ts')) / REM, 6);
    }
  });

  it('the formulas of a card of set width', () => {
    const body = rule('.card[data-w="px"]');
    const prop = (p, u) => num(decl(body, p), u);
    for (const width of [240, 320, 400, 640]) {
      const got = lengths({ dials: {}, width });
      expect(got.fs, width).toBeCloseTo(prop('--fs', width), 6);
      expect(got.pad[0], width).toBeCloseTo(prop('--pad-t', width), 6);
      expect(got.pad[1], width).toBeCloseTo(prop('--pad-x', width), 6);
      expect(got.pad[2], width).toBeCloseTo(prop('--pad-t', width), 6); // --pad-b: var(--pad-t)
      expect(got.rad, width).toBeCloseTo(prop('--rad', width), 6);
      expect(got.ib, width).toBeCloseTo(prop('--ib', width), 6);
      expect(got.ii, width).toBeCloseTo(prop('--ii', width), 6);
    }
    expect(decl(body, '--pad-b')).toBe('var(--pad-t)');
  });

  it('the proportions of a card’s parts', () => {
    // [what, where, the declaration] — each a number the layout multiplies by.
    const has = (re, what) => expect(css, what).toMatch(re);
    has(/\.c-name\{[^}]*font-size:var\(--ts, 1\.08em\)[^}]*line-height:1\.35/, 'title: 1.08em, line-height 1.35');
    has(/\.card\[data-size\] \.c-text p\{[^}]*line-height:1\.5/, 'text: line-height 1.5');
    has(/\.c-text\{display:flex; flex-direction:column; gap:\.15em/, 'the role and the text: .15em apart');
    has(/\.c-role\{[^}]*font-size:\.78em; letter-spacing:\.09em; text-transform:uppercase/, 'role: .78em, .09em apart, upper case');
    has(/--gr:\.35em/, 'the margin above each part, .35em');
    has(/\.c-foot\{display:grid[^}]*padding-top:\.3em/, 'the buttons: .3em of padding above');
    has(/\.card \.c-foot \.btns--icon\{[^}]*--bg:var\(--bgap, \.3em\)/, 'the buttons: .3em apart');
    has(/\.c-foot \.iconbtn\{width:var\(--ib\); height:var\(--ib\); border-radius:calc\(var\(--ib\) \* \.25\)\}/, 'a button: --ib square, a quarter rounded');
    has(/\.iconyear\{font-size:\.72rem; line-height:1/, 'a button’s label: .72rem');
    has(/\.iconbtn:has\(\.iconyear\)[^{]*\{\s*width:auto; padding:0 \.4rem; gap:\.25rem/, 'a labelled button: .4rem of padding, .25rem to the mark');
    has(/\.iconbtn\{[^}]*border:1px solid var\(--rule-strong\)/, 'a button: a 1px border');
    has(/background:color-mix\(in srgb, var\(--ink\) 2\.5%, transparent\)/, 'the card: 2.5% ink');
  });

  it('the icons are the sprite’s, a link by its key', () => {
    const ops = softwareModel(softwareInput(items.find((i) => i.id === 'unxt')), { slug: atWidth(PRESET_OF.softwareHeadline, 400), theme: 'light', measure }).ops;
    expect(ops.filter((o) => o.k === 'svg').map((o) => o.svg.match(/viewBox="([^"]+)"/)[1])).toHaveLength(4);
  });
});

const PRESET_OF = Object.fromEntries(SITE_PRESETS.map((p) => [p.key, p.slug]));

describe('the browser’s own measurement of each card', () => {
  it('is of the CSS and markup there now — if this fails, run scripts/record-card-layouts.mjs and read the fixture’s diff', () => {
    expect(fixture.syncKey).toBe(syncKey());
  });

  it('is of the cards the site draws: a card for every lead and headline package, none for another', () => {
    expect(fixture.cards.map((c) => c.id).sort()).toEqual(softwareCards.map((c) => c.item.id).sort());
  });

  it('is of the names the site asks for, read the way the page reads them', () => {
    for (const c of fixture.cards) {
      const item = items.find((i) => i.id === c.id);
      expect(c.slug, c.id).toBe(atWidth(PRESET_OF[TIER_PRESET[item.tier]], CARD_SVG_WIDTH));
      const face = cardFace(parseName(c.slug), cardFacts(item, true));
      expect({ data: face.data, style: face.style }, c.id).toEqual(c.face);
    }
  });

  for (const c of fixture.cards) {
    for (const theme of THEMES) {
      it(`${c.id}, ${theme}: every box, icon and line of text where the browser put it`, () => {
        const got = softwareModel(c.input, { slug: c.slug, theme, measure });
        const want = c.models[theme];
        expect(got.w).toBe(want.w);
        expect(got.h).toBeCloseTo(want.h, 0);
        expect(got.r).toEqual(want.r.map((r) => expect.closeTo(r, 1)));
        expect(got.ops.map((o) => o.k)).toEqual(want.ops.map((o) => o.k));
        got.ops.forEach((o, i) => {
          const w = want.ops[i];
          const at = `${c.id} ${theme} op ${i} ${o.k}${o.s ? ` ${JSON.stringify(o.s)}` : ''}`;
          // A line is as wide as the font says: a hair off where the browser kerns a pair differently.
          for (const [k, tol] of [['x', 0.15], ['y', 0.15], ['w', o.k === 'text' ? 1.5 : 0.15], ['h', 0.15]]) {
            expect(Math.abs(o[k] - w[k]), `${at}: ${k} ${o[k]} for ${w[k]}`).toBeLessThanOrEqual(tol);
          }
          for (const k of ['s', 'font', 'weight', 'color', 'fill', 'stroke', 'sw', 'href', 'svg', 'fit']) expect(o[k], `${at}: ${k}`).toEqual(w[k]);
          expect(o.ls ?? 0, `${at}: ls`).toBeCloseTo(w.ls ?? 0, 3);
          expect(o.size ?? 0, `${at}: size`).toBeCloseTo(w.size ?? 0, 2);
          if (w.r) expect(o.r.map((r) => Math.round(r * 10)), `${at}: r`).toEqual(w.r.map((r) => Math.round(r * 10)));
        });
      });
    }
  }
});

describe('what it takes a name for', () => {
  it('draws the presets the site gives the tiers, and says what it cannot draw when one moves', () => {
    for (const key of Object.values(TIER_PRESET)) {
      const slug = atWidth(PRESET_OF[key], CARD_SVG_WIDTH);
      const input = softwareInput(items.find((i) => i.type === 'software'));
      expect(() => softwareModel(input, { slug, theme: 'light', measure }), key).not.toThrow();
    }
  });

  it('refuses a name that asks for more than it draws', () => {
    const input = softwareInput(items.find((i) => i.id === 'unxt'));
    const base = atWidth(PRESET_OF.softwareHeadline, 400);
    const draw = (slug) => () => softwareModel(input, { slug, theme: 'light', measure });
    expect(draw(PRESET_OF.softwareHeadline)).toThrow(/set width/);
    expect(draw(base.replace('figure:none', 'figure:center:auto'))).toThrow(/figure/);
    expect(draw(base.replace('authors:none', 'authors:short'))).toThrow(/authors/);
    expect(draw(base.replace('buttons:all:fit', 'buttons:code'))).toThrow(/links/);
    expect(draw(base.replace('extras:none', 'extras:year'))).toThrow(/extras|year/);
    expect(draw(`${base}-space:title_figure=8`)).toThrow();
    expect(draw(base.replace('size:400:fit', 'size:400:200'))).toThrow(/height/);
    expect(draw(base.replace('title:full:whole:link', 'title:short:link'))).toThrow();
    expect(draw(`${base}-look:buttongap=8`)).toThrow(/buttongap|look/);
  });
});

describe('what it draws is what the site holds', () => {
  it('a card for each lead and headline package, with its preset and no other', () => {
    const want = items.filter((i) => i.type === 'software' && ['lead', 'headline'].includes(i.tier)).map((i) => i.id).sort();
    expect(softwareCards.map((c) => c.item.id).sort()).toEqual(want);
    expect(want.length).toBeGreaterThanOrEqual(7);
    expect(Object.keys(TIER_PRESET).sort()).toEqual(['headline', 'lead']);
  });

  for (const { item, input, slug } of softwareCards) {
    for (const theme of THEMES) {
      it(`${item.id}, ${theme}: its title, its words, its links in the card’s order, its stars — and a valid SVG`, async () => {
        const record = items.find((i) => i.id === item.id);
        const model = softwareModel(input, { slug, theme, measure });
        const links = model.ops.filter((o) => o.k === 'box' && o.href).map((o) => o.href);
        expect(links).toEqual(cardLinks(record).map((l) => new URL(l.url).href));
        expect(linkKeys(record).at(-1)).toBe('stars');
        const texts = model.ops.filter((o) => o.k === 'text');
        expect(texts[0]).toMatchObject({ s: record.title, href: input.href, font: 'IBM Plex Mono' });
        expect(texts.some((o) => o.s === input.links.at(-1).count)).toBe(true);
        // Every word of the text, in order, none dropped or added.
        const body = texts.filter((o) => o.font === 'IBM Plex Sans' && o.size === lengths({ dials: parseName(slug).dials, width: 400 }).fs).map((o) => o.s).reduce((a, b) => (a.endsWith('-') ? a + b : `${a} ${b}`));
        expect(body).toBe(input.text.replace(/\s+/g, ' '));
        if (record.tier === 'lead') expect(texts.filter((o) => o.color === `${TOKENS.accent[THEMES.indexOf(theme)].toLowerCase()}ff`).map((o) => o.s).join(' ')).toBe(record.role.toUpperCase());

        const svg = drawCard(input, slug, theme);
        const meta = await sharp(Buffer.from(svg)).metadata();
        expect([meta.format, meta.width]).toEqual(['svg', 400]);
        expect(svg).toBe(modelToSvg(model));
        expect(svg.match(/<a href=/g)?.length).toBeGreaterThanOrEqual(links.length);
        for (const url of links) expect(svg).toContain(`<a href="${url.replace(/&/g, '&amp;')}">`);
        expect(svg).toContain(`<a href="${new URL(input.href).href}"><text`);
      });
    }
  }

  it('every card fits its box: nothing runs past the card’s padding, nothing is left over', () => {
    for (const { input, slug } of softwareCards) {
      const m = softwareModel(input, { slug, theme: 'light', measure });
      const { pad } = lengths({ dials: parseName(slug).dials, width: CARD_SVG_WIDTH });
      for (const o of m.ops.slice(2)) {
        expect(o.x, input.id).toBeGreaterThanOrEqual(pad[1] - 0.01);
        expect(o.x + o.w, input.id).toBeLessThanOrEqual(CARD_SVG_WIDTH - pad[1] + 1.5);
        expect(o.y + o.h, input.id).toBeLessThanOrEqual(m.h - pad[2] + 0.01);
      }
    }
  });

  it('files are named /cards/<id>-<theme>.svg', () => {
    expect(cardFile('unxt', 'dark')).toBe('/cards/unxt-dark.svg');
  });
});

describe('the pieces', () => {
  const w = (s) => s.length * 10;
  it('wraps greedily, after a space, a hyphen between letters, or a dash', () => {
    expect(wrap('aaa bbb ccc ddd', 75, w)).toEqual(['aaa bbb', 'ccc ddd']);
    expect(wrap('Unit-aware quantities', 100, w)).toEqual(['Unit-aware', 'quantities']);
    expect(wrap('Unit-aware quantities', 55, w)).toEqual(['Unit-', 'aware', 'quantities']);
    expect(wrap('resolution — the layer', 130, w)).toEqual(['resolution —', 'the layer']);
    expect(wrap('', 100, w)).toEqual([]);
    expect(wrap('onlyoneverylongword', 50, w)).toEqual(['onlyoneverylongword']);
  });

  it('measures as the font does, with the letter-spacing a browser adds after every character', () => {
    const f = { font: 'IBM Plex Sans', weight: 400, size: 16, ls: 0 };
    expect(measure('unit', f)).toBeGreaterThan(0);
    expect(measure('unit', { ...f, ls: 1 })).toBeCloseTo(measure('unit', f) + 4, 6);
    expect(() => measure('x', { ...f, weight: 900 })).toThrow(/no face/);
  });

  it('keys the card’s CSS and not the rest of the stylesheet', () => {
    const rules = cardRules(css);
    expect(rules.length).toBeGreaterThan(50);
    expect(rules.some((r) => r.startsWith('.card['))).toBe(true);
    expect(rules.every((r) => !/^nav\b|^footer\b/.test(r))).toBe(true);
  });
});
