// Inline maths in abstracts, rendered to MathML at build time.
//
// Abstracts come from ADS and carry TeX: $M_\star$, $t_{\rm infall}$. Printed
// raw they read as literal dollar signs and backslashes.
//
// Temml runs here, during the build, and emits MathML that browsers draw with
// their own maths support — so nothing is shipped to render it: no script, no
// stylesheet, no font files. A client-side renderer would have cost 266 KB of
// JavaScript, 24 KB of CSS and 1.1 MB of fonts to typeset four expressions.
//
// Temml over KaTeX because KaTeX repeats the TeX source in an <annotation>
// element, which doubles the markup for no benefit here, and Temml has no
// dependencies of its own.

import temml from 'temml';

// $…$ only. Display maths ($$…$$) does not appear in any abstract, and an
// abstract is a paragraph — a centred display block would be wrong in one.
const INLINE = /\$([^$]+)\$/g;

/**
 * Split a string into text and rendered-maths parts.
 *
 * Returns `[{ maths: false, text }, { maths: true, html }, …]` rather than one
 * HTML string, so the caller decides what is escaped and what is not: only the
 * MathML from Temml is ever marked safe.
 */
export function mathParts(source) {
  if (typeof source !== 'string' || !source.includes('$')) {
    return [{ maths: false, text: source ?? '' }];
  }
  const parts = [];
  let at = 0;
  for (const m of source.matchAll(INLINE)) {
    if (m.index > at) parts.push({ maths: false, text: source.slice(at, m.index) });
    parts.push({ maths: true, html: render(m[1]) });
    at = m.index + m[0].length;
  }
  if (at < source.length) parts.push({ maths: false, text: source.slice(at) });
  return parts;
}

/** Bad TeX must not fail a build over one abstract, so it falls back to source. */
function render(tex) {
  try {
    return temml.renderToString(tex, { throwOnError: true });
  } catch {
    return `<code class="tex">${escapeHtml(`$${tex}$`)}</code>`;
  }
}

const escapeHtml = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
