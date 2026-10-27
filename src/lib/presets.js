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

/** The h-indices a tally can print, by name: ADS's, computed here from every
 *  publication's citation count as the last ADS refresh left it; and Google
 *  Scholar's two, over all years or since a recent one, read off the profile
 *  by hand into config/person.json. Each says where it is from. */
const H_INDEX = {
  ads: () => {
    const cites = items.filter((i) => i.type === 'publication').map((p) => p.citations ?? 0).sort((a, b) => b - a);
    return { value: cites.filter((c, i) => c >= i + 1).length, source: 'ADS' };
  },
  scholar: () => {
    const gs = person.metrics?.googleScholar;
    return gs?.hIndex == null ? null : { value: gs.hIndex, source: 'Google Scholar' };
  },
  'scholar-since': () => {
    const gs = person.metrics?.googleScholar;
    return gs?.hIndexSince == null ? null : { value: gs.hIndexSince, source: `Google Scholar, since ${gs.since}` };
  },
};
export const H_INDEX_SOURCES = Object.keys(H_INDEX);
/** One source's h-index as `tally` says it, or null; for the builder's preview. */
export const hIndexOf = (source) => H_INDEX[source]?.() ?? null;

/** How long Scholar's hand-read numbers stand before the builder says they may
 *  be out of date: about six months. */
export const SCHOLAR_STALE_DAYS = 183;

/**
 * A publication list's headline numbers, for a section with a `tally`: how
 * many papers, how many still submitted, how many I wrote first, and how many
 * a student I supervised led — counted from the records, so they cannot fall
 * behind the list beneath them. With `{ hIndex }` naming a source, the
 * h-index too, said with its source, since the sources disagree. A paper in
 * preparation is not one yet, so it is never counted. `form: "short"` passes
 * through, for the template to leave the student-led number to the key.
 */
export function tally(all, { hIndex, form } = {}) {
  const pubs = all.filter((p) => p.status !== 'in-prep');
  const lead = (p) => p.authors?.[0] ?? {};
  return {
    total: pubs.length,
    submitted: pubs.filter((p) => p.status === 'submitted').length,
    first: pubs.filter((p) => lead(p).me).length,
    student: pubs.filter((p) => lead(p).mentee).length,
    h: H_INDEX[hIndex]?.() ?? null,
    ...(form === 'short' && { form }),
  };
}

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

/**
 * A section group is a heading over several sections — Professional Activities over the
 * conferences, peer review and service — defined once in `$groups`. Presets never list one:
 * the builder switches a group on (`groups`), and its members then print together under it.
 */
const GROUPS = Object.fromEntries(Object.entries(presets.$groups ?? {}).filter(([k]) => !k.startsWith('$')));
const groupOf = new Map();
for (const [gid, g] of Object.entries(GROUPS)) {
  if (presets.$sections[gid]) throw new Error(`CV group "${gid}" takes the id of a section. Rename one in config/presets.json.`);
  for (const sid of g.sections) {
    if (!presets.$sections[sid]) throw new Error(`CV group "${gid}" names an unknown section "${sid}".`);
    if (groupOf.has(sid)) throw new Error(`CV section "${sid}" is in two groups, "${groupOf.get(sid)}" and "${gid}".`);
    groupOf.set(sid, gid);
  }
}
export const GROUP_IDS = Object.keys(GROUPS);
/** The groups as the builder needs them: heading and members, by id. */
export const SECTION_GROUPS = GROUPS;

/**
 * Gathers each switched-on group's members, in the group's order, at the place of the first
 * of them, and marks them with the group. Sections of other groups stay where they are.
 */
function grouped(sections, groups) {
  const on = new Set(groups.filter((g) => GROUPS[g]));
  const out = [];
  for (const s of sections) {
    const gid = groupOf.get(s.id);
    if (!on.has(gid)) { out.push(s); continue; }
    if (out.some((x) => x.group?.id === gid)) continue;
    const g = GROUPS[gid];
    const group = { id: gid, heading: g.heading, short: g.short ?? null, icon: g.icon ?? null };
    for (const sid of g.sections) {
      const m = sections.find((x) => x.id === sid);
      if (m) out.push({ ...m, group });
    }
  }
  return out;
}

export function preset(name) {
  const spec = presets[name];
  if (!spec) throw new Error(`Unknown CV preset "${name}". Known: ${presetNames.join(', ')}`);
  return { ...spec, groups: spec.groups ?? [], sections: spec.sections.map(section) };
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

export function resolve(name, only, { prefix = {}, order = [], location = {}, tally: tallied = {}, groups } = {}) {
  const spec = preset(name);
  // The builder's choice of groups, else the preset's own.
  groups ??= spec.groups ?? [];

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
        (spec.includeAll || (i.cvs ?? []).includes(name)) &&
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
      // `true` for the counts, or `{ hIndex }` to add one, and `of: "record"` to
      // count every publication rather than the list's; the builder's say, by
      // section id, before the preset's.
      tally: (() => {
        const t = tallied[section.id] ?? section.tally;
        if (!t) return null;
        return tally(t.of === 'record' ? items.filter((i) => i.type === 'publication') : picked, t === true ? {} : t);
      })(),
    };
  });

  return {
    name,
    label: spec.label,
    detail: spec.detail,
    // What the PDF's card shows, part by part. Its links' order only where the
    // preset sets one: otherwise the template's, which follows the page.
    card: { ...Object.fromEntries(CARD_PARTS.map((k) => [k, spec.card?.[k] ?? true])),
            ...(spec.card?.order ? { order: spec.card.order } : {}) },
    // The CV that takes every item is also the one that says every line, so it
    // is what `detailsComplete` keys off. Read from the spec rather than by
    // comparing the name to "complete", so a renderer never hard-codes which
    // preset is the unabridged one.
    includeAll: Boolean(spec.includeAll),
    // Where a part sits by default, keyed `<id>.<part>` as the builder's `place`.
    place: spec.place ?? {},
    // Print an entry's recipient on its title line. An item's own flag also does.
    recipientInline: Boolean(spec.recipientInline),
    // Entries whose institution (`funder`) this preset leaves out, by id.
    funderOff: spec.funderOff ?? [],
    // Gaps the preset sets, keyed as the builder's `spacing`.
    spacing: spec.spacing ?? {},
    // `order` is the builder's: section and group ids, first to last. Sections it does not
    // name keep their place after those it does (the sort is stable). A group moves as one —
    // at the earliest of its own id and its members' — and its members move only among
    // themselves.
    sections: (() => {
      const kept = grouped(sections, groups).filter((s) => s.items.length > 0 || s.entries?.length > 0);
      // A group of one is just that section: an umbrella over a single sub-heading says nothing.
      const size = (gid) => kept.filter((x) => x.group?.id === gid).length;
      const shown = kept.map((s) => (s.group && size(s.group.id) < 2 ? { ...s, group: undefined } : s));
      const top = (s) => (s.group
        ? Math.min(rank(order, s.group.id), ...shown.filter((x) => x.group?.id === s.group.id).map((x) => rank(order, x.id)))
        : rank(order, s.id));
      return shown.sort((a, b) => top(a) - top(b) || (a.group && a.group.id === b.group?.id ? rank(order, a.id) - rank(order, b.id) : 0));
    })(),
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
