// The conference map's render model, shrunk to the CV's right margin.
//
// Same places, same projection, same spreading as confmap.js — imported, not
// reimplemented, so the two maps cannot disagree about where a talk was. What
// differs is the scope: the gutter map sits beside a list of talks, so it pins
// only the talks that list holds. A pin the reader cannot find in the column
// next to it is a question with no answer on the page.
//
// Resolved here rather than in the component for the reason confmap.js is:
// the page then renders plain numbers, and the arithmetic is testable without
// a DOM.

import { conferenceMap, radius } from './confmap.js';

export { map } from './confmap.js';

/** At 176px a 3-unit pin is half a pixel. Scaled up uniformly, so a pin's area
 *  is still its count — the one thing the full map's legend promises. */
const MINI = 3;

/**
 * @param {Iterable<string>} ids the talks this CV renders.
 * @returns the places among them, the dots to draw, and the talks the map
 *   cannot show because they are not placed yet, counted rather than dropped.
 */
export function confMini(ids) {
  const shown = new Set(ids);

  // Filtered after conferenceMap() has spread its pins, so a place sits where
  // the full map puts it whichever of its neighbours this CV happens to list.
  const entries = conferenceMap().pins
    .map((pin) => ({ ...pin, talks: pin.talks.filter((t) => shown.has(t.id)) }))
    .filter((pin) => pin.talks.length > 0)
    .map((pin, c) => ({
      c,
      place: pin.place,
      x: pin.x.toFixed(1),
      y: pin.y.toFixed(1),
      r: (MINI * radius(pin.talks.length)).toFixed(1),
      talks: pin.talks.map((t) => t.id),
    }));

  const placed = entries.reduce((n, e) => n + e.talks.length, 0);

  return {
    // Alphabetical already, as conferenceMap() sorts its pins.
    entries,
    // Biggest first, so a place with one talk is never hidden under a place
    // with eight — the same painting order the full map uses.
    dots: [...entries].sort((a, b) => b.r - a.r),
    placed,
    offMap: shown.size - placed,
  };
}
