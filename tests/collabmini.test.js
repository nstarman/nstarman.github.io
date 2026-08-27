// The gutter map is a lossy view of the collaborator map, and every loss is a
// deliberate one: places collapse, trails need two of them, and papers written
// where ORCID names no post are still papers. These are the assertions that
// say so.

import { describe, it, expect } from 'vitest';
import { collaboratorMap, lastFirst } from '../src/lib/collabmap.js';
import { miniMap } from '../src/lib/collabmini.js';

const people = collaboratorMap();
const { entries, dots, trails } = miniMap();
// Every entry keeps the index of the person it came from; the picker's order
// is not that index, which is the point of the test below.
const who = (e) => people[e.c];

describe('the CV gutter map', () => {
  it('keeps one entry per collaborator', () => {
    expect(entries.length).toBe(people.length);
    expect(new Set(entries.map((e) => e.c)).size).toBe(people.length);
  });

  it('lists them surname-first, in that order', () => {
    expect(entries.map((e) => e.name))
      .toEqual([...people.map((p) => lastFirst(p.name))].sort((a, b) => a.localeCompare(b)));
  });

  it('does not renumber anyone when it sorts them', () => {
    // `c` keys the dots and the trails, so a sort that renumbered would move
    // every pin on the map to the wrong person without looking wrong.
    for (const e of entries) expect(e.name).toBe(lastFirst(who(e).name));
    // And the sort really does reorder, or this proves nothing.
    expect(entries.map((e) => e.c)).not.toEqual(people.map((_, i) => i));
  });

  it('collapses a person\'s repeat posts at one place into one dot', () => {
    // Four posts at one institution are one dot: at this size a rosette is
    // just a darker pixel.
    for (const e of entries) {
      expect(e.places.length).toBeLessThanOrEqual(who(e).pins.length);
      const keys = e.places.map((pl) => `${pl.x},${pl.y}`);
      expect(new Set(keys).size).toBe(keys.length);
    }
    // And it must actually be collapsing something, or the test proves nothing.
    expect(entries.some((e) => e.places.length < who(e).pins.length)).toBe(true);
  });

  it('counts a place as shared if anything was written during any post there', () => {
    for (const e of entries) {
      for (const place of e.places) {
        const here = who(e).pins.filter((pin) => pin.x.toFixed(1) === place.x
          && pin.y.toFixed(1) === place.y);
        expect(place.shared).toBe(here.some((pin) => pin.papers.length > 0));
      }
    }
    expect(dots.some((d) => d.shared)).toBe(true);
  });

  it('draws the shared dots last, so they sit over the plain ones', () => {
    const first = dots.findIndex((d) => d.shared);
    expect(dots.slice(first).every((d) => d.shared)).toBe(true);
  });

  it('draws a trail only for someone who moved', () => {
    expect(trails.map((t) => t.c))
      .toEqual(entries.filter((e) => e.places.length > 1).map((e) => e.c));
    for (const t of trails) expect(t.points.split(' ').length).toBeGreaterThan(1);
  });

  it('marks every shared paper, including the ones ORCID cannot place', () => {
    for (const e of entries) {
      const placed = who(e).pins.flatMap((pin) => pin.papers.map((q) => q.id));
      const unplaced = who(e).unplacedPapers.map((q) => q.id);
      expect(new Set(e.papers)).toEqual(new Set([...placed, ...unplaced]));
      // The ids go into one space-separated attribute, so an id with a space
      // in it would silently mark two rows and miss the one it meant.
      for (const id of e.papers) expect(id).not.toMatch(/\s/);
    }
    // Unplaced papers exist in the data, so this is not vacuous.
    expect(people.some((p) => p.unplacedPapers.length > 0)).toBe(true);
  });
});
