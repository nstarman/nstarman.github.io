# Tasks: Settable space before a refereed run's heading, and a larger heading

## Phase 1: Setup

None.

## Phase 2: Foundational

- [x] T001 Add the gap kind `run`, `{ "normal": 4, "tight": 4 }`, to cv/lib/gaps.json

## Phase 3: User Story 1 — set the space before a run heading (P1)

- [x] T002 [US1] In cv/cv.typ, the run heading's block takes `above: gap(section.id + ".run", "run")`
- [x] T003 [US1] A "Runs" spacing row (`key: ${s.id}.run`, `gap: 'run'`) after Tally in src/components/CvFmtRow.astro, and its comment
- [x] T004 [US1] tests/selection.test.js: `spacing["publications.run"]` survives a round trip

## Phase 4: User Story 2 — run headings read as headings (P1)

- [x] T005 [US2] In cv/cv.typ, the run heading at `look.size * 1.1`, bold, `look.headcolour`

## Phase 5: Polish

- [x] T006 Fold into specs/cv-presets/spec.md (FR-017, spacing keys); delete specs/004-run-heading-spacing and .specify/feature.json
- [x] T007 `npm test`; build the split publication list with and without the setting; check 2 pages

## Dependencies

T001 → T002, T003; T004 any time; T005 independent; T006–T007 last.
