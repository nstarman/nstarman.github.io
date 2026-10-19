import { describe, expect, it } from 'vitest';
import { parseBibtex, compareToArchive, splitExport } from '../src/lib/bibcompare.js';

const ARCH = String.raw`@ARTICLE{2025ApJ...980..253S,
       author = {{Starkman}, Nathaniel and {Nibauer}, Jacob and {Bovy}, J. and {P{\'e}rez}, Ana},
        title = "{Stream Members Only: Data-Driven Characterization}",
      journal = {\apj},
         year = 2025,
        month = jan,
       volume = {980},
        pages = {253},
          doi = {10.3847/1538-4357/ada0b1},
     keywords = {Stellar streams},
       adsurl = {https://ui.adsabs.harvard.edu/abs/2025ApJ...980..253S/abstract},
}`;
const OURS = `@article{Starkman+:2025:stream-members,
  author = {Starkman, Nathaniel and Nibauer, Jacob and Bovy, Jo and Pérez, Ana},
  title  = {{Stream Members Only: Data-Driven Characterization}},
  journal = {The Astrophysical Journal},
  volume = {980}, pages = {253}, year = {2025}, month = {jan},
  doi = {10.3847/1538-4357/ada0b1},
  adsurl = {https://ui.adsabs.harvard.edu/abs/2025ApJ...980..253S/abstract},
  note = {anything}
}`;

describe('compareToArchive', () => {
  it('parses nested braces, quotes and bare values', () => {
    const e = parseBibtex(ARCH);
    expect(e).toMatchObject({ type: 'article', key: '2025ApJ...980..253S' });
    expect(e.fields.title).toBe('{Stream Members Only: Data-Driven Characterization}');
    expect(e.fields.month).toBe('jan');
    expect(e.fields.year).toBe('2025');
  });
  it('matches across macros, accents, initials and brace protection', () =>
    expect(compareToArchive(OURS, ARCH, { preprint: false })).toEqual([]));
  it('ignores the key, note and fields only one side has', () =>
    expect(compareToArchive(OURS.replace('Starkman+:2025', 'Other:1999'), ARCH, { preprint: false })).toEqual([]));
  it('reports a changed field with both values', () =>
    expect(compareToArchive(OURS.replace('{980}', '{981}'), ARCH, { preprint: false }))
      .toEqual([{ field: 'volume', ours: '981', theirs: '980' }]));
  it('a different family name is a difference', () =>
    expect(compareToArchive(OURS.replace('Nibauer, Jacob', 'Nibaur, Jacob'), ARCH, { preprint: false })[0].field).toBe('author'));
  it('a preprint skips the venue', () =>
    expect(compareToArchive(OURS, ARCH.replace('{\\apj}', '{arXiv e-prints}').replace('{980}', '{}'), { preprint: true })).toEqual([]));
  it('an archive author list cut to "and others" is a difference that says so', () => {
    const cut = ARCH.replace(/author = \{.*\},\n/, 'author = {{Starkman}, Nathaniel and others},\n');
    const [d] = compareToArchive(OURS, cut, { preprint: false });
    expect(d.field).toBe('author');
    expect(d.theirs).toMatch(/ and others$/);
  });
  it('dotless i and special letters match their Unicode forms', () => {
    const arch = String.raw`@ARTICLE{k, author = {{Mart{\'\i}n}, Ana and {S{\o}rensen}, Bo and {Stra{\ss}e}, C}, year = 2025}`;
    const ours = '@article{x, author = {Martín, Ana and Sørensen, Bo and Straße, C}, year = {2025}}';
    expect(compareToArchive(ours, arch, { preprint: false })).toEqual([]);
  });
  it('a field without "=" throws instead of looping', () =>
    expect(() => parseBibtex('@article{k, oops }')).toThrow(/without "="/));
  it('splitExport drops leading text and @comment blocks', () =>
    expect(splitExport('\n\n@ARTICLE{a, year = 1}\n\n@comment{x}\n@MISC{b, year = 2}\n'))
      .toEqual(['@ARTICLE{a, year = 1}', '@MISC{b, year = 2}']));
  it('tilde is a space, and a dash run is one hyphen', () => {
    const a = '@article{k, author = {Marleau, F.~R.}, pages = {2292--2301}}';
    const b = '@article{k, author = {Marleau, F. R.}, pages = {2292-2301}}';
    expect(compareToArchive(a, b, { preprint: false })).toEqual([]);
    expect(compareToArchive(a.replace('--', '–'), b, { preprint: false })).toEqual([]);
  });
  it('given names match when one side is a prefix of the other', () => {
    const e = (g) => `@article{k, author = {Webb, ${g}}}`;
    expect(compareToArchive(e('Jeremy'), e('Jeremy J.'), { preprint: false })).toEqual([]);
    expect(compareToArchive(e('S. S.'), e('Stacy'), { preprint: false })).toEqual([]);
    expect(compareToArchive(e('Jeremy'), e('Karl'), { preprint: false })).toHaveLength(1);
  });
  it('title case, a leading The and a literal name\'s The are ignored', () => {
    const a = '@article{k, title = {Data-Driven Streams}, journal = {The Astrophysical Journal}, author = {{The Astropy Collaboration}}}';
    const b = '@article{k, title = {Data-driven streams}, journal = {\\apj}, author = {{Astropy Collaboration}}}';
    expect(compareToArchive(a, b, { preprint: false })).toEqual([]);
  });
  it('a preprint also skips doi, year and month', () => {
    const a = '@article{k, doi = {10.1/x}, year = {2026}, month = {oct}}';
    const b = '@article{k, doi = {10.48550/arXiv.1}, year = 2026, month = may}';
    expect(compareToArchive(a, b, { preprint: true })).toEqual([]);
    expect(compareToArchive(a, b, { preprint: false }).map((d) => d.field)).toEqual(['doi', 'month']);
  });
});
