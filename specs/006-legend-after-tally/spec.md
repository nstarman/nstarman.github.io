# Feature Specification: The student legend on the tally's line

**Feature Branch**: `legend-after-tally`

**Created**: 2026-11-01

**Status**: Draft

**Folds into**: specs/cv-presets/spec.md — FR-025 (the count and the key's places) and FR-021a (the builder's preview)

**Input**: User description: "In the pub list, sometimes the 'Students I supervised or advised' line should be on the same line as the tally."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Run the legend on after the tally (Priority: P1)

The maintainer chooses, per publication list, to print the key to the students'
marks straight after the tally, in the same paragraph, instead of on a line of
its own — saving a line and reading as one statement.

**Why this priority**: It is the feature.

**Independent Test**: Set the Legend's place to Tally in a selection and build; the key follows the tally's last word on its line.

**Acceptance Scenarios**:

1. **Given** a list with a tally below its heading and `place["publications.legend"] = "tally"`, **When** built, **Then** the key ("Students I supervised or advised: undergraduate†, graduate‡.") follows the tally in one paragraph, aligned as the tally is.
2. **Given** the same place but no tally, or the tally up on the heading's line, **When** built, **Then** the key prints on its own line below the heading, as `below`.
3. **Given** the builder, **When** a publication list's Legend row is open, **Then** its Place has a "Tally" stop, and the preview shows the key after the tally.
4. **Given** any selection or preset without the new place, **When** built, **Then** nothing changes.

### Edge Cases

- No student in any ticked paper's byline: no key, as now; the tally alone.
- The Legend's own spacing (`<id>.legend`) does nothing while it runs on the tally; the tally's spacing applies below the paragraph.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `place["<id>.legend"]` MUST accept `tally`: the key runs on after the tally, in its paragraph and alignment.
- **FR-002**: With no tally, or the tally on the heading's line, `tally` MUST print as `below`.
- **FR-003**: The builder's Legend Place MUST offer Tally (before Title), and its preview MUST show the key after the tally line's text.
- **FR-004**: Every other place value MUST render as before.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With the place set, the Berkeley-style publication list's tally and key take one paragraph instead of two.
- **SC-002**: Every existing selection and preset builds the same PDF as before.

## Assumptions

- The key keeps its full lead-in ("Students I supervised or advised:") and its smaller grey type, as on its own line.

## On landing *(mandatory)*

When the feature lands, fold this spec's requirements into the area spec named
in **Folds into** — rewritten there as its current contract — and delete this
folder in the same PR (constitution, Article X).
