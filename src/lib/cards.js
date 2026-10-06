// Which cards exist, and what the website uses. A card's name — its spec — is
// src/lib/cardname.js; this adds what needs the database: the website's
// presets, an item's default card, and its links and extras.
import starCounts from '/config/stars.json';
import { links, primaryLink, softwarePapers, relKey, authorPosition, HIGHLIGHT_TOPICS, venueUrl, venueLine, splitTitle } from './data.js';

export { placeOf, cardFace, PAPER_TO, LOOKS, DIALS, FIGURE_AT, FIGURE_ALIGN, FIGURE_SLOTS, FOOT_AT, FOOT_END, RAIL_ALIGN, SPACE_TRACKS, FIXED_MIN_HEIGHT, TITLES, AUTHORS, AUTHORS_MAX, FACES, TEXTS, EXTRAS, BACKGROUNDS, FIXED_MIN, FIXED_MAX, formatName, parseName } from './cardname.js';

/** The cards the website itself renders, by name, and where; a page names
 *  the one it draws by its key, PRESET.<key>. */
export const SITE_PRESETS = [
  { key: 'softwareLead', slug: 'size:fill:fit-figure:none-title:full:whole:link:top-authors:none-text:details-extras:role-buttons:all:fit-look:feature', where: 'Software — the lead package' },
  { key: 'softwareHeadline', slug: 'size:fill:fit-figure:none-title:full:whole:link-authors:none-text:details-extras:none-buttons:all:fit', where: 'Software — the headliners' },
  { key: 'softwareOther', slug: 'size:fill:fit-figure:none-title:full:whole:link-authors:none-text:summary-extras:none-buttons:all:fit-look:compact', where: 'Software — the long tail; the CV’s software' },
  { key: 'softwareUseful', slug: 'size:fill:fit-figure:none-title:full:whole:link-authors:none-text:summary-extras:none-buttons:all:fit-look:minor', where: 'Software — useful extras' },
  { key: 'proceeding', slug: 'size:fill:fit-figure:none-title:full:whole:link-authors:full:marked-text:none-extras:venue-buttons:all:fit:right', where: 'Publications — a proceeding under its paper' },
  // The paper's own links: a carousel card leaves the data (Zenodo) and the
  // package's docs to the entry on /publications/.
  { key: 'carousel', slug: 'size:fill:fit-figure:center:auto:link-title:short:link-authors:none-text:none-extras:position,students-buttons:paper,doi,preprint,code:fit-look:titleweight=medium,titleface=mono,partgap=8.8', where: 'Research — the highlight carousels' },
  // Its figure is no link: on /publications/ that would be to itself.
  { key: 'paperHighlight', slug: 'size:fill:fit-figure:left:center:auto-title:none-authors:none-text:details-extras:context-context:bottom:right-buttons:none-look:background=light', where: 'Publications — a paper’s highlight, under its entry' },
  { key: 'assist', slug: 'size:fill:fit-figure:none-title:full:whole:link-authors:1:plain-text:none-extras:venue-venue:full:authors-buttons:all:fit-look:textsize=minor,padding=12,corners=12,buttons=23,titlesize=13.6,authorssize=12.5,venuesize=12.5,titleface=mono', where: 'Publications — the Assists, papers that thank me' },
  // A row of a list, not a box: no tint and no padding, its link the paper's.
  { key: 'home', slug: 'size:fill:fit-figure:none-title:full:split:link:status-authors:short:marked-text:none-extras:venue,year-venue:full:undated:noarxiv:authors-buttons:year,paperbutton:right-paper:paper:grey-look:padding=0,yearstyle=italic,background=none', where: 'Home — the selected publications' },
];
export const PRESET = Object.fromEntries(SITE_PRESETS.map((p) => [p.key, p.slug]));

/** The software tiers that are drawn as cards of their own, and the preset
 *  the site gives each — the one thing both the site and the README's images
 *  (src/pages/cards/) read, so they cannot disagree about which package gets
 *  which card. */
export const TIER_PRESET = { lead: 'softwareLead', headline: 'softwareHeadline' };

/** The width, in px, the software cards are drawn at for the README's images:
 *  src/pages/cards/. */
export const CARD_SVG_WIDTH = 400;

/** A preset's name at a set width in px, in place of filling its column. */
export const atWidth = (slug, width) => slug.replace(/^size:fill:/, `size:${width}:`);

/** The steps in px, as global.css has them — a test holds the two to half
 *  a pixel — for the settings that can be typed in px: the text and title
 *  sizes, padding (the top's; the sides are a little wider), corners and
 *  buttons. The Card Builder labels their stops with these, not the steps'
 *  names, which say nothing about a size. With the range a typed size may
 *  take. */
export const STEP_PX = {
  textsize: { minor: 11.5, compact: 12.5, standard: 14, feature: 16, display: 18.4, min: 8, max: 40, what: 'The text size, in pixels' },
  titlesize: { minor: 12.4, compact: 13.5, standard: 15.2, feature: 17.3, display: 19.9, min: 8, max: 60, what: 'The title size, in pixels' },
  padding: { minor: 8, compact: 11, standard: 15, feature: 19, display: 24, min: 0, max: 64, what: 'The padding, in pixels, the same on every side' },
  corners: { minor: 10, compact: 12, standard: 16, feature: 18, display: 22, min: 0, max: 64, what: 'The corner radius, in pixels' },
  buttons: { minor: 21, compact: 23, standard: 26, feature: 30, display: 35, min: 12, max: 64, what: 'The link buttons, in pixels; the icon is half' },
};
/** The frame's steps in px, look:frame=<step>, as global.css has them: the
 *  builder shows a step as its px, the box having no steps of its own. */
export const FRAME_PX = { minor: 3, compact: 4, standard: 5, feature: 8, display: 12 };

/** The Card Builder's starting card, for every item: a full strip with its
 *  byline, summary, figure and venue. Extras an item has not got drop out. */
export const BUILDER_DEFAULT = 'size:fill:fit-figure:left:top:auto-title:full:split-authors:full:plain-text:summary-extras:venue-buttons:all:right';

/** The types that are drawn as cards, and so can be embedded. */
export const CARD_TYPES = ['publication', 'highlight', 'software'];

export const hasFigure = (item) => !!item.highlight?.image;
export const hasPosition = (item) => item.type !== 'software' && authorPosition(item) != null;
/** A paper with a student of mine among its authors: the students extra. */
export const hasStudents = (item) => item.type === 'publication' && (item.authors ?? []).some((a) => a.student);
export const hasRole = (item) => item.type === 'software' && !!item.role;
export const hasVenue = (item) => item.type === 'publication';
/** The year stands on its own in a paper's or a synthesis's rail. */
export const hasYear = (item) => item.type !== 'software';
/** The pill after a paper's title, title:…:status: where it stands, while
 *  it is not yet out — submitted or accepted. */
export const titleStatus = (item) => (item.type === 'publication' && ['submitted', 'accepted'].includes(item.status) ? item.status : null);
/** A paper not yet out: submitted, accepted. In preparation has no venue line. */
export const hasStatus = (item) => !!titleStatus(item);
/** Context links to the item's topic on /research/, so only a topic it shows. */
export const hasContext = (item) => HIGHLIGHT_TOPICS.some(([key]) => key === item.highlight?.topic);

/** The star count, as a button's label: 657 → "657", 1234 → "1.2k". */
export const starLabel = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

/** Below this many stars a button reads as a liability, not a credential, so
 *  a package with fewer has none. */
export const STARS_MIN = 40;

/** A package's stars, as a link to who gave them — none where the count is
 *  unknown, rather than a button that says 0, or is under STARS_MIN.
 *  config/stars.json is refreshed monthly, so the number is a month old at worst. */
function starLink(item) {
  const n = item.repo && starCounts.stars[item.repo];
  return n == null || n < STARS_MIN ? [] : [{ rel: 'stars', label: `${starLabel(n)} stars`, count: starLabel(n), url: `https://github.com/${item.repo}/stargazers` }];
}

/** The links a card carries, in order: for software its papers lead, each
 *  with its year. */
export function cardLinks(item) {
  return item.type === 'software' ? [...softwarePapers(item), ...links(item), ...starLink(item)] : links(item);
}

/** The link keys a card can be cut down to — `ads`, `preprint`, `code` … */
export const linkKeys = (item) => [...new Set(cardLinks(item).map(relKey))];

/** What an embed shows when its URL asks for nothing in particular: the card
 *  the website draws for it, in a fixed box at the standard look, so an
 *  iframe with no width still gets a card of a known shape. */
export function defaultSlug(item) {
  if (item.type === 'software') return 'size:320:400-figure:none-title:full:whole:link-authors:none-text:details-extras:none-buttons:all:fit-look:standard';
  if (!hasFigure(item)) return 'size:640:160-figure:none-title:full:whole:link-authors:full:marked-text:none-extras:venue-buttons:all:fit:right-look:standard';
  return `size:320:400-figure:center:auto:link-title:short:link-authors:none-text:none-extras:${hasPosition(item) ? (hasStudents(item) ? 'position,students' : 'position') : 'none'}-buttons:all:fit-look:standard`;
}

/** A card's two tiers of text. A package has its own summary and details; a
 *  paper or synthesis has its highlight's description as details, and as
 *  summary the record's own or, failing that, the description's first
 *  sentence. Either may be missing — a paper with no highlight has neither. */
export function cardText(item) {
  if (item.type === 'software') return { summary: item.summary, details: item.details ?? item.summary };
  const d = item.highlight?.description;
  // ponytail: the first sentence ends at the first ". " — an abbreviation such
  // as "e.g. " would cut it short; give the record a summary if one does.
  return { summary: item.summary ?? d?.match(/^.+?[.!?](?=\s|$)/)?.[0], details: d };
}

/** Where a card's paper button links, paper:…:<to>: the article, arXiv, ADS
 *  or this site; left unsaid, the article where it is out, else arXiv, else
 *  nowhere — and with nowhere to go there is no button. */
export function paperHref(item, to) {
  if (item.type !== 'publication') return null;
  const arxiv = links(item).find((l) => l.rel === 'preprint')?.url ?? (item.arxiv ? `https://arxiv.org/abs/${item.arxiv}` : null);
  const by = { journal: journalHref(item), arxiv, ads: adsHref(item), site: siteHref(item) };
  return (to ? by[to] : by.journal ?? by.arxiv) ?? null;
}

/** Where a card's title links, title:…:link — the item itself: a paper's
 *  paper or preprint, a package's first link. */
export const ownLink = (item) => (item.type === 'software' ? links(item)[0] : (primaryLink(item) ?? links(item)[0])) ?? null;

/** title:…:ads — its ADS abstract, where it has a bibcode. */
export const adsHref = (item) => (item.bibcode ? `https://ui.adsabs.harvard.edu/abs/${item.bibcode}/abstract` : null);

/** title:…:journal — where it was published: the journal's own page, or its
 *  DOI, once it is out. */
export const journalHref = (item) => (item.type === 'publication' ? venueUrl(item) : null);

/** Where it links with title:…:site — the item's entry on this site, where
 *  it has one: a paper on /publications/ (an in-prep one is not listed), a
 *  package on /software/, a synthesis on /research/. */
export const siteHref = (item) => (item.type === 'publication' ? (item.status !== 'in-prep' ? `/publications/#pub-${item.id}` : null)
  : item.type === 'software' ? `/software/#sw-${item.id}` : item.type === 'highlight' ? `/research/#hl-${item.id}` : null);

/** Where a click on an exported image of the card should go, and a
 *  research card's title: the paper, else its first link. */
export const embedHref = (item) => (primaryLink(item) ?? links(item)[0])?.url ?? null;

/** What a card can show of an item, for cardFace: the parts it has, its
 *  links' keys in order, and where its paper button can go. every: the
 *  embed page's card, which draws every part for a name to choose from. */
export function cardFacts(item, every = false) {
  return {
    every, type: item.type, figure: hasFigure(item), place: hasPosition(item), year: hasYear(item), context: hasContext(item),
    role: hasRole(item), students: hasStudents(item), venue: hasVenue(item), status: hasStatus(item), tstatus: !!titleStatus(item), split: !!splitTitle(item),
    byline: item.type === 'publication', lead: hasPosition(item) && authorPosition(item) === 1,
    varxiv: item.type === 'publication' && !venueLine(item), refs: item.type === 'highlight' ? item.refs.length : 0,
    keys: cardLinks(item).map(relKey),
    paper: Object.fromEntries(['auto', 'journal', 'arxiv', 'ads', 'site'].map((k) => [k, !!paperHref(item, k === 'auto' ? undefined : k)])),
  };
}
