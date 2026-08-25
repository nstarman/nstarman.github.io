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
import { items, lists } from './data.js';

const asArray = (v) => (v === undefined ? undefined : Array.isArray(v) ? v : [v]);

/** A section's `match` is a plain AND over fields; array values mean "any of". */
function matches(item, match) {
  return Object.entries(match).every(([field, want]) => asArray(want).includes(item[field]));
}

export const presetNames = Object.keys(presets).filter((k) => !k.startsWith('$'));

export function preset(name) {
  const spec = presets[name];
  if (!spec) throw new Error(`Unknown CV preset "${name}". Known: ${presetNames.join(', ')}`);
  return spec;
}

/**
 * @param {string} name          preset key, e.g. "2page"
 * @param {Set<string>} [only]   optional id allow-list, used by the builder's checkboxes
 */
export function resolve(name, only) {
  const spec = preset(name);

  const sections = spec.sections.map((section) => {
    // A list section has no items to select — it renders its entries verbatim.
    if (section.list) {
      return {
        id: section.id,
        heading: section.heading,
        groupBy: null,
        icon: section.icon ?? null,
        layout: 'list',
        collapsed: section.collapsed ?? false,
        page: null,
        items: [],
        entries: lists.get(section.list) ?? [],
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

    // `items` is already newest-first, so a limit keeps the most recent.
    if (section.limit) picked = picked.slice(0, section.limit);
    const dropped = whole - picked.length;

    return {
      id: section.id,
      // "Select Publications" when it is a selection, "Publications" when it is
      // the lot — decided from what actually resolved, not typed per preset,
      // so a heading cannot go on claiming to be a selection after the CV
      // grows to include everything.
      heading:
        picked.length < whole && !section.heading.startsWith('Select')
          ? `Select ${section.heading}`
          : section.heading,
      groupBy: section.groupBy ?? null,
      // Software is a grid of names rather than a dated list; the layout is a
      // property of the section, so it is stated once in presets.json and both
      // renderers read it from there.
      layout: section.layout ?? 'timeline',
      // Heading mark, drawn by the PDF only.
      icon: section.icon ?? null,
      // A section may keep its elaboration where the preset drops it. A talk
      // without its subject is a list of cities.
      detail: section.detail ?? spec.detail,
      // Sections the page opens closed. The PDF ignores this — paper has no
      // disclosure widget, and the CV is meant to be read whole there.
      collapsed: section.collapsed ?? false,
      // The site page that holds this section in full, linked from its heading.
      page: section.page ?? null,
      items: picked,
      dropped, // surfaced rather than silently truncated
    };
  });

  return {
    name,
    label: spec.label,
    detail: spec.detail,
    sections: sections.filter((s) => s.items.length > 0 || s.entries?.length > 0),
  };
}

/**
 * The ids a preset actually renders — resolved, so per-section `limit`s apply.
 * Filtering on `cvs` alone would let the builder pre-check 23 items for a preset
 * whose PDF contains 19, and "start from Two-page, compile" would not reproduce
 * the two-page CV.
 */
export function memberIds(name) {
  return resolve(name).sections.flatMap((s) => s.items.map((i) => i.id));
}

/**
 * For every preset, the section ids it actually renders — a section that
 * resolves to nothing is not offered, so the toggle never points at an empty
 * page position.
 */
export function sectionIndex() {
  return new Map(presetNames.map((n) => [n, new Set(resolve(n).sections.map((s) => s.id))]));
}
