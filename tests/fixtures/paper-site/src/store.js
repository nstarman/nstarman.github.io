// The store, from the snapshot the test wrote (a paper site's docs/card.json).
import fs from 'node:fs';
import { createStore } from '@nstarkman/research-kit/store.js';

export const store = createStore(JSON.parse(fs.readFileSync(process.env.PAPER_SITE_SNAPSHOT, 'utf8')));
export const {
  items, lists, config, byType, featured, resolve, titleOf, splitTitle, HIGHLIGHT_TOPICS,
  SOFTWARE_GROUPS, displayName, authorPosition, venueUrl, softwarePapers, softwareUsed,
  affiliationAt, authors, positionStops, money, venueLine, year,
  dateLabel, relKey, REL_ICON, primaryLink, links, assists,
  assistItem, groupedByDefault, institutionGroups, groupTitle, groupDate,
} = store;
