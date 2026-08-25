// Renders publication items to BibTeX.
//
// This is why the schema stores authors as family/given rather than display
// strings, requires an explicit `entryType`, and names venue fields after
// BibTeX's own — the mapping here is direct rather than guessed.

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun',
                'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// TeX spells its own dashes; a literal em dash breaks a pdflatex run that has
// not been told the input is UTF-8.
const TEX = {
  "\\": "\\textbackslash{}",
  "&": "\\&",
  "%": "\\%",
  "$": "\\$",
  "#": "\\#",
  "_": "\\_",
  "{": "\\{",
  "}": "\\}",
  "~": "\\textasciitilde{}",
  "^": "\\textasciicircum{}",
  "—": "---",
  "–": "--",
};

/**
 * Escape the characters that are syntax in TeX.
 *
 * One pass, so every character of the input is replaced exactly once and no
 * replacement can be re-escaped by a later step. The chained version needed a
 * sentinel to hold the backslash — otherwise the brace pass escaped
 * `\textbackslash{}`'s own braces and turned `\star` into
 * `\textbackslash\{\}star` — and that sentinel was itself a hole: a NUL in the
 * input came back out as a backslash.
 */
function esc(value) {
  return String(value).replace(/[\\&%$#_{}~^–—]/g, (ch) => TEX[ch]);
}

/**
 * Abstracts arrive from arXiv already written in LaTeX — `$M_\star$` and the
 * like. Escaping them as prose destroys the maths, so only a bare `&` or `%`
 * is escaped here; everything else is passed through as the author wrote it.
 */
function escAbstract(value) {
  return String(value).replace(/(?<!\\)([&%])/g, "\\$1");
}

/**
 * "Family, Given", which is what BibTeX needs to tell the two apart — a plain
 * "Nathaniel Starkman" would be guessed at, and "van der Waals" guessed wrong.
 * A `literal` byline is braced so BibTeX treats it as one indivisible name.
 */
function bibName(a) {
  if (a.literal) return `{${esc(a.literal)}}`;
  const family = [a.family, a.suffix].filter(Boolean).join(' ');
  return `${esc(family)}, ${esc(a.given)}`;
}

function names(item) {
  const list = (item.authors ?? []).map(bibName);
  // The collaboration leads the byline when it is set.
  if (item.collaboration) list.unshift(`{${esc(item.collaboration)}}`);
  return list.join(' and ');
}

export function toBibtex(item) {
  if (item.type !== 'publication') return null;

  const [year, month] = (item.date?.start ?? '').split('-');
  const v = item.venue ?? {};

  const fields = [
    ['author', names(item)],
    // Doubled braces protect the capitalisation BibTeX would otherwise flatten.
    ['title', `{${esc(item.title)}}`],
    ['journal', v.journal && esc(v.journal)],
    ['booktitle', v.booktitle && esc(v.booktitle)],
    ['school', v.school && esc(v.school)],
    ['publisher', v.publisher && esc(v.publisher)],
    ['series', v.series && esc(v.series)],
    ['volume', v.volume && esc(v.volume)],
    ['number', v.number && esc(v.number)],
    ['pages', v.pages && esc(v.pages)],
    ['address', v.address && esc(v.address)],
    ['year', year],
    ['month', month ? MONTHS[Number(month) - 1] : null],
    ['doi', item.doi && esc(item.doi)],
    ['eprint', item.arxiv],
    ['archivePrefix', item.arxiv ? 'arXiv' : null],
    ['primaryClass', item.primaryClass],
    ['adsurl', item.bibcode ? `https://ui.adsabs.harvard.edu/abs/${item.bibcode}/abstract` : null],
    ['abstract', item.abstract && escAbstract(item.abstract)],
    // `status` is the only place "submitted"/"in prep" is recorded, so it has
    // to reach the reader somehow; note is where BibTeX puts that.
    ['note', item.status !== 'published' ? item.status.replace('-', ' ') : null],
  ].filter(([, value]) => value !== null && value !== undefined && value !== '');

  const width = Math.max(...fields.map(([k]) => k.length));
  const body = fields
    .map(([k, value]) => `  ${k.padEnd(width)} = {${value}}`)
    .join(',\n');

  return `@${item.entryType}{${item.citekey ?? item.id},\n${body}\n}`;
}

export function toBibliography(items) {
  const entries = items
    .filter((i) => i.type === 'publication')
    .map(toBibtex)
    .filter(Boolean);
  return `${entries.join('\n\n')}\n`;
}
