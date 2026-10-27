# Implementation Plan: One meaning for `title` and `role`, one type for fellowships

**Branch**: `001-title-role-rule` | **Date**: 2026-10-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-title-role-rule/spec.md`

## Summary

Give `title` and `role` one meaning across every type (the thing's name; my part in it), add a
`fellowship` type for the seven fellowships now split between `position` and `grant`, narrow
`position` to posts, print every CV row as title, role, then host or funder, and migrate all data
in one PR. A whole-data test fails any role that repeats its title. Approach: schema first, then
the one row rule in `cvmodel.js`, the two preset matches, the three other `type` switches, then
the data, with a frozen before/after fixture proving every preset lists the same items
(research.md R1–R5).

## Technical Context

**Language/Version**: JavaScript (ES modules, Node as in CI), JSON Schema draft 2020-12

**Primary Dependencies**: Astro (site), Ajv (schema), vitest (tests), typst.ts (CV PDFs)

**Storage**: JSON files in `data/`, `config/`

**Testing**: `npm test` — the seven gates; vitest suites under `tests/`

**Target Platform**: static site (Cloudflare Pages preview, GitHub Pages) and four CV PDFs

**Project Type**: data-driven static site with renderers

**Performance Goals**: N/A

**Constraints**: ids, filenames and detail-line indices unchanged (spec FR-008, FR-010); the
one-page and two-page CVs keep their page counts (CI)

**Scale/Scope**: 7 fellowships retyped, 15 roles moved out of titles, 1 role rewritten;
1 schema, 2 preset sections, 4 code sites, 3 test files, 3 area specs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Status | Note |
|---|---|---|
| I. One source of truth | PASS | Changes data, schema and renderers; no rendered output edited by hand. |
| II. One item, one file | PASS | Every item stays one file; no file renamed (filenames carry date and id only). |
| III. Identity is permanent | PASS | No `id`, `/records/<id>.json` URL or ref changes; the Brinson ↔ `mit-postdoc` refs stay. |
| IV. Closed vocabularies change only through the schema | PASS | `fellowship` enters the `type` enum and every renderer that switches on `type` in the same PR (research.md R1 lists them). |
| V. Data is honest | PASS | Host and funder become distinct facts (Brinson: MIT Kavli, Brinson Foundation); NSERC CGS hosts recorded as U of T, where they were held. Two role wordings are flagged for the owner's confirmation (data-model.md ⚑). |
| VI. BibTeX matching ADS/SciX | N/A | No publication changes. |
| VII. Renderers read; they do not decide | PASS | The row rule is one expression over fields; selection stays in `cvs`, `tier` and presets; `funderOff` keeps deciding whether a funder prints. |
| VIII. Failures are loud | PASS | The schema rejects `tier`/`amount`/`funder` on a position and a fellowship without `tier`; a repeated role fails a test naming the item. |
| IX. Gates are mandatory | PASS | New logic (the repetition check, the row rule, the preset match) each gets a test; `npm test` and the CV page counts must pass. This is a feature PR, not a data PR, so one-item-per-PR does not apply; the migration must land with the schema change it depends on. |
| X. Specs describe the system as it is | PASS | On landing, FR-014 and the field table in `specs/data-model/spec.md`, FR-005 in `specs/cv-presets/spec.md` and the CV-row wording in `specs/renderers/spec.md` are rewritten; `AGENTS.md` "Write the item" gains the rule; this folder is deleted. |

Post-design re-check (after data-model.md, contracts/): unchanged — all PASS or N/A.

## Project Structure

### Documentation (this feature)

```text
specs/001-title-role-rule/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── schema.md        # the schema's contract for title, role, fellowship, position
│   └── cv-row.md        # the CV row's wording, per type
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
data/                  # 23 items migrated (data-model.md)
schema/
├── item.schema.json   # fellowship type; role on award; position narrowed; one role description
└── invalid/           # position-with-tier.json, fellowship-without-tier.json
config/presets.json    # grants-major: [grant, fellowship]; positions: no `not tier`
src/lib/cvmodel.js     # subject(): one row rule (research.md R3)
src/components/CvTimelineItem.astro   # funder toggle includes fellowship
src/pages/index.astro  # Background includes fellowship
tests/
├── integrity.test.js  # role never repeats title
├── presets.test.js    # fellowship test rewritten; before/after section fixture
├── cvmodel.test.js    # row wording per type
├── placefmt.test.js   # type list
└── fixtures/sections-before.json   # every preset's section ids, frozen from main
specs/data-model/spec.md, specs/cv-presets/spec.md, specs/renderers/spec.md, AGENTS.md
```

**Structure Decision**: no new modules. The row rule stays in `subject()`; the repetition check
joins the existing whole-data rules in `tests/integrity.test.js`.

## Complexity Tracking

No violations.
