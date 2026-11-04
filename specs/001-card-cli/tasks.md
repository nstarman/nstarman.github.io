---
description: "Tasks for Card images from the command line"
---

# Tasks: Card images from the command line

**Input**: Design documents from `/specs/001-card-cli/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/cli.md, quickstart.md

**Tests**: the argument reader gets a unit test (Article IX: non-trivial logic leaves a test).

## Phase 1: Setup

- [X] T001 Add `"build:card": "node scripts/build-card.mjs"` to the scripts in package.json

## Phase 2: Foundational

- [X] T002 Write `readArgs(argv)` in scripts/lib/cardargs.mjs: positionals are the id, then the output if it ends in `.svg`, `.png` or `.pdf` (any other extension on something that looks like a file, `/\.\w+$/`, is an error), else the name; `--theme` is `light` (default) or `dark`; `--width` is an integer 120–1600; a missing id, a second name or output, or an unknown flag throws with a message
- [X] T003 [P] Test `readArgs` in tests/cardcli.test.js: defaults, each format, name vs output, `--theme dark`, `--width`, and every error in contracts/cli.md

## Phase 3: User Story 1 — a paper's card for a slide (P1) 🎯 MVP

**Goal**: `npm run build:card -- macro-lightning [name] [out]` writes the builder's download.

**Independent test**: quickstart steps 1–3.

- [X] T004 [US1] Write scripts/build-card.mjs: read args (exit 2 with usage on error); make `src/generated/typst_ts_web_compiler_bg.wasm.gz` with scripts/gzip-compiler.mjs when missing; start Astro's `dev()` on 127.0.0.1 and a free port; open Chromium at 1280 × 800 on `/embed/<id>/`
- [X] T005 [US1] In scripts/build-card.mjs, in the page: find the item (fail if absent or its type not in `CARD_TYPES`), resolve the name (preset key → `PRESET`, none → `defaultSlug`, then `formatName(parseName(…))`), build `{ id, it: { title }, slug, width, format, theme }`, put the iframe in a preview as the builder does (height from the `nstarkman-embed` message), and call `downloadCard` with `site` `https://nstarkman.space` and the faces in public/fonts/card
- [X] T006 [US1] In scripts/build-card.mjs: save the download to the output (default `suggestedFilename()` in the working directory, paths from where the command was run), print `<out>  <bytes> bytes`; on any failure exit 1 with the message and leave no file; always close the browser and stop the server

## Phase 4: User Story 2 — dark, and a card that fills its width (P2)

**Independent test**: quickstart steps 4–5.

- [X] T007 [US2] In scripts/build-card.mjs: a name whose width is `fill` with no `--width` fails with "needs --width"; with it the iframe is that wide; `--width` on a card of set width is ignored; `--theme dark` passes through to `downloadCard`

## Phase 5: Polish

- [X] T008 [P] Document the command in AGENTS.md section 3, beside `build:cv`
- [X] T009 [P] Fold the requirements into specs/cards/spec.md (FR-006 and the Card Builder prose), and mention `build:card` alongside FR-028's conventions in specs/renderers/spec.md
- [X] T010 Run quickstart.md end to end, then `npm test`
- [X] T011 Delete specs/001-card-cli/ and .specify/feature.json

## Dependencies

T001 → T002 → T004 → T005 → T006 → T007 → T010 → T011; T003 after T002; T008, T009 any time after T007.

## Implementation strategy

MVP is US1 (T001–T006): the slide card. US2 is a few lines in the same script.
