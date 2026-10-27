# Implementation Plan: A paper count that counts the whole record

**Branch**: `001-tally-whole-record` | **Date**: 2026-10-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-tally-whole-record/spec.md`

## Summary

Let a publication list's `tally` take `of: "record"`, counting every published and submitted paper
in the data instead of the list's own; make every count leave in-prep papers out; turn it on for the
1-page and 2-page presets; and give the builder a **Whole record** box beside Tally, with a matching
preview, saved in the selection without a version change (research.md R1–R5). Give the count a
place, as the student key has (`place["publications.tally"]`: below, right, title), and a short form
(`tally.form: "short"`); set both on the 1-page and 2-page presets so the 2-page CV keeps two pages
(R6–R7).

## Technical Context

**Language/Version**: JavaScript (ES modules, Node as in CI), Typst

**Primary Dependencies**: Astro, vitest, typst / typst.ts

**Storage**: `config/presets.json`; saved selections

**Testing**: `npm test`; `tests/presets.test.js` ("tally"), `tests/selection.test.js`,
`tests/builder-placement.test.js`, `tests/selectionmodel.test.js`

**Target Platform**: static site, the builder, `npm run build:cv`, the four CV PDFs

**Project Type**: data-driven static site with renderers

**Performance Goals**: N/A

**Constraints**: the one- and two-page CVs keep their page counts; files saved before read as before

**Scale/Scope**: one function, two option keys, one place key, two preset entries, three builder
controls, `cv.typ`'s count line

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Status | Note |
|---|---|---|
| I. One source of truth | PASS | Counted from the data at build time; nothing hand-typed. |
| II. One item, one file | N/A | No item changes. |
| III. Identity is permanent | N/A | No id, URL or key changes. |
| IV. Closed vocabularies change only through the schema | N/A | `tally` is preset configuration, not an item vocabulary; its accepted shapes are documented in cv-presets FR-025 and enforced by `decode()`. |
| V. Data is honest | PASS | The record's numbers come from the records; in-prep work is not counted as a paper, per the owner's ruling. |
| VI. BibTeX matching ADS/SciX | N/A | No publication or BibTeX change. |
| VII. Renderers read; they do not decide | PASS | What to count, its form and its place are the preset's or the selection's; `cv.typ` prints the numbers it is given where `place` says. |
| VIII. Failures are loud | PASS | An unknown `of` is dropped by `decode()` to the list count, as an unknown h-index is today; nothing renders as nothing. |
| IX. Gates are mandatory | PASS | `tally()`'s in-prep rule, the record count and the selection's `of` each get a test; `npm test` and the page counts must pass. |
| X. Specs describe the system as it is | PASS | On landing, cv-presets FR-025, FR-021, FR-021a, FR-027 and the preset table are rewritten; the folder is deleted. |

Post-design re-check: unchanged.

## Project Structure

### Documentation (this feature)

```text
specs/001-tally-whole-record/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/tally.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
config/presets.json          # 1page, 2page publications: "tally": { "of": "record" }
src/lib/presets.js           # tally(): no in-prep, carries `form`; resolve(): `of: "record"` counts the record
cv/cv.typ                    # tallyline(): short form; placed by `place["<id>.tally"]`
src/lib/selection.js         # cleanTally keeps `of: "record"`
src/components/CvFmtRow.astro  # the Whole record box; the Short box; the count's Place
src/pages/webdev/cv.astro    # currentTally/setTally/syncLegends; page data `record`, PUBS `prep`
tests/presets.test.js, selection.test.js, builder-placement.test.js
specs/cv-presets/spec.md
```

**Structure Decision**: no new modules; the rule stays in `tally()`.

## Complexity Tracking

No violations.
