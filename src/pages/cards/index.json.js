// /cards/index.json — the software cards drawn as images, and where each is.
// What another repo (the profile README) reads to know which cards there are,
// rather than deciding for itself which packages get one.
import { softwareCards, cardFile } from '../../lib/softwarecards.js';

export function GET({ site }) {
  const abs = (p) => new URL(p, site).href;
  const body = softwareCards.map(({ item }) => ({
    id: item.id, tier: item.tier, href: item.href,
    light: abs(cardFile(item.id, 'light')), dark: abs(cardFile(item.id, 'dark')),
  }));
  return new Response(`${JSON.stringify({ cards: body }, null, 2)}\n`, { headers: { 'content-type': 'application/json' } });
}
