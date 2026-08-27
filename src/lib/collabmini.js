// The collaborator map's render model, shrunk to the CV's right margin.
//
// Same people, same projection, same paper links as collabmap.js — imported,
// not reimplemented, so the two maps cannot disagree about where anyone worked.
// What differs is everything the size decides: at 176px a rosette is a darker
// pixel and a paper title is unreadable, so a person is a handful of places and
// a list of paper ids, and the prose stays on /research/.
//
// Resolved here rather than in the component for the reason collabmap.js is:
// the page then renders plain numbers, and the arithmetic is testable without
// a DOM.

import { collaboratorMap, lastFirst } from './collabmap.js';

export { map } from './collabmap.js';

/** One dot per place per person, one trail per person who moved, and the paper
 *  ids each person shares with me — the three things the gutter map draws. */
export function miniMap() {
  const people = collaboratorMap();

  // Within a person, four posts at one institution are one dot. Across people
  // the dots stack, which is why they are drawn opaque: two collaborators at
  // the same institution should read as one place, not as a darker one.
  const entries = people.map((person, c) => {
    const at = new Map();
    for (const pin of person.pins) {
      const key = `${pin.x.toFixed(1)},${pin.y.toFixed(1)}`;
      at.set(key, {
        x: pin.x.toFixed(1),
        y: pin.y.toFixed(1),
        // Shared if anything was written during any post there.
        shared: (at.get(key)?.shared ?? false) || pin.papers.length > 0,
      });
    }
    // Every paper with this person, wherever they were standing.
    // `unplacedPapers` are still collaborations — their ORCID just does not say
    // where they were.
    const papers = [...new Set([
      ...person.pins.flatMap((p) => p.papers.map((q) => q.id)),
      ...person.unplacedPapers.map((q) => q.id),
    ])];
    return { c, name: lastFirst(person.name), places: [...at.values()], papers };
  });

  // Surname first, so the picker reads like an index rather than a list of
  // first names — the same order the CV's own references are scanned in. `c`
  // stays the collaboratorMap index it started as: it is what the dots and the
  // trails are keyed by, so re-ordering the picker must not renumber them.
  entries.sort((a, b) => a.name.localeCompare(b.name));

  return {
    entries,
    // Shared places last, so they are drawn over the plain ones rather than under.
    dots: entries
      .flatMap((e) => e.places.map((pl) => ({ ...pl, c: e.c })))
      .sort((a, b) => Number(a.shared) - Number(b.shared)),
    // One person's places joined in the order they held them — the same
    // trajectory the full map draws. `places` is already newest-first, because
    // the dedup keeps the order the pins came in and collaboratorMap sorts them
    // that way.
    trails: entries
      .filter((e) => e.places.length > 1)
      .map((e) => ({ c: e.c, points: e.places.map((pl) => `${pl.x},${pl.y}`).join(' ') })),
    label: `${people.length} collaborators`,
  };
}
