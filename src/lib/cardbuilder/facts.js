// What the Card Builder knows of each item, as plain data for its page: which
// parts the item has — a figure, a venue, a role, a title status — and where
// each of its links goes, so the controls offer only what the card can show.
// Computed at build time from the record; the page hands it to the builder.

import { relKey, splitTitle, venueLine, venueUrl } from '../data.js';
import {
  paperHref, PAPER_TO, hasFigure, hasPosition, hasRole, hasStudents, hasVenue, hasStatus, hasYear, hasContext, titleStatus, cardLinks, cardText, embedHref, ownLink, siteHref, adsHref, journalHref,
} from '../cards.js';

// The link keys a card can be cut to, each named in the builder: code, a
// preprint or data by where it goes — GitHub, arXiv, Zenodo — and ADS; a
// paper, the docs and the rest by what they are, wherever they are hosted. A
// key's links share its pill, so one that covers two places names both. The
// card's name, though, keeps the key.
const PLACES = { 'arxiv.org': 'arXiv', 'github.com': 'GitHub', 'zenodo.org': 'Zenodo', 'pypi.org': 'PyPI', 'openreview.net': 'OpenReview', 'ui.adsabs.harvard.edu': 'ADS' };
const BY_PLACE = ['code', 'repo', 'preprint', 'data', 'doi'];
export const linkPlace = (l) => {
  if (relKey(l) === 'ads') return 'ADS';
  if (!BY_PLACE.includes(l.rel)) return l.rel;
  const url = new URL(l.url, 'https://nstarkman.space');
  if (/zenodo/.test(url.pathname)) return 'Zenodo';
  return PLACES[url.host.replace(/^www\./, '')] ?? (l.rel === 'doi' ? 'DOI' : l.rel);
};
// A paper's own link goes to its publisher where it is the paper or its DOI
// and not ADS or arXiv: the title-link option then reads "publisher", and the
// journal's own, the same place, is not offered again.
const toPublisher = (i) => i.type === 'publication' && ['paper', 'doi'].includes(ownLink(i)?.rel) && !/adsabs|arxiv/.test(ownLink(i).url);
export const linkChoices = (i) => {
  const byKey = new Map();
  for (const l of cardLinks(i)) {
    const k = relKey(l);
    const o = byKey.get(k) ?? { names: new Set(), titles: new Set() };
    o.names.add(linkPlace(l));
    o.titles.add(l.label ?? l.rel);
    byKey.set(k, o);
  }
  return [...byKey].map(([k, o]) => [k, [...o.names].join(' · '), [...o.titles].join(', ')]);
};

/** The facts the builder keeps of one item. */
export const itemFacts = (i) => ({
  title: i.title,
  href: embedHref(i),
  figure: hasFigure(i),
  pos: hasPosition(i),
  role: hasRole(i),
  students: hasStudents(i),
  paperTo: Object.fromEntries(PAPER_TO.map((t) => [t, !!paperHref(i, t)])),
  venue: hasVenue(i),
  vlink: hasVenue(i) && !!venueUrl(i),
  varxiv: hasVenue(i) && !venueLine(i),
  vshort: hasVenue(i) && venueLine(i, { short: true }) !== venueLine(i) ? venueLine(i, { short: true }) : null,
  status: hasStatus(i) ? i.status : null,
  year: hasYear(i),
  tstatus: titleStatus(i),
  context: hasContext(i),
  split: !!splitTitle(i),
  byline: i.type === 'publication',
  text: !!(cardText(i).summary || cardText(i).details),
  links: linkChoices(i),
  link: ownLink(i) ? (toPublisher(i) ? 'publisher' : linkPlace(ownLink(i))) : null,
  site: siteHref(i) ? '/website/' : null,
  ads: adsHref(i) ? 'ADS' : null,
  journal: journalHref(i) && !toPublisher(i) ? 'publisher' : null,
  linkIs: ['ads', 'journal'].find((l) => ownLink(i)?.url && ownLink(i).url === (l === 'ads' ? adsHref(i) : journalHref(i))) ?? null,
});
