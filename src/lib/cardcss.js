// The stylesheet the offline pipeline hands the layout engine: the CSS the embed page loads
// (src/layouts/Embed.astro), which is the whole of a card's look, with the changes the
// engine needs (specs/001-takumi-card-renderer, research D4 and D8).
import site from '@nstarkman/site-layout/site.css?raw';
import faces from '../styles/card-faces.css?raw';

/** The stylesheets src/layouts/Embed.astro imports, as it writes them. A test holds this to the file. */
export const STYLESHEETS = ['@nstarkman/site-layout/site.css', '../styles/card-faces.css'];

/**
 * The browser's own defaults the engine does not apply to an HTML string, written where a browser
 * keeps them: first, and at no specificity, so that any author rule overrides them as it does a
 * user-agent rule. Grown from what `npm run check:cards` finds, each with the card that needed it.
 */
export const PRELUDE = ':where([hidden]){display:none}'; // the byline's unused author-count variants

// The engine paints the background and border of an inline-block, not of an inline: the title's status tag (home) is the one
// inline box on a card that has either, and, last, it is laid out as inline-block, which moves nothing.
const INLINE_BOXES = '.statustag{display:inline-block; line-height:calc(round(1.025em, 1px) + round(.275em, 1px))}';

/** The fonts come from the files in public/fonts/card/, which the engine is given directly. */
const FONT_FACE = /@font-face\s*\{[^}]*\}/g;
const COMMENT = /\/\*[\s\S]*?\*\//g;

/**
 * Takumi has no color-scheme, so light-dark(a, b) is always a. For a dark card write b where it stands.
 * Scans balanced parentheses, since a colour is often itself a function: light-dark(#fff, rgb(0 0 0)).
 */
export function darkCss(text) {
  let out = '';
  let from = 0;
  for (;;) {
    const at = text.slice(from).search(/light-dark\(/i);
    if (at < 0) return out + text.slice(from);
    const start = from + at;
    out += text.slice(from, start);
    let depth = 0;
    let comma = -1;
    let end = start + 'light-dark'.length;
    for (; end < text.length; end += 1) {
      const c = text[end];
      if (c === '(') depth += 1;
      else if (c === ')' && (depth -= 1) === 0) break;
      else if (c === ',' && depth === 1 && comma < 0) comma = end;
    }
    if (comma < 0 || end >= text.length) throw new Error(`cannot read light-dark() near "${text.slice(start, start + 60)}"`);
    out += darkCss(text.slice(comma + 1, end).trim());
    from = end + 1;
  }
}

// A strip in a card whose rail is empty sits in a foot that is not in the markup (cardmarkup.js, unwrapEmptyRail):
// its rules, written on `.c-foot [data-strip]`, are made to match the card itself in that case.
const STRIP = /\.c-foot (\[data-strip)/g;

// A padding written as a calc() that comes out below zero is 0 in a browser, where the engine takes the
// negative value (the home card's top: `--pad-t` 0 less `--gr`), so each is clamped.
const PADDING_CALC = /(padding[a-z-]*:\s*)(calc\([^;{}]*\))(?=\s*[;}])/g;

/** @param {'light' | 'dark'} theme */
export function engineCss(theme) {
  // Comments are dropped: one that mentions light-dark( would not be a call to read.
  const css = `${PRELUDE}\n${[site, faces].join('\n').replace(COMMENT, '').replace(FONT_FACE, '').replace(STRIP, ':is(.c-foot, .card[data-rail="empty"]) $1').replace(PADDING_CALC, '$1max(0px, $2)')}\n${INLINE_BOXES}`;
  return theme === 'dark' ? darkCss(css) : css;
}
