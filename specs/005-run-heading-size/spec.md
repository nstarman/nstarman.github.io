# Feature Specification: Settable size of a refereed run's heading

**Feature Branch**: `refereed-run-heading-size`

**Created**: 2026-11-01

**Status**: Draft

**Folds into**: specs/cv-presets/spec.md — FR-017 (the refereed split) and the selection's fields (FR-021)

**Input**: User description: "Use the preferences json to make the sub-title (Refereed Proceedings) a little larger text."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Set how large the run headings print (Priority: P1)

In a publication list split by refereeing, the maintainer sets how large the
run headings (Refereed Journal Articles, Refereed Proceedings, Other) print,
as a multiple of the body text, from the selection file or the builder.

**Why this priority**: The fixed 1.1× reads too close to the entries on some CVs.

**Independent Test**: Set the size to 1.3 in a selection and build; the run headings print larger than at the default.

**Acceptance Scenarios**:

1. **Given** `runSize: { "publications": 1.3 }`, **When** built, **Then** every run heading in Publications prints at 1.3× the body size.
2. **Given** no `runSize`, **When** built, **Then** the run headings print at 1.1× as now, and the CV is unchanged.
3. **Given** the builder, **When** a publication list's Runs row is open, **Then** it has a Size box beside the spacing, saved and restored with the selection.

### Edge Cases

- A value outside 0.8–2, or not a number, is dropped on load (the default applies).
- A list that is not split prints no run headings; the size does nothing there.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A selection MUST accept `runSize: { "<sectionId>": n }`, n a number from 0.8 to 2; decode keeps only such values and encode writes them back.
- **FR-002**: A run heading MUST print at n × the body size where its section has one, and at 1.1× otherwise.
- **FR-003**: The builder MUST show a Size box in a publication list's Runs row (cv-presets FR-027), read into and set from the selection.
- **FR-004**: A selection without `runSize` MUST render exactly as before.

### Key Entities

- **Selection.runSize**: section id → multiple of the body size for its run headings.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Run headings at `runSize` 1.3 measure 1.3× the body size in the built PDF.
- **SC-002**: Every existing selection builds the same model and PDF as before.

## Assumptions

- A multiple of the body size, not points, so it follows a style's type size; 1.1 is the default from the previous change.

## On landing *(mandatory)*

When the feature lands, fold this spec's requirements into the area spec named
in **Folds into** — rewritten there as its current contract — and delete this
folder in the same PR (constitution, Article X).
