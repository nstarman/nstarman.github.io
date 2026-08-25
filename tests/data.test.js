// The database loader: how a record becomes a date label, a byline, a venue
// line and a set of links. Every renderer goes through these.

import { describe, expect, it } from 'vitest';
import {
  items,
  byType,
  resolve,
  displayName,
  authors,
  venueLine,
  dateLabel,
  links,
  relKey,
} from '../src/lib/data.js';

describe('the database', () => {
  it('loads every item', () => {
    expect(items.length).toBeGreaterThan(150);
  });

  it('sorts newest first, with work in preparation ahead of it', () => {
    // The year on an in-preparation paper is a guess, so it does not compete
    // with dates that actually happened.
    const dated = items.filter((i) => i.status !== 'in-prep');
    const starts = dated.map((i) => i.date?.start ?? '');
    expect([...starts].sort().reverse()).toEqual(starts);

    const lastInPrep = items.findLastIndex((i) => i.status === 'in-prep');
    const firstDated = items.findIndex((i) => i.status !== 'in-prep');
    expect(lastInPrep).toBeLessThan(firstDated);
  });

  it('resolves an item by id', () => {
    expect(resolve('mit-postdoc')?.type).toBe('position');
    expect(resolve('no-such-item')).toBeUndefined();
  });
});

describe('dateLabel', () => {
  it('gives the year for a single date', () => {
    expect(dateLabel({ date: { start: '2019' } })).toBe('2019');
    expect(dateLabel({ date: { start: '2024-02' } })).toBe('2024');
  });

  it('spells the month only when asked, and only when there is one', () => {
    expect(dateLabel({ date: { start: '2024-02' } }, { month: true })).toBe('Feb 2024');
    expect(dateLabel({ date: { start: '2019' } }, { month: true })).toBe('2019');
  });

  it('keeps a range to years, even when asked for months', () => {
    const range = { date: { start: '2018-09', end: '2024-06' } };
    expect(dateLabel(range)).toBe('2018 – 2024');
    expect(dateLabel(range, { month: true })).toBe('2018 – 2024');
  });

  it('leaves an open range open', () => {
    expect(dateLabel({ date: { start: '2021', present: true } })).toBe('2021 –');
  });

  it('will not put a year on work in preparation', () => {
    expect(dateLabel({ date: { start: '2026' }, status: 'in-prep' })).toBe('In Prep');
  });
});

describe('authors', () => {
  const paper = {
    authors: [
      { family: 'Wu', given: 'Sirui' },
      { family: 'Starkman', given: 'Nathaniel', me: true },
      { family: 'Pearson', given: 'Sarah' },
    ],
  };

  it('abbreviates given names', () => {
    expect(displayName({ family: 'Starkman', given: 'Nathaniel' })).toBe('N. Starkman');
    expect(displayName({ family: 'Price-Whelan', given: 'Adrian M.' })).toBe('A. M. Price-Whelan');
  });

  it('marks the owner so a renderer can bold them', () => {
    expect(authors(paper).shown.filter((a) => a.me)).toHaveLength(1);
  });

  it('truncates with et al. past the limit', () => {
    expect(authors(paper, 2).shown).toHaveLength(2);
    expect(authors(paper, 2).etal).toBe(true);
    expect(authors(paper, 9).etal).toBe(false);
  });
});

describe('venueLine', () => {
  it('joins journal, volume and pages', () => {
    expect(venueLine({ venue: { journal: 'ApJ', volume: '980', pages: '253' } }))
      .toBe('ApJ 980, 253');
  });

  it('copes with a journal alone', () => {
    expect(venueLine({ venue: { journal: 'ApJ' } })).toBe('ApJ');
  });
});

describe('links', () => {
  it('synthesises ADS from a bibcode', () => {
    const out = links({ bibcode: '2022ApJ...935..167A' });
    expect(out.find((l) => l.label === 'ADS').url).toContain('2022ApJ...935..167A');
  });

  it('synthesises the preprint from an arXiv id', () => {
    const out = links({ arxiv: '2410.21174' });
    const pre = out.find((l) => l.rel === 'preprint');
    expect(pre.label).toBe('arXiv:2410.21174');
    expect(pre.url).toBe('https://arxiv.org/abs/2410.21174');
  });

  it('does not invent a second preprint when the record already has one', () => {
    const out = links({
      arxiv: '2410.21174',
      links: [{ rel: 'preprint', url: 'https://example.org', label: 'given' }],
    });
    expect(out.filter((l) => l.rel === 'preprint')).toHaveLength(1);
  });

  it('names a paper link by its DOI, so it is not the bare word "paper"', () => {
    const out = links({
      doi: '10.1093/mnras/stad1166',
      links: [{ rel: 'paper', url: 'https://doi.org/10.1093/mnras/stad1166' }],
    });
    expect(out.find((l) => l.rel === 'paper').label).toBe('10.1093/mnras/stad1166');
  });

  it('leaves an explicit label alone', () => {
    const out = links({ links: [{ rel: 'paper', url: 'https://x.test', label: 'JOSS review' }] });
    expect(out[0].label).toBe('JOSS review');
  });

  it('orders ADS before the preprint before the code', () => {
    const out = links({
      bibcode: '2022ApJ...935..167A',
      arxiv: '2206.14220',
      links: [{ rel: 'code', url: 'https://github.test' }],
    });
    expect(out.map(relKey)).toEqual(['ads', 'preprint', 'code']);
  });
});

describe('byType', () => {
  it('filters, and every type in the database is one the schema allows', () => {
    expect(byType('publication').every((i) => i.type === 'publication')).toBe(true);
    expect(byType('publication', 'software').length)
      .toBe(byType('publication').length + byType('software').length);
  });
});
