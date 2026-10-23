# Contract: the packages

| package | exports |
|---|---|
| `@nstarkman/data-resolver` | `createStore({items, lists, config})` → store (today's `data.js` API); `collect(id, reader)` → snapshot; `fromDisk(root)`, `fromGitHub({repo, ref})` readers |
| `@nstarkman/card-builder` | `./Card.astro`, `./Publication.astro`, `./cardname.js` (`parseName`, `cardFace`, grammar), `./cards.js` (`SITE_PRESETS`, `PRESET`, …) |
| `@nstarkman/collaborator-map` | `./CollabMap.astro` (prop `people`: all, or one paper's co-authors), `./map.css` |
| `@nstarkman/research-kit` | depends on the three at one version; re-exports their subpaths (`@nstarkman/research-kit/Card.astro`, …) |

**Store alias contract**: `card-builder` and `collaborator-map` import `@nstarkman/research-store`; the
consumer MUST alias it to a module whose default/named exports are a store (`createStore(...)`).
