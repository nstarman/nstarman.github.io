# Implementation Plan: The student legend on the tally's line

**Branch**: `legend-after-tally` | **Date**: 2026-11-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/006-legend-after-tally/spec.md`

## Summary

`cv.typ`: in the body, a Legend place `tally` with a tally below its heading
passes `legend: "tally"` to `publications()`, which appends `studentkey()` to
the tally line and skips the key's own block; otherwise `tally` falls back to
`below`. Builder: a "Tally" stop on the Legend's Place (before Title), the
stop count from the visible stops, and the preview appending the key to the
tally line.

## Technical Context

**Language/Version**: Typst, Astro/JS

**Primary Dependencies**: existing

**Storage**: selection `place` (free-form names, already round-tripped)

**Testing**: vitest (`tests/builder-placement.test.js` or a selection test), built PDFs

**Target Platform**: CV PDF, CV builder

**Project Type**: static site + PDF renderer

**Performance Goals**: N/A

**Constraints**: other place values unchanged

**Scale/Scope**: 3 files

## Constitution Check

| Article | Status | Note |
|---|---|---|
| I. One source of truth | PASS | The key's words stay in `studentkey()`; the preview mirrors them as it already does. |
| II. One item, one file | N/A | No data items. |
| III. Identity is permanent | N/A | No ids. |
| IV. Closed vocabularies change only through the schema | N/A | Place names are the template's, not a schema vocabulary. |
| V. Data is honest | N/A | No data. |
| VI. Publications produce valid BibTeX matching ADS/SciX, but for the key | N/A | BibTeX untouched. |
| VII. Renderers read; they do not decide | PASS | The template draws the place the selection names. |
| VIII. Failures are loud | PASS | An unknown place falls back as before. |
| IX. Gates are mandatory | PASS | A test holds the Tally stop in the Legend's Place; `npm test` and page counts. |
| X. Specs describe the system as it is | PASS | Folded into cv-presets FR-025/FR-021a; folder deleted in the last push. |

## Project Structure

```text
cv/                    # cv.typ
src/components/        # CvFmtRow.astro
src/pages/             # webdev/cv.astro
tests/                 # a builder test
specs/<area>/spec.md   # cv-presets
```

**Structure Decision**: existing files only.

## Complexity Tracking

None.
