// /cards/index.json — the software cards drawn as images, and where each is.
// What another repo (the profile README) reads to know which cards there are,
// rather than deciding for itself which packages get one.
import { softwareCards, cardFile } from '../../lib/softwarecards.js';

export function GET({ site }) {
  const abs = (p) => new URL(p, site).href;
  const body = softwareCards.map(({ input }) => ({
    id: input.id, tier: input.tier, href: input.href,
    light: abs(cardFile(input.id, 'light')), dark: abs(cardFile(input.id, 'dark')),
  }));
  return new Response(`${JSON.stringify({ cards: body }, null, 2)}\n`, { headers: { 'content-type': 'application/json' } });
}
