# Tasks: Settable size of a refereed run's heading

## Phase 1: Setup

None.

## Phase 2: Foundational

- [x] T001 `runSize` in encode/decode of src/lib/selection.js: section id → number, kept only when 0.8 ≤ n ≤ 2

## Phase 3: User Story 1 — set how large run headings print (P1)

- [x] T002 [US1] src/lib/selectionmodel.js: set `s.runSize` on a section only where `sel.runSize[s.id]` is set
- [x] T003 [US1] cv/cv.typ: a run heading at `look.size * section.at("runSize", default: 1.1)`
- [x] T004 [US1] Size box (`name="runsize:<id>"`, 0.8–2, step 0.05, placeholder 1.1) in the Runs row of src/components/CvFmtRow.astro; read, set, retire-on-change and save in src/pages/webdev/cv.astro
- [x] T005 [US1] Tests: round trip and junk dropped in tests/selection.test.js; the model carries `runSize` only when set in tests/selectionmodel.test.js

## Phase 4: Polish

- [x] T006 Fold into specs/cv-presets/spec.md (FR-017, FR-021, FR-027); delete specs/005-run-heading-size and .specify/feature.json
- [x] T007 `npm test`; build a split list at 1.3

## Dependencies

T001 → T002 → T003; T004 after T001; T005 after T001–T002; T006–T007 last.
