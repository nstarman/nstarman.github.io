// /cards/<id>-<theme>.svg — a software card as an SVG, drawn here at build
// without a browser: the engine lays out the card's own markup and stylesheet
// (src/lib/cardoffline.js), and src/lib/cardsvg.js writes it. The same card the
// site shows (the preset of its tier, at a set width), so the README's images
// follow the site's cards.
import { softwareCards, THEMES, drawCard } from '../../lib/softwarecards.js';

export const getStaticPaths = () => Promise.all(softwareCards.flatMap((card) => THEMES.map(async (theme) => ({
  params: { name: `${card.input.id}-${theme}` }, props: { svg: await drawCard(card, theme) },
}))));

export const GET = ({ props }) => new Response(props.svg, { headers: { 'content-type': 'image/svg+xml' } });
