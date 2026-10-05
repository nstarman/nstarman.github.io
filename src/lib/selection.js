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

import { plural } from './inline.js';
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

export function encode({ items, lines, inline, style, spacing, heading, place, prefix, order, columns, group, site = {}, savedAt }) {
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
  };
}

class SelectionError extends Error {}

const fail = (msg) => {
  throw new SelectionError(msg);
};

/**
 * Parse a saved selection. Throws `SelectionError` with a readable message.
 * Returns `{ items:Set, lines:Map<string,Set<number>>, style, spacing, heading, place, prefix, order, columns, site, savedAt }`.
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
