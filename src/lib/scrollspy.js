// Which section heading the reader is currently in.
//
// Split out of the CV page's inline script so it can be tested with plain
// numbers instead of a browser: the bug it exists to prevent was a comparison
// against zero, and that is exactly the kind of thing a unit test pins down and
// a manual look does not.

/**
 * How far below the gap line a heading may still count as reached, in CSS px.
 *
 * An anchor jump lands a heading exactly on its own `scroll-margin-top`, so in
 * principle `top === topGap`. In practice the browser settles the scroll on a
 * device pixel and the heading comes to rest a fraction *below* the line —
 * measured at 0.06 to 0.24px across the CV's headings. A strict `<= 0` therefore
 * missed the section the reader had just jumped to and marked the one before it,
 * on nine of the fifteen links.
 *
 * One pixel: comfortably more than the rounding, and nothing beside it, since
 * consecutive headings on this page are hundreds of pixels apart.
 */
export const REACHED_EPS = 1;

/**
 * @param {{id: string, top: number}[]} heads  headings in document order, `top`
 *   as viewport coordinates
 * @param {number} topGap  the offset headings are scrolled to
 * @returns {string|null} the id to mark current
 *
 * The last heading that has reached the line, rather than whichever is
 * intersecting: sections here run from one row to thirty-five, so "is visible"
 * is true of several at once. Above the first heading, the first one is current
 * — the reader is at the top of the document, not in nothing.
 */
export function currentSection(heads, topGap) {
  if (!heads.length) return null;
  let best = heads[0];
  for (const h of heads) {
    if (h.top - topGap <= REACHED_EPS) best = h;
  }
  return best.id;
}

/**
 * @param {{id: string, top: number}[]} heads  headings in document order, `top`
 *   as viewport coordinates
 * @param {number} topGap  the offset headings are scrolled to
 * @returns {{id: string, top: number}[]} where to stand, best candidate first
 *
 * Switching CV length navigates to a different document, so the reader's place
 * has to be described by something both documents share: a heading, and how far
 * down the viewport it sat. The heading they are in is the first choice.
 *
 * The rest of the trail is the fallback, because the length you switch to need
 * not have that section — 1P has no Talks. Each earlier heading carries its own
 * offset, so landing on one still puts the reader where they were standing,
 * only measured from a landmark further back.
 */
export function anchorTrail(heads, topGap) {
  const at = heads.findIndex((h) => h.id === currentSection(heads, topGap));
  return heads.slice(0, at + 1).reverse().map((h) => ({ id: h.id, top: Math.round(h.top) }));
}
