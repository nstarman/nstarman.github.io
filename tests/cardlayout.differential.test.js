// The browser-free card (src/lib/cardlayout.js) against Chrome, over generated
// data. tests/cardlayout.test.js holds it to a recording of Chrome at a few
// widths; tests/cardlayout.property.test.js holds it to what must be true of
// any card; this one asks Chrome itself, for cards nobody recorded: a random
// width, a random title, text and role, a random subset of the package's
// buttons with random labels — laid out by the real card CSS on the real embed
// page, and by cardlayout.js, and compared. A difference is shrunk to the
// smallest card that shows it.
//
// It needs a browser and the site, so it runs only when asked:
//
//   npx astro dev --port 4321 &
//   CARD_FUZZ=1 npx vitest run tests/cardlayout.differential.test.js
//
// FUZZ_SITE (default http://localhost:4321) is where the site is, FC_RUNS how
// many cards to try (100), FUZZ_MINUTES the longest to run (20), FC_SEED and
// FC_PATH replay a failure, FUZZ_OUT a
// directory for it as JSON. CI runs it weekly, on request and when a pull
// request is labelled fuzz-cards: .github/workflows/card-layout-fuzz.yml.

import fs from 'node:fs';
import fc from 'fast-check';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { softwareInput, softwareModel } from '../src/lib/cardlayout.js';
import { measure } from '../src/lib/textmeasure.js';
import { softwareCards, THEMES } from '../src/lib/softwarecards.js';

const enabled = !!process.env.CARD_FUZZ;
const site = process.env.FUZZ_SITE ?? 'http://localhost:4321';
const numRuns = +(process.env.FC_RUNS ?? 100);
const seed = process.env.FC_SEED ? +process.env.FC_SEED : undefined;
const path = process.env.FC_PATH;
const minutes = +(process.env.FUZZ_MINUTES ?? 20);
vi.setConfig({ testTimeout: (minutes + 5) * 60000 });

// ---- what is generated: as in cardlayout.property.test.js, a card of a package ----

const word = fc.oneof(
  { weight: 8, arbitrary: fc.stringMatching(/^[A-Za-z]{1,12}$/) },
  { weight: 2, arbitrary: fc.stringMatching(/^[A-Za-z]{1,6}-[A-Za-z]{1,6}$/) },
  { weight: 1, arbitrary: fc.stringMatching(/^[A-Za-z]{1,6}-[0-9]{1,3}$/) },
  { weight: 1, arbitrary: fc.stringMatching(/^[A-Za-z]+[.,;:!?'")(]$/) },
  { weight: 1, arbitrary: fc.constantFrom('—', '·', '&', '<b>', 'a&b', '"quoted"', "it's", 'naïve', 'Zürich', 'ß', '5–10', 'x/y', 'e.g.', '3.14') },
  { weight: 1, arbitrary: fc.stringMatching(/^[A-Za-z]{25,45}$/) },
);
const sentence = fc.array(word, { minLength: 1, maxLength: 40 }).map((w) => w.join(' '));
const label = fc.oneof(fc.stringMatching(/^[0-9]{4}$/), fc.stringMatching(/^[0-9]{1,3}(\.[0-9])?k?$/));
const cards = fc.record({
  id: fc.constantFrom(...softwareCards.map((c) => c.input.id)),
  width: fc.integer({ min: 160, max: 900 }),
  theme: fc.constantFrom(...THEMES),
  title: fc.option(fc.stringMatching(/^[A-Za-z_][A-Za-z0-9_-]{0,30}$/), { nil: null }),
  text: fc.option(sentence, { nil: null }),
  role: fc.option(sentence, { nil: null }),
  // The first button always stays: a card with none is another card (no box for them), which the unit tests have.
  keep: fc.array(fc.boolean(), { minLength: 11, maxLength: 11 }).map((k) => [true, ...k]),
  labels: fc.array(label, { minLength: 12, maxLength: 12 }),
});

/** The input the page's card has, after the same edits are made to it. */
function edited(input, c) {
  let k = 0;
  const links = input.links.flatMap((l, i) => {
    if (!c.keep[i]) return [];
    const labelled = l.year != null || l.count != null;
    const text = labelled ? c.labels[k] : null;
    k += 1;
    return [{ ...l, ...(l.year != null ? { year: text } : {}), ...(l.count != null ? { count: text } : {}) }];
  });
  return { ...input, title: c.title ?? input.title, text: c.text ?? input.text, role: input.role && c.role ? c.role : input.role, links };
}

/** The same edits, made to the page. */
const edit = ({ title, text, role, keep, labels }) => {
  const card = document.querySelector('.card');
  if (title != null) for (const t of card.querySelectorAll('.c-name .c-t')) t.textContent = title;
  if (text != null) card.querySelector('.c-det').textContent = text;
  if (role != null) { const r = card.querySelector('.c-role'); if (r) r.textContent = role; }
  let k = 0;
  [...card.querySelectorAll('.c-foot .btns > li[data-rel]')].forEach((li, i) => {
    if (!keep[i]) { li.remove(); return; }
    const y = li.querySelector('.iconyear');
    if (y) y.textContent = labels[k];
    k += 1;
  });
};

/** How the two cards differ, as lines: nothing if they do not. */
function differences(got, want) {
  const out = [];
  const near = (a, b, tol) => Math.abs(a - b) <= tol;
  if (!near(got.h, want.h, 0.5)) out.push(`card height ${got.h.toFixed(2)}, Chrome ${want.h.toFixed(2)}`);
  if (got.ops.length !== want.ops.length) {
    out.push(`${got.ops.length} ops, Chrome ${want.ops.length}`);
    const txt = (m) => m.ops.filter((o) => o.k === 'text').map((o) => o.s);
    out.push(`  text ${JSON.stringify(txt(got))}`, `  Chrome ${JSON.stringify(txt(want))}`);
    return out;
  }
  got.ops.forEach((o, i) => {
    const w = want.ops[i];
    const at = `op ${i} ${o.k}${o.s ? ` ${JSON.stringify(o.s)}` : ''}`;
    if (o.k !== w.k) return out.push(`${at}: Chrome has a ${w.k}`);
    for (const [k, tol] of [['x', 0.3], ['y', 0.3], ['w', o.k === 'text' ? 0.75 : 0.3], ['h', 0.3]]) if (!near(o[k], w[k], tol)) out.push(`${at}: ${k} ${o[k].toFixed(2)}, Chrome ${w[k].toFixed(2)}`);
    for (const k of ['s', 'font', 'weight', 'color', 'fill', 'stroke', 'href', 'svg']) if (o[k] !== w[k]) out.push(`${at}: ${k} ${JSON.stringify(o[k])}, Chrome ${JSON.stringify(w[k])}`);
  });
  return out;
}

describe.skipIf(!enabled)('against Chrome, over generated cards', () => {
  let browser, page;
  const real = new Map();

  beforeAll(async () => {
    const { chromium } = await import('playwright');
    browser = await chromium.launch();
    // 1280 wide, where the root font size is the 16px cardlayout.js is written for.
    page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(`${site}/software/`);
    for (const { input: { id } } of softwareCards) {
      // Page code as text: vitest rewrites an import() in a function, which the page could not run.
      real.set(id, await page.evaluate(`(async () => {
        const { items } = await import('/src/lib/data.js');
        const { softwareInput } = await import('/src/lib/cardlayout.js');
        return softwareInput(items.find((i) => i.id === ${JSON.stringify(id)}));
      })()`));
    }
  }, 120000);
  afterAll(async () => { await browser?.close(); });

  it('lays a card out where Chrome does', async () => {
    const slugs = Object.fromEntries(softwareCards.map((c) => [c.input.id, c.slug]));
    const property = fc.asyncProperty(cards, async (c) => {
      const slug = slugs[c.id].replace(/^size:\d+:/, `size:${c.width}:`);
      const input = edited(real.get(c.id), c);
      const want = softwareModel(input, { slug, theme: c.theme, measure });
      await page.goto(`${site}/embed/${c.id}/?card=${encodeURIComponent(slug)}&theme=${c.theme}`, { waitUntil: 'networkidle' });
      await page.evaluate(`(${edit.toString()})(${JSON.stringify(c)})`);
      const got = await page.evaluate(`(async () => {
        const { measureCard } = await import('/src/lib/cardpdf.js');
        await document.fonts.ready;
        return measureCard(document.querySelector('.card'), { title: 'x', site: 'https://nstarkman.space' }).model;
      })()`);
      const diff = differences(want, got);
      if (diff.length) throw new Error(`${slug} (${c.theme})\n${diff.slice(0, 12).join('\n')}`);
    });
    try {
      // A time limit, shrinking included: a run that cannot finish is a result too.
      await fc.assert(property, { numRuns, seed, path, interruptAfterTimeLimit: minutes * 60000, markInterruptAsFailure: false });
    } catch (e) {
      // A failure, as a file a workflow can keep.
      if (process.env.FUZZ_OUT) { fs.mkdirSync(process.env.FUZZ_OUT, { recursive: true }); fs.writeFileSync(`${process.env.FUZZ_OUT}/counterexample.txt`, String(e.message)); }
      throw e;
    }
    expect(real.size).toBeGreaterThan(0);
  });
});
