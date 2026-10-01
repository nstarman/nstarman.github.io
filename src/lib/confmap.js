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

/** A talk with no venue. */
export const ONLINE = 'Online';

/** Where the online talks are pinned: Antarctica, on the prime meridian — the
 *  bottom of the map, dead centre. A place no talk could have been, so the pin
 *  reads as "nowhere in particular" rather than inventing a city; rounding to
 *  wherever I was sitting would be the invented fact (#22).
 *
 *  -70 rather than the pole because the pole is the map's bottom edge, and
 *  Equal Earth squashes latitude there: -85 is still under two units above
 *  it. -70 is 20.6 units up, which clears the largest Online pin either map
 *  draws — the CV gutter map's, when it holds every online talk. */
export const ONLINE_AT = { lat: -70, lon: 0 };

/** Where a location string is on Earth, or nothing if it is not settled. */
const coords = (loc) => (loc === ONLINE ? ONLINE_AT : places.places[loc]);

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
 * `pins` are the ones with a settled, resolvable location, plus one for the
 * talks given online, at ONLINE_AT. `unsettled` still carry a location string
 * the geocoder refuses — `TO, CA` reads as California, so it is left off
 * rather than guessed at. `unplaced` have no location recorded yet at all.
 *
 * Every talk lands in exactly one of the three, and the page says so: a map
 * that quietly drops seventeen talks is worse than one that admits to them.
 */
export function conferenceMap() {
  const unsettled = [];
  const unplaced = [];
  const here = new Map();

  for (const item of byType('presentation')) {
    const talk = talkOf(item);
    const loc = item.location;
    if (!loc) { unplaced.push(talk); continue; }
    if (!coords(loc)) { unsettled.push({ ...talk, location: loc }); continue; }
    if (!here.has(loc)) here.set(loc, []);
    here.get(loc).push(talk);
  }

  const pins = [...here.entries()]
    // Alphabetical, because the picker under the map is a list of names and a
    // reader looking for Toronto should find it where T belongs.
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([place, talks], i) => {
      const { lat, lon } = coords(place);
      const [x, y] = toXY(lon, lat);
      talks.sort(newestFirst);
      return { place, lat, lon, x, y, talks, r: radius(talks.length), hue: hueFor(i) };
    });

  spread(pins);
  unsettled.sort(newestFirst);
  unplaced.sort(newestFirst);

  return {
    pins,
    unsettled,
    unplaced,
    talks: pins.reduce((n, p) => n + p.talks.length, 0),
    total: unsettled.length + unplaced.length
      + pins.reduce((n, p) => n + p.talks.length, 0),
  };
}
