// Preset resolution: which items a CV variant contains, and what its headings
// are allowed to claim. This is the logic that replaced the LaTeX CV's
// `% SKIP: (*)` preprocessor, and the page counts depend on it.

import { describe, expect, it } from 'vitest';
import { presetNames, preset, resolve, memberIds, sectionIndex } from '../src/lib/presets.js';
import { items } from '../src/lib/data.js';

describe('the presets', () => {
  it('are the four the site offers', () => {
    expect(presetNames).toEqual(['complete', 'np', '2page', '1page']);
  });

  it('reject a name that does not exist, rather than rendering nothing', () => {
    expect(() => preset('nope')).toThrow(/Unknown CV preset/);
  });
});

describe('resolve', () => {
  it('takes everything for the complete CV, and a subset for the rest', () => {
    const complete = resolve('complete');
    const np = resolve('np');
    const count = (cv) => cv.sections.reduce((n, s) => n + s.items.length, 0);
    expect(count(complete)).toBe(items.length);
    expect(count(np)).toBeLessThan(count(complete));
  });

  it('only includes an item whose cvs list names the preset', () => {
    for (const s of resolve('2page').sections) {
      for (const i of s.items) expect(i.cvs ?? []).toContain('2page');
    }
  });

  it('drops a section that resolves to nothing', () => {
    for (const cv of presetNames.map((n) => resolve(n))) {
      for (const s of cv.sections) {
        expect(s.items.length + (s.entries?.length ?? 0)).toBeGreaterThan(0);
      }
    }
  });

  it('honours a section limit, keeping the newest', () => {
    const pubs = resolve('1page').sections.find((s) => s.id === 'publications');
    expect(pubs.items.length).toBeLessThanOrEqual(preset('1page').sections
      .find((s) => s.id === 'publications').limit);
  });

  it('says "Select" when, and only when, a section is a selection', () => {
    for (const name of presetNames) {
      for (const s of resolve(name).sections) {
        // `dropped` counts everything left out, however it was left out.
        expect(s.heading.startsWith('Select ')).toBe(s.dropped > 0);
      }
    }
  });

  it('counts what it leaves out', () => {
    const sw = resolve('2page').sections.find((s) => s.id === 'software');
    const all = items.filter((i) => i.type === 'software').length;
    expect(sw.items.length + sw.dropped).toBe(all);
  });

  it('narrows to an explicit id list, for the builder', () => {
    const only = new Set(['mit-postdoc']);
    const picked = resolve('complete', only).sections.flatMap((s) => s.items);
    expect(picked.map((i) => i.id)).toEqual(['mit-postdoc']);
  });
});

describe('memberIds', () => {
  it('reports what a preset renders, not what merely opted in', () => {
    // Filtering on `cvs` alone would pre-check items a limit then discards, and
    // "start from 2P, compile" would not reproduce the two-page CV.
    for (const name of presetNames) {
      const rendered = resolve(name).sections.flatMap((s) => s.items.map((i) => i.id));
      expect(memberIds(name)).toEqual(rendered);
    }
  });
});

describe('sectionIndex', () => {
  it('offers a section only where it resolves to something', () => {
    const index = sectionIndex();
    for (const name of presetNames) {
      const ids = new Set(resolve(name).sections.map((s) => s.id));
      expect([...index.get(name)].sort()).toEqual([...ids].sort());
    }
  });
});
