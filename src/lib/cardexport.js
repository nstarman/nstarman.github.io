// What the Card Builder hands over for a card: its query, the names of its
// image files, and the snippet that shows it — an iframe, HTML, Markdown, or
// the files alone. s is the builder's card: { id, it, slug, width, format,
// theme }, it the item as the builder has it ({ title, href }).

/** The query that names the card: a % in the name, buttongap=50%, as %25,
 *  which the query decodes back. */
export const query = (s) => `?card=${s.slug.replace(/%/g, '%25')}${s.theme === 'auto' ? '' : `&theme=${s.theme}`}`;

/** A short, stable stand-in for a name too long for a file's (djb2). */
const hash = (str) => {
  let h = 5381;
  for (const c of str) h = ((h * 33) ^ c.codePointAt(0)) >>> 0;
  return h.toString(36);
};

/** An image's file name: the item, the name — a colon, not safe in a file
 *  name on macOS or Windows, as _ — and the theme. A name that would run the
 *  file past what a disk takes is a hash of itself. */
export const file = (s, t) => {
  const n = s.slug.replaceAll(':', '_');
  return `${s.id}--${n.length > 160 ? hash(s.slug) : n}-${t}.${s.format === 'pdf' ? 'pdf' : 'png'}`;
};

/** The images a format needs: both themes when following the reader, except
 *  Markdown, which cannot switch. */
export const themes = (s) => (s.theme !== 'auto' ? [s.theme] : s.format === 'markdown' ? ['light'] : ['light', 'dark']);

export const esc = (str) => str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** The snippet for s, the iframe at the height the card last reported. */
export function snippet(s, { site, height }) {
  const alt = esc(s.it.title);
  const wrap = (inner) => (s.it.href ? `<a href="${esc(s.it.href)}">${inner}</a>` : inner);
  if (s.format === 'iframe') {
    return `<iframe src="${site}/embed/${s.id}/${query(s)}" title="${alt}" width="${s.width ?? '100%'}" height="${height || 200}" style="border:0; max-width:100%" loading="lazy"></iframe>\n`
      + `<script src="${site}/embed/resize.js" async><\/script>`;
  }
  if (s.format === 'html') {
    return wrap(s.theme === 'auto'
      ? `<picture><source media="(prefers-color-scheme: dark)" srcset="${file(s, 'dark')}"><img src="${file(s, 'light')}" alt="${alt}"${s.width ? ` width="${s.width}"` : ''}></picture>`
      : `<img src="${file(s, s.theme)}" alt="${alt}"${s.width ? ` width="${s.width}"` : ''}>`);
  }
  if (s.format === 'markdown') {
    const md = `![${s.it.title.replace(/[[\]]/g, '\\$&')}](${file(s, themes(s)[0])})`;
    // In <…>, a link may hold spaces and brackets.
    return s.it.href ? `[${md}](<${s.it.href.replace(/[<>]/g, encodeURIComponent)}>)` : md;
  }
  return themes(s).map((t) => file(s, t)).join('\n');
}
