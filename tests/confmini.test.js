// The gutter conference map pins only the talks the CV beside it lists. These
// are the assertions that say so, and that what it leaves off is counted.

import { describe, it, expect } from 'vitest';
import { conferenceMap, radius } from '../src/lib/confmap.js';
import { confMini } from '../src/lib/confmini.js';
import { resolve } from '../src/lib/presets.js';

const full = conferenceMap();
const talksOn = (preset) => resolve(preset).sections
  .flatMap((s) => s.items)
  .filter((item) => item.type === 'presentation')
  .map((item) => item.id);

describe('the CV gutter conference map', () => {
  it('pins every placed talk when given every talk', () => {
    const all = [...full.pins.flatMap((p) => p.talks), ...full.online, ...full.unsettled, ...full.unplaced]
      .map((t) => t.id);
    const mini = confMini(all);
    expect(mini.entries.map((e) => e.place)).toEqual(full.pins.map((p) => p.place));
    expect(mini.placed).toBe(full.talks);
    expect(mini.offMap).toBe(full.total - full.talks);
  });

  it('pins only the talks a shorter CV lists, and counts the rest', () => {
    const ids = talksOn('2page');
    const mini = confMini(ids);
    const pinned = mini.entries.flatMap((e) => e.talks);
    // Nothing on the map that is not in the list beside it...
    for (const id of pinned) expect(ids).toContain(id);
    // ...every listed talk either pinned once or counted as off the map...
    expect(new Set(pinned).size).toBe(pinned.length);
    expect(mini.placed + mini.offMap).toBe(ids.length);
    // ...and it really is a subset, or this proves nothing.
    expect(mini.entries.length).toBeLessThan(full.pins.length);
  });

  it('sizes a pin by its talks on this CV, area for count', () => {
    for (const e of confMini(talksOn('2page')).entries) {
      expect(Number(e.r)).toBeCloseTo(3 * radius(e.talks.length), 1);
    }
  });

  it('keeps each place where the full map puts it', () => {
    const at = new Map(full.pins.map((p) => [p.place, p]));
    for (const e of confMini(talksOn('np')).entries) {
      expect(e.x).toBe(at.get(e.place).x.toFixed(1));
      expect(e.y).toBe(at.get(e.place).y.toFixed(1));
    }
  });

  it('draws the biggest pins first, so none hides a smaller one', () => {
    const r = confMini(talksOn('complete')).dots.map((d) => Number(d.r));
    expect(r).toEqual([...r].sort((a, b) => b - a));
  });
});
