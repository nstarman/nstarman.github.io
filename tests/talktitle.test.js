// A presentation's title is `talk`, not a line of `details` (specs/data-model/spec.md, FR-017).
// The migration moved each title out of `details`; this holds that none was lost and none is
// printed twice, and that a note was not mistaken for a title.

import { describe, expect, it } from 'vitest';
import { byType } from '../src/lib/data.js';
import { detailLines } from '@nstarkman/data-resolver/inline.js';
import frozen from './fixtures/talk-titles.json';

const talks = byType('presentation');
const byId = Object.fromEntries(talks.map((i) => [i.id, i]));
const text = (line) => line.map((s) => s.t).join('');

describe("a presentation's title", () => {
  it.each(Object.entries(frozen))('%s keeps its title in `talk`', (id, title) => {
    expect(byId[id]?.talk).toBe(title);
  });

  it('is never also in `details`', () => {
    for (const i of talks.filter((t) => t.talk)) {
      expect([i.details ?? []].flat(), i.id).not.toContain(i.talk);
      expect(String(i.details ?? ''), i.id).not.toContain(i.talk);
    }
  });

  it('is not given to a note: a role is not a title', () => {
    for (const i of talks.filter((t) => String(t.details ?? '').startsWith('Role:') && !frozen[t.id])) {
      expect(i.talk, i.id).toBeUndefined();
    }
  });

  it('prints first, in quotation marks, on the entries that have one', () => {
    for (const i of talks.filter((t) => t.talk)) {
      expect(text(detailLines(i)[0]), i.id).toMatch(/^“.+”$/);
    }
  });
});
