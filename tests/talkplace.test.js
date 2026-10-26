// A talk's place is its `location`. A title is the event's name: it must not also carry the place
// as text, or "In the title" would print it twice and the default would print it in two positions.

import { describe, expect, it } from 'vitest';
import { byType } from '../src/lib/data.js';

const talks = byType('presentation');

describe("a talk's title", () => {
  it('does not end in its own location, whole or just its city', () => {
    for (const i of talks.filter((t) => t.location)) {
      const city = i.location.split(',')[0].trim();
      expect(i.title.endsWith(`(${i.location})`), `${i.id}: ${i.title}`).toBe(false);
      expect(i.title.endsWith(`(${city})`), `${i.id}: ${i.title}`).toBe(false);
    }
  });

  it.each([
    ['eas-26-s10-lausanne', 'EAS 26-S10'],
    ['cca-software-seminar-nyc', 'CCA Software seminar'],
    ['texas-a-m-seminar-texas', 'Texas A&M Seminar'],
    ['marche-iii-big-bang-big-stars-big-computers-jesi', 'Marche III: Big Bang, Big Stars, Big Computers'],
  ])('%s is just the event: %s', (id, title) => {
    expect(talks.find((t) => t.id === id)?.title).toBe(title);
  });

  it('keeps its location, which is the place', () => {
    for (const id of ['eas-26-s10-lausanne', 'cca-software-seminar-nyc', 'texas-a-m-seminar-texas']) {
      expect(talks.find((t) => t.id === id)?.location, id).toBeTruthy();
    }
  });
});
