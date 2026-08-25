// BibTeX generation. The output is pasted into other people's .tex files, so a
// stray unescaped character breaks someone else's build, not ours.

import { describe, expect, it } from 'vitest';
import { toBibtex, toBibliography } from '../src/lib/bibtex.js';
import { byType } from '../src/lib/data.js';

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
