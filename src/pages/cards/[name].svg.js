// /cards/<id>-<theme>.svg — a software card as an SVG, drawn here at build
// without a browser: src/lib/cardlayout.js lays it out, src/lib/cardsvg.js
// writes it. The same card the site shows (the preset of its tier, at a set
// width), so the README's images follow the site's cards.
import { softwareCards, THEMES, drawCard } from '../../lib/softwarecards.js';

export const getStaticPaths = () => softwareCards.flatMap(({ item, input, slug }) => THEMES.map((theme) => ({
  params: { name: `${item.id}-${theme}` }, props: { svg: drawCard(input, slug, theme) },
})));

export const GET = ({ props }) => new Response(props.svg, { headers: { 'content-type': 'image/svg+xml' } });
