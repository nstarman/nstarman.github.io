# Contract: the packages

| package | exports |
|---|---|
| `@nstarkman/data-resolver` | `createStore({items, lists, config})` → store (today's `data.js` API); `collect(id, reader)` → snapshot; `fromDisk(root)`, `fromGitHub({repo, ref})` readers |
| `@nstarkman/card-builder` | `./Card.astro`, `./Publication.astro`, `./cardname.js` (`parseName`, `cardFace`, grammar), `./cards.js` (`SITE_PRESETS`, `PRESET`, …) |
| `@nstarkman/collaborator-map` | `./CollabMap.astro` (prop `people`: all, or one paper's co-authors), `./map.css` |
| `@nstarkman/research-kit` | depends on the three at one version; re-exports their subpaths (`@nstarkman/research-kit/Card.astro`, …) |

**Store alias contract**: `card-builder` and `collaborator-map` import `@nstarkman/research-store`; the
consumer MUST alias it (`vite.resolve.alias`) to a module that exports a store's names (`export const { … } = createStore(…)`, and `config`), and MUST set `vite.ssr.noExternal: [/^@nstarkman\//]` so Vite, not Node, loads the packages and the alias applies in dev as in build.
