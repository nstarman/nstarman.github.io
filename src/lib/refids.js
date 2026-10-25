// A paper cited by its identifier rather than its words: its DOI, else its arXiv id.
// Used for a mentoring entry's lines, where "[a NeurIPS workshop paper](item:pinns-neurips)"
// can instead read "doi:10.…".

import { resolve as itemById } from './data.js';

/** `{ t, url }` for a publication's DOI, else its arXiv id, or null where it has neither. */
export function identifierOf(item) {
  if (item?.type !== 'publication') return null;
  if (item.doi) return { t: `doi:${item.doi}`, url: `https://doi.org/${item.doi}` };
  if (item.arxiv) return { t: `arXiv:${item.arxiv}`, url: `https://arxiv.org/abs/${item.arxiv}` };
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
