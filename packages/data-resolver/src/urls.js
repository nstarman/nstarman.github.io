// Where an item's entry is on nstarkman.space — site-absolute, so a paper site at
// nstarkman.space/<repo>/ links back into the website.

/** Where it links with title:…:site — the item's entry on this site, where
 *  it has one: a paper on /publications/ (an in-prep one is not listed), a
 *  package on /software/, a synthesis on /research/. */
export const siteHref = (item) => (item.type === 'publication' ? (item.status !== 'in-prep' ? `/publications/#pub-${item.id}` : null)
  : item.type === 'software' ? `/software/#sw-${item.id}` : item.type === 'highlight' ? `/research/#hl-${item.id}` : null);

