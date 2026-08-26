// The conference map's render model.
//
// A pin is a place I have given a talk, run a workshop, or shown a poster; its
// size is how many times. The list underneath is those talks, newest first.
//
// The unit here is the *place*, not the talk: eight visits to Cleveland are one
// pin and eight lines, because a map answering "where have you spoken" is asking
// about places. That is the one structural difference from the collaborator map,
// where the unit is a person and the pins are their posts.
//
// Geometry is resolved here rather than in the component, so the page renders
// plain numbers and the maths is testable without a DOM.

import places from '/config/places.json';
import { map, toXY, spread, hueFor } from './worldmap.js';
import { byType, dateLabel, links } from './data.js';

export { map };

/** A talk with no venue. Deliberately not a pin: putting "Online" somewhere on
 *  Earth would be inventing a fact, so it gets its own list instead (#22). */
export const ONLINE = 'Online';

/** How the CV's `kind` reads in a sentence about one talk. */
const KIND = {
  invited: 'invited talk',
  contributed: 'contributed',
  poster: 'poster',
  seminar: 'seminar',
  organizer: 'organised',
  attended: 'attended',
};

/** Area, not radius, carries the count — a place with four talks should look
 *  four times as big, and doubling the radius would make it sixteen. */
export const radius = (n) => Number((2.8 * Math.sqrt(n)).toFixed(2));

function talkOf(item) {
  const event = (links(item) ?? []).find((l) => l.rel === 'event');
  return {
    id: item.id,
    date: String(item.date.start),
    when: dateLabel(item, { month: true }),
    title: item.title,
    kind: item.kind,
    kindLabel: KIND[item.kind] ?? item.kind,
    // What the talk was about, where the record says. Never the location — that
    // is the pin's job, and printing it twice is how the old records read.
    details: typeof item.details === 'string' ? item.details : null,
    url: event?.url ?? null,
  };
}

const newestFirst = (a, b) => b.date.localeCompare(a.date);

/**
 * Every presentation, sorted into the four things it can be.
 *
 * `pins` are the ones with a settled, resolvable location. `online` had no
 * venue. `unsettled` still carry a location string the geocoder refuses —
 * `TO, CA` reads as California, so it is left off rather than guessed at.
 * `undated` have no location recorded yet at all.
 *
 * Every talk lands in exactly one of the four, and the page says so: a map that
 * quietly drops seventeen talks is worse than one that admits to them.
 */
export function conferenceMap() {
  const online = [];
  const unsettled = [];
  const unplaced = [];
  const here = new Map();

  for (const item of byType('presentation')) {
    const talk = talkOf(item);
    const loc = item.location;
    if (!loc) { unplaced.push(talk); continue; }
    if (loc === ONLINE) { online.push(talk); continue; }
    const at = places.places[loc];
    if (!at) { unsettled.push({ ...talk, location: loc }); continue; }
    if (!here.has(loc)) here.set(loc, []);
    here.get(loc).push(talk);
  }

  const pins = [...here.entries()]
    // Alphabetical, because the picker under the map is a list of names and a
    // reader looking for Toronto should find it where T belongs.
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([place, talks], i) => {
      const { lat, lon } = places.places[place];
      const [x, y] = toXY(lon, lat);
      talks.sort(newestFirst);
      return { place, lat, lon, x, y, talks, r: radius(talks.length), hue: hueFor(i) };
    });

  spread(pins);
  online.sort(newestFirst);
  unsettled.sort(newestFirst);
  unplaced.sort(newestFirst);

  return {
    pins,
    online,
    unsettled,
    unplaced,
    talks: pins.reduce((n, p) => n + p.talks.length, 0),
    total: online.length + unsettled.length + unplaced.length
      + pins.reduce((n, p) => n + p.talks.length, 0),
  };
}
