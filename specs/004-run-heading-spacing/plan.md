# Implementation Plan: Settable space before a refereed run's heading, and a larger heading

**Branch**: `refereed-run-heading-spacing` | **Date**: 2026-11-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-run-heading-spacing/spec.md`

## Summary

A new gap kind `run` in `cv/lib/gaps.json` (default 4pt, today's `above`),
read by `cv.typ` as `gap(<id>.run, "run")` for the space before a run heading;
a "Runs" spacing row for Publications in `CvFmtRow.astro`; the heading set at
`look.size * 1.1`, bold, `look.headcolour`.

## Technical Context

**Language/Version**: Typst (template), Astro (builder row)

**Primary Dependencies**: existing

**Storage**: selection `spacing` (free-form keys, already round-tripped by `cleanSpacing`)

**Testing**: vitest (`tests/selection.test.js`), a built PDF

**Target Platform**: CV PDF, CV builder page

**Project Type**: static site + PDF renderer

**Performance Goals**: N/A

**Constraints**: CVs without the split unchanged

**Scale/Scope**: 3 files

## Constitution Check

| Article | Status | Note |
|---|---|---|
| I. One source of truth | PASS | The default lives once, in `cv/lib/gaps.json`, read by both template and builder. |
| II. One item, one file | N/A | No data items. |
| III. Identity is permanent | N/A | No ids. |
| IV. Closed vocabularies change only through the schema | N/A | No schema vocabularies. |
| V. Data is honest | N/A | No data. |
| VI. Publications produce valid BibTeX matching ADS/SciX, but for the key | N/A | BibTeX untouched. |
| VII. Renderers read; they do not decide | PASS | The template reads the spacing it is given; the default is config. |
| VIII. Failures are loud | PASS | Unchanged: a bad spacing value is dropped by `cleanSpacing` as today. |
| IX. Gates are mandatory | PASS | A selection test holds the `.run` key through a round trip; `npm test` and the page counts run. |
| X. Specs describe the system as it is | PASS | Folded into `specs/cv-presets/spec.md`; folder deleted in the last push. |

## Project Structure

```text
cv/                    # cv.typ, lib/gaps.json
src/components/        # CvFmtRow.astro
tests/                 # selection.test.js
specs/<area>/spec.md   # cv-presets
```

**Structure Decision**: existing files only.

## Complexity Tracking

None.
