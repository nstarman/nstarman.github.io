import { describe, expect, it } from 'vitest';
import { parseBibtex, compareToArchive } from '../src/lib/bibcompare.js';

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
});
