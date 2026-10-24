// Resolves a preset into ordered sections of items.
//
// This is the replacement for make_short.py, which produced the short CVs by
// grepping `% SKIP: (*)` markers out of the .tex and then injecting \vspace
// hacks to repair the layout. Selection is data now: `cvs` says which presets an
// item belongs to, the section `match` says where it lands, and `detail` says
// whether its `details` field renders.
//
// The same resolver serves the HTML CV page, the CI-built PDFs, and the
// in-browser builder — so all three cannot disagree about what "2-page" means.

import presets from '/config/presets.json';
import person from '/config/person.json';
import { items, lists } from './data.js';

/** What the PDF's card can show — each profile link by its service — each on
 *  unless a preset's `card` turns it off; the email, the website or a link may
 *  be `"icon"`, its mark without its label, or `"text"`, its label without its
 *  mark. */
const SERVICES = person.profiles.map((p) => (p.service ?? p.label).toLowerCase());
export const CARD_PARTS = ['portrait', 'address', 'email', 'website', ...SERVICES, 'qr'];
/** The card's links in the order they print, "/" breaking the line: the email
 *  and the website sharing one and the profiles the next — or, on US Letter,
 *  the email and the website a line each, since at 12pt they do not fit one. */
export const cardOrder = (letter) => ['email', ...(letter ? ['/'] : []), 'website', '/', ...SERVICES];

const asArray = (v) => (v === undefined ? undefined : Array.isArray(v) ? v : [v]);

/**
 * A section's `match` is a plain AND over fields; array values mean "any of".
 * `not` is the same shape, and rules an item out where every field in it holds.
 */
function matches(item, { not, ...match }) {
  const holds = (m) => Object.entries(m).every(([field, want]) => asArray(want).includes(item[field]));
  return holds(match) && !(not && holds(not));
}

export const presetNames = Object.keys(presets).filter((k) => !k.startsWith('$'));

/**
 * A preset's sections name one of `$sections` by id, written once so the
 * presets cannot drift apart, or override just the keys that differ there:
 * `{ "id": "publications", "limit": 5 }`. `null` removes a key, as
 * `"groupBy": null` does for the one-page CV.
 */
function section(ref) {
  const { id } = typeof ref === 'string' ? { id: ref } : ref;
  const shared = presets.$sections[id];
  if (!shared) throw new Error(`Unknown CV section "${id}". Define it in $sections in config/presets.json.`);
  return { id, ...shared, ...(typeof ref === 'string' ? {} : ref) };
}

export function preset(name) {
  const spec = presets[name];
  if (!spec) throw new Error(`Unknown CV preset "${name}". Known: ${presetNames.join(', ')}`);
  return { ...spec, sections: spec.sections.map(section) };
}

/**
 * @param {string} name          preset key, e.g. "2page"
 * @param {Set<string>} [only]   optional id allow-list, used by the builder's checkboxes
 * @param {{ prefix?: Record<string, string> }} [opts]
 *   section id → `select` to put "Select " on that section's heading when it is a selection
 */
const rank = (order, id) => { const i = order.indexOf(id); return i < 0 ? order.length : i; };

// `"sort": "tier"` orders a section by the tiers /software/ uses: flagship, major, minor,
// utility, and by `order` within a tier. Stable, so ties stay newest-first.
const TIERS = ['flagship', 'major', 'minor', 'utility'];
const byTier = (a, b) => rank(TIERS, a.tier) - rank(TIERS, b.tier) || (a.order ?? 0) - (b.order ?? 0);

/**
 * A publication list's headline numbers, for a section with `"tally": true`:
 * how many papers, how many still submitted, how many I wrote first, how many a
 * student I supervised led, and the h-index as of the last ADS refresh. The
 * h-index rather than a citation total, which one community paper (Astropy
 * v5.0) would swamp. Counted from the records rather than typed, so it cannot
 * fall behind the list beneath it.
 */
export function tally(pubs) {
  const lead = (p) => p.authors?.[0] ?? {};
  const cites = pubs.map((p) => p.citations ?? 0).sort((a, b) => b - a);
  return {
    total: pubs.length,
    submitted: pubs.filter((p) => p.status === 'submitted').length,
    first: pubs.filter((p) => lead(p).me).length,
    student: pubs.filter((p) => lead(p).mentee).length,
    h: cites.filter((c, i) => c >= i + 1).length,
  };
}

export function resolve(name, only, { prefix = {}, order = [], location = {} } = {}) {
  const spec = preset(name);
  // Whose `cvs` membership this preset takes: its own, or another preset's
  // when it is the same CV in a different page format, so no item has to list
  // both.
  const members = spec.members ?? name;

  const sections = spec.sections.map((section) => {
    // A list section has no items — it renders its entries verbatim — so the
    // builder selects it whole, by a key no item id can take (ids have no colon).
    if (section.list) {
      const key = `list:${section.list}`;
      return {
        key,
        id: section.id,
        heading: section.heading,
        short: section.short ?? null,
        groupBy: null,
        icon: section.icon ?? null,
        layout: 'list',
        collapsed: section.collapsed ?? false,
        page: null,
        items: [],
        entries: !only || only.has(key) ? lists.get(section.list) ?? [] : [],
        dropped: 0,
      };
    }

    let picked = items.filter(
      (i) =>
        // `includeAll` presets take everything that matches a section; the
        // curated ones take only what opted in via `cvs`.
        (spec.includeAll || (i.cvs ?? []).includes(members)) &&
        matches(i, section.match) &&
        (!only || only.has(i.id)),
    );

    // Everything this section could ever hold, so a heading can say whether it
    // is showing all of it.
    const whole = items.filter((i) => matches(i, section.match)).length;

    if (section.sort === 'tier') picked = picked.sort(byTier);

    // `items` is already newest-first, so a limit keeps the most recent —
    // or, sorted by tier, the most prominent.
    if (section.limit) picked = picked.slice(0, section.limit);
    const dropped = whole - picked.length;

    return {
      id: section.id,
      // "Select Publications" when asked for and it is a selection, otherwise
      // "Publications" — decided from what actually resolved, not typed per
      // preset, so a heading cannot go on claiming to be a selection after the
      // CV grows to include everything.
      heading:
        prefix[section.id] === 'select' && picked.length < whole && !section.heading.startsWith('Select')
          ? `Select ${section.heading}`
          : section.heading,
      short: section.short ?? null,
      groupBy: section.groupBy ?? null,
      // `institution`: roles at one organization print under it, once. The
      // builder may turn it off per section.
      cluster: section.cluster ?? null,
      // Software is a grid of names rather than a dated list; the layout is a
      // property of the section, so it is stated once in presets.json and both
      // renderers read it from there.
      layout: section.layout ?? 'timeline',
      // Columns of a grid layout; a preset may ask for more than the usual 3.
      columns: section.columns ?? 3,
      // Heading mark, drawn by the PDF only.
      icon: section.icon ?? null,
      // A section may keep its elaboration where the preset drops it. A talk
      // without its subject is a list of cities.
      detail: section.detail ?? spec.detail,
      // Whether entries print their place. An institution already says where it
      // is; a talk's city is news.
      // The builder's say, by section id, before the preset's.
      location: location[section.id] ?? section.location ?? spec.location ?? true,
      // Sections the page opens closed. The PDF ignores this — paper has no
      // disclosure widget, and the CV is meant to be read whole there.
      collapsed: section.collapsed ?? false,
      // The site page that holds this section in full, linked from its heading.
      page: section.page ?? null,
      items: picked,
      dropped, // surfaced rather than silently truncated
      tally: section.tally ? tally(picked) : null,
    };
  });

  return {
    name,
    members,
    label: spec.label,
    detail: spec.detail,
    // Page shape for the PDF: absent, the template's own; "letter" is US Letter
    // with inch margins, nothing under 12pt, and every page numbered.
    format: spec.format ?? null,
    // What the PDF's card shows, part by part.
    card: { ...Object.fromEntries(CARD_PARTS.map((k) => [k, spec.card?.[k] ?? true])),
            order: spec.card?.order ?? cardOrder(spec.format === 'letter') },
    // The CV that takes every item is also the one that says every line, so it
    // is what `detailsComplete` keys off. Read from the spec rather than by
    // comparing the name to "complete", so a renderer never hard-codes which
    // preset is the unabridged one.
    includeAll: Boolean(spec.includeAll),
    // Where a part sits by default, keyed `<id>.<part>` as the builder's `place`.
    place: spec.place ?? {},
    // Print an entry's recipient on its title line. An item's own flag also does.
    recipientInline: Boolean(spec.recipientInline),
    // Gaps the preset sets, keyed as the builder's `spacing`.
    spacing: spec.spacing ?? {},
    // `order` is the builder's: section ids, first to last. Sections it does not
    // name keep their place after those it does (the sort is stable).
    sections: sections
      .filter((s) => s.items.length > 0 || s.entries?.length > 0)
      .sort((a, b) => rank(order, a.id) - rank(order, b.id)),
  };
}

/**
 * The ids a preset actually renders — resolved, so per-section `limit`s apply.
 * Filtering on `cvs` alone would let the builder pre-check 23 items for a preset
 * whose PDF contains 19, and "start from Two-page, compile" would not reproduce
 * the two-page CV.
 */
export function memberIds(name) {
  return resolve(name).sections.flatMap((s) => (s.key ? [s.key] : s.items.map((i) => i.id)));
}
