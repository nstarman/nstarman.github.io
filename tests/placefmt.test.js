// A place as the CV prints it: the region dropped, the country abbreviated, or both.

import { describe, expect, it } from 'vitest';
import { formatPlace } from '../src/lib/placefmt.js';
import { byType } from '../src/lib/data.js';
import countries from '../config/countries.json';

describe('formatPlace', () => {
  it('is the place as written by default', () => {
    expect(formatPlace('Toronto, ON, Canada')).toBe('Toronto, ON, Canada');
    expect(formatPlace('Toronto, ON, Canada', { region: true, country: 'full' })).toBe('Toronto, ON, Canada');
  });

  it('leaves out the province or state', () => {
    expect(formatPlace('Toronto, ON, Canada', { region: false })).toBe('Toronto, Canada');
    expect(formatPlace('Cleveland, OH, USA', { region: false })).toBe('Cleveland, USA');
  });

  it('abbreviates the country', () => {
    expect(formatPlace('Toronto, ON, Canada', { country: 'code' })).toBe('Toronto, ON, CA');
    expect(formatPlace('Cleveland, OH, USA', { country: 'code' })).toBe('Cleveland, OH, US');
    expect(formatPlace('Durham, UK', { country: 'code' })).toBe('Durham, UK');
  });

  it('combines the two', () => {
    expect(formatPlace('Toronto, ON, Canada', { region: false, country: 'code' })).toBe('Toronto, CA');
    expect(formatPlace('Lausanne, Switzerland', { region: false, country: 'code' })).toBe('Lausanne, CH');
  });

  it('has no region to drop in a two-part place, and no country in a one-word one', () => {
    expect(formatPlace('Lausanne, Switzerland', { region: false })).toBe('Lausanne, Switzerland');
    for (const w of ['Online', 'Remote']) expect(formatPlace(w, { region: false, country: 'code' })).toBe(w);
  });

  it('keeps a country it has no code for, rather than losing it', () => {
    expect(formatPlace('Nowhere, ZZ, Atlantis', { country: 'code' })).toBe('Nowhere, ZZ, Atlantis');
  });
});

describe('the countries in the records', () => {
  const places = [...new Set(['presentation', 'education', 'position', 'outreach', 'service', 'teaching', 'award', 'grant'].flatMap(byType)
    .map((i) => i.location).filter(Boolean))];

  it('each have a code', () => {
    for (const l of places.filter((p) => p.includes(','))) {
      const country = l.split(',').at(-1).trim();
      expect(countries[country], `${l}: no code for ${country}`).toMatch(/^[A-Z]{2}$/);
    }
  });

  it('print as two letters, with no province, when both are chosen', () => {
    for (const l of places.filter((p) => p.includes(','))) {
      expect(formatPlace(l, { region: false, country: 'code' }), l).toMatch(/^[^,]+, [A-Z]{2}$/);
    }
  });
});
