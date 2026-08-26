import { describe, it, expect } from 'vitest';
import { collaboratorMap, lastFirst, project, toXY, map, MAX_PIN_DRIFT, KM_PER_UNIT, MAX_DRIFT_MILES }
  from '../src/lib/collabmap.js';

const people = collaboratorMap();
const pins = people.flatMap((p) => p.pins);

describe('the Equal Earth projection', () => {
  // The reason for choosing it: every cell of the graticule covers the same
  // projected area as every other of the same true area. If this drifts, the
  // map is quietly lying about how big places are.
  const cell = (lon, lat, d = 2) => {
    const c = [[lon, lat], [lon + d, lat], [lon + d, lat + d], [lon, lat + d]].map(([a, b]) => project(a, b));
    let s = 0;
    for (let i = 0; i < 4; i += 1) {
      const [x1, y1] = c[i];
      const [x2, y2] = c[(i + 1) % 4];
      s += x1 * y2 - x2 * y1;
    }
    return Math.abs(s) / 2;
  };
  const sphere = (lat, d = 2) => {
    const r = Math.PI / 180;
    return d * r * (Math.sin((lat + d) * r) - Math.sin(lat * r));
  };

  it('is equal-area from the equator to the far north', () => {
    const ratios = [[0, 0], [60, 0], [0, 30], [100, 45], [-120, 60], [30, -45], [170, 75]]
      .map(([lo, la]) => cell(lo, la) / sphere(la));
    for (const r of ratios) expect(r).toBeCloseTo(1, 3);
  });

  it('puts the origin in the middle and the poles on the edges', () => {
    const [cx, cy] = toXY(0, 0);
    expect(cx).toBeCloseTo(map.width / 2, 1);
    expect(Math.abs(cy - map.height / 2)).toBeLessThan(0.5);
    expect(toXY(0, 90)[1]).toBeCloseTo(0, 1);
    expect(Math.abs(toXY(0, -90)[1] - map.height)).toBeLessThan(1);
  });

  it('agrees with the published formula, not just with itself', () => {
    // Equal-area alone only proves it is *an* equal-area projection. These are
    // the forward equations as Šavrič, Patterson & Jenny published them,
    // written out with explicit powers so a folded exponent in the
    // implementation cannot hide in both places at once.
    const [A1, A2, A3, A4] = [1.340264, -0.081106, 0.000893, 0.003796];
    const literal = (lonDeg, latDeg) => {
      const lam = (lonDeg * Math.PI) / 180;
      const th = Math.asin((Math.sqrt(3) / 2) * Math.sin((latDeg * Math.PI) / 180));
      return [
        (2 * Math.sqrt(3) * lam * Math.cos(th))
          / (3 * (9 * A4 * th ** 8 + 7 * A3 * th ** 6 + 3 * A2 * th ** 2 + A1)),
        A4 * th ** 9 + A3 * th ** 7 + A2 * th ** 3 + A1 * th,
      ];
    };
    for (let lat = -90; lat <= 90; lat += 15) {
      for (let lon = -180; lon <= 180; lon += 30) {
        const [ax, ay] = literal(lon, lat);
        const [bx, by] = project(lon, lat);
        expect(bx).toBeCloseTo(ax, 12);
        expect(by).toBeCloseTo(ay, 12);
      }
    }
  });

  it('has Equal Earth’s published proportions', () => {
    // "The projected equator is about 2.05 times the length of the projected
    // central meridian" — wider than Robinson's 1.97, which is the nearest
    // thing it could be mistaken for.
    const halfWidth = project(180, 0)[0];
    const halfHeight = project(0, 90)[1];
    expect(halfWidth / halfHeight).toBeCloseTo(2.0546, 3);
    expect(map.width / map.height).toBeCloseTo(2.05, 1);
  });

  it('puts the corners where the paper says', () => {
    // Reference values at unit radius, so a change of constants shows up here.
    expect(project(180, 0)[0]).toBeCloseTo(2.706630, 6);
    expect(project(0, 90)[1]).toBeCloseTo(1.317363, 6);
    expect(project(90, 45)[0]).toBeCloseTo(1.159854, 6);
    expect(project(90, 45)[1]).toBeCloseTo(0.860231, 6);
  });
});

describe('the world outline', () => {
  it('carries land and lakes, and the lakes are the cheaper half by far', () => {
    expect(map.land.length).toBeGreaterThan(1000);
    expect(map.lakes.length).toBeGreaterThan(100);
    // The whole point of including them: twenty-four lakes cost a fraction of
    // the coastline. If that ever inverts, something has gone wrong upstream.
    expect(map.lakes.length).toBeLessThan(map.land.length / 4);
  });

  it('keeps the whole thing small enough to inline', () => {
    // It is committed into the page, so its size is the page's size.
    expect((map.land.length + map.lakes.length) / 1024).toBeLessThan(40);
  });

  it('draws every path inside the viewBox', () => {
    for (const d of [map.land, map.lakes]) {
      for (const [, x, y] of d.matchAll(/([\d.]+) ([\d.]+)/g)) {
        expect(Number(x)).toBeLessThanOrEqual(map.width + 1);
        expect(Number(y)).toBeLessThanOrEqual(map.height + 1);
      }
    }
  });
});

describe('the collaborator map', () => {
  it('places every pin inside the map', () => {
    const out = pins.filter((p) => p.x < 0 || p.x > map.width || p.y < 0 || p.y > map.height);
    expect(out).toEqual([]);
  });

  it('never draws a pin far from where the place actually is', () => {
    // The property that matters, and the one an earlier version broke: it
    // relaxed pins apart until nothing overlapped, which moved them a median
    // of ten units and a maximum of twenty-five — nine degrees of longitude.
    // Columbia University came out in Ohio. Overlap is honest; misplacement
    // is not.
    for (const pin of pins) {
      const [tx, ty] = toXY(pin.lon, pin.lat);
      const miles = (Math.hypot(pin.x - tx, pin.y - ty) * KM_PER_UNIT) / 1.609;
      // Stated in miles, because that is the promise: city level.
      expect(miles).toBeLessThanOrEqual(MAX_DRIFT_MILES + 0.01);
    }
  });

  it('still separates pins that share a coordinate exactly', () => {
    // Otherwise one pin hides the four other people who worked there.
    const stacked = new Map();
    for (const pin of pins) {
      const key = `${pin.lat},${pin.lon}`;
      stacked.set(key, (stacked.get(key) ?? 0) + 1);
    }
    const shared = [...stacked.entries()].filter(([, n]) => n > 1);
    expect(shared.length).toBeGreaterThan(0);        // the case exists
    for (const [key] of shared) {
      const here = pins.filter((p) => `${p.lat},${p.lon}` === key);
      const seen = new Set(here.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`));
      expect(seen.size).toBe(here.length);
    }
  });

  it('gives every collaborator a different hue', () => {
    const hues = people.map((p) => p.hue);
    expect(new Set(hues).size).toBe(hues.length);
  });

  it('only includes people who can actually be placed', () => {
    for (const p of people) {
      expect(p.pins.length).toBeGreaterThan(0);
      for (const pin of p.pins) {
        expect(pin.start).toBeTruthy();
        expect(Number.isFinite(pin.lat)).toBe(true);
        expect(Number.isFinite(pin.lon)).toBe(true);
      }
    }
  });

  it('orders each trajectory newest first', () => {
    for (const p of people) {
      const starts = p.pins.map((pin) => pin.start);
      expect([...starts].sort().reverse()).toEqual(starts);
    }
  });

  it('attaches a paper only to a post that was current when it appeared', () => {
    for (const pin of pins) {
      for (const paper of pin.papers) {
        expect(paper.date >= pin.start).toBe(true);
        if (pin.end) expect(paper.date <= pin.end).toBe(true);
      }
    }
  });

  it('finds somewhere for most of the papers, and says so for the rest', () => {
    // Not every co-authored paper lands inside a dated post — that is a fact
    // about other people's ORCID records, and the page reports it rather than
    // dropping it.
    const placed = pins.reduce((n, p) => n + p.papers.length, 0);
    const unplaced = people.reduce((n, p) => n + p.unplacedPapers.length, 0);
    expect(placed).toBeGreaterThan(0);
    expect(placed + unplaced).toBeGreaterThan(placed);
  });
});

describe('surname-first names', () => {
  it('moves the given names behind the surname, particles included', () => {
    expect(lastFirst('Adrian M. Price-Whelan')).toBe('Price-Whelan, Adrian M.');
    expect(lastFirst('Marten H. van Kerkwijk')).toBe('van Kerkwijk, Marten H.');
    expect(lastFirst('C. E. Brasseur')).toBe('Brasseur, C. E.');
    // A mononym has nothing to move.
    expect(lastFirst('Cher')).toBe('Cher');
  });
});
