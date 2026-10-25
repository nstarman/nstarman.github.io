// A paper cited by its identifier rather than its words: its DOI, else its arXiv id.
// Used for a mentoring entry's lines, where "[a NeurIPS workshop paper](item:pinns-neurips)"
// can instead read as its DOI or arXiv id, with the mark the Publications section gives it.

import { resolve as itemById } from './data.js';

/** `{ t, url, icon }` for a publication's DOI (the bare DOI, with the paper mark, as the
 *  Publications section writes it), else its arXiv id, or null where it has neither. */
export function identifierOf(item) {
  if (item?.type !== 'publication') return null;
  if (item.doi) return { t: item.doi, url: `https://doi.org/${item.doi}`, icon: 'paper' };
  if (item.arxiv) return { t: `arXiv:${item.arxiv}`, url: `https://arxiv.org/abs/${item.arxiv}`, icon: 'arxiv' };
  return null;
}

/** A span list with each `item:` reference to a paper that has an identifier written as it. */
export const asIdentifiers = (spans) => spans.map((x) => {
  const id = x.item && identifierOf(itemById(x.item));
  return id ? { ...x, ...id } : x;
});

/** The same, kept beside the words: each such reference carries its identifier as `alt`,
 *  for the builder's page to swap. */
export const withIdentifiers = (spans) => spans.map((x) => {
  const id = x.item && identifierOf(itemById(x.item));
  return id ? { ...x, alt: id } : x;
});
