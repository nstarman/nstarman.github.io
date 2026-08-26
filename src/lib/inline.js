// A deliberately tiny inline-link syntax for `long` and `short`.
//
// The CV's detail lines carry links — the NSERC fellowships, a grant call, a
// conference page — and rendering them as buttons underneath detaches them from
// the words they belong to. Rather than adding rich text to the schema, `long`
// may contain `[text](url)` and this splits it into spans.
//
// Spans, not HTML: the same model feeds the website and the Typst CV, and only
// one of those understands markup.

// `[text](https://…)` for the web, and `[text](item:some-id)` to point at
// another entry on the same CV — the CV cross-references itself (a position
// citing the grants that funded it) and a bare URL cannot express that.
const LINK = /\[([^\]]+)\]\((https?:\/\/[^)\s]+|item:[a-z0-9-]+)\)/g;

// `base` is where the cross-referenced entry lives. Empty on the CV, which
// holds every entry itself; '/cv/' from any other page, so the reference is a
// link there too rather than being flattened to plain text.
const href = (target, base = '') =>
  target.startsWith('item:') ? `${base}#item-${target.slice(5)}` : target;

/**
 * @param {string|string[]} text
 * @param {string} [base]  prefix for `item:` targets, e.g. '/cv/'
 * @returns {{t: string, url?: string}[]}
 */
export function spans(text, base = '') {
  if (!text) return [];
  if (Array.isArray(text)) return text.flatMap((t) => spans(t, base));
  const out = [];
  let last = 0;
  for (const m of text.matchAll(LINK)) {
    if (m.index > last) out.push({ t: text.slice(last, m.index) });
    out.push({ t: m[1], url: href(m[2], base) });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ t: text.slice(last) });
  return out;
}

/** The same text with the link syntax stripped, for places that cannot link. */
export const plain = (text) => (text ?? '').replace(LINK, '$1');

/** Each line of a `long` as its own span list. A plain string is one line. */
export function lines(long, base = '') {
  return (Array.isArray(long) ? long : [long]).filter(Boolean).map((l) => spans(l, base));
}

/**
 * An item's elaboration, one span array per line, in the order both renderers
 * must use. Shared so the page and the PDF cannot disagree about what an
 * entry's lines are — or, once the builder can tick them individually, about
 * which line index a tick refers to.
 *
 * `complete` adds the lines only the complete CV shows. It is off by default so
 * every caller that has not thought about it gets the discreet answer: a field
 * whose whole purpose is to appear in one place should not leak into a fourth
 * renderer by being forgotten about.
 *
 * The extra lines go last, after the thesis and supervisors, so a line index
 * means the same thing whether or not they are included — the builder ticks
 * lines by index, and inserting in the middle would silently move its ticks.
 */
export function detailLines(item, { complete = false } = {}) {
  return [
    ...lines(item.details),
    ...(item.thesis ? [spans(`Thesis: ${item.thesis}`)] : []),
    ...(item.supervisors?.length ? [spans(`Supervisors: ${item.supervisors.join(', ')}`)] : []),
    ...(complete ? lines(item.detailsComplete) : []),
  ];
}
