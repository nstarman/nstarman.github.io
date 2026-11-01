# Feature Specification: Refereed split in the CV's publications

**Feature Branch**: `refereed-split`

**Created**: 2026-11-01

**Status**: Draft

**Folds into**: specs/data-model/spec.md (the field), specs/cv-presets/spec.md (the option, the runs, the tally), specs/renderers/spec.md (the PDF's run headings)

**Input**: User description: "Refereed vs non-refereed publications in the CV. Every publication says how it was refereed; a selection opts a publications section into a split; existing selections render as before."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Every publication says how it was refereed (Priority: P1)

The maintainer records, once per paper, whether it is (or is under review as) a
refereed journal article, a refereed proceedings or workshop paper, or not
refereed at all. Today nothing records it, so a reader asked for "papers
accepted or submitted to refereed journals" cannot be answered from the data.

**Why this priority**: Everything else reads this fact.

**Independent Test**: Validate the data; a publication without the fact, or
with a value outside the three, fails.

**Acceptance Scenarios**:

1. **Given** a publication without `refereed`, **When** the data is validated, **Then** it fails.
2. **Given** the current data, **When** validated, **Then** `pinns-neurips` is `"proceedings"`, `data-infrastructure-report` is `false`, and every other publication (including the submitted `galactic-amnesia` and the in-prep papers) is `"journal"`.

---

### User Story 2 - A CV splits its publications by how they were refereed (Priority: P1)

A selection file opts a publications section into the split. That section then
prints up to three sub-headed runs, in order: **Refereed Journal Articles**
(keeping its status runs In Preparation, Submitted, Accepted, Published, as
now), **Refereed Proceedings**, **Other**. A run with no entries is not
printed. The tally, where the section has one, says how many of its papers are
in refereed journals.

**Why this priority**: It is the feature.

**Independent Test**: Build a CV from a selection with the split on and see the
run headings; build it with the split off and get the same PDF as before.

**Acceptance Scenarios**:

1. **Given** a selection with the split on for Publications, **When** the CV is built, **Then** the section prints "Refereed Journal Articles", "Refereed Proceedings" and "Other" headings over the right papers, numbering continuing across them.
2. **Given** any selection or preset without the split, **When** built, **Then** the output is unchanged from today.
3. **Given** the split on and a tally, **When** built, **Then** the tally reads e.g. "12 papers (10 in refereed journals, 3 submitted)".

---

### User Story 3 - The builder offers the split (Priority: P2)

On the CV builder page, a publication list's own settings row has a "Split by
refereeing" switch, saved in the selection and restored on load.

**Why this priority**: Selections are made in the builder; a setting it drops on save would be lost.

**Independent Test**: Tick it, save, reload the file: still ticked; compile: the runs print.

**Acceptance Scenarios**:

1. **Given** a saved selection with the split, **When** loaded in the builder and saved again, **Then** the split survives.

### Edge Cases

- A preset section in `config/presets.json` may also turn the split on; the selection's own say wins.
- Only one kind present among the picked papers: only that run prints, still under its heading.
- An in-prep paper counts in no tally, as now, whatever its `refereed`.
- An unknown split value in a selection is dropped on decode (the split stays off).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every publication MUST carry `refereed`: `"journal"`, `"proceedings"` or `false`; tests reject a missing or other value.
- **FR-002**: A selection (starkman-cv-selection v2) MUST accept `refereed: { "<sectionId>": "split" }`; decode keeps only `"split"` and encode writes it back.
- **FR-003**: A preset section MAY set `"refereed": "split"`; the selection's value for that section wins over the preset's.
- **FR-004**: With the split on, the section's runs MUST be: journal papers (by status, as `groupBy: "status"` orders them), then proceedings, then not refereed, each run carrying its heading; empty runs dropped. Without it, runs are exactly as today and carry no heading.
- **FR-005**: The PDF MUST print a run's heading when it has one, and nothing new otherwise.
- **FR-006**: The tally MUST count `journal` papers (excluding in-prep) and, with the split on, print that count.
- **FR-007**: The builder MUST show the switch in a publication list's settings row (cv-presets FR-027) and save/restore it.

### Key Entities

- **Publication.refereed**: how the work is refereed — in a journal, in proceedings, or not.
- **Selection.refereed**: per-section split switch.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of publications carry a valid `refereed` value; validation fails on any that do not.
- **SC-002**: Every existing preset and saved selection renders byte-for-byte the same render model as before (aside from the new data field).
- **SC-003**: A sample CV built with the split shows all three headings with the papers listed in User Story 1.

## Assumptions

- In-prep papers are written for refereed journals, so they are `"journal"`; their run stays In Preparation inside the journal run.
- JOSS counts as a refereed journal.
- `galactic-amnesia` was submitted to a refereed journal (maintainer confirmed).
- `pinns-neurips` was peer-reviewed as a workshop paper (maintainer confirmed), hence `"proceedings"`.

## On landing *(mandatory)*

When the feature lands, fold this spec's requirements into the area spec named
in **Folds into** — rewritten there as its current contract — and delete this
folder in the same PR (constitution, Article X).
