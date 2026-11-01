# Tasks: The student legend on the tally's line

## Phase 1: Setup

None.

## Phase 2: Foundational

None — `place` values are free-form names already.

## Phase 3: User Story 1 — run the legend on after the tally (P1)

- [x] T001 [US1] cv/cv.typ: in the body, `legend: "tally"` when the Legend place is `tally` and a tally prints below the heading; in `publications()`, append `studentkey()` to the tally line then and skip the key's block; else `tally` acts as `below`
- [x] T002 [US1] src/components/CvFmtRow.astro: a "Tally" stop (value `tally`) in the Legend's Place only, before Title; `data-stops` 4 there
- [x] T003 [US1] src/pages/webdev/cv.astro: `syncFmt` counts visible stops; the preview appends the key's text to the tally line when the Legend's place is Tally and the tally is shown below
- [x] T004 [US1] tests: the Legend's Place offers Tally and the Tally line's does not (a builder markup test)

## Phase 4: Polish

- [x] T005 Fold into specs/cv-presets/spec.md FR-025 and FR-021a; delete specs/006-legend-after-tally and .specify/feature.json
- [x] T006 `npm test`; build the Berkeley publication list with the place set
