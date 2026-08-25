// The render model. cv.typ and the website both read this, so a mistake here
// shows up in the PDF and the page at once — and neither can be diffed easily.

import { describe, expect, it } from 'vitest';
import { cvModel } from '../src/lib/cvmodel.js';
import { resolve as itemById } from '../src/lib/data.js';

const complete = cvModel('complete');
const twoPage = cvModel('2page');
const all = (cv) => cv.sections.flatMap((s) => s.items);
const find = (cv, id) => all(cv).find((i) => i.id === id);
const text = (spans) => spans.map((s) => s.t).join('');

describe('the model', () => {
  it('carries the person and the preset it was built from', () => {
    expect(complete.preset).toBe('complete');
    expect(complete.person.name).toBeTruthy();
  });

  it('spells months on dates, because the PDF prints them', () => {
    expect(find(complete, 'brinson-prize-fellowship').when).toBe('Feb 2024');
  });
});

describe('detail levels', () => {
  it('drops elaboration on a summary preset', () => {
    const summarySections = twoPage.sections.filter((s) => s.detail !== 'full');
    for (const s of summarySections) {
      for (const i of s.items) expect(i.lines).toEqual([]);
    }
  });

  it('keeps it where a section overrides the preset', () => {
    // Invited Talks is `detail: full` on the two-page CV: a talk that names a
    // city and not its subject is an itinerary.
    const talks = twoPage.sections.find((s) => s.id === 'talks-invited');
    expect(talks.detail).toBe('full');
    expect(talks.items.some((i) => i.lines.length > 0)).toBe(true);
  });

  it('lets the builder pick individual lines', () => {
    const onlyFirst = cvModel('complete', undefined, (_id, line) => line === 0);
    for (const i of all(onlyFirst)) expect(i.lines.length).toBeLessThanOrEqual(1);
  });
});

describe('publications', () => {
  const pubs = complete.sections.find((s) => s.id === 'publications');
  const astropy = pubs.items.find((i) => i.id === 'astropy-v5-paper');

  it('hands byline, title and venue over separately', () => {
    expect(text(astropy.byline)).toContain('Starkman');
    expect(astropy.venue).toContain('Astrophysical Journal');
    expect(astropy.title).not.toContain('Starkman');
  });

  it('bolds the owner and nobody else', () => {
    expect(astropy.byline.filter((s) => s.b).map((s) => s.t)).toEqual(['N. Starkman']);
  });

  it('groups by status, newest state first', () => {
    expect(pubs.groups.map((g) => g.label))
      .toEqual(['In Preparation', 'Submitted', 'Published']);
    const grouped = pubs.groups.flatMap((g) => g.ids);
    expect(new Set(grouped).size).toBe(grouped.length);
    expect(grouped.length).toBe(pubs.items.length);
  });

  it('names every citation link rather than leaving a bare glyph', () => {
    const cite = ['ads', 'arxiv', 'paper', 'doi'];
    for (const p of pubs.items) {
      for (const l of p.links.filter((x) => cite.includes(x.icon))) {
        expect(l.label).toBeTruthy();
      }
    }
  });
});

describe('software', () => {
  const sw = complete.sections.find((s) => s.id === 'software');

  it('shows the paper of a package that has one', () => {
    const unxt = sw.items.find((i) => i.id === 'unxt');
    expect(unxt.links.some((l) => l.icon === 'paper')).toBe(true);
    // ...and it is the paper the record points at.
    expect(itemById('unxt').refs).toContain('unxt-joss');
  });

  it('leaves a package with no paper alone', () => {
    const quax = sw.items.find((i) => i.id === 'quax');
    expect(quax.links.some((l) => l.icon === 'paper')).toBe(false);
  });

  it('still titles a package with its repository', () => {
    const unxt = sw.items.find((i) => i.id === 'unxt');
    expect(unxt.links[0].icon).toBe('github');
  });
});

describe('every item', () => {
  it('has the fields cv.typ reads, so the template cannot fault', () => {
    for (const i of all(complete)) {
      expect(typeof i.when).toBe('string');
      expect(typeof i.title).toBe('string');
      expect(Array.isArray(i.subject)).toBe(true);
      expect(Array.isArray(i.lines)).toBe(true);
      expect(Array.isArray(i.links)).toBe(true);
      expect(typeof i.trailing).toBe('string');
      for (const l of i.links) expect(l.icon && l.url && l.label).toBeTruthy();
    }
  });

  it('never prints a mentee name twice', () => {
    // `student` was imported equal to `title`, so the subject repeated it.
    const mentoring = complete.sections.find((s) => s.id === 'mentoring');
    for (const i of mentoring.items) expect(text(i.subject)).not.toBe(i.title);
  });
});
