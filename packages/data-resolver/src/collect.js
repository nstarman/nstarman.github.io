// What a paper site keeps of the website's data to draw its card, its collaborator
// map, its funding and its software citations: the item and the items it reaches,
// as they are in data/ (but `internal`), and the slices of config/ they use.
// createStore(snapshot) then runs the website's own functions on it.

import { sortItems } from './store.js';

export const SCHEMA = 1;
const CONFIG = ['collaborators', 'journals', 'stars', 'places'];

/** cards/<id>.json, the item's card choices, where it has one. */
async function readCard(reader, id) {
  let text;
  try {
    text = await reader.read(`cards/${id}.json`);
  } catch (e) {
    if (e.notFound) return null; // none: the default
    throw e; // a failed read is not "no card"
  }
  const { $schema, ...card } = JSON.parse(text);
  return card;
}

/** The snapshot for item `id`, read through `reader` (readers.js). */
export async function collect(id, reader, { card } = {}) {
  const index = await reader.index();
  const items = new Map();
  const get = async (ref, from) => {
    if (items.has(ref)) return items.get(ref);
    const path = index.get(ref);
    if (!path) throw new Error(`no data file for "${ref}"${from ? ` (referenced by ${from})` : ''}`);
    let item;
    try {
      item = JSON.parse(await reader.read(path));
    } catch (e) {
      throw new Error(`${path}${from ? ` (referenced by ${from})` : ''}: ${e.message}`);
    }
    delete item.internal;
    delete item.$schema;
    items.set(ref, item);
    return item;
  };

  const root = await get(id);
  // What it points at: its software (in its order), grants, highlights.
  for (const ref of root.refs ?? []) {
    const r = await get(ref, id);
    // A package's own papers: its card's paper buttons and how to cite it.
    if (r.type === 'software') for (const p of r.refs ?? []) await get(p, ref);
  }
  // My students among its authors, for their marks and profile links.
  for (const a of root.authors ?? []) if (a.mentee) await get(a.mentee, id);

  const config = Object.fromEntries(await Promise.all(CONFIG.map(async (k) => [k, JSON.parse(await reader.read(`config/${k}.json`))])));
  const all = [...items.values()];
  const orcids = new Set(all.flatMap((i) => (i.authors ?? []).map((a) => a.orcid)).filter(Boolean));
  const people = config.collaborators.people.filter((p) => orcids.has(p.orcid));
  const orgs = new Set([
    ...people.flatMap((p) => p.affiliations.map((a) => a.organization)),
    ...all.flatMap((i) => (i.journey ?? []).map((j) => j.organization)),
  ]);
  const places = Object.fromEntries(Object.entries(config.places.places).filter(([name]) => orgs.has(name)));
  // A sameAs entry needs what it points at.
  for (const p of Object.values(places)) if (p.sameAs) places[p.sameAs] = config.places.places[p.sameAs];
  const repos = new Set(all.map((i) => i.repo).filter(Boolean));
  const venues = new Set(all.flatMap((i) => [i.venue?.journal, i.venue?.booktitle]).filter(Boolean));

  return {
    schema: SCHEMA,
    root: id,
    source: reader.source,
    items: sortItems(all),
    config: {
      collaborators: { ...config.collaborators, people },
      journals: Object.fromEntries(Object.entries(config.journals).filter(([k]) => venues.has(k))),
      stars: { ...config.stars, stars: Object.fromEntries(Object.entries(config.stars.stars).filter(([k]) => repos.has(k))) },
      places: { ...config.places, places },
      acknowledgements: { papers: [] },
    },
    card: card ?? (await readCard(reader, id)) ?? { preset: 'paperSite' },
  };
}
