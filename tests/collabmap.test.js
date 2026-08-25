import { describe, it, expect } from 'vitest';
import { collaboratorMap, project, toXY, map } from '../src/lib/collabmap.js';

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

  it('keeps Equal Earth’s proportions', () => {
    expect(map.width / map.height).toBeCloseTo(2.05, 1);
  });
});

describe('the collaborator map', () => {
  it('places every pin inside the map', () => {
    const out = pins.filter((p) => p.x < 0 || p.x > map.width || p.y < 0 || p.y > map.height);
    expect(out).toEqual([]);
  });

  it('leaves no two pins on top of each other', () => {
    // Harvard and MIT are a few units apart and would render as one dot;
    // separating them is the whole reason spread() exists.
    let closest = Infinity;
    for (let i = 0; i < pins.length; i += 1) {
      for (let j = i + 1; j < pins.length; j += 1) {
        closest = Math.min(closest, Math.hypot(pins[i].x - pins[j].x, pins[i].y - pins[j].y));
      }
    }
    expect(closest).toBeGreaterThan(4.5);   // the largest pin radius
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

  it('orders each trajectory in time', () => {
    for (const p of people) {
      const starts = p.pins.map((pin) => pin.start);
      expect([...starts].sort()).toEqual(starts);
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
