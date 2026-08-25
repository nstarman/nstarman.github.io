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

const POSITION_NAMES = { first: 1, second: 2, third: 3, fourth: 4 };

/**
 * Which author position the owner holds, 1-based, or null if he is not on it.
 *
 * Derived from the index of the author marked `me` rather than stored, so it
 * cannot drift out of step with the author list. `collaboration` is its own
 * field and takes no slot, which is why the Euclid paper comes out first-author
 * even though it prints as "Euclid Collaboration, N. Starkman, …".
 *
 * A record can still override with `authorPosition` for the case derivation
 * cannot see: a byline that understates the credit.
 */
export function authorPosition(item) {
  const explicit = item.authorPosition;
  if (typeof explicit === 'number') return explicit;
  if (typeof explicit === 'string') return POSITION_NAMES[explicit] ?? null;
  const i = (item.authors ?? []).findIndex((a) => a.me);
  return i === -1 ? null : i + 1;
}

/**
 * The article's page at the journal, or null.
 *
 * Only for published work: a submitted paper has no article page, and pointing
 * its venue at an arXiv DOI would claim otherwise.
 *
 * The record's own `paper` link wins over the DOI because it is the curated
 * one — often the publisher's own reader rather than the doi.org redirect. The
 * ADS link that `links()` synthesises from a bibcode is deliberately not used:
 * ADS is a database record about the paper, not the journal's page for it.
 */
export function venueUrl(item) {
  if (item.status !== 'published') return null;
  const curated = (item.links ?? []).find((l) => l.rel === 'paper' && l.url);
  if (curated) return curated.url;
  // 10.48550 is arXiv's own prefix — a preprint DOI, not a journal article.
  if (item.doi && !item.doi.startsWith('10.48550/')) return `https://doi.org/${item.doi}`;
  return null;
}

/**
 * A package's paper, where the record points at one.
 *
 * `unxt` refs `unxt-joss`, `astropy` refs the v5 paper, `trackstream` refs the
 * stream-tracks paper. The software entry itself carries only code and docs
 * links, so without following the ref a published package looks unpublished.
 *
 * `refs` is not a paper field: `coordinax` refs `unxt`, another package. Hence
 * the type check — it is what stops a package being called published because
 * it happens to point at a sibling.
 */
const CITE_RELS = ['paper', 'preprint', 'doi'];
export function softwarePaper(sw) {
  for (const id of sw.refs ?? []) {
    const ref = resolve(id);
    if (ref?.type !== 'publication') continue;
    // The article at the journal first. Taking the first citation link instead
    // sent Astropy to its ADS record and macro_lightning to its arXiv preprint,
    // because REL_ORDER ranks `ads` and `preprint` above `paper` — right for a
    // trail of marks, wrong when only one link is being chosen.
    const article = venueUrl(ref);
    if (article) return { rel: 'paper', url: article, label: 'paper', id: ref.id, status: ref.status };
    // Nothing published yet: a preprint or a review thread is what there is.
    const cite = links(ref).find((l) => CITE_RELS.includes(l.rel));
    if (cite) return { rel: 'paper', url: cite.url, label: 'paper', id: ref.id, status: ref.status };
  }
  return null;
}

/** Where a co-author's name points. ORCID is the identifier, so it is the link. */
const orcidUrl = (orcid) => (orcid ? `https://orcid.org/${orcid}` : null);

/**
 * Authors for display, truncated per preset. The data always holds the full
 * list — truncating there would corrupt the BibTeX — so it happens here.
 *
 * `url` is the author's ORCID page, and is null for the owner: this is his own
 * site, his ORCID is already in the CV header, and a self-link in every byline
 * would be noise rather than navigation.
 */
export function authors(item, max = Infinity) {
  const all = item.authors ?? [];
  const shown = all.slice(0, max).map((a) => ({
    name: displayName(a),
    me: Boolean(a.me),
    url: a.me ? null : orcidUrl(a.orcid),
  }));
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
