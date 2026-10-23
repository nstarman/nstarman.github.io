// Loads data/*.json at build time, and builds the store every renderer reads
// (@nstarkman/data-resolver; the card and map packages import it as
// @nstarkman/research-store, which astro.config.mjs points here).
//
// data/ is flat and a filename is its item's start date followed by its id, so
// this reads the directory rather than maintaining an index — and `ls` comes
// out chronological. Everything downstream — the site, the CV presets,
// the BibTeX file, the README — sorts and filters through here, so ordering and
// author formatting are defined once.

// Vite's glob, not node:fs — the module gets bundled, so a path relative to
// import.meta.url would resolve inside dist/ at render time. This inlines the
// JSON at build time instead, and keeps working if the site ever goes SSR.
const modules = import.meta.glob('/data/*.json', { eager: true });

// Generated from ORCID; see scripts/collect-collaborators.mjs.
import collaborators from '/config/collaborators.json';
// Generated from ADS; see scripts/collect-acknowledgements.mjs.
import acknowledgements from '/config/acknowledgements.json';
// Each journal's short name, "ApJ" for "The Astrophysical Journal", by hand.
import journals from '/config/journals.json';
// Each package's GitHub stars; see scripts/collect-stars.mjs.
import starCounts from '/config/stars.json';

// Where each place is, for the maps; see scripts/geocode-places.mjs.
import places from '/config/places.json';
import { createStore, sortItems } from '@nstarkman/data-resolver/store.js';

const files = Object.entries(modules)
  .map(([file, mod]) => {
    const item = mod.default ?? mod;
    const stem = file.slice(file.lastIndexOf('/') + 1, -'.json'.length);
    const want = `${item.date?.start}-${item.id}`;
    if (stem !== want) {
      throw new Error(`${file}: filename should be ${want}.json (<date.start>-<id>).`);
    }
    return item;
  });

/**
 * Bare enumerations — refereeing venues, review panels. Not items: no date, no
 * presets, nothing to sort by. A preset section names one with `list`.
 */
const listModules = import.meta.glob('/data/lists/*.json', { eager: true });
export const lists = new Map(
  Object.values(listModules).map((m) => {
    const l = m.default ?? m;
    return [l.id, l.entries];
  }),
);


export const items = sortItems(files);

export const store = createStore({ items, lists, config: { collaborators, acknowledgements, journals, stars: starCounts, places } });
export const config = store.config;
export const {
  byType, featured, resolve, titleOf, splitTitle, HIGHLIGHT_TOPICS,
  SOFTWARE_GROUPS, displayName, authorPosition, venueUrl, softwarePapers, softwareUsed,
  affiliationAt, authors, positionStops, money, venueLine, year,
  dateLabel, relKey, REL_ICON, primaryLink, links, assists,
  assistItem, groupedByDefault, institutionGroups, groupTitle, groupDate,
} = store;
