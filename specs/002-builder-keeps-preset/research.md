# Research: the builder keeps the preset it started from

Code paths from `main` at the branch point.

## R1. Why the builder lays out as the complete CV

- `modelFromSelection(sel)` (`src/lib/selectionmodel.js`) — used by the builder's Compile and by
  `scripts/build-cv.mjs` — calls `cvModel('complete', sel.items, keepLine, opts)`, then overlays
  what the selection records (spacing, heading, place, card, columns, inline recipients, …).
- What the selection does not record comes from `complete`:
  - `model.preset` — `cv/cv.typ` sets `tight` (margins, leading, `lib/gaps.json`'s tight gaps)
    only when it is `1page`.
  - `model.detail` — `cv.typ`'s bare lists (Peer Review) print as one run-on line in `summary`, a
    bulleted list in `full`.
  - each section's `groups` — from the section's `groupBy`; `complete` splits publications by
    `status`, `1page` sets `groupBy: null`.
  - `model.label` — the PDF's title.
- Reproduced 2026-10-27: the builder's Start-from-1P selection compiles to 2 pages; with
  `cvModel('1page', …)` in its place, 1 page.

## R2. Why not resolve against the started preset

- **Decision**: keep resolving against `complete`; lay the result out as the started preset.
- **Rationale**:
  - The builder's line ticks index `detailLines(item, { complete: cv.includeAll })` and
    `achievementLines(item, cv.name, …)` as `complete` makes them (the complete-only lines
    included). Resolving against `1page` would shift every index after a complete-only line, so a
    saved tick would point at another line.
  - `resolve()` takes a preset's own sections only and applies its `limit`s; the builder may tick an
    entry in a section the short preset lacks (FR-003), and its ticks, not the limit, choose.
- **Alternatives**: resolve against the started preset (rejected above); record every layout setting
  in the selection (copies preset settings into files, so a preset change would not reach them —
  Article I).

## R3. What "lays out as the preset" covers

- `model.preset`, `model.label`, `model.detail` ← the started preset.
- For each section the started preset has: its `groupBy` (so the status groups) — the only
  per-section layout setting a preset sets that the selection does not record. `columns` (recorded),
  `limit` (ticks decide) and section `detail` (lines are ticked; the template does not read a
  section's `detail`) need nothing.
- A section the started preset lacks keeps `complete`'s settings.
- `model.spacing`, `card`, `place`, `heading` stay the selection's, as today (FR-004).

## R4. The field

- **Decision**: `preset`, a key of `config/presets.json`; absent means `complete`; no version bump
  (an older file means what it meant). `decode()` keeps a string; `modelFromSelection` uses it only
  when it names a preset; `loadReport` says when it does not.
- Builder: a `base` held in the page — set by Start from (to that preset) and by loading a file (to
  its `preset`, or `complete`); written by `currentSelection()`; starts as the preset the page opens on
  (`START`, `np`).
