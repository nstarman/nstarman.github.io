// The saved-selection file for the CV builder.
//
// A selection is a list of entry ids plus, per entry, which of its detail lines
// are kept. That only means something against a particular version of the
// database, so the file records the commit the site was built from: if the ids
// no longer resolve, `git checkout <commit>` and a local build gets them back.
//
// Read by the builder from a file the user chose, so decode() treats its input
// as hostile — wrong shape, wrong types, absurd sizes — and fails with a
// sentence a person can act on rather than a TypeError from three frames down.

export const FORMAT = 'starkman-cv-selection';
export const VERSION = 1;

// Nothing legitimate approaches these; they stop a malformed or malicious file
// from being expanded into millions of DOM lookups.
const MAX_ITEMS = 5000;
const MAX_LINES_PER_ITEM = 500;

/** The selection as it is written to disk. */
export function encode({ items, lines, site = {}, savedAt }) {
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
  };
}

class SelectionError extends Error {}

const fail = (msg) => {
  throw new SelectionError(msg);
};

/**
 * Parse a saved selection. Throws `SelectionError` with a readable message.
 * Returns `{ items:Set, lines:Map<string,Set<number>>, site, savedAt }`.
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

  const site = raw.site && typeof raw.site === 'object' && !Array.isArray(raw.site) ? raw.site : {};
  return {
    items,
    lines,
    savedAt: typeof raw.savedAt === 'string' ? raw.savedAt : null,
    site: {
      commit: typeof site.commit === 'string' ? site.commit : null,
      short: typeof site.short === 'string' ? site.short : null,
      dirty: !!site.dirty,
    },
  };
}

export { SelectionError };
