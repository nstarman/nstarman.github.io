// The card's markup for the offline pipeline: Card.astro rendered with a name, which is what the
// website draws, so a card and its image share their markup (specs/001-takumi-card-renderer,
// research D1). Astro's container API renders it in the build, in vitest and under scripts/lib/ssr.mjs.
//
// Three things are added for the measurer (src/lib/cardtree.js), which reads the engine's paint
// tree, and the tree says neither where a link goes nor what colour an icon is (research E12):
//   - each <a href>, and each element inside it, gets a class x-link-N, and `links[N]` is its address;
//   - each icon <svg class="ico"> is followed by a probe <i class="x-ink-N"> whose background is the
//     colour the icon is drawn in (currentColor), and `icons[N]` names its symbol in the sprite;
//   - the card is followed by a probe <i class="x-ground"> in the site's --ground, which the PDF and
//     SVG put behind the card because a card's own background is a tint over the page.
// The probes are absolutely positioned and 1px, so they take no part in a flex or grid layout.
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import Card from '@nstarkman/card-builder/Card.astro';
import IconSprite from '@nstarkman/site-layout/IconSprite.astro';

const PROBE = 'position:absolute;width:1px;height:1px';
const unescape = (s) => s.replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/**
 * The engine has no display:contents: it lays the box out as a block with its margin and padding
 * (research E16: 10.28 px too tall for a card with no buttons). The one use on a card is the foot and
 * its slots when the rail is empty (site.css), which is those boxes not being there, so they are
 * removed from the markup, their children left where they stood.
 */
export function unwrapEmptyRail(card) {
  if (!/\bdata-rail="empty"/.test(card)) return card;
  // site.css hides the refs and the buttons of that foot by a rule on `.c-foot`, which would then no longer match.
  let out = card.replace(/<ul(?= class="(?:c-refs|btns)\b)/g, '<ul style="display:none"');
  for (const cls of ['c-slot', 'c-foot']) {
    for (;;) {
      const open = new RegExp(`<div class="${cls}"[^>]*>`).exec(out);
      if (!open) break;
      // Its closing tag: the </div> that brings the depth from this <div> back to zero.
      let depth = 0;
      let close = -1;
      for (const t of out.slice(open.index).matchAll(/<(\/?)div\b/g)) {
        depth += t[1] ? -1 : 1;
        if (depth === 0) { close = open.index + t.index; break; }
      }
      if (close < 0) throw new Error(`no closing tag for the ${cls} in the card's markup`);
      out = out.slice(0, open.index) + out.slice(open.index + open[0].length, close) + out.slice(close + '</div>'.length);
    }
  }
  return out;
}

/** The card with `data-authors="count"` and only the `n`-name cut of the byline shown (the embed page's `show(n)`). */
function cutByline(card, n) {
  if (n == null) return card;
  const shown = (tag) => tag.replace(/\shidden(="[^"]*")?/, '');
  return card
    .replace(/<article\b[^>]*>/, (tag) => tag.replace(/\bdata-authors="[^"]*"/, 'data-authors="count"'))
    .replace(/<span class="c-by-n"[^>]*>/g, (tag) => (+/\bdata-n="(\d+)"/.exec(tag)[1] === n ? shown(tag) : `${shown(tag).slice(0, -1)} hidden>`));
}

let container;
const astro = () => (container ??= AstroContainer.create());

/**
 * @param {object} item  an item with a card, as the site's store holds it
 * @param {string} name  a card name (src/lib/cardname.js)
 * @param {{ theme?: 'light' | 'dark', cut?: number }} [options]  `theme` sets data-theme on the root, as the embed page does;
 *   `cut` puts the card in count mode and shows the byline of that many names, as the embed page's authors:…:fit does
 * @returns {Promise<{ html: string, links: string[], icons: { symbol: string | null }[] }>}
 */
export async function renderMarkup(item, name, { theme = 'light', cut } = {}) {
  const card = await (await astro()).renderToString(Card, { props: { item, preset: name, allCounts: true } });
  const links = [];
  const icons = [];
  const markup = cutByline(unwrapEmptyRail(card), cut);
  // `<a>` is inline, so it has no box of its own in the layout, and a run of text inside it reports the
  // element it came from, which is a <span> in the link as often as the link. Every element in a link
  // therefore carries its marker, and so does a figure or an icon inside one.
  const mark = (tag, n) => (/\bclass="/.test(tag) ? tag.replace(/\bclass="([^"]*)"/, `class="$1 x-link-${n}"`) : tag.replace(/^<([a-zA-Z][\w-]*)/, `<$1 class="x-link-${n}"`));
  const tagged = markup
    .replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/g, (whole, attrs, inner) => {
      const href = attrs.match(/\bhref="([^"]*)"/)?.[1];
      if (href === undefined) return whole;
      const n = links.push(unescape(href)) - 1;
      return `${mark(`<a${attrs}>`, n)}${inner.replace(/<[a-zA-Z][^>]*>/g, (tag) => mark(tag, n))}</a>`;
    })
    .replace(/<svg\b[^>]*\bclass="[^"]*\bico\b[^"]*"[^>]*>([\s\S]*?)<\/svg>/g, (svg, inner) => {
      const symbol = inner.match(/\bhref="#([^"]+)"/)?.[1] ?? null;
      const n = icons.push({ symbol }) - 1;
      // The icon names itself, so one that is not drawn (a hidden button's) does not shift the rest.
      return `${svg.replace(/\bclass="/, `class="x-ico-${n} `)}<i class="x-ink-${n}" style="${PROBE};background:currentColor"></i>`;
    });
  const ground = `<i class="x-ground" style="${PROBE};background:var(--ground)"></i>`;
  return { html: `<html data-theme="${theme}"><body class="embed"><main>${tagged}${ground}</main></body></html>`, links, icons };
}

let symbols;

/** The icon sprite's symbols, by id: `{ viewBox, body }`, `body` being what is inside the <symbol>. */
export async function sprite() {
  if (!symbols) {
    const html = await (await astro()).renderToString(IconSprite);
    symbols = new Map([...html.matchAll(/<symbol\b[^>]*\bid="([^"]+)"[^>]*\bviewBox="([^"]+)"[^>]*>([\s\S]*?)<\/symbol>/g)]
      // A development server marks elements with the file they came from, a path of this machine, which a drawing must not carry.
      .map(([, id, viewBox, body]) => [id, { viewBox, body: body.replace(/\sdata-astro-[\w-]+="[^"]*"/g, '') }]));
  }
  return symbols;
}
