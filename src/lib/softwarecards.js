// The software cards that are drawn as images: which packages, at what name,
// and how one is drawn. Shared by the endpoints in src/pages/cards/ and the
// tests, so the list and the drawing are written once. Each is laid out by the
// engine from the card's own markup and stylesheet (src/lib/cardoffline.js),
// with no browser.
import { items } from './data.js';
import { TIER_PRESET, CARD_SVG_WIDTH, CARD_WIDE, ownLink } from '@nstarkman/card-builder/cards.js';
import { modelFor } from './cardoffline.js';
import { modelToSvg } from './cardsvg.js';

export const THEMES = ['light', 'dark'];

const TIER_ORDER = Object.keys(TIER_PRESET); // flagship, then major

/** Each lead and headline package, as the Software page orders them, with the
 *  preset of its tier, its width, its row and the height it shares with the rest
 *  of the row: the lead alone, at the width of two; the others two to a row. */
const cards = items
  .filter((i) => i.type === 'software' && i.tier in TIER_PRESET)
  .sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier) || a.title.toLowerCase().localeCompare(b.title.toLowerCase()))
  .map((item) => ({
    item,
    input: { id: item.id, tier: item.tier, title: item.title, href: ownLink(item)?.url ?? null },
    preset: TIER_PRESET[item.tier],
    width: item.tier === 'flagship' ? CARD_WIDE : CARD_SVG_WIDTH,
  }));
const rows = [];
for (const c of cards) {
  const last = rows.at(-1);
  if (c.input.tier === 'major' && last?.[0].input.tier === 'major' && last.length < 2) last.push(c); else rows.push([c]);
}
// A card as the Software page lays it out is as tall as the tallest of its row.
const natural = await Promise.all(cards.map(({ item, preset, width }) => modelFor({ item, name: preset, theme: 'light', width }).then(({ model }) => model.h)));
rows.forEach((row, i) => {
  const height = Math.max(...row.map((c) => natural[cards.indexOf(c)]));
  for (const c of row) Object.assign(c, { row: i, height });
});

export const softwareCards = cards;

export const cardFile = (id, theme) => `/cards/${id}-${theme}.svg`;

/** The card as an SVG document, as tall as its row. A figure has none: these cards draw none. */
export async function drawCard({ item, preset, width, height }, theme) {
  const { model } = await modelFor({ item, name: preset, theme, width, minHeight: height });
  return modelToSvg(model);
}
