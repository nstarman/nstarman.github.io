// A presentation's `titlePlace` is the place its title ends with, in parentheses
// (specs/data-model/spec.md, FR-017). The CV leaves it out of the title on request, so it
// must be exactly the text the title ends with, and the invited talks that end in a place say so.

import { describe, expect, it } from 'vitest';
import { byType } from '../src/lib/data.js';

const talks = byType('presentation');
const NAMED = {
  'cca-software-seminar-nyc': 'NYC',
  'cwru-seminar-cleveland': 'Cleveland',
  'dark-seminar-copenhagen': 'Copenhagen',
  'dark-seminar-copenhagen-2': 'Copenhagen',
  'eas-26-s10-lausanne': 'Lausanne',
  'marche-iii-big-bang-big-stars-big-computers-jesi': 'Jesi',
  'princeton-thunch-seminar-princeton': 'Princeton',
  'tevpa-valencia': 'Valencia',
  'texas-a-m-seminar-texas': 'Texas',
};

describe("the place a talk's title ends with", () => {
  it('is what the title ends with, in parentheses', () => {
    for (const i of talks.filter((t) => t.titlePlace)) {
      expect(i.title.endsWith(` (${i.titlePlace})`), i.id).toBe(true);
    }
  });

  it.each(Object.entries(NAMED))('%s names %s', (id, place) => {
    expect(talks.find((t) => t.id === id)?.titlePlace).toBe(place);
  });

  it('is not given to a kind label such as (Talk) or (Poster)', () => {
    for (const i of talks.filter((t) => /\((Talk|Poster)\)$/.test(t.title))) {
      expect(i.titlePlace, i.id).toBeUndefined();
    }
  });
});
