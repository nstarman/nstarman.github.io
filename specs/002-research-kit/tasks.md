---
description: "Tasks for research-kit"
---

# Tasks: research-kit

**Input**: spec.md, plan.md, research.md (R1–R8), data-model.md, contracts/packages.md, quickstart.md
**Tests**: required (SC-001…SC-004; Art. IX). Every phase ends with the page diff against `main` (no change).

## Phase 1: Setup

- [ ] T001 Baseline: build `origin/main` into the scratchpad (`before/`) for the page diff (asset hashes masked, as for site-layout)
- [ ] T002 Create `packages/{data-resolver,card-builder,collaborator-map,research-kit}/package.json` (one version `20261023.0.0`, `"type": "module"`, `exports`, `files`, MIT, `repository.directory`, peer `astro ^7` for the two component packages; research-kit depends on the three at exactly that version) and add them to the workspace; `npm install` (offline workspace links)
- [ ] T003 Alias `@nstarkman/research-store` → `src/lib/data.js` in `astro.config.mjs` and `vitest.config.js`

## Phase 2: The store (US1, US2 foundation)

- [ ] T004 `packages/data-resolver/src/store.js`: `createStore({ items, lists, config })` returning today's `data.js` API (every export, same behavior), with `make…(store)` factories for `mentees.js`, `places.js`, `inline.js`, `bibtex.js`, the URL helpers from `cards.js`, and the data half of `collabmap.js` (R8)
- [ ] T005 Rewrite `src/lib/data.js` to build items/lists/config as now (glob + config imports, filename check) and `export const { … } = createStore(…)`; `src/lib/{mentees,places,inline,bibtex}.js` and the data half of `collabmap.js` become re-exports from it
- [ ] T006 Checkpoint: `npm run test:unit`, `npm run test:bibtex`, build, page diff = none

## Phase 3: The card in card-builder (US1)

- [ ] T007 Move (git mv) `Card`, `Publication`, `Byline`, `Venue`, `VenueBits`, `ButtonList`, `LinkIcon`, `LinkIcons`, `SoftwareRow`, `Inline` (.astro) and `cardname.js`, `maths.js`, and `cards.js`'s card logic (presets, `cardFacts`, `cardText`, `cardLinks`, `studentStamp`, constants) into `packages/card-builder/`; their data imports become `@nstarkman/research-store`
- [ ] T008 Update every importer in `src/` (pages, `CvView`, `SoftwareSection`, embed, cards endpoints, cardbuilder, tests, `scripts/lib/cardsync.mjs` paths) to `@nstarkman/card-builder/…`; `src/lib/cards.js` keeps only website-only bits or becomes a re-export
- [ ] T009 Checkpoint: unit + cardlayout tests (hash unchanged: Card.astro content unchanged), build, page diff = none

## Phase 4: The map in collaborator-map (US1)

- [ ] T010 Move `CollabMap.astro`, `worldmap.js`, `src/assets/world-equal-earth.json`, `src/styles/map.css` (and ConfMap's shared use of worldmap: keep ConfMap in `src/`, importing worldmap from the package) into `packages/collaborator-map/`; add prop `people` (default: the store's whole collaborator map) for one paper's co-authors
- [ ] T011 Checkpoint: build, page diff = none (`/research/` map identical)

## Phase 5: Collect (US2)

- [ ] T012 [P] `packages/data-resolver/src/collect.js`: `collect(id, reader)` → snapshot per data-model.md (root, items reached through refs/highlight/mentee/preliminaryOf/grants, minus `internal`; config slices; `source`); a missing file fails naming it and the ref
- [ ] T013 [P] `packages/data-resolver/src/readers.js`: `fromDisk(root)`, `fromGitHub({ repo, ref, fetch })` (tree API listing → id→path; raw files)
- [ ] T014 `tests/research-kit.test.js`: for every publication/highlight/software item, `collect` with `fromDisk` ≡ with a fake GitHub reader over the same files (SC-002); `createStore(snapshot)` renders the same card facts (`cardFacts`) as the full store for that item

## Phase 6: Card choices and funding (US3, US5)

- [ ] T015 [P] `schema/card.schema.json` and `cards/` (README line in `AGENTS.md`); `SITE_PRESETS` gains `paperSite` (the Research entry without the `context` extra); test: every `cards/*.json` validates and names an existing key; `collect` attaches `card` (default `paperSite`)
- [ ] T016 [P] Grants in a publication's `refs`: data-model test accepts them, CV output unchanged (presets select by type, not refs) — add a test; `collect` includes them

## Phase 7: The kit (US4)

- [ ] T017 `packages/research-kit/`: re-export subpaths; test: four versions equal, research-kit deps exact
- [ ] T018 `tests/fixtures/paper-site/`: Astro project depending only on `@nstarkman/research-kit` + `@nstarkman/site-layout`, aliasing the store to `createStore(snapshot)` of `stream-convexity-spatial` (collected from disk in the test), base `/demo`; build offline; its card HTML equals `/embed/`'s rendering for `paperSite` (SC-003)
- [ ] T019 `.github/workflows/release-research-kit.yml`: tag `research-kit-v*`; check tag = all four versions; unit tests; publish data-resolver, card-builder, collaborator-map, research-kit in order, skipping versions on npm; Node 24, `id-token: write`
- [ ] T020 [P] READMEs and CHANGELOGs for the four packages (install, the store alias contract, snapshot schema)

## Phase 8: Landing

- [ ] T021 `AGENTS.md`: research-kit for hosted paper sites; releasing the kit
- [ ] T022 Fold into `specs/cards/spec.md`, `specs/renderers/spec.md`, `specs/data-model/spec.md`; delete `specs/002-research-kit/` (Art. X)
- [ ] T023 `npm test`, CV PDFs, page diff; PR; independent review; merge on the author's go; first publish by hand (four packages, in order), then trusted publishers

## Dependencies

Phases in order (each ends with an unchanged page diff). T012/T013 parallel; T015/T016 parallel; T017–T020 after Phase 5.
