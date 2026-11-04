# Feature Specification: Card images from the command line

**Feature Branch**: `claude/card-cli-690987`

**Created**: 2026-11-04

**Status**: Draft

**Folds into**: specs/cards/spec.md — the Card Builder's downloads (FR-006); its command-line
conventions follow `build:cv`'s in specs/renderers/spec.md (FR-028)

**Input**: User description: "A command-line exporter for cards: `npm run build:card -- <id> [<card name | SITE_PRESETS key>] [--theme light|dark] [--width N] [out.svg|.png|.pdf]` writes the same SVG, PNG or PDF that the Card Builder (/webdev/card/) downloads for that item and name, without anyone opening a browser — for any item with an embed page (publication, synthesis, package), not only the software cards cardlayout.js draws. Left out, the name is the item's default card (defaultSlug) and the theme light; the format is the output's extension (default `<id>--<name>-<theme>.png` as cardexport.js `file` names it). A card that fills its width needs --width. A name parseName cannot read, an unknown id, or an unknown extension fails loudly. Folds into specs/cards/spec.md (FR-006, the builder's downloads), and follows build:cv's CLI conventions in specs/renderers/spec.md (FR-028). Motivation: the owner wants paper cards from the site for slides (e.g. macro-lightning's default card, light theme) and today must open the builder by hand."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A paper's card for a slide (Priority: P1)

The owner is writing a talk and wants a paper's card, as the website draws it, as an image
file to put on a slide. They run one command naming the paper and get the file the Card
Builder would have downloaded, without opening the builder.

**Why this priority**: It is the reason for the feature: today the card can only be had by
opening `/webdev/card/` and clicking Download.

**Independent Test**: Run the command for `macro-lightning` with no name and no theme; a PNG
of its default card in the light theme is written, and is the same image the builder
downloads for that card.

**Acceptance Scenarios**:

1. **Given** the paper `macro-lightning`, **When** the command is run with only its id,
   **Then** a PNG of its default card, light theme, is written under the builder's own file
   name for it, and the command prints the path and size.
2. **Given** the same paper, **When** the output is named `card.svg` or `card.pdf`, **Then**
   that format is written — the SVG with its text and links, the PDF with its text
   selectable and its links live, as the builder's downloads have them.
3. **Given** a name or a `SITE_PRESETS` key, **When** it is given after the id, **Then** that
   card is drawn instead of the default.

---

### User Story 2 - Dark, and a card that fills its width (Priority: P2)

The owner wants the dark card, or a card whose name fills its container, at a width they
choose.

**Why this priority**: Slides on a dark ground, and the website's own presets (which fill
their width), are the next most common asks.

**Independent Test**: Run it with `--theme dark`, and with a filling preset and `--width 480`.

**Acceptance Scenarios**:

1. **Given** `--theme dark`, **When** the command runs, **Then** the card is drawn in the dark
   theme and the file name says `dark`.
2. **Given** a name that fills its width and `--width 480`, **When** the command runs,
   **Then** the card is drawn 480 px wide.
3. **Given** a name that fills its width and no `--width`, **Then** the command fails with a
   message saying a width is needed, and writes nothing.

---

### Edge Cases

- An id with no embed page (not a publication, synthesis or package), or no such item: fails
  with a message naming it, nothing written.
- A name that cannot be read: fails, never drawn as a default card.
- An output extension other than `.svg`, `.png` or `.pdf`, or a theme other than `light` or
  `dark`: fails before anything is drawn.
- A figure that cannot be fetched: fails, as the builder does, rather than a card without it.
- `--width` given for a card of set width: the card's own width wins; the option is for a card
  that fills its width.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `npm run build:card -- <id> [<name | preset key>] [--theme light|dark] [--width N] [out.svg|.png|.pdf]`
  MUST write the image the Card Builder downloads for that item, name and theme — the same
  measurement of the same card, written by the same code — so the two cannot disagree.
- **FR-002**: Left out, the name MUST be the item's default card, the theme `light`, and the
  output the builder's own file name for it (`<id>--<name>-<theme>.png`) where the command
  was run; the format MUST be the output's extension.
- **FR-003**: Paths MUST be taken from where the command was run, as `build:cv`'s are.
- **FR-004**: Every failure — an unknown or non-card item, an unreadable name, a bad theme,
  extension or width, a filling card with no width, a drawing that fails — MUST exit
  non-zero with a message and leave no output file.
- **FR-005**: On success it MUST print the output path and its size in bytes, as `build:cv` does.
- **FR-006**: It MUST work for every item that has an embed page: publications, syntheses and
  packages.

### Key Entities

- **Card request**: an item id, a name (or preset key), a theme, a width where the name fills
  its width, and an output path whose extension is the format.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The owner gets a paper's card as SVG, PNG or PDF with one command and no
  browser window, in under a minute on their machine.
- **SC-002**: For `macro-lightning`'s default card in the light theme, the command's SVG is
  identical to what the builder's download writes for the same card.
- **SC-003**: Every failure listed in Edge Cases exits non-zero and leaves no file.

## Assumptions

- The machine has the project's development dependencies installed (`npm install`), including
  the headless browser the repository already uses for its card recordings; nothing new is
  installed.
- One image per run: one item, one theme. Both themes, or many items, are a loop in the shell.
- The site the card's own links point at is the website's (`https://nstarkman.space`), as in
  the builder's downloads.
- No CI job runs the command itself on every pull request; its pure parts (reading the
  arguments) are unit tested and the full draw is checked by hand and can be run on demand.

## On landing *(mandatory)*

When the feature lands, fold this spec's requirements into the area spec named
in **Folds into** — rewritten there as its current contract — and delete this
folder in the same PR (constitution, Article X).
