// BibTeX generation. The output is pasted into other people's .tex files, so a
// stray unescaped character breaks someone else's build, not ours.

import { describe, expect, it } from 'vitest';
import { citekey, toBibtex, toBibliography } from '../src/lib/bibtex.js';
import { byType } from '../src/lib/data.js';
import fixture from './fixtures/citekeys.json';

const pubs = byType('publication');
const bib = toBibliography(pubs);

const entry = (over = {}) => ({
  id: 'x',
  type: 'publication',
  entryType: 'article',
  title: 'A Title',
  date: { start: '2024-02' },
  authors: [{ family: 'Starkman', given: 'Nathaniel', me: true }],
  status: 'published',
  ...over,
});

describe('escaping', () => {
  const esc = (title) => toBibtex(entry({ title }));

  it('turns a backslash into a command, without mangling its braces', () => {
    // The chained version needed a sentinel here, and got it subtly wrong.
    expect(esc('mass \\star limit')).toContain('mass \\textbackslash{}star limit');
  });

  it('escapes the characters that are syntax in TeX', () => {
    expect(esc('A & B')).toContain('A \\& B');
    expect(esc('50% of it')).toContain('50\\% of it');
    expect(esc('under_score')).toContain('under\\_score');
    expect(esc('{braced}')).toContain('\\{braced\\}');
  });

  it('spells dashes the way TeX does', () => {
    expect(esc('em — dash')).toContain('em --- dash');
    expect(esc('en – dash')).toContain('en -- dash');
  });

  it('passes a NUL through instead of turning it into a backslash', () => {
    const nul = String.fromCharCode(0);
    expect(esc(`a${nul}b`)).toContain(`a${nul}b`);
  });
});

describe('an entry', () => {
  it('names its type explicitly rather than guessing one', () => {
    expect(toBibtex(entry({ entryType: 'article' }))).toMatch(/^@article\{/);
    expect(toBibtex(entry({ entryType: 'misc' }))).toMatch(/^@misc\{/);
  });

  it('writes authors as "Family, Given", which is what BibTeX parses', () => {
    const out = toBibtex(entry({
      authors: [
        { family: 'Price-Whelan', given: 'Adrian M.' },
        { family: 'Starkman', given: 'Nathaniel', me: true },
      ],
    }));
    expect(out).toContain('Price-Whelan, Adrian M. and Starkman, Nathaniel');
  });

  it('protects the title from having its case flattened', () => {
    expect(toBibtex(entry({ title: 'Dark Matter' }))).toContain('{{Dark Matter}}');
  });

  it('writes the month when the record has one, and omits it otherwise', () => {
    expect(toBibtex(entry({ date: { start: '2024-02' } }))).toContain('month');
    expect(toBibtex(entry({ date: { start: '2024' } }))).not.toContain('month');
  });
});

describe('year, month and adsurl', () => {
  it('uses the journal issue date when venue.year is set, never mixing months', () => {
    const b = toBibtex(entry({ venue: { year: '2021', month: '03' } }));
    expect(b).toMatch(/year\s+= \{2021\}/);
    expect(b).toMatch(/month\s+= \{mar\}/);
    const noMonth = toBibtex(entry({ venue: { year: '2021' } }));
    expect(noMonth).toContain('{2021}');
    expect(noMonth).not.toMatch(/month\s+=/);
  });
  it('falls back to date.start', () => {
    const b = toBibtex(entry());
    expect(b).toContain('= {2024}');
    expect(b).toContain('= {feb}');
  });
  it('writes the ADS url without /abstract', () => {
    expect(toBibtex(entry({ bibcode: '2022ApJ...935..167A' })))
      .toContain('= {https://ui.adsabs.harvard.edu/abs/2022ApJ...935..167A}');
  });
});

describe('the whole bibliography', () => {
  it('emits one entry per publication', () => {
    expect((bib.match(/^@/gm) ?? []).length).toBe(pubs.length);
  });

  it('balances its braces', () => {
    const open = (bib.match(/(?<!\\)\{/g) ?? []).length;
    const close = (bib.match(/(?<!\\)\}/g) ?? []).length;
    expect(open).toBe(close);
  });

  it('leaves no bare ampersand or percent outside an abstract', () => {
    for (const line of bib.split('\n')) {
      if (line.trimStart().startsWith('abstract')) continue;
      expect(line).not.toMatch(/(?<!\\)[&%]/);
    }
  });

  it('keeps the LaTeX maths arXiv puts in an abstract intact', () => {
    // Escaping an abstract as prose would destroy $M_\star$.
    const withMaths = bib.split('\n').filter((l) => l.includes('$') && l.includes('abstract'));
    for (const l of withMaths) expect(l).not.toContain('\\textbackslash{}');
  });

  it('gives every entry a citation key', () => {
    for (const key of bib.match(/^@\w+\{([^,]+),/gm) ?? []) {
      expect(key.split('{')[1].replace(',', '').trim()).toBeTruthy();
    }
  });
});

const A = (family, given = 'X') => ({ family, given });

describe('citekey', () => {
  it('one author: no plus', () =>
    expect(citekey(entry({ id: 'p', authors: [A('Starkman')] }))).toBe('Starkman:2024:p'));
  it('two authors: both', () =>
    expect(citekey(entry({ id: 'p', authors: [A('Starkman'), A('Price-Whelan')] }))).toBe('Starkman+Price-Whelan:2024:p'));
  it('three or more: first and a plus', () =>
    expect(citekey(entry({ id: 'p', authors: [A('Li'), A('Lelli'), A('McGaugh')] }))).toBe('Li+:2024:p'));
  it('collaboration leads, The/Collaboration dropped', () => {
    expect(citekey(entry({ id: 'p', collaboration: 'The Astropy Collaboration', authors: [A('Price-Whelan'), A('Lim'), A('Earl')] }))).toBe('Astropy+Price-Whelan+:2024:p');
    expect(citekey(entry({ id: 'p', collaboration: 'Euclid Collaboration', authors: [A('Starkman'), A('Nibauer'), A('Pearson')] }))).toBe('Euclid+Starkman+:2024:p');
  });
  it('citeslug replaces the id', () =>
    expect(citekey(entry({ id: 'stream-members-only', citeslug: 'stream-members' }))).toBe('Starkman:2024:stream-members'));
  it('family names are ASCII, unspaced', () =>
    expect(citekey(entry({ id: 'p', authors: [A('van der Pérez'), A("O'Brien")] }))).toBe('vanderPerez+OBrien:2024:p'));
  it('always matches the BibTeX key pattern', () =>
    pubs.forEach((p) => expect(citekey(p)).toMatch(/^[A-Za-z][A-Za-z0-9_:+.-]*$/)));
  it('a published paper keeps its frozen key', () =>
    pubs.filter((p) => p.bibcode).forEach((p) =>
      expect(citekey(p), `${p.id}: add or restore "${p.id}": "${citekey(p)}" in tests/fixtures/citekeys.json`).toBe(fixture[p.id])));
  it('the entry uses it', () =>
    expect(toBibtex(entry({ id: 'p' }))).toMatch(/^@article\{Starkman:2024:p,/));
});
