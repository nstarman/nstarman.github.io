# Feature Specification: The builder keeps the preset it started from

**Feature Branch**: `002-builder-keeps-preset`

**Created**: 2026-10-27

**Status**: Draft

**Folds into**: specs/cv-presets/spec.md — FR-020 (what Compile does), FR-021 (the selection file);
specs/renderers/spec.md — FR-028 (`build:cv` draws a selection as the builder does)

**Input**: User description: "The CV builder keeps the preset it started from, so its layout matches
that preset's PDF … a selection records the preset it started from; compiling resolves against that
preset, so Start from X then Compile with nothing changed gives the same layout as X's PDF;
selections saved before (no preset recorded) keep resolving as complete, so they print as they did."

## Background

"Start from" a preset in the CV builder ticks that preset's entries and sets the options a selection
records (spacing, places, groups, columns, …). Compile then lays the ticks out as the **complete** CV
does, whichever preset was chosen, so three things a preset sets but a selection does not record are
lost:

- **The one-page page budget** — the 1-page CV's tighter margins, leading and gaps.
- **A publication list's status groups** — the 1-page CV lists its papers in one run; the complete CV
  splits them under "Submitted" and "Published".
- **The detail level** — the short CVs print in summary (e.g. Peer Review as one run-on line); the
  complete CV in full (Peer Review as a bulleted list).

Observed 2026-10-27: Start from 1P, Compile gives two pages, while the 1-page PDF the site serves
is one; resolving the same selection as the 1-page CV gives one page. The 2-page CV lays out
differently in the builder for the same reasons, so the builder misjudges how much room is left.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start from a preset, compile, get that preset's PDF (Priority: P1)

As the CV's owner, when I start from the 1-page or 2-page preset and compile without changing
anything, I get the same PDF the site serves for that preset — same pages, same layout — so I can
judge what fits before tailoring it.

**Why this priority**: The builder exists to tailor these CVs; if its starting point does not match
the preset, every judgement about space is wrong.

**Independent Test**: Start from 1P, Compile: one page, laid out as the site's 1-page PDF. Repeat for
2P (two pages) and NP and All.

**Acceptance Scenarios**:

1. **Given** Start from 1P, **When** I compile with nothing changed, **Then** the PDF is one page and
   lays out as the site's 1-page PDF.
2. **Given** Start from 2P, **When** I compile with nothing changed, **Then** the PDF is two pages and
   lays out as the site's 2-page PDF.
3. **Given** Start from 1P, **When** I tick one more entry and compile, **Then** the PDF keeps the
   1-page CV's layout (page budget, one run of papers, summary detail) with that entry added.
4. **Given** Start from 1P, **When** I tick an entry in a section the 1-page CV does not have (an
   invited talk), **Then** it still prints, in that section.

---

### User Story 2 - A saved selection keeps its preset (Priority: P2)

As the CV's owner, when I save a selection I started from a preset and load or compile it later —
in the builder or from the command line — it lays out as that preset again.

**Why this priority**: Tailored CVs (the Hubble one) are saved files compiled from the command line;
the choice must survive saving.

**Independent Test**: Start from 1P, save, compile the file from the command line: one page, as the
builder's Compile. Load it in the builder, compile: the same.

**Acceptance Scenarios**:

1. **Given** a selection saved after Start from 1P, **When** it is compiled from the command line,
   **Then** the PDF matches the builder's Compile of it.
2. **Given** that file loaded in the builder, **When** I compile, **Then** it lays out as the 1-page CV.
3. **Given** a selection saved before this feature, **When** it is loaded or compiled, **Then** it
   lays out as the complete CV, as it did.

### Edge Cases

- Start from one preset, then another: the last one chosen is the one kept.
- Loading a saved file replaces the preset with the file's (or with the complete CV's for an older file).
- An option a selection records (spacing, places, columns, …) that the user changes after Start from
  wins over the preset's, as today.
- A file naming a preset that no longer exists lays out as the complete CV, and loading says so.
- The builder's start-up state, before any Start from, lays out as the preset it opens on.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A selection MUST record which preset it was started from.
- **FR-002**: Compiling a selection — in the builder or from the command line — MUST lay it out with
  that preset's page budget, its publication lists' grouping, and its detail level, so Start from a
  preset and Compile with nothing changed gives the same pages and layout as the site's PDF of it.
- **FR-003**: Which entries can print MUST NOT narrow to the preset's own sections: an entry ticked
  in a section the preset lacks still prints, in that section, laid out as the complete CV lays it out.
- **FR-004**: The options a selection already records MUST keep winning over the preset's, as today.
- **FR-005**: A selection with no preset recorded (every file saved before this feature), or naming
  one that no longer exists, MUST lay out as the complete CV, so it prints as it did; loading one
  naming an unknown preset MUST say so.
- **FR-006**: Start from and loading a file MUST each set the recorded preset; the last one wins.

### Key Entities

- **Selection**: what the builder saves and the command line compiles; gains the preset it was
  started from.
- **Preset**: one of the site's CVs (All, NP, 2P, 1P); besides its entries and options, it sets a
  page budget, how its publication lists group, and a detail level.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For each of the four presets, Start from it and Compile gives a PDF with the same
  number of pages as the site's PDF of it (1-page: 1, 2-page: 2).
- **SC-002**: For each preset, the PDF compiled from a selection saved straight after Start from it
  matches the site's PDF of it in content and page breaks.
- **SC-003**: Every selection saved before this feature (including the owner's Hubble selection)
  compiles to the same PDF after it as before.

## Assumptions

- No new control: the preset in use is the one Start from last set (its button already shows as
  pressed), or the loaded file's.
- The builder's "Start from" set of presets is unchanged.
- The selection's format version need not change: an absent preset reads as the complete CV.

## On landing *(mandatory)*

When the feature lands, fold this spec's requirements into the area spec named
in **Folds into** — rewritten there as its current contract — and delete this
folder in the same PR (constitution, Article X).
