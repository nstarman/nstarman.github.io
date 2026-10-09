// Records what the browser makes of the software cards, for the tests that hold
// the browser-free renderer (src/lib/cardlayout.js) to it.
//
//   npm i --no-save playwright && npx playwright install chromium
//   npx astro dev --port 4321 &
//   node scripts/record-card-layouts.mjs [http://localhost:4321]
//
// Writes tests/fixtures/software-cards.json: for each lead and headline
// package, the inputs the renderer takes and the card cardpdf.js measures from
// the real page, in both themes — plus sync.key, which tests/cardlayout.test.js
// recomputes from the card CSS and markup. When that test fails the CSS has
// moved: run this, and read the diff of the fixture as the change in layout.

import fs from 'node:fs';
import { readItems } from './lib/items.mjs';
import { syncKey } from './lib/cardsync.mjs';

const site = process.argv[2] ?? 'http://localhost:4321';
const { chromium } = await import('playwright');
const tiers = readItems().map((r) => r.item).filter((i) => i.type === 'software' && ['flagship', 'major'].includes(i.tier));

const browser = await chromium.launch();
// 1280 wide is where the root font size is exactly 16px, which the renderer assumes.
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const out = { cards: [] };
await page.goto(`${site}/software/`); // somewhere that can import the site's modules
// Widths either side of the README's, so wrapping, a second row of buttons and
// the formulas of a card of set width are measured, not only reasoned about.
// Light at each; dark too at the README's own.
const WIDTHS = [200, 280, 400, 640, 808];
const README = [400, 808]; // a card's width in the README: the lead's spans two columns (CARD_WIDE)
for (const { id } of tiers) {
  const rec = { id, cases: [] };
  for (const width of WIDTHS) {
    for (const theme of README.includes(width) ? ['light', 'dark'] : ['light']) {
      // The name goes in the query, as the README's images ask for it; the page
      // applies it before the first paint.
      const slug = await page.evaluate(async ({ id, width }) => {
        const { items } = await import('/src/lib/data.js');
        const { SITE_PRESETS, TIER_PRESET, atWidth } = await import('/src/lib/cards.js');
        return atWidth(SITE_PRESETS.find((p) => p.key === TIER_PRESET[items.find((i) => i.id === id).tier]).slug, width);
      }, { id, width });
      await page.goto(`${site}/embed/${id}/?card=${encodeURIComponent(slug)}&theme=${theme}`, { waitUntil: 'networkidle' });
      const r = await page.evaluate(async ({ id, slug }) => {
        const { items } = await import('/src/lib/data.js');
        const { parseName, cardFace, cardFacts } = await import('/src/lib/cards.js');
        const { softwareInput } = await import('/src/lib/cardlayout.js');
        const { measureCard } = await import('/src/lib/cardpdf.js');
        const item = items.find((i) => i.id === id);
        await document.fonts.ready;
        const face = cardFace(parseName(slug), cardFacts(item, true));
        return { face: { data: face.data, style: face.style }, input: softwareInput(item), model: measureCard(document.querySelector('.card'), { title: item.title, site: 'https://nstarkman.space' }).model };
      }, { id, slug });
      rec.input = r.input;
      rec.cases.push({ width, theme, slug, face: r.face, model: r.model });
    }
  }
  out.cards.push(rec);
}
await browser.close();
out.syncKey = syncKey();
// Small: each icon's markup once, by number, and one case to a line — the models
// are long, and what a change to the card does shows as the lines that moved.
const svgs = [];
for (const c of out.cards) for (const k of c.cases) for (const o of k.model.ops) if (o.svg) o.svg = svgs.indexOf(o.svg) >= 0 ? svgs.indexOf(o.svg) : svgs.push(o.svg) - 1;
const cards = out.cards.map((c) => `{"id":${JSON.stringify(c.id)},"input":${JSON.stringify(c.input)},"cases":[\n${c.cases.map((k) => JSON.stringify(k)).join(',\n')}\n]}`);
fs.mkdirSync('tests/fixtures', { recursive: true });
fs.writeFileSync('tests/fixtures/software-cards.json', `{"syncKey":"${out.syncKey}","svgs":${JSON.stringify(svgs)},\n"cards":[\n${cards.join(',\n')}\n]}\n`);
console.log(`recorded ${out.cards.length} cards`);
