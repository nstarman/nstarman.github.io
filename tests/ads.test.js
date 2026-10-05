import { describe, expect, it } from 'vitest';
import {
  adsQuery, changes, cleanAbstract, arxivAbstract, crossrefAbstract, arxivByTitle,
} from '../scripts/lib/ads.mjs';

const long = 'A sentence about stellar streams. '.repeat(6).trim();

describe('adsQuery', () => {
  it('prefers bibcode, then doi, then arXiv without its version', () => {
    expect(adsQuery({ bibcode: '2022ApJ...935..167A', doi: '10.1234/x' })).toBe('bibcode:"2022ApJ...935..167A"');
    expect(adsQuery({ doi: '10.1234/x', arxiv: '2201.00001' })).toBe('doi:"10.1234/x"');
    expect(adsQuery({ arxiv: '2201.00001v2' })).toBe('identifier:"arXiv:2201.00001"');
    expect(adsQuery({})).toBeNull();
  });
});

describe('changes', () => {
  it('fills only what is missing and never replaces an abstract', () => {
    const doc = { abstract: `<p>${long}</p>`, bibcode: '2022ApJ...935..167A', citation_count: 5, doi: ['10.1234/x'] };
    expect(changes({}, doc)).toEqual({ abstract: long, bibcode: doc.bibcode, doi: '10.1234/x', citations: 5 });
    expect(changes({ abstract: 'mine', bibcode: doc.bibcode, doi: '10.9/y', citations: 5 }, doc)).toEqual({});
  });

  it('replaces a preprint bibcode with a journal one, never the reverse', () => {
    const journal = { bibcode: '2022ApJ...935..167A' };
    expect(changes({ bibcode: '2022arXiv220100001S' }, journal)).toEqual({ bibcode: journal.bibcode });
    expect(changes({ bibcode: '2021ApJ...900....1S' }, journal)).toEqual({});
    expect(changes({ bibcode: journal.bibcode }, { bibcode: '2022arXiv220100001S' })).toEqual({});
  });

  it('ignores the arXiv-issued DOI', () => {
    expect(changes({}, { doi: ['10.48550/arXiv.2605.04138'] })).toEqual({});
  });

  it('drops a stub abstract and an invalid DOI, and updates the count', () => {
    expect(changes({ citations: 1 }, { abstract: 'Too short.', doi: ['not-a-doi'], citation_count: 2 })).toEqual({ citations: 2 });
  });
});

describe('fallback parsing', () => {
  it('cleans markup but keeps maths', () => {
    expect(cleanAbstract('<jats:title>Abstract</jats:title><jats:p>Mass $M_\\odot$ &amp; more</jats:p>')).toBe('Mass $M_\\odot$ & more');
  });
  it('reads arXiv and Crossref', () => {
    expect(arxivAbstract(`<summary>\n ${long}\n</summary>`)).toBe(long);
    expect(crossrefAbstract({ message: { abstract: `<jats:p>${long}</jats:p>` } })).toBe(long);
    expect(crossrefAbstract({ message: {} })).toBeNull();
  });
  it('accepts a title search hit only on an exact title', () => {
    const feed = (t) => `<entry><title>${t}</title><summary>${long}</summary></entry>`;
    expect(arxivByTitle(feed('Stream Members Only'), 'Stream members only!')).toBe(long);
    expect(arxivByTitle(feed('Something Else'), 'Stream Members Only')).toBeNull();
  });
});
