# Feature Specification: A paper count that counts the whole record

**Feature Branch**: `001-tally-whole-record`

**Created**: 2026-10-27

**Status**: Draft

**Folds into**: specs/cv-presets/spec.md — FR-025 (the tally), FR-021/FR-021a (the selection and the
builder's preview), FR-027 (where the option lives), and the preset reference table

**Input**: User description: "A paper-count (tally) line that counts the whole publication record on a
selected list … a tally option that counts the whole record … while the section lists only its
selection; turned on for the 1-page and 2-page presets; available in the builder too … The h-index
option is unaffected."

## Background

A publication list may open with a count line (cv-presets FR-025): "N papers (S submitted): F
first-author, T led by students I supervised", optionally with an h-index. It counts the papers
the list shows. On a list that shows everything that is the record; on a selected list it restates
the list — the 1-page CV, listing 5 papers, would say "5 papers (2 submitted): 4 first-author, 1 led
by students I supervised". So the 1-page and 2-page CVs carry no count line today (left out in #489).

The record holds 22 publications: 3 in preparation, 5 submitted, 14 published. The complete CV's
count therefore reads 22; the owner's Hubble CV, which leaves the in-prep papers unticked, reads 19.
The owner's ruling (2026-10-27): a paper in preparation is not counted.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A short CV states the whole record (Priority: P1)

As the CV's owner, my 1-page and 2-page CVs list a handful of selected papers but open the list
with the size of my whole record — how many papers, how many submitted, first-author, and led by
students I supervised.

**Why this priority**: It is the point of a count line on a selected list, and the short CVs are
where a reader most needs the number.

**Independent Test**: Build the 1-page CV: its publication list shows 5 papers and opens with
"19 papers (5 submitted): …", the same numbers as the complete CV's count.

**Acceptance Scenarios**:

1. **Given** the 1-page CV listing 5 papers, **When** it renders, **Then** its count line gives the
   whole record's numbers, not 5.
2. **Given** the 2-page CV listing 10 papers, **When** it renders, **Then** its count line gives the
   same numbers as the 1-page CV's.
3. **Given** a count line that adds an h-index, **When** it counts the whole record, **Then** the
   h-index is the same as today.

---

### User Story 2 - I choose it in the builder (Priority: P2)

As the CV's owner, when I build a CV in the builder I choose whether its count line counts the
papers I ticked or my whole record, and the compiled PDF and a saved selection keep that choice.

**Why this priority**: The builder is where tailored CVs (the Hubble one) are made; it needs the
same choice as the presets.

**Independent Test**: In the builder, tick 6 papers and the count; switch the count to the whole
record: the preview and the compiled PDF both give the whole record's numbers; save, reload — the
choice is kept.

**Acceptance Scenarios**:

1. **Given** the count on and set to "ticked papers" (today's behaviour), **When** I tick 6 papers,
   **Then** it counts 6.
2. **Given** it set to "whole record", **When** I tick 6, **Then** it counts the whole record.
3. **Given** a selection saved before this feature with the count on, **When** it is loaded,
   **Then** it counts the ticked papers, as it did.
4. **Given** "Start from" the 1-page or 2-page preset, **When** applied, **Then** the count is on
   and set to the whole record, as that preset has it.

---

### User Story 3 - The count takes no line of its own (Priority: P2)

As the CV's owner, I can set the count on the publication list's heading line, at its right — so it
reads apart from the word "Publications" — and in a short form, "19 papers (10 first-author, 5
submitted)", leaving the students to the colours and marks the key explains. The 2-page CV, which has
about two lines to spare, then keeps its two pages with the count on.

**Why this priority**: Without it the 2-page CV runs to a third page with the count on (measured:
two lines over), and the only other fixes cut an entry.

**Independent Test**: Build the 2-page CV: its Publications heading line reads, at its right, "19
papers (10 first-author, 5 submitted)" and then the student key; the PDF is two pages.

**Acceptance Scenarios**:

1. **Given** the count placed on the heading line, **When** the key is placed there too, **Then**
   both sit at the line's right, the count first.
2. **Given** the count placed on the heading line, **When** the key is below, **Then** the count
   alone sits at the line's right and the key keeps its own line.
3. **Given** the short form, **When** an h-index is asked for, **Then** it follows as it does now.
4. **Given** the builder, **When** I set the count's place and form, **Then** the preview and the
   compiled PDF agree, Save keeps them, and Start from sets them as the preset has them.

### Edge Cases

- A list that shows every paper: either setting gives the same numbers.
- A list whose ticked papers include one in preparation: it lists, and is not counted.
- A selection whose ticked papers include ones not in the record any more (a stale file): the
  whole-record count counts the record as it is now.
- The complete and NP CVs: they list every paper, so either setting gives the same numbers; their
  count stops counting in-prep papers (FR-002).
- A paper that moves from submitted to published: the next build's counts follow the data.
- The count placed on the heading line of a list printed without a heading: it takes its own line,
  as the key does there.
- A short count with no submitted papers: "N papers (F first-author)".

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A publication list's count line MUST be able to count either the papers the list
  shows (today's behaviour, the default) or the whole record.
- **FR-002**: The whole record MUST be every published and submitted publication in the data (19
  today). No count line counts a paper in preparation — not the whole record's, not a list's own
  — so the complete CV's count, which counts its 3 in-prep papers today, reads 19, not 22. An
  in-prep paper still lists where it does.
- **FR-003**: The 1-page and 2-page presets MUST open their publication lists with a count of the
  whole record.
- **FR-004**: The builder MUST offer the choice, beside the existing Tally box in the publication
  list's own settings row (a per-section option, cv-presets FR-027); its preview and the compiled
  PDF MUST give the same numbers; a saved selection MUST record the choice, and a selection saved
  before it MUST keep counting the ticked papers.
- **FR-005**: "Start from" a preset MUST set the count as that preset has it.
- **FR-006**: The count line's wording MUST be the same whichever it counts.
- **FR-007**: The h-index option MUST be unchanged by which papers the count counts.
- **FR-008**: The count line MUST have a place, as the student key does: on its own line below the
  heading (the default, today's), on its own line at the right, or on the heading's line at its
  right. On the heading's line with the key also there, the count comes first and the key's lead-in
  shortens to "Students I advised:" so both fit one line; with no heading, it takes its own line.
- **FR-009**: The count MUST have a short form, "N papers (F first-author, S submitted)", which
  leaves out the student-led number and, with no submitted papers, the ", S submitted"; the long
  form (FR-006) stays the default. An h-index follows either form.
- **FR-010**: The 1-page and 2-page presets MUST set the count on the heading's line in the short
  form; the builder MUST offer both choices in the publication list's own settings row, and a saved
  selection MUST record them, a file without them reading as the default.

### Key Entities

- **Count line (tally)**: per publication list; on or off, an optional h-index, what it counts —
  the shown papers or the whole record — its form (long or short), and its place.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The 1-page and 2-page CVs' count lines give identical numbers, equal to the whole
  record's under FR-002.
- **SC-002**: Every count line existing before this feature prints the same numbers after it,
  except that none counts an in-prep paper (the complete CV's goes from 22 to 19; a saved selection
  with in-prep papers ticked counts them no longer).
- **SC-003**: The 1-page and 2-page CVs keep their page counts with the count line added.
- **SC-004**: In the builder, switching the choice changes the preview and the compiled PDF alike.
- **SC-005**: With the count on the heading line in the short form, the 2-page CV is two pages and
  the 1-page CV one, with no entry cut.

## Assumptions

- "Whole record" is the publications in the data, not an external source (ADS, Scholar).
- The count's place and form are chosen apart from the key's; absent, a count prints where and as
  it does today.
- #489 (the short-CV curation) lands first; this feature builds on its presets.

## On landing *(mandatory)*

When the feature lands, fold this spec's requirements into the area spec named
in **Folds into** — rewritten there as its current contract — and delete this
folder in the same PR (constitution, Article X).
