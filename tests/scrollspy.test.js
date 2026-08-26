import { describe, expect, it } from 'vitest';
import { currentSection, REACHED_EPS } from '../src/lib/scrollspy.js';

// The offset headings are scrolled to, as the CV page computes it: 6.6rem.
const GAP = 105.6;

describe('the CV contents rail', () => {
  it('marks the section you jumped to, not the one before it', () => {
    // The bug, with the numbers measured off the page. Clicking a contents link
    // settles the heading a fraction *below* its own scroll-margin-top, because
    // the browser lands the scroll on a device pixel. Comparing `<= 0` therefore
    // decided the heading had not been reached and marked its predecessor —
    // on nine of the fifteen links, "Select Publications" among them.
    const landed = [
      { id: 'education', top: -511.14 },
      { id: 'positions', top: -257.66 },
      { id: 'publications', top: GAP + 0.19 },   // the one just jumped to
      { id: 'awards-major', top: 1871.66 },
    ];
    expect(currentSection(landed, GAP)).toBe('publications');
  });

  it('marks each of the measured landings correctly', () => {
    // Every delta seen on the page, so a smaller tolerance cannot pass this.
    for (const delta of [0.06, 0.07, 0.13, 0.19, 0.2, 0.24]) {
      const heads = [
        { id: 'before', top: -300 },
        { id: 'target', top: GAP + delta },
        { id: 'after', top: GAP + 900 },
      ];
      expect(currentSection(heads, GAP)).toBe('target');
    }
  });

  it('does not reach forward to a heading that is genuinely below', () => {
    // The tolerance must not become "near enough": a heading a screen down is
    // not the section being read.
    const heads = [
      { id: 'current', top: -40 },
      { id: 'next', top: GAP + 200 },
    ];
    expect(currentSection(heads, GAP)).toBe('current');
    // And not one just past the tolerance either.
    expect(currentSection(
      [{ id: 'current', top: -40 }, { id: 'next', top: GAP + REACHED_EPS + 0.5 }],
      GAP,
    )).toBe('current');
  });

  it('marks the last heading that has passed, not the first', () => {
    const heads = [
      { id: 'a', top: -900 },
      { id: 'b', top: -400 },
      { id: 'c', top: -20 },
      { id: 'd', top: 800 },
    ];
    expect(currentSection(heads, GAP)).toBe('c');
  });

  it('marks the first heading while still above it', () => {
    // At the top of the document the reader is in the first section, not in none.
    expect(currentSection([{ id: 'a', top: 400 }, { id: 'b', top: 900 }], GAP)).toBe('a');
  });

  it('has nothing to say about an empty page', () => {
    expect(currentSection([], GAP)).toBe(null);
  });
});
