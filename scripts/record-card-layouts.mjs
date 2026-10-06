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
const tiers = readItems().map((r) => r.item).filter((i) => i.type === 'software' && ['lead', 'headline'].includes(i.tier));

const browser = await chromium.launch();
// 1280 wide is where the root font size is exactly 16px, which the renderer assumes.
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const out = { cards: [] };
await page.goto(`${site}/software/`); // somewhere that can import the site's modules
for (const { id } of tiers) {
  const rec = { id, models: {} };
  for (const theme of ['light', 'dark']) {
    // The name goes in the query, as the README's images ask for it; the page
    // applies it before the first paint.
    const slug = await page.evaluate(async (id) => {
      const { items } = await import('/src/lib/data.js');
      const { SITE_PRESETS, TIER_PRESET, atWidth, CARD_SVG_WIDTH } = await import('/src/lib/cards.js');
      return atWidth(SITE_PRESETS.find((p) => p.key === TIER_PRESET[items.find((i) => i.id === id).tier]).slug, CARD_SVG_WIDTH);
    }, id);
    const q = `?card=${encodeURIComponent(slug)}&theme=${theme}`;
    await page.goto(`${site}/embed/${id}/${q}`, { waitUntil: 'networkidle' });
    const r = await page.evaluate(async ({ id }) => {
      const { items } = await import('/src/lib/data.js');
      const { SITE_PRESETS, TIER_PRESET, atWidth, CARD_SVG_WIDTH, parseName, cardFace, cardFacts } = await import('/src/lib/cards.js');
      const { softwareInput } = await import('/src/lib/cardlayout.js');
      const { measureCard } = await import('/src/lib/cardpdf.js');
      const item = items.find((i) => i.id === id);
      const slug = atWidth(SITE_PRESETS.find((p) => p.key === TIER_PRESET[item.tier]).slug, CARD_SVG_WIDTH);
      await document.fonts.ready;
      const face = cardFace(parseName(slug), cardFacts(item, true));
      return { slug, face: { data: face.data, style: face.style }, input: softwareInput(item), model: measureCard(document.querySelector('.card'), { title: item.title, site: 'https://nstarkman.space' }).model };
    }, { id });
    rec.slug = r.slug;
    rec.face = r.face;
    rec.input = r.input;
    rec.models[theme] = r.model;
  }
  out.cards.push(rec);
}
await browser.close();
out.syncKey = syncKey();
fs.mkdirSync('tests/fixtures', { recursive: true });
fs.writeFileSync('tests/fixtures/software-cards.json', `${JSON.stringify(out, null, 1)}\n`);
console.log(`recorded ${out.cards.length} cards`);
