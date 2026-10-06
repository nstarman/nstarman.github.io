import { describe, expect, it } from 'vitest';
import data from '../config/places.json';
import { locate } from '../src/lib/places.js';

const entries = Object.entries(data.places);

describe('config/places.json', () => {
  it('points every sameAs at a place with coordinates of its own', () => {
    for (const [name, p] of entries.filter(([, e]) => e.sameAs)) {
      const target = data.places[p.sameAs];
      expect(target, `${name} -> ${p.sameAs}`).toBeDefined();
      expect(target.sameAs, `${name} -> ${p.sameAs} is a chain`).toBeUndefined();
      expect(typeof target.lat).toBe('number');
    }
  });

  it('writes each coordinate once: the same campus is a sameAs, not a copy', () => {
    const seen = new Map();
    for (const [name, p] of entries.filter(([, e]) => !e.sameAs)) {
      const key = `${p.lat},${p.lon}`;
      expect(seen.get(key), `${name} repeats the coordinates of ${seen.get(key)}`).toBeUndefined();
      seen.set(key, name);
    }
  });

  it('locate follows a sameAs and is undefined for an unplaced name', () => {
    expect(locate('Smithsonian Astrophysical Observatory'))
      .toBe(data.places['Center for Astrophysics Harvard & Smithsonian']);
    expect(locate('Nowhere in particular')).toBeUndefined();
  });

  it('keeps the Smithsonian Institution in Washington, apart from the observatory', () => {
    expect(locate('Smithsonian Institution').lat).not.toBe(locate('Smithsonian Astrophysical Observatory').lat);
  });
});
