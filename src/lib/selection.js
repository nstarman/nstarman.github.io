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
export const VERSION = 2;

// What changed under a saved file between versions, as data, so decode() can bring an old file up
// to now and it prints what it printed when it was saved.
//
// 2: an organized conference's role moved from its first detail line ("Role: SOC") into `role`, so
//    the line went and those after it each moved up one; Conferences split into Organized, Attended
//    and Professional & Software Talks; section groups (`groups`) arrived, off for an old file.
//    The index is the line's among all the entry's lines, where a talk's title is line 0.
const V2_LINE_GONE = {
  'jaxtronomy-workshop': 0, 'division-of-dynamical-astronomy-56': 0, 'astropy-coordination-meeting': 0,
  'astrophysics-and-space-science-in-marche-iii-big-bang-big-st': 0, 'gaia-hackathon': 0, 'gaia-hackathon-2': 0,
  'astropy-core-developer-conference-talk': 1,
};
const V2_SPLIT = { conferences: ['conferences-organized', 'conferences-attended', 'talks-professional'] };
// Settings keyed by section id, and those keyed `<id>.<part>`.
const BY_SECTION = ['heading', 'locationAt', 'location', 'locationBelow', 'prefix', 'columns', 'tally'];
const BY_PART = ['spacing', 'place'];

function toV2(raw) {
  // A malformed list is left as it is, for decode() to refuse as it would any other.
  const ok = raw.lines && typeof raw.lines === 'object' && !Array.isArray(raw.lines);
  const lines = ok ? { ...raw.lines } : raw.lines;
  for (const [id, gone] of ok ? Object.entries(V2_LINE_GONE) : []) {
    if (!Array.isArray(lines[id])) continue;
    const moved = lines[id].filter((n) => Number.isInteger(n) && n !== gone).map((n) => (n > gone ? n - 1 : n));
    if (moved.length) lines[id] = moved; else delete lines[id];
  }
  const split = (key) => {
    const [id, ...part] = key.split('.');
    return V2_SPLIT[id]?.map((to) => [to, ...part].join('.')) ?? [key];
  };
  const renamed = (obj) => Object.fromEntries(Object.entries(objectOf(obj)).flatMap(([k, v]) => split(k).map((to) => [to, v])));
  const out = { ...raw, version: 2, lines };
  for (const f of [...BY_SECTION, ...BY_PART]) if (raw[f] !== undefined) out[f] = renamed(raw[f]);
  if (Array.isArray(raw.order)) out.order = raw.order.flatMap((id) => (typeof id === 'string' ? split(id) : [id]));
  return out;
}
const MIGRATIONS = { 1: toV2 };

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

/** Section id → true, or { hIndex } naming its source, { of: "record" } to
 *  count the whole record and { form: "short" } for the short form, for the
 *  publication lists that open with a tally. Sources are names, as headings
 *  are; any other `of` counts the list, any other `form` is the long one. */
const cleanTally = (raw) => Object.fromEntries(
  Object.entries(raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {})
    .filter(([k]) => k.length <= 64).slice(0, 64)
    .map(([k, v]) => {
      if (v === true) return [k, true];
      if (!v || typeof v !== 'object') return [k, null];
      const t = {
        ...(v.of === 'record' && { of: 'record' }),
        ...(v.form === 'short' && { form: 'short' }),
        ...(typeof v.hIndex === 'string' && v.hIndex.length <= 64 && { hIndex: v.hIndex }),
      };
      return [k, Object.keys(t).length ? t : 'of' in v || 'form' in v ? true : null];
    })
    .filter(([, v]) => v !== null));

/** Section id → where its entries print their place: `below` the title, `title` (in it,
 *  in parentheses) or `none`. Absent, the right-hand column. One value, so never two places. */
const PLACES = ['below', 'title', 'none'];
const cleanLocationAt = (raw) => Object.fromEntries(
  Object.entries(raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {})
    .filter(([k, v]) => PLACES.includes(v) && k.length <= 64).slice(0, 64));

/** The right-hand column's cap, in inches: a number from 0.5 to 4 that is not the usual 1.45 (that
 *  is absence). Anything else reads as the usual width. */
export const TRAILCAP_DEFAULT = 1.45;
const cleanTrailcapWidth = (n) => (typeof n === 'number' && Number.isFinite(n) && n >= 0.5 && n <= 4 && n !== TRAILCAP_DEFAULT ? n : null);

const objectOf = (raw) => (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {});

/** What older files said, as `locationAt` says it: `location: { id: false }` left places
 *  out (`none`) and `locationBelow: { id: true }` put them below the title. An explicit
 *  `locationAt` wins, and among the old two, leaving them out does. */
const locationAtOf = (raw) => ({
  ...Object.fromEntries(Object.entries(objectOf(raw.locationBelow)).filter(([k, v]) => v === true && k.length <= 64).map(([k]) => [k, 'below'])),
  ...Object.fromEntries(Object.entries(objectOf(raw.location)).filter(([k, v]) => v === false && k.length <= 64).map(([k]) => [k, 'none'])),
  ...cleanLocationAt(raw.locationAt),
});

/** How a place prints: `region: false` leaves the province or state out, `country: 'code'` writes
 *  the country as its code. Either, or both; absent, the place as written. */
const cleanLocationDetail = (raw) => ({
  ...(objectOf(raw).region === false && { region: false }),
  ...(objectOf(raw).country === 'code' && { country: 'code' }),
});

/** Section groups switched on, by id. An id this build does not define is ignored by the resolver. */
const cleanGroups = (raw) => [...new Set(Array.isArray(raw) ? raw.filter((k) => typeof k === 'string' && /^[a-z0-9-]{1,64}$/.test(k)) : [])].slice(0, 16);

const cleanOrder = (raw) => (Array.isArray(raw)
  ? [...new Set(raw.filter((s) => typeof s === 'string' && s.length <= 64))].slice(0, 64)
  : []);

/** Section id → how many columns its grid has, for the grids not at the usual 3. */
const cleanColumns = (raw) => {
  const out = {};
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [id, n] of Object.entries(raw)) {
    if (Number.isInteger(n) && n >= 1 && n <= 5 && n !== 3) out[id] = n;
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

export function encode({ items, lines, inline, style, spacing, heading, place, prefix, order, columns, group, groups, card, locationAt, locationDetail, page, trailcap, trailcapWidth, namesFor, currency, funderOff, recipientOff, fill, paperIds, schoolBelow, linkOnDegree, tally, preset, site = {}, savedAt }) {
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
    // Section groups switched on — Professional Activities as one heading. Absent, none.
    groups: cleanGroups(groups),
    // What the header card shows, and its links' order. Absent, the card as it
    // comes, which is what every selection saved before the card means.
    card: cleanCard(card),
    // Where each section's entries print their place, if not in the right-hand
    // column: below the title, in it, or nowhere. Absent, the column.
    locationAt: cleanLocationAt(locationAt),
    // How a place prints: the region left out, the country abbreviated. Absent, as written.
    locationDetail: cleanLocationDetail(locationDetail),
    // The page format, as the Page menu names it. Absent, the style's default.
    // (`format` is the file's own kind, above.)
    page: typeof page === 'string' && page.length <= 64 ? page : null,
    // Whether the right-hand column of dated entries is capped. Absent, it is not.
    trailcap: trailcap === true,
    // How wide the capped right-hand column may be, in inches. Absent, the usual 1.45.
    trailcapWidth: cleanTrailcapWidth(trailcapWidth),
    // How much of an entry's institution name prints, by id: 1 shorter, 2
    // shortest. Absent, full.
    namesFor: cleanNamesFor(namesFor),
    // How amounts are written: `us` (US$, CA$) or `dollar` ($, CA$). Absent, codes.
    currency: CURRENCY_STYLES.includes(currency) ? currency : null,
    // Entries whose institution (`funder`) does not print. Absent, every one does.
    funderOff: cleanIds(funderOff),
    // Entries whose recipient line does not print. Absent, every one does.
    recipientOff: cleanIds(recipientOff),
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
    // The preset it was started from, whose layout it prints in. Absent, the complete CV's.
    preset: presetName(preset),
  };
}

// A name, not a promise that this build has that preset — loadReport says when it does not.
const presetName = (p) => (typeof p === 'string' && /^[a-z0-9-]{1,64}$/.test(p) ? p : null);

class SelectionError extends Error {}

const fail = (msg) => {
  throw new SelectionError(msg);
};

/**
 * Parse a saved selection. Throws `SelectionError` with a readable message.
 * Returns `{ items:Set, lines:Map<string,Set<number>>, inline:Set, style, spacing, heading, place, prefix, order, columns, group, card, locationAt, locationDetail, page, tally, preset, site, savedAt }`.
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
  // An older file is brought up to this version, step by step, before it is read.
  for (let v = raw.version; v < VERSION; v++) raw = MIGRATIONS[v]?.(raw) ?? raw;
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
    groups: cleanGroups(raw.groups),
    card: cleanCard(raw.card),
    locationAt: locationAtOf(raw),
    locationDetail: cleanLocationDetail(raw.locationDetail),
    page: typeof raw.page === 'string' && raw.page.length <= 64 ? raw.page : null,
    trailcap: raw.trailcap === true,
    trailcapWidth: cleanTrailcapWidth(raw.trailcapWidth),
    namesFor: cleanNamesFor(raw.namesFor),
    currency: CURRENCY_STYLES.includes(raw.currency) ? raw.currency : null,
    funderOff: cleanIds(raw.funderOff),
    recipientOff: cleanIds(raw.recipientOff),
    fill: raw.fill === true,
    paperIds: raw.paperIds === true,
    schoolBelow: raw.schoolBelow === true,
    linkOnDegree: raw.linkOnDegree === true,
    tally: cleanTally(raw.tally),
    preset: presetName(raw.preset),
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
 * @param {boolean} [presetKnown] whether the file's preset is one this build has
 * @returns {{ message: string, missing: string[] }}
 */
export function loadReport(sel, known, here, styleKnown, presetKnown = true) {
  const missing = [...sel.items].filter((id) => !known.has(id));
  const restored = sel.items.size - missing.length;
  const parts = [`Loaded ${plural(restored, 'entry', 'entries')}.`];
  // A style this build does not have is worth saying out loud — the PDF
  // would silently come out in a different design otherwise.
  if (!styleKnown) {
    parts.push(`Its style "${sel.style ?? 'default'}" is not one this page offers; using Default.`);
  }
  if (sel.preset && !presetKnown) {
    parts.push(`Its preset "${sel.preset}" is not one this page has; laid out as the complete CV.`);
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
