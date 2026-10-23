# Research: research-kit

## R1 The data layer becomes a store

- **Finding**: `src/lib/data.js` builds the item index from `import.meta.glob('/data/*.json')` and imports
  `config/*.json` at module level; `cards.js`, `mentees.js`, `places.js`, `collabmap.js`,
  `Card.astro` and `Publication.astro` call its functions (28 importers). A package cannot reach that glob.
- **Decision**: `@nstarkman/data-resolver` exports `createStore({ items, lists, config })`, the functions of
  today's `data.js` (and the parts of `mentees.js`/`places.js` the card and map use) as methods of the
  store, unchanged in behavior. The website's `src/lib/data.js` becomes thin: it builds the store from the
  glob and config imports and re-exports the store's functions under today's names, so the 28 importers
  do not change.
- **Rationale**: no second implementation (Art. VII); the website keeps exercising every function.

## R2 How package components reach the store

- **Decision**: components in `card-builder` and `collaborator-map` import the store from the bare
  specifier `@nstarkman/research-store`, which the consumer maps with a Vite alias
  (`vite.resolve.alias` in `astro.config.mjs`): the website → `src/lib/data.js`; a paper site → a module
  that does `createStore(snapshot)` on `docs/card.json`. A package test builds a fixture site with a
  fixture store.
- **Alternatives**: a `store` prop threaded through every `<Card>`/`<Publication>` (≈ 20 call sites and
  every nested component — rejected: churn); module-level `setStore()` (order-dependent — rejected).

## R3 The snapshot is raw records, not derived values

- **Decision**: `collect(id, read)` returns `{ schema: 1, root, items, config }`: the root item and every
  item reached through `refs`, `highlight`, `preliminaryOf`, mentee links on authors, and grants; the
  `config/` entries they use (stars for its software, journals for its venues, collaborators and places
  for its co-authors, mentees'… ) — each item as in `data/`, minus `internal`. A paper site runs the same
  store functions on it, so its card is drawn by exactly the website's code from exactly the website's
  facts.
- **Rationale**: nothing derived is stored, so nothing can drift; the user's "pointers, not copies".

## R4 Reading the website's files from GitHub

- **Decision**: data files are named `<date>-<id>.json`, so `collect` needs a listing: the GitHub tree API
  (`GET /repos/nstarman/nstarman.github.io/git/trees/<ref>?recursive=1`, one call) maps ids to paths;
  files come from `raw.githubusercontent.com/<repo>/<ref>/<path>`. `read` and the listing are injected
  (`fromGitHub({ repo, ref })`, `fromDisk(root)`), so tests use disk and a fake GitHub reader.
- **Rationale**: no new endpoint; unauthenticated limits (60 tree calls/hour) are ample for a weekly bot.

## R5 Card choices and the paper-site preset

- **Decision**: a new `SITE_PRESETS` key, `paperSite`: the Research page's publication entry without the
  `context` extra. `cards/<id>.json` (schema `schema/card.schema.json`): `{ "preset": "<SITE_PRESETS key>" }`
  plus optional card settings; tests validate every file and that each preset key exists.

## R6 Releasing four packages together

- **Decision**: one version in all four `package.json`s (a test enforces it); `research-kit` depends on the
  three at exactly that version; tag `research-kit-v<version>` → `release-research-kit.yml` publishes
  data-resolver, card-builder, collaborator-map, research-kit in that order with trusted publishing,
  skipping versions already on npm (the site-layout workflow's pattern). First versions by hand.
- `card-builder` styles come from the page's `site.css` (`@nstarkman/site-layout`), see R7.

## R7 Where the card's and map's CSS live

- **Finding**: the card's rules are in `site.css` (`@nstarkman/site-layout`); the map's in
  `src/styles/map.css`.
- **Decision**: card CSS stays in `site.css` (paper sites already load it; moving it would change the site
  stylesheet's contract and the card hash in `cardsync`). `map.css` moves into `collaborator-map` with the
  component.

## R8 What goes where (found while writing tasks)

- **Finding**: `Byline.astro` (in the card) imports `collabHref` from `collabmap.js`; `mentees.js` and
  `cards.js` import each other; `inline.js` imports `data.js` and `mentees.js`.
- **Decision**: split by kind, not by file —
  - **data-resolver** (everything computed from data): `data.js`'s functions, `mentees.js`, `places.js`,
    `inline.js`, `bibtex.js`, the URL helpers (`siteHref`, `adsHref`, …), and the data half of
    `collabmap.js` (`collaboratorMap` entries, `collabHref`, `lastFirst`, `meets`, `postsOf`). Each module
    becomes `make<Name>(store)` inside `createStore`, so the store object exposes the same names the
    files export today.
  - **card-builder** (drawing): `Card`, `Publication`, `Byline`, `Venue`, `VenueBits`, `ButtonList`,
    `LinkIcon(s)`, `SoftwareRow`, `Inline`, `cardname.js`, `cards.js`'s presets and card logic, `maths.js`
    (temml) — importing data only from `@nstarkman/research-store`.
  - **collaborator-map** (drawing): `CollabMap.astro`, `worldmap.js` and the world outline, `map.css`.
- The website's `src/lib/{data,mentees,places,inline,bibtex,collabmap}.js` become thin re-exports of the
  store, so their importers and tests keep their paths.
