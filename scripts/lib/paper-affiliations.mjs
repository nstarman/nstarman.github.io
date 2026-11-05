// Where a collaborator was, from the papers, for someone whose ORCID lists nothing.
//
// An item's author entry carries the affiliation printed on that paper, as free text:
// "Physics Department/CERCA/ISO, Case Western Reserve University, Cleveland, Ohio 44106-7079, USA".
// Which part is the institution is not something to guess, so a part counts only when it is
// exactly — case and punctuation aside — an institution some ORCID history already names. That
// also means it already has its one spelling and its one place in the collaborator file.

/** Case, punctuation and spacing removed — two spellings of one name collide. */
export const orgKey = (name) => (name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * `people`: the collaborator entries so far (ORCID histories). `items`: the site's items.
 * `empty`: the ORCIDs whose record was read and listed no employment and no education.
 * Returns `byOrcid` (ORCID → entries, newest first) for those of `empty` that an item places,
 * and `unmatched` ({ orcid, affiliation }) for printed affiliations that name no known institution.
 */
export function paperAffiliations(people, items, empty) {
  const known = new Map();
  for (const p of people) {
    for (const a of p.affiliations) {
      if (a.kind !== 'paper' && a.organization && !known.has(orgKey(a.organization))) known.set(orgKey(a.organization), a);
    }
  }

  const found = new Map(); // orcid → key → entry
  const unmatched = [];
  for (const item of items) {
    const date = item.date?.start;
    for (const author of item.authors ?? []) {
      if (!empty.has(author.orcid) || !author.affiliation) continue;
      const keys = author.affiliation.split(/[,;/]/).map(orgKey).filter((k) => known.has(k));
      if (keys.length === 0) {
        unmatched.push({ orcid: author.orcid, affiliation: author.affiliation });
        continue;
      }
      const mine = found.get(author.orcid) ?? new Map();
      found.set(author.orcid, mine);
      for (const k of new Set(keys)) {
        // The institution's place as ORCID gives it; the collector then makes it agree with
        // that institution's other entries, as for everyone.
        const { organization, city, region, country } = known.get(k);
        const e = mine.get(k) ?? {
          organization, city, region, country, role: null, kind: 'paper', start: date ?? null, end: date ?? null,
        };
        if (date && (!e.start || date < e.start)) e.start = date;
        if (date && (!e.end || date > e.end)) e.end = date;
        mine.set(k, e);
      }
    }
  }

  const byOrcid = new Map([...found].map(([orcid, m]) => [
    orcid, [...m.values()].sort((a, b) => (b.start ?? '').localeCompare(a.start ?? '')),
  ]));
  return { byOrcid, unmatched };
}
