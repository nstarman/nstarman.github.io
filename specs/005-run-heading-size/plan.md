# Implementation Plan: Settable size of a refereed run's heading

**Branch**: `refereed-run-heading-size` | **Date**: 2026-11-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-run-heading-size/spec.md`

## Summary

`runSize` (section id → 0.8–2) in the selection, cleaned in `selection.js`;
`selectionmodel.js` sets `s.runSize` on a section only where given; `cv.typ`
prints a run heading at `look.size * section.at("runSize", default: 1.1)`; a
Size box in the Runs row of `CvFmtRow.astro`, read and set in `cv.astro`.

## Technical Context

**Language/Version**: JavaScript (ESM), Typst, Astro

**Primary Dependencies**: existing

**Storage**: selection file

**Testing**: vitest (`tests/selection.test.js`, `tests/selectionmodel.test.js`)

**Target Platform**: CV PDF, CV builder

**Project Type**: static site + PDF renderer

**Performance Goals**: N/A

**Constraints**: models of selections without `runSize` unchanged

**Scale/Scope**: 5 files

## Constitution Check

| Article | Status | Note |
|---|---|---|
| I. One source of truth | PASS | The default (1.1) is in one place, the template; the selection only overrides it. |
| II. One item, one file | N/A | No data items. |
| III. Identity is permanent | N/A | No ids. |
| IV. Closed vocabularies change only through the schema | N/A | No schema vocabularies. |
| V. Data is honest | N/A | No data. |
| VI. Publications produce valid BibTeX matching ADS/SciX, but for the key | N/A | BibTeX untouched. |
| VII. Renderers read; they do not decide | PASS | The template prints the size the model carries. |
| VIII. Failures are loud | PASS | Out-of-range values are dropped on decode, as every selection field is cleaned. |
| IX. Gates are mandatory | PASS | Round-trip and model tests added; `npm test` and the page counts. |
| X. Specs describe the system as it is | PASS | Folded into `specs/cv-presets/spec.md`; folder deleted in the last push. |

## Project Structure

```text
cv/                    # cv.typ
src/lib/               # selection.js, selectionmodel.js
src/components/        # CvFmtRow.astro
src/pages/             # webdev/cv.astro
tests/                 # selection.test.js, selectionmodel.test.js
specs/<area>/spec.md   # cv-presets
```

**Structure Decision**: existing files only.

## Complexity Tracking

None.
