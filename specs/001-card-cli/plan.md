# Implementation Plan: Card images from the command line

**Branch**: `claude/card-cli-690987` | **Date**: 2026-11-04 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-card-cli/spec.md`

## Summary

`npm run build:card -- <id> [<name | preset key>] [--theme light|dark] [--width N] [out.svg|.png|.pdf]`
writes the Card Builder's own download for that card. It starts the site's dev server in-process
(Astro's `dev()`), opens a headless Chromium (Playwright, already a devDependency) on the item's
embed page, puts the card in an iframe as the builder's preview does, and calls the builder's
`downloadCard` (`src/lib/cardbuilder/download.js`) unchanged; the browser's download is saved to the
output path. No layout, measurement or drawing code is added. See [research.md](research.md) for why
this over extending `cardlayout.js`.

## Technical Context

**Language/Version**: Node ≥ 22, ES modules (as the rest of `scripts/`)

**Primary Dependencies**: `astro` (its programmatic `dev()`), `playwright` (Chromium) — both already
installed; nothing new

**Storage**: N/A — writes one file

**Testing**: vitest — `tests/cardcli.test.js` for the argument reader; the full draw by the quickstart

**Target Platform**: the owner's machine (macOS) and any CI runner with Playwright's Chromium

**Project Type**: CLI script in `scripts/`

**Performance Goals**: one card in well under a minute (spike: ~8 s for SVG, PNG and PDF together)

**Constraints**: same bytes as the builder's download; no network beyond localhost (Article VIII)

**Scale/Scope**: one item, one theme, one file per run

## Constitution Check

| Article | Status | Note |
|---|---|---|
| I. One source of truth | PASS | The image is rendered from `data/` by the site's own code; nothing is committed or hand-edited. |
| II. One item, one file | N/A | No data changes. |
| III. Identity is permanent | PASS | Reads `/embed/<id>/` and the item id; changes neither. File names are `cardexport.js`'s `file`, unchanged. |
| IV. Closed vocabularies change only through the schema | N/A | No vocabulary touched. |
| V. Data is honest | N/A | Reads data; writes none. |
| VI. Publications produce valid BibTeX matching ADS/SciX, but for the key | N/A | No BibTeX. |
| VII. Renderers read; they do not decide | PASS | `cardFace` stays the one interpreter; the CSS lays the card out and `measureCard`/`cardsvg`/`card.typ` draw it, through `downloadCard` itself. Option (a), extending `cardlayout.js` to publication presets, would be a *third* implementation of the card CSS for figures, authors, venue and buttons — rejected. |
| VIII. Failures are loud | PASS | Unknown id, non-card item, unreadable name, bad theme/extension/width, a filling card with no width, or a failed draw exits non-zero with a message and no file. Only localhost is contacted; no build or test calls a network service. |
| IX. Gates are mandatory | PASS | The argument reader (non-trivial logic) has a unit test in `npm test`; the draw is the builder's, already covered by `tests/cardbuilder.test.js` and the browser. |
| X. Specs describe the system as it is | PASS | Folded into `specs/cards/spec.md` (FR-006 and the reference prose) and cross-referenced from `specs/renderers/spec.md` FR-028's conventions; this folder and `.specify/feature.json` deleted in the last push. |

## Project Structure

### Documentation (this feature)

```text
specs/001-card-cli/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/cli.md
└── tasks.md
```

### Source Code (repository root)

```text
scripts/build-card.mjs        # new: the command
scripts/lib/cardargs.mjs      # new: reads argv → request (pure, tested)
tests/cardcli.test.js         # new
package.json                  # "build:card" script
AGENTS.md                     # documents the command (section 3, beside build:cv)
specs/cards/spec.md           # FR-006 and the builder prose gain the command
```

**Structure Decision**: one script plus one pure helper module in `scripts/lib/`, as `build-cv.mjs`
and `scripts/lib/*.mjs` are laid out. The browser side is the existing builder module, imported
through Vite by URL as `scripts/record-card-layouts.mjs` already does.

## Complexity Tracking

None — no violations.
