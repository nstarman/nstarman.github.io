# Implementation Plan: The builder keeps the preset it started from

**Branch**: `002-builder-keeps-preset` | **Date**: 2026-10-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-builder-keeps-preset/spec.md`

## Summary

A selection gains `preset`, the preset "Start from" (or a loaded file) last set. `modelFromSelection`
still resolves the ticks against `complete` — the widest section set, and the detail-line list the
builder's ticks index — and then lays the model out as `preset` does: the model's `preset`, `label`
and `detail`, and each section's status groups as that preset has them (research.md R1–R4). The
template already keys the page budget on `cv.preset` and the bare-list style on `cv.detail`, so it does
not change. An absent or unknown `preset` lays out as `complete`, as every older file did.

## Technical Context

**Language/Version**: JavaScript (ES modules, Node as in CI), Typst

**Primary Dependencies**: Astro, vitest, typst / typst.ts

**Storage**: saved selections (`starkman-cv-selection`, version 2)

**Testing**: `npm test`; `tests/selection.test.js`, `tests/selectionmodel.test.js`

**Target Platform**: the builder (`/webdev/cv/`), `npm run build:cv`

**Project Type**: data-driven static site with renderers

**Performance Goals**: N/A

**Constraints**: older files print as they did; the builder's line ticks keep their indices

**Scale/Scope**: one selection field, one model step, the builder's Start from / load / save

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Status | Note |
|---|---|---|
| I. One source of truth | PASS | The layout comes from `config/presets.json`, read where the site's PDFs read it; the selection names a preset, it does not copy its settings. |
| II. One item, one file | N/A | No item changes. |
| III. Identity is permanent | PASS | A selection refers to a preset by its key; a key that no longer exists falls back to `complete` and loading says so (FR-005). |
| IV. Closed vocabularies change only through the schema | PASS | `preset` takes only a key of `config/presets.json`; `decode()` keeps anything else only so it can be reported, and it lays out as `complete`. |
| V. Data is honest | N/A | No data changes. |
| VI. Publications produce valid BibTeX matching ADS/SciX, but for the key | N/A | No publication or BibTeX change. |
| VII. Renderers read; they do not decide | PASS | Which layout is the selection's; `cv.typ` reads `cv.preset` and `cv.detail` as it already does for the site's PDFs. |
| VIII. Failures are loud | PASS | An unknown preset is reported by `loadReport`, not silently swapped. |
| IX. Gates are mandatory | PASS | Tests: a selection made from each preset lays out as that preset's model; an older file lays out as `complete`; `preset` round-trips and an unknown one is reported. |
| X. Specs describe the system as it is | PASS | On landing, cv-presets FR-020, FR-021 and renderers FR-028 are rewritten; the folder is deleted. |

Post-design re-check: unchanged.

## Project Structure

### Documentation (this feature)

```text
specs/002-builder-keeps-preset/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/selection-preset.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
src/lib/selection.js        # `preset` encoded, decoded, reported when unknown
src/lib/selectionmodel.js   # lay the complete-resolved model out as `preset`
src/lib/cvmodel.js          # a section's status groups from a given groupBy (if not reusable as is)
src/pages/webdev/cv.astro   # Start from / load set it; save writes it
tests/selection.test.js, tests/selectionmodel.test.js
specs/cv-presets/spec.md, specs/renderers/spec.md
```

**Structure Decision**: no new modules; the layout step lives in `modelFromSelection`, the one place
both the builder and the CLI turn a selection into a model.

## Complexity Tracking

No violations.
