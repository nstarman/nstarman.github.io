// Where a builder option lives. An option for the whole CV is in the global settings panel (the
// `all` block of CvFmtRow.astro); an option for one section is in that section's own row, among its
// Items controls. This holds the global block to the whole-CV options it has, so a section's option
// cannot be put there without someone saying it is for the whole CV.

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const src = fs.readFileSync(new URL('../src/components/CvFmtRow.astro', import.meta.url), 'utf8');
const start = src.indexOf('{all && (');
// The marker that opens the global block; if it moves, say so rather than slicing at -1.
if (start === -1) throw new Error('CvFmtRow.astro: the global block (`{all && (`) was not found; update this test');
const global = src.slice(start);
const section = src.slice(0, start);
const ids = (text) => [...text.matchAll(/\bid="([A-Za-z0-9_-]+)"/g)].map((m) => m[1]);

// Every control for the whole CV. A new one is added here on purpose.
const WHOLE_CV = ['style', 'format', 'names', 'currency', 'selprefix', 'trailcap', 'fill', 'resetorder'];
// Controls for one section, and the section whose row holds each.
const ONE_SECTION = { schoolbelow: "s.id === 'education'", linkondegree: "s.id === 'education'", paperids: "s.id === 'mentoring'" };

describe('where a builder option lives', () => {
  it('has only options for the whole CV in the global panel', () => {
    expect(ids(global).sort()).toEqual([...WHOLE_CV].sort());
  });

  it("puts a section's option in that section's own row, behind its section", () => {
    for (const [id, guard] of Object.entries(ONE_SECTION)) {
      if (!src.includes(`id="${id}"`)) continue; // an option not in this build yet
      expect(ids(section)).toContain(id);
      expect(ids(global)).not.toContain(id);
      expect(src).toContain(guard);
    }
  });

  it("offers a talks section's place below the title in that section's row only, and for talks", () => {
    expect(section).toContain('data-location-below-of');
    expect(global).not.toContain('data-location-below-of');
    expect(section).toContain("s.items.every((i) => i.type === 'presentation')");
  });

  it("offers the place in a title in a section's row only, where a talk has one", () => {
    expect(section).toContain('data-title-place-of');
    expect(global).not.toContain('data-title-place-of');
    expect(section).toContain('s.items.some((i) => i.titlePlace)');
  });
});
