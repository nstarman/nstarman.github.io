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

// Generated from ORCID; see scripts/collect-collaborators.mjs.
import collaborators from '/config/collaborators.json';
// Generated from ADS; see scripts/collect-acknowledgements.mjs.
import acknowledgements from '/config/acknowledgements.json';

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

// Research-highlight topics in the order /research/ shows them; a topic left
// out is not shown at all: `software` cards wait here. Anchored there as
// `#hl-topic-<key>`, which /publications/ links to.
//
// The third entry is the topic's introduction, one string per paragraph.
// `[](item:<id>)` puts that paper's inline-card into the sentence, named by its
// `nickTitle` and linking to its card below.
export const HIGHLIGHT_TOPICS = [
  ['extragalactic', 'Extragalactic', [
    'Weighing a galaxy’s dark matter halo is comparatively easy: its rotation curve tells us how much gravitational mass is present. [](item:maximum-discs) turned decades of by-eye mass modelling into an algorithm for measuring how much of that gravity can be supplied by stars, while [](item:sparc-halo-density) found that haloes have remarkably similar characteristic densities across galaxies spanning five orders of magnitude in brightness. The harder—and more revealing—question is shape. Cold dark matter predicts haloes that are flattened and triaxial; self-interacting dark matter makes them rounder. Stellar streams are ideal probes because their paths trace the gravitational field, preserving a visible record of the halo geometry.',
    'Our work turns that record into a scalable test of dark matter. [](item:potamides-apj) showed that projected stream tracks around nearby galaxies can constrain halo shape, using 15 systems; [](item:potamides-joss) made that inference run in minutes on a laptop. [](item:euclid-eggs-pilot) then took the method beyond the local Universe: it was the first analysis of stellar streams around more distant galaxies, and the first to combine multiple streams in a single joint halo-shape measurement—13 galaxies in Euclid’s first data. The real payoff is statistical: in a round halo, streams cannot curve away from their host galaxy’s centre in projection, while non-spherical haloes can produce such “wrong-way” curves. [](item:stream-convexity-rate) turns that signature into a population test: across about 10,000 streams, within reach of Euclid, Rubin and Roman, how often those curves appear can distinguish cold dark matter from self-interacting dark matter at up to 5σ.',
  ]],
  ['galactic', 'Galactic', [
    'Galaxies forget. Stars that arrived in the same merger are gradually stirred into the Milky Way’s background, erasing the record of how it was assembled. [](item:galactic-amnesia) measures this loss of memory: radial velocities forget a merger’s mass and timing within about 5 billion years, but orbital energies retain the signal for more than 10—provided we know the Galaxy’s gravitational potential. Stellar streams are the exception. They are stars stripped from one cluster and stretched along nearly a single orbit, so one snapshot reveals a path that would take a single star hundreds of millions of years to trace. [](item:pal5-gaia-dr2) nearly doubled the known length of Palomar 5’s leading tail; [](item:stream-members-only) identifies a stream’s members star by star; and [](item:characterizing-stream-tracks) maps a stream’s path in about a second, without assuming a model for the Milky Way.',
    'Streams probe dark matter on both large and small scales: the Galaxy-wide gravitational potential that guides their orbits, and the compact dark-matter clumps that perturb them. [](item:streamsculptor) finds that GD-1 may have been struck by up to a hundred subhaloes too small to form stars, leaving its stars moving about three times more randomly than an undisturbed stream would—just what cold dark matter predicts. [](item:pinns-mnras) learns the potential itself from measured accelerations: tested on simulated Milky Ways, it recovers the influence of both the Galactic bar and the Large Magellanic Cloud even when neither is included in the starting model.',
  ]],
  ['cmb', 'Cosmic Microwave Background', [
    'The cosmic microwave background is almost a perfect blackbody, but its tiny spectral distortions contain information that its temperature map cannot provide. In [](item:cmb-spectrum-distortions), we calculate a signal that standard cosmology must produce. As the Universe became transparent, photons diffused out of hotter and colder regions, mixing blackbodies with slightly different temperatures. That mixing created a faint Compton y-distortion that is largest where the temperatures being mixed differ most, so it correlates with the squared temperature map. That correlation should already be detectable with ACT and SPT, at a signal-to-noise of about 12, opening a new observational test of early-Universe physics.',
  ]],
  ['dm-direct-detection', 'Dark Matter Direct Detection', [
    'Direct detection usually means placing a shielded detector underground and waiting for a dark-matter particle to scatter. But if dark matter comes in macroscopic objects—far heavier, and therefore far rarer, than ordinary particle candidates—no laboratory detector is large enough to expect an encounter. In [](item:macro-lightning), we turn the atmosphere into the detector instead. A macro passing through a thunderstorm would leave a long, straight channel of ionized air that could seed a lightning bolt straight as a ruler, unlike the jagged bolts produced by ordinary storms; the odds of ordinary lightning running even ten steps that straight are about 3 in 10 trillion. Searching for straight lightning on Earth, or even on Jupiter, turns thunderstorms into planet-sized dark-matter experiments.',
  ]],
];

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
 * A package's papers, where the record points at any, oldest first.
 *
 * `unxt` refs `unxt-joss`, `astropy` refs the v5 paper, `trackstream` refs the
 * stream-tracks paper. The software entry itself carries only code and docs
 * links, so without following the ref a published package looks unpublished.
 *
 * `refs` is not a paper field: `coordinax` refs `unxt`, another package. Hence
 * the type check — it is what stops a package being called published because
 * it happens to point at a sibling.
 *
 * The package's own date is when the repository started; each paper carries
 * its own year, so a package with a second paper shows two. Nothing is copied
 * onto the software record, so the dates cannot drift from the papers'.
 */
const CITE_RELS = ['paper', 'preprint', 'doi'];
export function softwarePapers(sw) {
  const out = [];
  for (const id of sw.refs ?? []) {
    const ref = resolve(id);
    if (ref?.type !== 'publication') continue;
    // In prep has no year to claim — dateLabel says the same.
    const year = ref.status === 'in-prep' ? null : String(ref.date.start).slice(0, 4);
    const paper = { rel: 'paper', label: year ? `paper ${year}` : 'paper', id: ref.id, status: ref.status, year };
    // The article at the journal first. Taking the first citation link instead
    // sent Astropy to its ADS record and macro_lightning to its arXiv preprint.
    const article = venueUrl(ref);
    // Nothing published yet: a preprint or a review thread is what there is.
    const url = article ?? links(ref).find((l) => CITE_RELS.includes(l.rel))?.url;
    if (url) out.push({ ...paper, url });
  }
  return out.sort((a, b) => (a.year ?? '9999').localeCompare(b.year ?? '9999'));
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
/**
 * Where a collaborator was working on a given date, from the dated employment
 * history in config/collaborators.json.
 *
 * Returns null rather than a guess in three cases worth keeping separate in the
 * caller's mind: the person is not in the database, they list no employment on
 * ORCID, or nothing they list covers that date. A gap in a career is real —
 * people leave posts before starting the next — and papering over one would be
 * inventing a fact.
 *
 * `date` is "YYYY" or "YYYY-MM"; the comparisons are string comparisons, which
 * is why the database stores dates in that order.
 */
export function affiliationAt(orcid, date) {
  if (!orcid || !date) return null;
  const person = collaborators.people.find((p) => p.orcid === orcid);
  if (!person) return null;
  const held = person.affiliations.filter((a) => {
    if (!a.start) return false;        // undated: cannot claim it covered this date
    if (a.start > date) return false;
    return !a.end || a.end >= date;
  });
  if (held.length === 0) return null;
  // Concurrent posts happen; the most recently taken up is the one a paper of
  // that date would most likely have printed.
  return held.reduce((best, a) => (a.start > best.start ? a : best));
}

const ELLIPSIS = { name: '…', me: false, student: null, url: null, affiliation: null };

export function authors(item, max = Infinity) {
  const all = item.authors ?? [];
  // Where they were at the time. The paper's own printed affiliation wins where
  // there is one — that is what the paper actually claimed — and the employment
  // history answers for the rest.
  const at = item.date?.start ?? null;
  // Cutting at `max` would drop the owner into "et al." — the one name a CV's
  // reader is looking for. Keep the first author and elide to the owner instead: "J. Nibauer, …, N. Starkman, et al."
  const meAt = all.findIndex((a) => a.me);
  const elide = max >= 2 && meAt >= max;
  const picked = elide ? [all[0], null, all[meAt]] : all.slice(0, max);
  const shown = picked.map((a) => a === null ? ELLIPSIS : ({
    name: displayName(a),
    me: Boolean(a.me),
    student: a.student ?? null,
    orcid: a.me ? null : (a.orcid ?? null),
    url: a.me ? null : orcidUrl(a.orcid),
    affiliation: a.me ? null : (a.affiliation ?? affiliationAt(a.orcid, at)?.organization ?? null),
  }));
  return { shown, etal: all.length > (elide ? meAt + 1 : max), collaboration: item.collaboration };
}

/**
 * Author-position stops for a "first author / first two / …" filter. A stop
 * that admits the same papers as the one before it, or as all of them, is a
 * control that does nothing — with positions 1, 2 and 4 that leaves 1 and 2.
 * Items with no position (not a publication, or no author marked `me`) are
 * ignored.
 */
export function positionStops(items) {
  const positions = items.map(authorPosition).filter((n) => n != null);
  const stops = [];
  for (let n = 1; n <= 4; n += 1) {
    const count = positions.filter((p) => p <= n).length;
    const previous = stops.length ? stops[stops.length - 1].count : 0;
    if (count > previous && count < positions.length) stops.push({ n, count });
  }
  return stops;
}

/** "USD 10,000", "CAD 20,000\u201330,000 p.a.", or null. */
export function money(a) {
  if (!a) return null;
  const n = (v) => v.toLocaleString('en-US');
  const span = a.valueMax ? `${n(a.value)}\u2013${n(a.valueMax)}` : n(a.value);
  return `${a.currency} ${span}${a.perAnnum ? ' p.a.' : ''}`;
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
// The paper itself leads: the article at the journal, then the records of it.
const REL_ORDER = ['paper', 'doi', 'ads', 'preprint', 'repo', 'code',
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
 * The one link a title points at: the article, else the preprint, else null.
 * No fallback to code or docs — a paper's title linking to its repository
 * would be a surprise, and a submitted paper with nothing public stays a bare
 * title rather than a dead '#'.
 */
export function primaryLink(item) {
  const all = links(item);
  return all.find((l) => l.rel === 'paper') ?? all.find((l) => l.rel === 'preprint') ?? null;
}

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

/**
 * Papers that thank him in their acknowledgements, newest first: the Assists
 * on /publications/. Not items — he did not write them — but given `links`
 * so links() and primaryLink() read them like one. arXiv's own DOI prefix is a
 * preprint, which `arxiv` already links, not a journal article.
 */
export const assists = acknowledgements.papers.map((p) => ({
  ...p,
  links: p.doi && !p.doi.startsWith('10.48550/') ? [{ rel: 'paper', url: `https://doi.org/${p.doi}` }] : [],
}));
