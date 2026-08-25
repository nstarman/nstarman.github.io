// Loads data/*.json at build time.
//
// data/ is flat and a filename is its item's start date followed by its id, so
// this reads the directory rather than maintaining an index — and `ls` comes
// out chronological. Everything downstream — the site, the CV presets,
// the BibTeX file, the README — sorts and filters through here, so ordering and
// author formatting are defined once.

// Vite's glob, not node:fs — the module gets bundled, so a path relative to
// import.meta.url would resolve inside dist/ at render time. This inlines the
// JSON at build time instead, and keeps working if the site ever goes SSR.
const modules = import.meta.glob('/data/*.json', { eager: true });

/**
 * Partial dates (YYYY, YYYY-MM, YYYY-MM-DD) compare correctly as strings, so a
 * month orders items inside a year even though only the year is ever shown.
 *
 * Work in preparation has no date to speak of — the year on the record is a
 * guess that keeps the filename honest — so it sorts ahead of everything that
 * has actually happened.
 */
const sortKey = (i) => (i.status === 'in-prep' ? '9999' : (i.date?.start ?? ''));
const byDateDesc = (a, b) => sortKey(b).localeCompare(sortKey(a));

export const items = Object.entries(modules)
  .map(([file, mod]) => {
    const item = mod.default ?? mod;
    const stem = file.slice(file.lastIndexOf('/') + 1, -'.json'.length);
    const want = `${item.date?.start}-${item.id}`;
    if (stem !== want) {
      throw new Error(`${file}: filename should be ${want}.json (<date.start>-<id>).`);
    }
    return item;
  })
  .sort(byDateDesc);

/**
 * Bare enumerations — refereeing venues, review panels. Not items: no date, no
 * presets, nothing to sort by. A preset section names one with `list`.
 */
const listModules = import.meta.glob('/data/lists/*.json', { eager: true });
export const lists = new Map(
  Object.values(listModules).map((m) => {
    const l = m.default ?? m;
    return [l.id, l.entries];
  }),
);

const byId = new Map(items.map((i) => [i.id, i]));

export const byType = (...types) => items.filter((i) => types.includes(i.type));
export const featured = (...types) => byType(...types).filter((i) => i.featured);
export const resolve = (id) => byId.get(id);

/** "Nathaniel" -> "N."; "Adrian M." -> "A. M."  */
function initials(given) {
  return given
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => (part.endsWith('.') ? part : `${part[0].toUpperCase()}.`))
    .join(' ');
}

/** Display form. BibTeX uses "Family, Given" instead — see lib/bibtex.js. */
export function displayName(a) {
  if (a.literal) return a.literal;
  return [initials(a.given), a.family, a.suffix].filter(Boolean).join(' ');
}

/**
 * Authors for display, truncated per preset. The data always holds the full
 * list — truncating there would corrupt the BibTeX — so it happens here.
 */
export function authors(item, max = Infinity) {
  const all = item.authors ?? [];
  const shown = all.slice(0, max).map((a) => ({ name: displayName(a), me: Boolean(a.me) }));
  return { shown, etal: all.length > max, collaboration: item.collaboration };
}

/** "The Astrophysical Journal 979, 155" */
export function venueLine(item) {
  const v = item.venue;
  if (!v) return '';
  const title = v.journal ?? v.booktitle ?? v.school ?? '';
  const tail = [v.volume, v.pages].filter(Boolean).join(', ');
  return [title, tail].filter(Boolean).join(' ');
}

export const year = (item) => (item.date?.start ?? '').slice(0, 4);

/** "2024 –", "2018 – 2024", "2025" */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
               'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * @param {object} item
 * @param {{month?: boolean}} [opts]
 *   `month` spells a single date as "Feb 2024" where the record has one. Ranges
 *   stay year-only either way — "Feb 2018 – Jun 2024" is noise, and the CV this
 *   replaces wrote them as years too.
 */
export function dateLabel(item, { month = false } = {}) {
  // A year on an in-preparation paper would be a claim it cannot support.
  if (item.status === 'in-prep') return 'In Prep';
  const { start, end, present } = item.date ?? {};
  const y = (d) => (d ?? '').slice(0, 4);
  if (present) return `${y(start)} –`;
  if (end) return `${y(start)} – ${y(end)}`;
  const [, mm] = (start ?? '').split('-');
  return month && mm ? `${MONTHS[Number(mm) - 1]} ${y(start)}` : y(start);
}

/**
 * Order links land in. ADS first as the canonical record, then the preprint,
 * then the published article, then everything that is code or data.
 */
const REL_ORDER = ['ads', 'preprint', 'paper', 'doi', 'repo', 'code',
                   'docs', 'data', 'slides', 'event', 'homepage'];

/**
 * The vocabulary key for a link. ADS is synthesised as a `paper` rel, so the
 * label is what distinguishes it — ordering and iconography must agree on that
 * or the ADS link sorts first and then draws the generic paper glyph.
 */
export const relKey = (l) => (l.label === 'ADS' ? 'ads' : l.rel);

// Real marks where one exists, a drawn glyph otherwise. Keyed by the same
// closed vocabulary, so a new rel is a visible gap rather than a silent
// fallback everywhere.
export const REL_ICON = {
  ads: 'ads', preprint: 'arxiv', paper: 'paper', doi: 'paper', repo: 'repo',
  code: 'github', docs: 'docs', data: 'data', slides: 'slides',
  event: 'link', homepage: 'link',
};

/**
 * Links for rendering, in REL_ORDER. The ADS entry is synthesised from
 * `bibcode` rather than stored, so a paper can never carry a bibcode and a
 * contradicting ADS URL.
 */
export function links(item) {
  const out = [...(item.links ?? [])];
  if (item.bibcode) {
    out.push({
      rel: 'paper',
      url: `https://ui.adsabs.harvard.edu/abs/${item.bibcode}/abstract`,
      label: 'ADS',
    });
  }
  if (item.arxiv && !out.some((l) => l.rel === 'preprint')) {
    out.push({
      rel: 'preprint',
      url: `https://arxiv.org/abs/${item.arxiv}`,
      label: `arXiv:${item.arxiv}`,
    });
  }
  for (const l of out) {
    if ((l.rel === 'paper' || l.rel === 'doi') && !l.label && item.doi) l.label = item.doi;
  }

  const rank = (l) => {
    const i = REL_ORDER.indexOf(relKey(l));
    return i === -1 ? REL_ORDER.length : i;
  };
  return out.sort((a, b) => rank(a) - rank(b));
}
