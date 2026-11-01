# Feature Specification: Settable space before a refereed run's heading, and a larger heading

**Feature Branch**: `refereed-run-heading-spacing`

**Created**: 2026-11-01

**Status**: Draft

**Folds into**: specs/cv-presets/spec.md — FR-017 (the refereed split) and the spacing keys

**Input**: User description: "Allow the spacing before the subsection, e.g. Refereed Proceedings, to be set, and increase the font size."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Set the space before a run heading (Priority: P1)

In a publication list split by refereeing, the maintainer sets how much space
comes before each run heading (Refereed Journal Articles, Refereed Proceedings,
Other), as they already can below the legend and the tally, from the builder or
in the selection file.

**Why this priority**: The fixed gap does not suit every page; the maintainer cannot tune it today.

**Independent Test**: Set the space in a selection, build, and see the gap before "Refereed Proceedings" change; leave it unset and see today's gap.

**Acceptance Scenarios**:

1. **Given** a split list and `spacing["publications.run"]` set to 2×, **When** built, **Then** the space before each run heading is twice the default.
2. **Given** no such setting, **When** built, **Then** the space before a run heading is what it is today.
3. **Given** the builder, **When** the Publications settings row is open, **Then** it has a "Runs" spacing beside Legend and Tally, saved and restored with the selection.

### User Story 2 - Run headings read as headings (Priority: P1)

A run heading prints larger than the entries beneath it (about 12pt against
their 11pt), bold, in the heading colour, so it reads as a sub-heading rather
than as one more line.

**Independent Test**: Build a split list; the run heading is visibly larger than an entry's text.

**Acceptance Scenarios**:

1. **Given** a split list, **When** built, **Then** "Refereed Proceedings" is set larger than the entry text, bold, in the heading colour.

### Edge Cases

- A list that is not split prints no run headings, so the setting does nothing there and the CV is unchanged.
- The first run heading follows the legend or tally; the setting applies before it too.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The space before a run heading MUST be the spacing key `<id>.run`, of a new gap kind `run` whose default is today's gap, settable in points or as a multiple like every other spacing.
- **FR-002**: The builder MUST offer it as a "Runs" spacing row in a publication list's own settings (cv-presets FR-027), saved in and restored from the selection's `spacing`.
- **FR-003**: A run heading MUST print at about 1.1× the body size, bold, in the style's heading colour.
- **FR-004**: A CV without the refereed split MUST render exactly as before.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Setting the run spacing to 2× doubles the gap before every run heading in the built PDF.
- **SC-002**: The run heading's type is larger than the entries' in every style.
- **SC-003**: The Berkeley-style two-page split list still fits two pages at the default.

## Assumptions

- "Spacing before" means the space added before the heading, on top of the usual gap after the entry above it, as the other spacing keys add to their part.
- The space below the heading stays fixed (7pt tight, 9pt otherwise, from the fix before this).

## On landing *(mandatory)*

When the feature lands, fold this spec's requirements into the area spec named
in **Folds into** — rewritten there as its current contract — and delete this
folder in the same PR (constitution, Article X).
