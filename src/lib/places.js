// Where a named place is on Earth.
//
// `config/places.json` holds each coordinate once. A name that is the same
// campus as another — "University of Chicago" and "The University of Chicago",
// SAO and the CfA — is written `{ "sameAs": "<other name>" }` instead of
// repeating coordinates, so the two can never drift apart.

import data from '/config/places.json';

/** `{ lat, lon }` for a place name, or undefined when it is not placed. */
export function locate(name) {
  const p = data.places[name];
  return p?.sameAs ? data.places[p.sameAs] : p;
}
