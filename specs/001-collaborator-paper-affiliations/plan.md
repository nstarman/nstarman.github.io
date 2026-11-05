# Implementation Plan: Collaborators placed from their paper affiliations

**Branch**: `claude/collaborator-paper-affiliations` | **Date**: 2026-11-05 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-collaborator-paper-affiliations/spec.md`

## Summary

When a co-author's public ORCID record is read and lists no employment and no education, the
collaborator collector builds their history from the affiliations printed on the site's own items:
each comma/semicolon/slash-separated part of an item affiliation that is exactly an institution some
ORCID history already names becomes one `kind: "paper"` entry, dated by the items, spelled and placed
as the file already does for that institution ([research.md](research.md)). The logic is a pure
function in `scripts/lib/`, tested on fixtures; the script calls it after the ORCID pass and before
normalising.

## Technical Context

**Language/Version**: Node.js (ES modules), as the other refresh scripts

**Primary Dependencies**: none new; `scripts/lib/items.mjs` (`readItems`) for the items

**Storage**: `config/collaborators.json` (committed snapshot; shape in [data-model.md](data-model.md))

**Testing**: vitest, `tests/collaborators.test.js` (new `describe` on the pure function, fixtures
inline); existing file-level tests keep holding

**Target Platform**: the refresh workflows (`refresh-collaborators.yml`, monthly `--new`) and local runs

**Project Type**: refresh script feeding a static site

**Performance Goals**: none; one pass over the items (a few hundred) per run, no extra network calls

**Constraints**: no network in tests or build (Article VIII); nothing sent but the ORCID iD (FR-007)

**Scale/Scope**: 65 collaborators; 1 placed by this today (Sidhu)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Status | Note |
|---|---|---|
| I. One source of truth | PASS | The affiliation is read from the items that already record it; the collaborator file stays a generated snapshot, never hand-edited. |
| II. One item, one file | N/A | No item or file layout changes. |
| III. Identity is permanent | N/A | No ids, URLs or citekeys touched. |
| IV. Closed vocabularies change only through the schema | PASS | `kind` here is a field of `config/collaborators.json`, which has no schema and is not one of the item vocabularies the article lists; nothing reads it (research R5). The new value is documented in the file's `$comment` and the area spec. |
| V. Data is honest | PASS | Entries come only from printed affiliations, matched exactly to known institutions; dates at the items' own precision; marked as from a paper; no match means no entry. |
| VI. Publications produce valid BibTeX matching ADS/SciX, but for the key | N/A | BibTeX untouched. |
| VII. Renderers read; they do not decide | PASS | The decision is made in the collector; the maps read entries as before, with no change. |
| VIII. Failures are loud | PASS | The run's summary lists every collaborator still empty and why, and each unmatched affiliation; an unreadable ORCID record is logged and not silently replaced. Tests use fixtures, no network. |
| IX. Gates are mandatory | PASS | New logic gets tests (pure function, fixtures); `npm test` and CI Pass as usual. |
| X. Specs describe the system as it is | PASS | On landing, FR-011/FR-012 in `specs/refresh/spec.md` are rewritten to include the fallback and this folder is deleted in the same PR. |

No violations. Re-checked after Phase 1: unchanged.

## Project Structure

### Documentation (this feature)

```text
specs/001-collaborator-paper-affiliations/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── tasks.md             # /speckit-tasks
```

No `contracts/`: the feature exposes no interface beyond the data file, described in data-model.md.

### Source Code (repository root)

```text
scripts/
├── collect-collaborators.mjs      # calls the fallback after the ORCID pass; empty vs unreadable; $comment; summary
└── lib/paper-affiliations.mjs     # NEW: paperAffiliations(people, items, knownOrgKeys) — pure
config/collaborators.json          # regenerated (Sidhu gains one entry)
tests/collaborators.test.js        # new cases on the pure function
specs/refresh/spec.md              # FR-011, FR-012 rewritten on landing
```

**Structure Decision**: the matching, merging and dating live in one pure module so they can be
tested without ORCID; the script keeps the network and file I/O. `orgKey` moves to that module (or
is exported from it) so both use one definition.

## Complexity Tracking

No violations to justify.
