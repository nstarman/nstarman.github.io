// The saved-selection file for the CV builder.
//
// A selection is a list of entry ids plus, per entry, which of its detail lines
// are kept, and the style it was meant to be compiled in. That only means something against a particular version of the
// database, so the file records the commit the site was built from: if the ids
// no longer resolve, `git checkout <commit>` and a local build gets them back.
//
// Read by the builder from a file the user chose, so decode() treats its input
// as hostile — wrong shape, wrong types, absurd sizes — and fails with a
// sentence a person can act on rather than a TypeError from three frames down.

import { plural } from '@nstarkman/data-resolver/inline.js';
import { readSavedSpacing } from './cvspacing.js';

export const FORMAT = 'starkman-cv-selection';
export const VERSION = 1;

// Nothing legitimate approaches these; they stop a malformed or malicious file
// from being expanded into millions of DOM lookups.
const MAX_ITEMS = 5000;
const MAX_LINES_PER_ITEM = 500;

/** The selection as it is written to disk. */
/** Spacing key (a section id, `<id>.heading` or `<id>.legend`) →
 *  `{value, unit}`, held to the field's limits; a bare number, as files saved
 *  before points existed have it, is a multiple. Anything else is dropped. */
const cleanSpacing = (raw) => {
  const out = {};
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [id, g] of Object.entries(raw)) {
    const gap = readSavedSpacing(g);
    if (gap) out[id] = gap;
  }
  return out;
};

/** Section id → how its heading prints: `none`, or a variant of the style.
 *  Names, not promises — which variants exist is the style's to say, so the
 *  builder decides what an unknown one falls back to, as with `style`. */
const cleanHeadings = (raw) => {
  const out = {};
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [id, h] of Object.entries(raw)) {
    if (typeof h === 'string' && h.length <= 64) out[id] = h;
  }
  return out;
};

/** Part key (`<id>.legend`) → where it sits. Names, as headings are: which
 *  places exist is the template's to say, and the builder falls back. */
const cleanPlace = (raw) => cleanHeadings(raw);

/** Section id → `select`, for the sections whose heading says "Select". */
const cleanPrefix = (raw) => Object.fromEntries(
  Object.entries(cleanHeadings(raw)).filter(([, v]) => v === 'select'));

/** Section ids, first to last. Names, as headings are: which sections exist is
 *  the page's to say, and it appends any the file does not name. */
/** Institution → whether its roles print as one row, where the builder chose
 *  against the records' own `groupRoles`. */
const cleanGroup = (raw) => Object.fromEntries(
  Object.entries(raw && typeof raw === 'object' ? raw : {})
    .filter(([k, v]) => typeof v === 'boolean' && k.length <= 128).slice(0, 64));

/** The header card: part → on, off, or a link's `"icon"` or `"text"` alone; and
 *  `order`, the links in the order they print, "/" breaking the line. Names,
 *  as headings are: which parts exist is the page's to say. Absent, `null`:
 *  the card as it comes, every part on, in the usual order. */
const CARD_VALUES = [true, false, 'icon', 'text'];
const cleanCard = (raw) => {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out = {};
  for (const [k, v] of Object.entries(raw).slice(0, 64)) {
    if (k !== 'order' && k.length <= 64 && CARD_VALUES.includes(v)) out[k] = v;
  }
  if (Array.isArray(raw.order)) {
    out.order = raw.order.filter((k) => typeof k === 'string' && k.length <= 64).slice(0, 64);
  }
  return out;
};

/** Section id → true, or { hIndex } naming its source, for the publication
 *  lists that open with a tally. Sources are names, as headings are. */
const cleanTally = (raw) => Object.fromEntries(
  Object.entries(raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {})
    .filter(([k]) => k.length <= 64).slice(0, 64)
    .map(([k, v]) => [k, v === true ? true
      : v && typeof v.hIndex === 'string' && v.hIndex.length <= 64 ? { hIndex: v.hIndex } : null])
    .filter(([, v]) => v !== null));

/** Section id → false, for the sections whose entries leave their place out. */
const cleanLocation = (raw) => Object.fromEntries(
  Object.entries(raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {})
    .filter(([k, v]) => v === false && k.length <= 64).slice(0, 64));

/** Section id → false, for the sections whose entries print their title without the place
 *  it ends with. Absent, every title prints whole. */
const cleanTitlePlace = (raw) => Object.fromEntries(
  Object.entries(raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {})
    .filter(([k, v]) => v === false && k.length <= 64).slice(0, 64));

/** Section id → true, for the sections whose entries print their place on a line
 *  of its own below the title, not in the right-hand column. */
const cleanLocationBelow = (raw) => Object.fromEntries(
  Object.entries(raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {})
    .filter(([k, v]) => v === true && k.length <= 64).slice(0, 64));

const cleanOrder = (raw) => (Array.isArray(raw)
  ? [...new Set(raw.filter((s) => typeof s === 'string' && s.length <= 64))].slice(0, 64)
  : []);

/** Section id → how many columns its grid has, for the grids not at the usual 3. */
const cleanColumns = (raw) => {
  const out = {};
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [id, n] of Object.entries(raw)) {
    if (Number.isInteger(n) && n >= 2 && n <= 5 && n !== 3) out[id] = n;
  }
  return out;
};

const CURRENCY_STYLES = ['us', 'dollar'];

/** A list of entry ids, each a short string, once. */
const cleanIds = (raw) => [...new Set(Array.isArray(raw) ? raw.filter((k) => typeof k === 'string' && k.length <= 64) : [])].slice(0, 256);

/** Entry id → its institution-name level, 1 or 2; full is the absence. */
const cleanNamesFor = (raw) => Object.fromEntries(
  Object.entries(raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {})
    .filter(([k, v]) => k.length <= 64 && [1, 2].includes(v)).slice(0, 256));

export function encode({ items, lines, inline, style, spacing, heading, place, prefix, order, columns, group, card, location, locationBelow, titlePlace, page, trailcap, namesFor, currency, funderOff, fill, paperIds, schoolBelow, linkOnDegree, tally, site = {}, savedAt }) {
  const clean = {};
  for (const [id, ns] of Object.entries(lines ?? {})) {
    const kept = [...new Set(ns)].filter((n) => Number.isInteger(n) && n >= 0).sort((a, b) => a - b);
    if (kept.length) clean[id] = kept;
  }
  return {
    format: FORMAT,
    version: VERSION,
    savedAt: savedAt ?? new Date().toISOString(),
    // What the ids mean. `dirty` says the build had uncommitted changes, so the
    // commit alone will not reproduce it.
    site: { commit: site.commit ?? null, short: site.short ?? null, dirty: !!site.dirty },
    items: [...new Set(items ?? [])].filter((s) => typeof s === 'string'),
    lines: clean,
    // Entries whose recipient prints on the title line. Absent, none does.
    inline: [...new Set(inline ?? [])].filter((s) => typeof s === 'string'),
    // Which pre-built style to compile in. Absent means the default, which is
    // also what every selection saved before styles existed means.
    style: typeof style === 'string' ? style : null,
    // How far apart each section's entries sit, for the sections not at their
    // default. Absent means every one is.
    spacing: cleanSpacing(spacing),
    // How each section's heading prints. A section absent takes the style's
    // usual heading, which is what every earlier selection means.
    heading: cleanHeadings(heading),
    // Where a part sits, for the parts not in their usual place.
    place: cleanPlace(place),
    // The sections whose heading says "Select". Absent, none does.
    prefix: cleanPrefix(prefix),
    // The order the sections print in. Absent means the preset's own.
    order: cleanOrder(order),
    // Grids not at the usual 3 columns. Absent, it says it.
    columns: cleanColumns(columns),
    // Institutions whose roles are grouped, or not, against the records' say.
    group: cleanGroup(group),
    // What the header card shows, and its links' order. Absent, the card as it
    // comes, which is what every selection saved before the card means.
    card: cleanCard(card),
    // Sections whose entries leave their place out. Absent, every one prints it.
    location: cleanLocation(location),
    // Sections whose entries print their place below the title. Absent, none does.
    locationBelow: cleanLocationBelow(locationBelow),
    // Sections whose entries leave the place out of the title. Absent, none does.
    titlePlace: cleanTitlePlace(titlePlace),
    // The page format, as the Page menu names it. Absent, the style's default.
    // (`format` is the file's own kind, above.)
    page: typeof page === 'string' && page.length <= 64 ? page : null,
    // Whether the right-hand column of dated entries is capped. Absent, it is not.
    trailcap: trailcap === true,
    // How much of an entry's institution name prints, by id: 1 shorter, 2
    // shortest. Absent, full.
    namesFor: cleanNamesFor(namesFor),
    // How amounts are written: `us` (US$, CA$) or `dollar` ($, CA$). Absent, codes.
    currency: CURRENCY_STYLES.includes(currency) ? currency : null,
    // Entries whose institution (`funder`) does not print. Absent, every one does.
    funderOff: cleanIds(funderOff),
    // Whether an entry's text runs out to its own right-hand text. Absent, off.
    fill: fill === true,
    // Whether a mentee's papers are cited by identifier. Absent, in words.
    paperIds: paperIds === true,
    // Whether Education puts the university on its own line. Absent, on the degree's line.
    schoolBelow: schoolBelow === true,
    linkOnDegree: linkOnDegree === true,
    // Publication lists that open with a tally, and the h-index it adds.
    // Absent, none does.
    tally: cleanTally(tally),
  };
}

class SelectionError extends Error {}

const fail = (msg) => {
  throw new SelectionError(msg);
};

/**
 * Parse a saved selection. Throws `SelectionError` with a readable message.
 * Returns `{ items:Set, lines:Map<string,Set<number>>, inline:Set, style, spacing, heading, place, prefix, order, columns, group, card, location, locationBelow, titlePlace, page, tally, site, savedAt }`.
 */
export function decode(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    fail('That file is not JSON.');
  }
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    fail('That file is not a saved selection.');
  }
  if (raw.format !== FORMAT) {
    fail('That is not a CV selection file.');
  }
  // Forward compatibility is the author's problem, not the reader's: a newer
  // file may mean things this build cannot honour, so say so rather than guess.
  if (!Number.isInteger(raw.version) || raw.version > VERSION) {
    fail(`That selection was saved by a newer version of this page (v${raw.version}).`);
  }
  if (!Array.isArray(raw.items)) fail('That selection has no entry list.');
  if (raw.items.length > MAX_ITEMS) fail('That selection is implausibly large.');

  const items = new Set(raw.items.filter((s) => typeof s === 'string'));

  const lines = new Map();
  const rawLines = raw.lines;
  if (rawLines !== undefined) {
    if (rawLines === null || typeof rawLines !== 'object' || Array.isArray(rawLines)) {
      fail('That selection has a malformed detail list.');
    }
    for (const [id, ns] of Object.entries(rawLines)) {
      if (!Array.isArray(ns) || ns.length > MAX_LINES_PER_ITEM) continue;
      const kept = ns.filter((n) => Number.isInteger(n) && n >= 0);
      if (kept.length) lines.set(id, new Set(kept));
    }
  }

  const inline = new Set(Array.isArray(raw.inline)
    ? raw.inline.filter((s) => typeof s === 'string').slice(0, MAX_ITEMS) : []);

  const site = raw.site && typeof raw.site === 'object' && !Array.isArray(raw.site) ? raw.site : {};
  // A name, not a promise that this build has it: a file may have been saved by
  // a build with styles this one does not. The caller decides what to do about
  // that, which is why an unknown name is returned rather than rejected.
  const style = typeof raw.style === 'string' && raw.style.length <= 64 ? raw.style : null;
  return {
    items,
    lines,
    inline,
    style,
    spacing: cleanSpacing(raw.spacing),
    heading: cleanHeadings(raw.heading),
    place: cleanPlace(raw.place),
    prefix: cleanPrefix(raw.prefix),
    order: cleanOrder(raw.order),
    columns: cleanColumns(raw.columns),
    group: cleanGroup(raw.group),
    card: cleanCard(raw.card),
    location: cleanLocation(raw.location),
    locationBelow: cleanLocationBelow(raw.locationBelow),
    titlePlace: cleanTitlePlace(raw.titlePlace),
    page: typeof raw.page === 'string' && raw.page.length <= 64 ? raw.page : null,
    trailcap: raw.trailcap === true,
    namesFor: cleanNamesFor(raw.namesFor),
    currency: CURRENCY_STYLES.includes(raw.currency) ? raw.currency : null,
    funderOff: cleanIds(raw.funderOff),
    fill: raw.fill === true,
    paperIds: raw.paperIds === true,
    schoolBelow: raw.schoolBelow === true,
    linkOnDegree: raw.linkOnDegree === true,
    tally: cleanTally(raw.tally),
    savedAt: typeof raw.savedAt === 'string' ? raw.savedAt : null,
    site: {
      commit: typeof site.commit === 'string' ? site.commit : null,
      short: typeof site.short === 'string' ? site.short : null,
      dirty: !!site.dirty,
    },
  };
}

/**
 * What to tell the reader after loading `sel` into a page that offers the
 * entries in `known` and was built from `here` (buildInfo()).
 *
 * @param {boolean} styleKnown whether the page offers the file's style
 * @returns {{ message: string, missing: string[] }}
 */
export function loadReport(sel, known, here, styleKnown) {
  const missing = [...sel.items].filter((id) => !known.has(id));
  const restored = sel.items.size - missing.length;
  const parts = [`Loaded ${plural(restored, 'entry', 'entries')}.`];
  // A style this build does not have is worth saying out loud — the PDF
  // would silently come out in a different design otherwise.
  if (!styleKnown) {
    parts.push(`Its style "${sel.style ?? 'default'}" is not one this page offers; using Default.`);
  }
  // The commit is why the file carries one. If entries have gone missing,
  // the fix is mechanical, so say what it is rather than only that it broke.
  const from = sel.site.commit;
  const moved = from && here.commit && from !== here.commit;
  const saved = `Saved from ${sel.site.short ?? from?.slice(0, 7)}`;
  if (missing.length) {
    parts.push(`${plural(missing.length, 'entry', 'entries')} no longer ${missing.length === 1 ? 'exists' : 'exist'} here.`);
    if (moved) {
      parts.push(`${saved}; this site is ${here.short}.`);
      parts.push(`git checkout ${from} && npm run build to recover ${missing.length === 1 ? 'it' : 'them'}.`);
    } else {
      parts.push('They were removed from the database.');
    }
  } else if (moved) {
    parts.push(`${saved}; every entry still resolves.`);
  }
  if (sel.site.dirty) parts.push('That build had uncommitted changes.');
  return { message: parts.join(' '), missing };
}

export { SelectionError };
