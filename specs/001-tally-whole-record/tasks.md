---

description: "Tasks for a paper count that counts the whole record"
---

# Tasks: A paper count that counts the whole record

**Input**: Design documents from `/specs/001-tally-whole-record/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/tally.md, quickstart.md

**Tests**: included — constitution Article IX and the plan ask for a test of `tally()`'s in-prep rule,
the record count, and the selection's `of`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1 a short CV states the whole record; US2 I choose it in the builder

## Phase 1: Setup

No setup: no new module, dependency or file layout (plan, Structure Decision).

## Phase 2: Foundational (blocks both stories)

- [ ] T001 Add a test to the "tally" describe in tests/presets.test.js: `tally()` given a list with an `in-prep` paper counts neither it in total nor in first-author or student-led (FR-002)
- [ ] T002 In `tally()` in src/lib/presets.js, drop every publication whose `status` is `"in-prep"` before counting; its JSDoc says so
- [ ] T003 Add tests to tests/presets.test.js: a section `tally: { of: "record" }` over a 5-paper `only` gives the whole record's numbers (every publication whose `status` is not `in-prep` — 19 today); `{ of: "record", hIndex: "ads" }` keeps the h-index; `true` and `{ hIndex }` give the list's numbers as before (SC-002, FR-007)
- [ ] T004 In `resolve()` in src/lib/presets.js, when the section's or the builder's tally has `of: "record"`, call `tally()` with every `publication` item instead of `picked`; update the comment above it to name `of`

**Checkpoint**: `npx vitest run tests/presets.test.js` passes.

## Phase 3: User Story 1 — a short CV states the whole record (P1) 🎯 MVP

**Goal**: the 1-page and 2-page CVs open their publication list with the whole record's count.

**Independent test**: `pdftotext` of each built PDF shows the same "19 papers (5 submitted): …" line; one page and two pages.

- [ ] T005 [US1] In config/presets.json, give the `1page` and `2page` `publications` sections `"tally": { "of": "record" }`
- [ ] T006 [US1] Add a test to tests/presets.test.js: `resolve('1page')` and `resolve('2page')` publications' `tally` equal each other and equal `tally()` of the whole record (SC-001)
- [ ] T007 [US1] Build the site and the CV PDFs (`npm run build && scripts/build-cv-pdfs.sh`); check both count lines read the same numbers and the page counts are 1 and 2 (SC-003)

**Checkpoint**: US1 is shippable alone — the presets carry it; the builder's Start from would print it once US2 lands.

## Phase 4: User Story 2 — I choose it in the builder (P2)

**Goal**: a **Whole record** box beside Tally; preview, Compile, Save and Start from agree.

**Independent test**: in `/webdev/cv/`, Start from 1P shows Tally and Whole record ticked and a preview of 19; unticking Whole record shows the ticked count; Compile PDF matches; Save then load keeps it.

- [ ] T008 [P] [US2] Add tests to tests/selection.test.js: `encode`/`decode` keep `{ of: "record" }` and `{ of: "record", hIndex }` by section; any other `of` (`"list"`, `7`, `""`) is dropped, leaving `true` or `{ hIndex }`; a file without `of` decodes as before
- [ ] T009 [US2] In `cleanTally` in src/lib/selection.js, keep `of` only when it is `"record"`, alongside `hIndex`; a value of `{}` after cleaning is `true`; update its comment
- [ ] T010 [P] [US2] Add the Whole record option to the per-section list in tests/builder-placement.test.js (cv-presets FR-027: the publication list's own settings row)
- [ ] T011 [US2] In src/components/CvFmtRow.astro, after the Tally checkbox, add `<input type="checkbox" name={`tallyrecord:${s.id}`} data-tally-record-of={s.id} />Whole record` in a label, disabled until Tally is ticked
- [ ] T012 [US2] In src/pages/webdev/cv.astro's page data, add `record` (the whole record's numbers from `tally()` over every publication) and a `prep` flag per `PUBS` entry
- [ ] T013 [US2] In src/pages/webdev/cv.astro, make `currentTally()` add `of: "record"` when its section's Whole record box is ticked; `setTally()` tick it from a preset's or a file's `of`; the box enables and disables with its Tally box
- [ ] T014 [US2] In `syncLegends` in src/pages/webdev/cv.astro, leave `prep` papers out of a ticked count and print `record` when Whole record is ticked
- [ ] T015 [US2] Run the builder (`npm run dev`, `/webdev/cv/`) through the independent test above; no console errors

**Checkpoint**: both stories work; `npm test` passes.

## Phase 5: Polish & landing (constitution Article X)

- [ ] T016 Run `npm test` and the quickstart.md checks
- [ ] T017 Fold into specs/cv-presets/spec.md: FR-025 (`tally` takes `of: "record"`; no count includes an in-prep paper), FR-021 (the selection's `of`), FR-021a (Start from sets it), FR-027 (Whole record in the publication list's settings row), and the preset table (1page, 2page publications count the record) — as the current contract, not a changelog
- [ ] T018 Delete specs/001-tally-whole-record/ and .specify/feature.json

## Dependencies & execution order

- Phase 2 (T001–T004) blocks both stories; T001 before T002, T003 before T004.
- US1 (T005–T007) needs only Phase 2.
- US2 (T008–T015) needs Phase 2; T008 before T009; T011 before T013; T012 before T014. Independent of US1 except that T015's Start from check needs T005.
- Phase 5 after both.

## Parallel opportunities

- T008 and T010 (different test files) together.
- US1 and US2 could run side by side after Phase 2; they share no file except tests/presets.test.js (US1 only).

## Implementation strategy

MVP is US1: Phase 2 then T005–T007 already makes the short CVs state the whole record. US2 then makes it a builder choice. Land both in one PR with the fold (T017–T018).
