// The software cards that are drawn as images: which packages, at what name,
// and how one is drawn. Shared by the endpoints in src/pages/cards/ and the
// tests, so the list and the drawing are written once. Node only (it
// measures text from the font files).
import { items } from './data.js';
import { SITE_PRESETS, TIER_PRESET, CARD_SVG_WIDTH, atWidth } from './cards.js';
import { softwareInput, softwareModel } from './cardlayout.js';
import { modelToSvg } from './cardsvg.js';
import { measure } from './textmeasure.js';

export const THEMES = ['light', 'dark'];

/** Each lead and headline package, with the name of its card. */
export const softwareCards = items
  .filter((i) => i.type === 'software' && i.tier in TIER_PRESET)
  .map((item) => ({
    item: { id: item.id, tier: item.tier, href: softwareInput(item).href },
    input: softwareInput(item),
    slug: atWidth(SITE_PRESETS.find((p) => p.key === TIER_PRESET[item.tier]).slug, CARD_SVG_WIDTH),
  }));

export const cardFile = (id, theme) => `/cards/${id}-${theme}.svg`;

/** The card as an SVG document. A figure has none: these cards draw none. */
export const drawCard = (input, slug, theme) => modelToSvg(softwareModel(input, { slug, theme, measure }));
