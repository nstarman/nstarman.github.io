// /cards/index.json — the software cards drawn as images, and where each is.
// What another repo (the profile README) reads to know which cards there are,
// in what order, how wide and how tall each is, and which row it is in — cards of
// a row are one height, so they line up — rather than deciding for itself.
import { softwareCards, cardFile } from '../../lib/softwarecards.js';

export function GET({ site }) {
  const abs = (p) => new URL(p, site).href;
  const body = softwareCards.map(({ input, width, height, row }) => ({
    id: input.id, tier: input.tier, href: input.href, row, width, height: Math.round(height * 100) / 100,
    light: abs(cardFile(input.id, 'light')), dark: abs(cardFile(input.id, 'dark')),
  }));
  return new Response(`${JSON.stringify({ cards: body }, null, 2)}\n`, { headers: { 'content-type': 'application/json' } });
}
