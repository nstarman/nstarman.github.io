# Research: a paper count that counts the whole record

Code paths from `cv/short-cv-curation` at `be8fbbb`.

## R1. Where the count is made

- `tally(pubs, { hIndex })` in `src/lib/presets.js` counts what it is given: total, submitted,
  first-author (first author `me`), student-led (first author `mentee`), and an h-index.
- `resolve()` calls it with the section's `picked` items, when the builder's `tally` (by section)
  or the section's own `tally` is set — `true` or `{ hIndex }`.
- `cv/cv.typ` `tallyline(t)` prints the numbers; it needs no change.
- The builder's preview (`syncLegends`, `src/pages/webdev/cv.astro`) counts the ticked papers from
  `PUBS` (per paper: `sub`, `first`, `led`, `stu`), and its Tally box and h-index menu
  (`CvFmtRow.astro`, the publication list's own settings row) make `currentTally()`; `setTally()`
  applies a preset's or a file's.
- `src/lib/selection.js` `cleanTally` keeps `true` or `{ hIndex }` per section.

## R2. The option's shape

- **Decision**: `tally` becomes `true | { hIndex?, of? }`, with `of: "record"` counting the whole
  record and absent counting the list. `true` and `{ hIndex }` keep their meaning, so every preset,
  saved selection and test written before reads as it did (FR-004).
- **Alternatives**: a separate section key `tallyOf` (two keys for one line, which the builder's
  overrides would have to merge); a new value `tally: "record"` (cannot also carry an h-index).

## R3. The whole record, and in-prep

- **Decision**: the record is every `publication` item whose `status` is not `in-prep` — 19 today.
  `tally()` drops in-prep papers from whatever it is given, so a list's own count never counts one
  either (FR-002). The record is the data's, not a preset's selection: the same 19 for every CV.
- **Rationale**: one rule in one function; the record's count and a full list's count agree.

## R4. The builder

- **Decision**: beside the Tally box, a checkbox **Whole record** (`data-tally-record-of`), enabled
  only while Tally is ticked; `currentTally()` adds `of: "record"`; `setTally()` sets it from a
  preset or a file. The page's data gains `record` — the whole record's numbers, computed once by
  `tally()` — and `PUBS` gains `prep` so the preview leaves in-prep papers out of a ticked count.
  The preview prints `record` when the box is ticked.
- Placement: a per-section option in the publication list's settings row (cv-presets FR-027);
  `tests/builder-placement.test.js` lists per-section options and gains it.

## R5. Presets

- `1page` and `2page`: `publications` gains `"tally": { "of": "record" }`. Page counts are guarded
  by CI; the line is one line on each.
