---
description: "Task list: the builder keeps the preset it started from"
---

# Tasks: The builder keeps the preset it started from

**Input**: Design documents from `/specs/002-builder-keeps-preset/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/selection-preset.md

**Tests**: Included — the constitution (Article IX) requires each rule to have a test; the plan names them.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

None — no new modules or dependencies.

## Phase 2: Foundational (blocks both stories)

- [X] T001 Add `preset` to the selection in src/lib/selection.js: `encode` writes it when present; `decode` keeps it "when it is a string; otherwise absent"; no version bump ("absent means `complete`")
- [X] T002 [P] Test in tests/selection.test.js: `preset` round-trips through encode/decode; a non-string is dropped; a file without it decodes with none

**Checkpoint**: a selection can carry its preset.

## Phase 3: User Story 1 — Start from a preset, compile, get that preset's PDF (P1) 🎯 MVP

**Goal**: Start from X and Compile with nothing changed lays out as X's PDF.

**Independent test**: Start from 1P, Compile → 1 page; Start from 2P → 2 pages.

- [X] T003 [P] [US1] Test in tests/selectionmodel.test.js: for each preset P, a selection holding P's resolved ids, `preset: P` and P's recorded options gives a model whose `preset`, `label`, `detail`, section ids, item ids per section and section `groups` equal `cvModel(P)`'s (contract invariant)
- [X] T004 [P] [US1] Test in tests/selectionmodel.test.js: `preset: "1page"` with an invited talk ticked keeps the Invited Talks section and prints the talk (FR-003); its publications have no status groups
- [X] T005 [US1] In src/lib/selectionmodel.js, after `cvModel('complete', …)`, when `sel.preset` names a preset P: set `model.preset`, `model.label`, `model.detail` from P; for each section P has, rebuild its `groups` from P's `groupBy` ("none when P sets `groupBy: null`"); sections P lacks keep `complete`'s. Export or reuse `groupsOf` from src/lib/cvmodel.js rather than copying it
- [X] T006 [US1] In src/pages/webdev/cv.astro: hold the base preset (starts as `START`); Start from sets it; `currentSelection()` writes it as `preset`
- [X] T007 [US1] Verify in the builder (dev server): Start from 1P → Compile → 1 page; Start from 2P → 2 pages; compare with public/cv/starkman-cv-1page.pdf and -2page.pdf

**Checkpoint**: US1 works in the builder.

## Phase 4: User Story 2 — A saved selection keeps its preset (P2)

**Goal**: save, load and the CLI keep the preset; older files print as they did.

**Independent test**: save after Start from 1P, `npm run build:cv` → 1 page; the Hubble selection compiles unchanged.

- [X] T008 [P] [US2] Test in tests/selectionmodel.test.js: a selection without `preset`, and one with `preset: "nope"`, lays out as `complete` (model `preset` is `complete`, publications keep status groups)
- [X] T009 [P] [US2] Test in tests/selection.test.js: `loadReport` adds a line when `preset` names no preset, saying it lays out as the complete CV
- [X] T010 [US2] In src/lib/selection.js `loadReport`: report an unknown `preset` (needs the preset names; pass them in as `known` is)
- [X] T011 [US2] In src/pages/webdev/cv.astro: loading a file sets the base preset to the file's `preset` if known, else `complete`; pass the preset names to `loadReport`
- [X] T012 [US2] Verify: compile the owner's Hubble selection with `npm run build:cv` before and after (page count and `pdftotext` text identical); save after Start from 1P and compile it with the CLI → 1 page

**Checkpoint**: both stories work.

## Phase 5: Polish

- [X] T013 Update the "reads every field a selection carries" test in tests/selectionmodel.test.js if it enumerates fields
- [X] T014 Run `npm test`, `npm run build`, `bash scripts/build-cv-pdfs.sh` — all green, 1page 1 page, 2page 2 pages
- [X] T015 Fold into specs/cv-presets/spec.md (FR-020 what Compile does, FR-021 the `preset` field) and specs/renderers/spec.md (FR-028), as the current contract
- [X] T016 Delete specs/002-builder-keeps-preset/ and .specify/feature.json

## Dependencies

- T001 → everything. T005 ← T003, T004 (tests first). T006 ← T005. T010 ← T009. T011 ← T006, T010.
- US2 builds on US1's T005/T006 (the same field and model step).

## Parallel opportunities

- T002 with T003/T004 (different files). T008 with T009.

## Implementation strategy

MVP is US1 (T001–T007): the builder's Compile matches the presets. US2 makes it survive save/load and
reports bad files. Then polish and fold.
