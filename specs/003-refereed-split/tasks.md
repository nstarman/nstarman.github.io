# Tasks: Refereed split in the CV's publications

**Input**: specs/003-refereed-split/ (plan.md, spec.md, data-model.md, contracts/, quickstart.md)

## Phase 1: Setup

None — existing project.

## Phase 2: Foundational

- [x] T001 Add `refereed` to the publication branch of schema/item.schema.json: `enum: ["journal", "proceedings", false]`, required

## Phase 3: User Story 1 — every publication says how it was refereed (P1)

**Independent test**: `npm run validate`; a fixture without `refereed` is rejected.

- [x] T002 [US1] Set `refereed` on all 22 publications in data/*.json: `"proceedings"` for pinns-neurips, `false` for data-infrastructure-report, `"journal"` for the rest
- [x] T003 [US1] Check the bad-fixture tests still reject (tests/fixtures) and the schema test passes

## Phase 4: User Story 2 — a CV splits its publications (P1)

**Independent test**: a selection with `refereed: { publications: "split" }` builds a PDF with the three headings; without it the `--model` output matches main.

- [x] T004 [US2] `refereed` in encode/decode, cleaned to `{ id: "split" }`, in src/lib/selection.js; pass it on in src/lib/selectionmodel.js
- [x] T005 [US2] src/lib/presets.js `resolve`: section `refereed` (builder's ?? preset section's ?? null); `tally(…, { refereed })` adds `journal` only when split
- [x] T006 [US2] src/lib/cvmodel.js: split runs — journal by status, first with `heading: "Refereed Journal Articles"`; then "Refereed Proceedings"; then "Other"; empty dropped; unsplit unchanged
- [x] T007 [US2] cv/cv.typ: print a run's `heading`; tally words with "N in refereed journals" when `journal` present
- [x] T008 [US2] Tests in tests/cvmodel.test.js (runs, headings, unsplit unchanged, tally) and tests/selection.test.js (round-trip, junk dropped)

## Phase 5: User Story 3 — the builder offers the split (P2)

- [x] T009 [US3] Checkbox `data-refereed-of` beside the Tally in src/components/CvFmtRow.astro; read/set/preset defaults and compile-again retire in src/pages/webdev/cv.astro

## Phase 6: Polish

- [x] T010 Fold into specs/data-model/spec.md, specs/cv-presets/spec.md, specs/renderers/spec.md; delete specs/003-refereed-split and .specify/feature.json
- [x] T011 `npm test`; sample PDF built with the split

## Dependencies

T001 → T002 → T003; T004–T007 after T001; T008 after T004–T007; T009 after T004; T010–T011 last.
