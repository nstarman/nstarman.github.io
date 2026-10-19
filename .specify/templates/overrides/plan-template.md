# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]

**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]

**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]

**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]

**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]

**Project Type**: [e.g., library/cli/web-service/mobile-app/compiler/desktop-app or NEEDS CLARIFICATION]

**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]

**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]

**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Mark every article PASS, N/A or VIOLATION, with a note; justify a VIOLATION in
Complexity Tracking.

| Article | Status | Note |
|---|---|---|
| I. One source of truth | [PASS / N/A / VIOLATION] | [why] |
| II. One item, one file | [PASS / N/A / VIOLATION] | [why] |
| III. Identity is permanent | [PASS / N/A / VIOLATION] | [why] |
| IV. Closed vocabularies change only through the schema | [PASS / N/A / VIOLATION] | [why] |
| V. Data is honest | [PASS / N/A / VIOLATION] | [why] |
| VI. Publications produce valid BibTeX matching ADS/SciX, but for the key | [PASS / N/A / VIOLATION] | [why] |
| VII. Renderers read; they do not decide | [PASS / N/A / VIOLATION] | [why] |
| VIII. Failures are loud | [PASS / N/A / VIOLATION] | [why] |
| IX. Gates are mandatory | [PASS / N/A / VIOLATION] | [why] |
| X. Specs describe the system as it is | [PASS / N/A / VIOLATION] | [why] |

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Mark the paths this feature touches, and expand them with
  real files. Delete the lines it does not touch.
-->

```text
data/                  # items, one per file: data/<date.start>-<id>.json
data/lists/            # bare enumerations
schema/                # item.schema.json, list.schema.json
config/                # presets, journals, places, and fetched snapshots
src/lib/               # loaders, the render model, card grammar, BibTeX
src/components/        # Astro components, Card.astro
src/pages/             # site pages, embeds, static endpoints
scripts/               # build, refresh and check scripts
tests/                 # vitest suites and fixtures
specs/<area>/spec.md   # the area spec this feature folds into
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
