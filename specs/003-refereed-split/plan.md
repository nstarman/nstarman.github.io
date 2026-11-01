# Implementation Plan: Refereed split in the CV's publications

**Branch**: `refereed-split` | **Date**: 2026-11-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-refereed-split/spec.md`

## Summary

Add a required `refereed` (`"journal" | "proceedings" | false`) to every
publication; let a selection (or a preset section) set `refereed: "split"` per
section; when split, the publications section's runs become journal-by-status,
then proceedings, then other, each first run carrying a heading the PDF prints,
and the tally gains a journal count. Off, the model is unchanged.

## Technical Context

**Language/Version**: JavaScript (Node, ESM), Typst for the PDF

**Primary Dependencies**: Astro/Vite (existing), Ajv schema validation (existing)

**Storage**: JSON files in `data/`, `config/presets.json`

**Testing**: vitest (`tests/cvmodel.test.js`, `tests/selection*.test.js`, `tests/schema*`)

**Target Platform**: static site + CLI (`scripts/build-cv.mjs`)

**Project Type**: data-driven static site with PDF renderer

**Performance Goals**: N/A

**Constraints**: existing selections and presets render the same model (SC-002)

**Scale/Scope**: 22 publications, ~6 source files

## Constitution Check

| Article | Status | Note |
|---|---|---|
| I. One source of truth | PASS | The fact lives once, on the item; CV and tally read it. |
| II. One item, one file | PASS | One field added to existing files; no new items. |
| III. Identity is permanent | PASS | No id changes. |
| IV. Closed vocabularies change only through the schema | PASS | `refereed` is a closed enum added in `schema/item.schema.json`. |
| V. Data is honest | PASS | Values set from the maintainer's own knowledge (workshop paper was peer-reviewed; report was not). |
| VI. Publications produce valid BibTeX matching ADS/SciX, but for the key | PASS | `refereed` is not emitted to BibTeX; `test:bibtex` unchanged. |
| VII. Renderers read; they do not decide | PASS | The runs and their headings are built in `cvmodel.js`; `cv.typ` only prints a heading it is given. |
| VIII. Failures are loud | PASS | Missing or invalid `refereed` fails schema validation. |
| IX. Gates are mandatory | PASS | Tests added for the runs, the tally count and selection round-trip. |
| X. Specs describe the system as it is | PASS | Folded into data-model, cv-presets and renderers specs; folder deleted in the last push. |

## Design

- `schema/item.schema.json`: `refereed` in the publication branch, `enum: ["journal", "proceedings", false]`, required.
- `data/*.json`: set on all 22 publications.
- `src/lib/selection.js`: `refereed` map, cleaned to `{ id: "split" }`, in `encode`/`decode`.
- `src/lib/selectionmodel.js`: passes `sel.refereed` on.
- `src/lib/presets.js` `resolve`: section `refereed` = builder's ?? preset section's ?? null; `tally(…, { refereed })` adds `journal` only when split.
- `src/lib/cvmodel.js`: `groups` — split: journal items through `groupsOf` (status), first run gets `heading: "Refereed Journal Articles"`, then `{ label/heading: "Refereed Proceedings" }`, `{ "Other" }`, empty dropped. Not split: unchanged (no `heading` key).
- `cv/cv.typ`: print `g.heading` as a sub-heading when present; tally words add "N in refereed journals" when `t.journal` present.
- Builder: `CvFmtRow.astro` checkbox `data-refereed-of` in the tally's row (publication lists); `cv.astro` reads/sets it, retires compiled PDF on change, presets' defaults via `preset(n)`.

## Project Structure

```text
data/                  # refereed on each publication
schema/                # item.schema.json
src/lib/               # presets.js, cvmodel.js, selection.js, selectionmodel.js
src/components/        # CvFmtRow.astro
src/pages/             # webdev/cv.astro
cv/                    # cv.typ
tests/                 # cvmodel, selection tests
specs/<area>/spec.md   # data-model, cv-presets, renderers
```

**Structure Decision**: existing layout; no new modules.

## Complexity Tracking

None.
