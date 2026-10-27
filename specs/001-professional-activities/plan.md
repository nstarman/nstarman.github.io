# Implementation Plan: Professional Activities — a section group, and conference and service work sorted

**Branch**: `001-professional-activities` | **Date**: 2026-10-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-professional-activities/spec.md`

## Summary

Add section groups — a heading over consecutive member sections — defined in the presets file
and switched on per CV by a builder option, **Group Professional Activities** (off by default, so
presets and the prebuilt PDFs never group). `resolve()` gathers a switched-on group's members into
the flat section list every renderer already walks, each tagged with its group. Split Conferences
into Organized and Attended, add Professional & Software Talks for presentations marked
`professional`, and rename Peer Review and Service; every preset lists them as ordinary
sections. Give `presentation` a `role`,
migrate the 17 "Role: …" detail lines, and bump the saved-selection format to v2 with a migration
in `decode()` so old selections print the same lines (research.md R1–R8).

## Technical Context

**Language/Version**: JavaScript (ES modules, Node as in CI), Typst (PDF template), JSON Schema 2020-12

**Primary Dependencies**: Astro (site), Ajv (schema), vitest (tests), typst / typst.ts (PDFs)

**Storage**: JSON in `data/`, `config/`; saved selections are files the owner keeps

**Testing**: `npm test` — the seven gates; `tests/presets.test.js`, `tests/secorder.test.js`,
`tests/selection.test.js`, `tests/cvmodel.test.js`, `tests/integrity.test.js`

**Target Platform**: static site, the builder in the browser, `npm run build:cv`, four CV PDFs

**Project Type**: data-driven static site with renderers

**Performance Goals**: N/A

**Constraints**: every preset lists the same item ids (SC-005); the one- and two-page CVs keep
their page counts (SC-006); a v1 selection prints the same detail lines (SC-004)

**Scale/Scope**: 1 group, 3 new sections, 2 renamed headings, 1 removed section; 19 items migrated;
4 renderers (PDF, `/cv/`, contents list, builder); 1 selection format version

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Status | Note |
|---|---|---|
| I. One source of truth | PASS | Changes data, presets and renderers; no rendered output edited by hand. The owner's selection is input, rewritten only by loading and re-encoding it. |
| II. One item, one file | PASS | No item split or merged; groups are configuration in `config/presets.json`, not `data/`. |
| III. Identity is permanent | PASS | No id changes. Section ids are not in the article's list, but `conferences` is retired with a migration (R7) rather than dropped, so saved selections and `/cv/#cv-conferences` readers are handled; the contents list links the new anchors. |
| IV. Closed vocabularies change only through the schema | PASS | No closed vocabulary changes (`kind` untouched). `professional` and `role` on `presentation` enter the schema with their renderers in the same PR. |
| V. Data is honest | PASS | Roles and remainders keep the record's own words; "Core Developer" is not invented away — the title already states it (R6). |
| VI. BibTeX matching ADS/SciX | N/A | No publication changes. |
| VII. Renderers read; they do not decide | PASS | Membership is in the presets file and whether to group is the selection's (`groups`); renderers draw `group` as given. |
| VIII. Failures are loud | PASS | A group naming an unknown section, or a section in two groups, throws at load; a "Role:" prefix fails a test; a selection newer than v2 is refused. |
| IX. Gates are mandatory | PASS | Each new rule gets a test (group expansion and order, selection migration, Role: prefix, professional matching); `npm test` and page counts must pass. |
| X. Specs describe the system as it is | PASS | On landing, cv-presets (groups, sections, FR-028 for presentations, selection v2), data-model (presentation fields, Role: rule) and renderers (group drawing, contents list) are rewritten; the folder is deleted. |

Post-design re-check: unchanged.

## Project Structure

### Documentation (this feature)

```text
specs/001-professional-activities/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── cv-layout.md
│   └── selection-v2.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
data/                    # 17 Role: migrations + 2 professional marks
schema/item.schema.json  # presentation: role, professional
config/presets.json      # $groups; new/renamed sections; presets list the group
src/lib/presets.js       # group expansion in resolve(); ordering by group; load-time checks
src/lib/secorder.js      # move() within a group / a group as a unit
src/lib/cvmodel.js       # passes `group`; presentation heading prints role
src/lib/selection.js     # VERSION 2; `groups`; MIGRATIONS[1] applied in decode()
src/lib/selectionmodel.js   # passes `groups` to resolve() (builder Compile and build:cv)
cv/cv.typ                # group heading + subsection()
src/components/CvView.astro, CvToc.astro, CvTimelineItem.astro
src/pages/webdev/cv.astro   # the Group Professional Activities checkbox; group controls
src/styles/cv/page.css, builder.css
tests/presets.test.js, secorder.test.js, selection.test.js, cvmodel.test.js, integrity.test.js
specs/cv-presets/spec.md, specs/data-model/spec.md, specs/renderers/spec.md, AGENTS.md
```

**Structure Decision**: no new modules; the group is a property on resolved sections, and the
selection migration a table beside `decode()`.

## Complexity Tracking

No violations.
