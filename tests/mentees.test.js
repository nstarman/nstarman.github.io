// The mentee helpers, on items built here rather than on the database.

import { describe, expect, it } from 'vitest';
import { spans } from '../src/lib/inline.js';
import {
  menteeName, papersOf, pickMentees, pickTop, profileHref, softwareOf, sortAchievements, researchSpans, firstSentenceSpans,
} from '../src/lib/mentees.js';

const dates = (list) => list.map((a) => a.date);

describe('achievements', () => {
  it('sort newest first, the more precise date ahead of its year', () => {
    const list = [{ date: '2026' }, { date: '2026-04' }, { date: '2025-07' }];
    expect(dates(sortAchievements(list))).toEqual(['2026-04', '2026', '2025-07']);
  });

  it('lead with awards, even older ones', () => {
    const list = [
      { kind: 'talk', date: '2026', title: 'new talk' },
      { kind: 'award', date: '2020', title: 'old award' },
      { kind: 'poster', date: '2025', title: 'poster' },
    ];
    expect(pickTop(list, 2).map((a) => a.title)).toEqual(['old award', 'new talk']);
  });
});

describe('a mentee', () => {
  it('is named and linked from the record', () => {
    expect(menteeName({ person: { given: 'Amir', family: 'Abdul' } })).toBe('Amir Abdul');
    expect(profileHref({ slug: 'amir-abdul' })).toBe('/people/amir-abdul/');
  });

  it('is a mentoring item with a person, newest first', () => {
    const all = [
      { id: 'a', type: 'mentoring', date: { start: '2020' }, person: {} },
      { id: 'b', type: 'mentoring', date: { start: '2020' } },
      { id: 'c', type: 'mentoring', date: { start: '2024' }, person: {} },
      { id: 'd', type: 'award', date: { start: '2025' }, person: {} },
    ];
    expect(pickMentees(all).map((m) => m.id)).toEqual(['c', 'a']);
  });

  it('has the papers whose author names them, newest first', () => {
    const m = { id: 'amir' };
    const pubs = [
      { id: 'old', date: { start: '2023' }, authors: [{ mentee: 'amir' }] },
      { id: 'other', date: { start: '2024' }, authors: [{ mentee: 'someone' }] },
      { id: 'new', date: { start: '2025' }, authors: [{}, { mentee: 'amir' }] },
    ];
    expect(papersOf(m, pubs).map((p) => p.id)).toEqual(['new', 'old']);
  });

  it('has each package once, from their papers then their own', () => {
    const m = { id: 'amir' };
    const pkg = { id: 'pkg', type: 'software' };
    const own = { id: 'own', type: 'software', authors: [{ mentee: 'amir' }] };
    const byId = { pkg, own, p1: { id: 'p1', type: 'publication' } };
    const papers = [{ refs: ['pkg', 'p1'] }, { refs: ['pkg'] }];
    expect(softwareOf(m, papers, [own], (id) => byId[id]).map((s) => s.id)).toEqual(['pkg', 'own']);
  });
});

describe('researchSpans', () => {
  it('names an item link by its nickTitle and points it at this site', () => {
    const out = researchSpans('We wrote [](item:pinns-mnras) together.');
    const link = out.find((s) => s.item === 'pinns-mnras');
    expect(link.t).toBeTruthy();
    expect(link.url).toMatch(/^\/publications\/#pub-pinns-mnras$/);
  });
  it('throws on an id that names nothing', () => {
    expect(() => researchSpans('[](item:no-such-item)')).toThrow(/names no item/);
  });
});

describe('firstSentenceSpans', () => {
  const first = (t) => firstSentenceSpans(spans(t)).map((s) => s.t).join('');
  it('stops at the first sentence', () => {
    expect(first('One thing. Another.')).toBe('One thing.');
  });
  it('does not cut at et al., e.g., i.e. or an initial', () => {
    expect(first('With Smith et al. we fit it. Then more.')).toBe('With Smith et al. we fit it.');
    expect(first('Streams, e.g. GD-1, fit. Next.')).toBe('Streams, e.g. GD-1, fit.');
    expect(first('Dark matter, i.e. halos, matter. Next.')).toBe('Dark matter, i.e. halos, matter.');
    expect(first('Led by J. Nibauer on streams. Next.')).toBe('Led by J. Nibauer on streams.');
  });
  it('keeps a link across the cut whole', () => {
    expect(firstSentenceSpans(spans('See [paper](https://x.org) now. More.')))
      .toEqual([{ t: 'See ' }, { t: 'paper', url: 'https://x.org' }, { t: ' now.' }]);
  });
});
