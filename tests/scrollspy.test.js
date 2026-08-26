import { describe, expect, it } from 'vitest';
import { anchorTrail, currentSection, REACHED_EPS } from '../src/lib/scrollspy.js';

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

describe('holding your place across a change of CV length', () => {
  // Measured off /cv/ with "Conferences" 40px above the gap line.
  const reading = [
    { id: 'software', top: -8966 },
    { id: 'talks-invited', top: -8142 },
    { id: 'talks-contributed', top: -5035 },
    { id: 'conferences', top: 66 },
    { id: 'mentoring', top: 2084 },
  ];

  it('offers the section you are in first', () => {
    expect(anchorTrail(reading, GAP)[0]).toEqual({ id: 'conferences', top: 66 });
  });

  it('falls back up the page, never down it', () => {
    // 1P has none of these, so the trail has to keep walking backwards. A
    // heading below the fold is not somewhere the reader was standing.
    expect(anchorTrail(reading, GAP).map((h) => h.id)).toEqual([
      'conferences', 'talks-contributed', 'talks-invited', 'software',
    ]);
  });

  it("keeps each heading's own offset, not the first one's", () => {
    // The fallback is only worth having if it lands you where you were
    // relative to *that* heading: reusing 66 would put a heading you had
    // scrolled a screenful past back at the top of the viewport.
    expect(anchorTrail(reading, GAP).find((h) => h.id === 'software').top).toBe(-8966);
  });

  it('gives the first section while still above it', () => {
    // currentSection says you are in the first section at the top of the
    // document, so there is exactly one place to stand.
    expect(anchorTrail([{ id: 'a', top: 400 }, { id: 'b', top: 900 }], GAP))
      .toEqual([{ id: 'a', top: 400 }]);
  });

  it('has nowhere to stand on a page with no headings', () => {
    expect(anchorTrail([], GAP)).toEqual([]);
  });
});
