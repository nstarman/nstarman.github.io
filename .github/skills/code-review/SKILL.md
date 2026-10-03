---
name: code-review
description: Pull request review for this repository — a JSON database in data/ that renders the website, CV PDFs, BibTeX and the profile README. Use this when reviewing a pull request here, whether it adds a data item or changes code, schema or templates.
---

`AGENTS.md` holds the conventions; this skill is how to review against them.
Read the sections of `AGENTS.md` that the diff touches before commenting.

CI already runs the schema, the `<date.start>-<id>.json` filename check, refs,
BibTeX, the build, accessibility and internal links (`npm test`). Do not
restate what those catch. Look for what they cannot: a record that is valid but
wrong, and code that passes but breaks a convention.

## First, which kind of pull request

The template (`.github/pull_request_template.md`) has two halves. A pull
request that **adds an item** should touch one file in `data/`, plus at most
`config/places.json` (a new location), `config/journals.json` (a new journal)
and `public/highlights/` (a mirrored figure). Anything else in it — a second
item, a code change — should be its own pull request: flag it.

## Adding an item

- **Identity.** An `id` never changes after merge. A renamed file is fine only
  when `date.start` changed; if the `id` half changed, flag it, since `refs`,
  `[…](item:id)` links and `/records/<id>.json` point at it.
- **Dates.** The precision must be what is known. `"2025-01-01"` where only the
  year is sourced is invented; ask where the day came from.
- **`summary` / `details` / `detailsComplete`.** Elaboration belongs in
  `details`, because `summary` renders on the one-page CV. `detailsComplete` is
  for facts kept off CVs you hand out, like a GPA.
- **`cvs` and `tier`.** Check the presets named make sense for the item, and
  that an award or grant's `tier` puts it under the right CV heading.
- **`location`** is a place, never an institution: `City, ST, Country` in the
  US and Canada, `City, Country` elsewhere, or `Online`. Flag `MIT, USA`, and
  flag `CA` used for Canada — it reads as California. A new location needs its
  coordinates in `config/places.json`; check the pin is the city, not a county.
  An `accepted` talk has no `location`.
- **Publications.**
  - Authors are `family`/`given` objects, complete and in order — never
    truncated with "et al.". Compare against the arXiv or journal listing.
  - `entryType` is the BibTeX type: `misc` for a preprint, `inproceedings` for
    a conference paper. It does not follow from `status`.
  - `bibcode` only once the paper is on ADS, and no separate ADS link.
  - `preliminaryOf` goes on the proceeding, never on the full paper.
  - A new journal needs its short name in `config/journals.json`.
- **Links.** `rel` is from the closed vocabulary. `repo` is a paper's
  repository; `code` is the software itself.
- **Highlights.** `topic` is set and `alt` describes the picture. A software
  figure is the package's own logo, mirrored with a `source` and
  `scripts/sync-software-figures.mjs` — not a hand-copied image and not its
  paper's figure. A paper added to a topic should be worked into that topic's
  introduction in `HIGHLIGHT_TOPICS` (`src/lib/data.js`), not only appended.
- **Hand-written numbers.** Star counts and citation numbers are fetched by
  scripts; flag any typed in.

## Changing code, schema or templates

- **Generated files.** No hand edits to `dist/`, the CV PDFs under `cv/`, the
  `.bib`, or the profile README.
- **Closed vocabularies.** A new `link.rel` or `type` must reach the schema and
  every renderer — website buttons, CV glyphs, README icon trail — in the same
  pull request, or it renders as nothing.
- **Schema constraints.** A new constraint needs a fixture in `schema/invalid/`
  proving it is rejected.
- **`data/` is items only.** Configuration goes in `config/`.
- **Cards.** Every card is `src/components/Card.astro` given a preset. A card
  given a class of its own for a look is a finding: the look should be a new
  preset. A new preset used on the site must be added to `SITE_PRESETS`
  (`src/lib/cards.js`).
- **`detailsComplete`** is appended after `details`, never inserted before it:
  the CV builder ticks lines by index.
- **Presets by role, not name.** The complete CV is found by `includeAll` in
  `config/presets.json`; flag code that hard-codes its name.
- **Published URLs.** `/embed/<id>/`, its query names and `/records/<id>.json`
  must not move.

## Public text

Pull request descriptions, commit messages and review comments are public. Flag
local machine paths, private file names, or quotes from private documents in
any of them; a source is named by its type, not its location.

## How to comment

- Lead with the defect and a concrete consequence: "`CA` here places the pin
  in California", not "consider the location format".
- Cite the `AGENTS.md` rule when one applies, so the fix is unambiguous.
- Mark high severity only for what renders wrong, breaks a published URL or
  an `id`, or produces invalid BibTeX. Style is low.
- If nothing is wrong, say so. Do not invent findings.
