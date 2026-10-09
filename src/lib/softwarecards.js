// The software cards that are drawn as images: which packages, at what name,
// and how one is drawn. Shared by the endpoints in src/pages/cards/ and the
// tests, so the list and the drawing are written once. Node only (it
// measures text from the font files).
import { items } from './data.js';
import { SITE_PRESETS, TIER_PRESET, CARD_SVG_WIDTH, CARD_WIDE, atWidth } from './cards.js';
import { softwareInput, softwareModel } from './cardlayout.js';
import { modelToSvg } from './cardsvg.js';
import { measure } from './textmeasure.js';

export const THEMES = ['light', 'dark'];

const TIER_ORDER = Object.keys(TIER_PRESET); // flagship, then major

/** Each lead and headline package, as the Software page orders them, with the
 *  name of its card, its width, its row and the height it shares with the rest
 *  of the row: the lead alone, at the width of two; the others two to a row. */
export const softwareCards = items
  .filter((i) => i.type === 'software' && i.tier in TIER_PRESET)
  .sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier) || a.title.toLowerCase().localeCompare(b.title.toLowerCase()))
  .map((item) => {
    const width = item.tier === 'flagship' ? CARD_WIDE : CARD_SVG_WIDTH;
    return { input: softwareInput(item), width, slug: atWidth(SITE_PRESETS.find((p) => p.key === TIER_PRESET[item.tier]).slug, width) };
  });
const rows = [];
for (const c of softwareCards) {
  const last = rows.at(-1);
  if (c.input.tier === 'major' && last?.[0].input.tier === 'major' && last.length < 2) last.push(c); else rows.push([c]);
}
rows.forEach((row, i) => {
  const height = Math.max(...row.map((c) => softwareModel(c.input, { slug: c.slug, theme: 'light', measure }).h));
  for (const c of row) Object.assign(c, { row: i, height });
});

export const cardFile = (id, theme) => `/cards/${id}-${theme}.svg`;

/** The card as an SVG document, as tall as its row. A figure has none: these cards draw none. */
export const drawCard = ({ input, slug, height }, theme) => modelToSvg(softwareModel(input, { slug, theme, measure, minHeight: height }));
