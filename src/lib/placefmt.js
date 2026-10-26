// A place as the CV prints it. A record's `location` is written `City, Region, Country` in the US and
// Canada, `City, Country` elsewhere, or one word (`Online`); the builder can drop the region and
// abbreviate the country, together or apart. The title's city, `City`, needs none of this.

import COUNTRIES from '/config/countries.json';

/**
 * @param {string} location
 * @param {{ region?: boolean, country?: 'full' | 'code' }} [form]
 *   `region: false` leaves the region out; `country: 'code'` writes the country as its code.
 *   An unknown country is kept as written, so a missing code never blanks a place.
 */
export function formatPlace(location, { region = true, country = 'full' } = {}) {
  const parts = location.split(',').map((p) => p.trim());
  if (parts.length === 1 || (region && country === 'full')) return location;
  const last = parts.length - 1;
  const named = parts.slice(0, last);
  const kept = region ? named : named.slice(0, 1);
  const end = country === 'code' ? (COUNTRIES[parts[last]] ?? parts[last]) : parts[last];
  return [...kept, end].join(', ');
}
