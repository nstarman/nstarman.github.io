import { describe, it, expect } from 'vitest';
import { conferenceMap, radius, ONLINE, map } from '../src/lib/confmap.js';
import { toXY, KM_PER_UNIT, MAX_DRIFT_MILES } from '../src/lib/worldmap.js';
import { byType } from '../src/lib/data.js';

const cmap = conferenceMap();

describe('the conference map', () => {
  it('accounts for every presentation exactly once', () => {
    // The property that matters most: a map that silently drops a talk is
    // worse than one that says it cannot place it.
    const all = byType('presentation');
    expect(cmap.total).toBe(all.length);

    const ids = [
      ...cmap.pins.flatMap((p) => p.talks.map((t) => t.id)),
      ...cmap.online.map((t) => t.id),
      ...cmap.unsettled.map((t) => t.id),
      ...cmap.unplaced.map((t) => t.id),
    ];
    expect(ids.length).toBe(all.length);
    expect(new Set(ids).size).toBe(all.length);
  });

  it('places every pin inside the map', () => {
    const out = cmap.pins.filter((p) => p.x < 0 || p.x > map.width || p.y < 0 || p.y > map.height);
    expect(out).toEqual([]);
  });

  it('never draws a pin far from where the place actually is', () => {
    for (const pin of cmap.pins) {
      const [tx, ty] = toXY(pin.lon, pin.lat);
      const miles = (Math.hypot(pin.x - tx, pin.y - ty) * KM_PER_UNIT) / 1.609;
      expect(miles).toBeLessThanOrEqual(MAX_DRIFT_MILES + 0.01);
    }
  });

  it('never puts an online talk on the map', () => {
    // "Online" is not a place, and the whole point of #22's note about it is
    // that it must not become a pin somewhere on Earth.
    expect(cmap.online.length).toBeGreaterThan(0);
    for (const pin of cmap.pins) expect(pin.place).not.toBe(ONLINE);
  });

  it('refuses a location a geocoder would misread, rather than guessing', () => {
    // `TO, CA` is Toronto, Ontario; a geocoder reads CA as California. Issue #22
    // calls this the one that silently produces a plausible-looking wrong map.
    // Until the string is settled the talk is listed, not pinned.
    for (const t of cmap.unsettled) expect(t.location).toBeTruthy();
    for (const pin of cmap.pins) {
      expect(pin.place).toMatch(/^[^,]+, (?:[A-Z]{2}, (?:USA|Canada)|[^,]+)$/);
    }
  });

  it('sizes a pin by area, so counts read honestly', () => {
    // Doubling the radius would quadruple the ink for twice the talks.
    expect(radius(4) / radius(1)).toBeCloseTo(2, 6);
    expect(radius(9) / radius(1)).toBeCloseTo(3, 6);
    for (const pin of cmap.pins) expect(pin.r).toBe(radius(pin.talks.length));
  });

  it('gives every place a different hue', () => {
    const hues = cmap.pins.map((p) => p.hue);
    expect(new Set(hues).size).toBe(hues.length);
  });

  it('lists a place’s talks newest first, and the places alphabetically', () => {
    const names = cmap.pins.map((p) => p.place);
    expect([...names].sort((a, b) => a.localeCompare(b))).toEqual(names);
    for (const pin of cmap.pins) {
      const dates = pin.talks.map((t) => t.date);
      expect([...dates].sort().reverse()).toEqual(dates);
    }
  });

  it('separates places that land on the same coordinate', () => {
    const seen = new Set(cmap.pins.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`));
    expect(seen.size).toBe(cmap.pins.length);
  });

  it('carries what each talk needs to render itself', () => {
    for (const pin of cmap.pins) {
      for (const t of pin.talks) {
        expect(t.title).toBeTruthy();
        expect(t.when).toMatch(/\d{4}/);
        expect(t.kindLabel).toBeTruthy();
      }
    }
  });
});
