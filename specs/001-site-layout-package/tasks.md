---
description: "Tasks for the site layout package"
---

# Tasks: the site layout as a released package

**Input**: `specs/001-site-layout-package/` — spec.md, design.md, plan.md, research.md, data-model.md,
contracts/package.md, quickstart.md

**Tests**: requested by the spec (FR-003, FR-007, SC-001, SC-003) and the constitution (Art. IX: new
logic leaves a test).

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [ ] T001 Record a baseline build of `main` for the SC-001 comparison: `npm run build && cp -r dist "$SCRATCH/before"` (before any change; scratchpad, not committed)
- [ ] T002 Add `"workspaces": ["packages/*"]` and dependency `"@nstarkman/site-layout": "*"` to `package.json`; create `packages/site-layout/package.json` per contracts/package.md (version `20261022.0.0`, MIT, `exports`, `files`, `peerDependencies.astro: "^7"`, `publishConfig`, `repository.directory`); run `npm install` (offline-safe: workspace link only) and commit the updated `package-lock.json`

## Phase 2: Foundational (blocks every story)

- [ ] T003 `git mv src/layouts/Base.astro packages/site-layout/SiteLayout.astro`, `git mv src/styles/global.css packages/site-layout/site.css`, `git mv src/components/IconSprite.astro packages/site-layout/IconSprite.astro`; in `SiteLayout.astro` change the imports to `./site.css` and `./IconSprite.astro` (nothing else changes)
- [ ] T004 [P] Update `src/layouts/Embed.astro` to import `@nstarkman/site-layout/site.css` and `@nstarkman/site-layout/IconSprite.astro`
- [ ] T005 [P] Update `src/lib/cardlayout.js` sprite import to `@nstarkman/site-layout/IconSprite.astro?raw` (fall back to a relative `../../packages/site-layout/IconSprite.astro?raw` only if Vite's `?raw` does not resolve through the package `exports`)
- [ ] T006 [P] Update `scripts/lib/cardsync.mjs` to read `${root}/packages/site-layout/site.css`; update the stylesheet path in `tests/cards.test.js`, `tests/cardlayout.test.js`, `tests/cardgroups.test.js`
- [ ] T007 Replace `import Base from '…/layouts/Base.astro'` and `<Base …>`/`</Base>` with `import SiteLayout from '@nstarkman/site-layout/SiteLayout.astro'` and `<SiteLayout …>` in the 13 pages: `src/pages/{index,404,publications,research,software}.astro`, `src/pages/cv/{index,[preset]}.astro`, `src/pages/people/{index,[slug]}.astro`, `src/pages/tools/index.astro`, `src/pages/webdev/{card,cv,tiers}.astro`
- [ ] T008 Update comments naming `global.css` to `site.css` where they name the file: `src/styles/cv/page.css`, `src/styles/card-builder.css`, `src/components/SoftwareSection.astro`, `src/lib/cards.js`, `src/lib/cardlayout.js`, `src/lib/cardbuilder/model.js`, `scripts/lib/cardsync.mjs`; `grep -rn "global.css\|Base.astro\|layouts/Base" src scripts tests` returns nothing

**Checkpoint**: `npm run test:unit` and `npm run build` pass.

## Phase 3: User Story 1 — iterate on the layout in the website (P1) 🎯 MVP

**Independent test**: an edit to `packages/site-layout/SiteLayout.astro` shows on `npm run dev` without install; built pages unchanged.

- [ ] T009 [US1] SC-001: build the branch and compare HTML with `main`'s baseline per quickstart step 1 (asset hashes masked); no differences
- [ ] T010 [US1] Quickstart step 2: change the footer text, `npm run dev`, confirm on `/` and `/research/`, revert

## Phase 4: User Story 2 — release the layout (P2)

**Independent test**: the package checks pass and the workflow refuses a mismatched tag.

- [ ] T011 [P] [US2] Write `tests/site-layout.test.js` (replaces `tests/base-hosted.test.js`, `git rm` it): `SiteLayout.astro` imports exactly `./site.css`, `./IconSprite.astro`; `IconSprite.astro` imports nothing; `site.css` has no `@import`/`url(`; every `exports` target exists; `npm pack --dry-run --json` in `packages/site-layout` lists exactly `package.json`, `README.md`, `LICENSE`, `CHANGELOG.md`, `SiteLayout.astro`, `IconSprite.astro`, `site.css`; `version` matches `/^\d{8}\.0\.\d+$/` and its date is a real date; `CHANGELOG.md` has a `## <version>` section; README documents the four props
- [ ] T012 [P] [US2] Add `packages/site-layout/README.md` (install `@nstarkman/site-layout@<version>`, props table from contracts/package.md, `site`/`base` notes, versioning `YYYYMMDD.0.N`), `CHANGELOG.md` (`## 20261022.0.0` — first release, renamed from `Base.astro`), `LICENSE` (MIT, 2026 Nathaniel Starkman)
- [ ] T013 [US2] Add `.github/workflows/release-site-layout.yml`: on push of tags `site-layout-v*`; `permissions: contents: read, id-token: write`; Node 24 with `registry-url: https://registry.npmjs.org`; `npm ci`; fail unless `${GITHUB_REF_NAME#site-layout-v}` equals `packages/site-layout/package.json` version; `npm run test:unit`; `npm publish --provenance --access public` in `packages/site-layout`; no `NPM_TOKEN`
- [ ] T014 [US2] Validate T013: run its tag-check step locally with a matching and a mismatching tag name (shell), and `actionlint` if available

## Phase 5: User Story 3 — a hosted site uses a released layout (P3)

**Independent test**: the fixture hosted site builds and links back to the website.

- [ ] T015 [US3] Add `tests/fixtures/hosted-site/` (`astro.config.mjs` with `site: 'https://nstarkman.space'`, `base: '/demo'`, `outDir` in the OS temp dir; `src/pages/index.astro` using `<SiteLayout title="Demo" section="/research/" repo="nstarman/demo">`)
- [ ] T016 [US3] Extend `tests/site-layout.test.js`: build the fixture with the installed Astro (`astro build --root tests/fixtures/hosted-site`, no network) and assert nav hrefs are site-absolute (`/research/`, none starting `/demo/`), the research entry is marked current, and "Last updated" links to `https://github.com/nstarman/demo`; make sure the fixture is not picked up by the site's own build or `test:links`
- [ ] T017 [US3] Rewrite `AGENTS.md` "Sites hosted in their own repos": install and pin `@nstarkman/site-layout@<version>`, wrap pages in `<SiteLayout section repo>`, set `site`/`base`, add a Dependabot `npm` entry; remove the sparse-submodule recipe; releasing (YYYYMMDD.0.N, tag, first publish by hand per research R1, backports on `versions/site-layout-v<YYYYMMDD>.x`)

## Phase 6: Polish and landing

- [ ] T018 [P] Update `README.md` stylesheet table and cascade note to `packages/site-layout/site.css` / `SiteLayout.astro`
- [ ] T019 [P] Update `specs/refresh/spec.md` (card-rule hash reads `site.css`) and `specs/cards/spec.md` (tokens read from `site.css`)
- [ ] T020 Fold into `specs/renderers/spec.md`: Covers lists `packages/site-layout/`; FR-020 rewritten as the package contract (name, exports, props, self-containment, `YYYYMMDD.0.N` releases by tag with trusted publishing, website consumes it by workspace; *Enforced:* `tests/site-layout.test.js`, `release-site-layout.yml`)
- [ ] T021 Delete `specs/001-site-layout-package/` and `.specify/feature.json`' s pointer to it (Art. X), in the same PR
- [ ] T022 Full gates: `npm test` (unit, bibtex, build, a11y, links); open the PR; independent subagent review; after merge, hand the author the first-publish steps (research R1)

## Dependencies

- T001 before T003. T002 → T003 → T004–T008 → checkpoint.
- US1 (T009–T010) after Phase 2. US2 (T011–T014) after Phase 2; T011 needs T012's files to pass.
  US3 (T015–T017) after T011. Phase 6 after all stories; T021 last before T022.

## Parallel examples

- Phase 2: T004, T005, T006 together after T003.
- US2: T011 and T012 together.
- Polish: T018 and T019 together.

## Implementation strategy

MVP is Phases 1–3: the website on the package with no visible change. US2 adds releasing, US3 the
hosted-site proof and docs. All land in one PR (Art. X folds the spec on landing); nothing is
published until the author's first manual publish after merge.
