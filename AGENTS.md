# AGENTS.md

How to add something to the database and open a pull request.

This repo holds one source of truth. The JSON in `data/` renders into the
website, the profile README at [nstarman/nstarman], three CV PDFs, and a BibTeX
file. Adding a conference, a paper, or a package means adding **one file** —
never editing a rendered output by hand.

[nstarman/nstarman]: https://github.com/nstarman/nstarman

---

## 1. Add one file

`data/` is **flat**. One item, one file, named for its start date and its id:

```
data/<date.start>-<id>.json

data/2025-01-stream-members-only.json     date: { "start": "2025-01" }
data/2019-5th-gaia-challenge-conference-talk.json   date: { "start": "2019" }
```

The date comes first so `ls data/` reads chronologically; use exactly the
precision `date.start` has, and do not invent a month it does not carry.
Correcting a date therefore renames the file.

The `id` *is* the identity — refs, `[…](item:id)` cross-links and the published
`/records/<id>.json` URL all point at it, and it must never change after merge.
CI checks that the filename is exactly `<date.start>-<id>.json`, so neither half
can drift from the record. There are no
per-type folders: `type` already carries that, and a flat space means an item
like a conference talk can be interpreted differently by context rather than
being pinned to one directory.

Bare enumerations — refereeing venues, review panels — are *not* one file per
item. A single string with no date, no links of its own and no presets does not
deserve a file. They live in `data/lists/<id>.json` against
`schema/list.schema.json`:

```jsonc
{
  "$schema": "../../schema/list.schema.json",
  "id": "refereeing",                 // = filename stem, and what a preset names
  "entries": [
    "Astronomy & Astrophysics",
    "JOSS — [commensurability: …](https://joss.theoj.org/papers/…)"
  ]
}
```

An entry is one line of prose and may carry `[text](url)` exactly as an item's
`details` does. A preset section renders one by naming it instead of matching:
`{ "id": "refereeing", "heading": "Journal Refereeing", "list": "refereeing" }`.

**`data/*.json` is items only.** Configuration lives outside that namespace, in
`config/` — currently `config/presets.json`, which defines the CV presets.
Putting it in `data/` would make the loader and `npm run validate` treat it as
a malformed item.

## 2. Write the item

Every item shares one envelope; `type` then adds required and optional fields.
Start from a sibling file rather than from scratch — editors pick up the schema
from the `$schema` key.

```jsonc
{
  "$schema": "../schema/item.schema.json",
  "id": "stream-members-only",        // lowercase-kebab; file is <date.start>-<id>.json, NEVER changed after merge
  "type": "publication",              // see the table below
  "cvs": ["np", "2page"],           // which CV presets include it; omit for none
  "featured": true,                   // surface on the website landing page
  "date": { "start": "2025-01" },     // YYYY | YYYY-MM | YYYY-MM-DD
  "title": "Stream Members Only: …",
  "summary": "One line. Always rendered, including in the 2-page CV.",
  "details": "Elaboration. Long CVs and website only — dropped from short presets.",
  "links": [ { "rel": "paper", "url": "https://…" } ],
  "refs":  ["trackstream"],           // other items, by bare id
  "tags":  ["streams", "machine-learning"],
  "internal": "Maintainer note. Never rendered."
}
```

### `summary` vs `details`

This replaces the old LaTeX `% SKIP` preprocessor. `summary` always renders;
`details` is dropped from the 1-page and 2-page CVs and kept in the np and
complete CVs and on
the website. Put the elaboration — thesis title, award citation, what the grant
paid for — in `details`. Publications are the exception: their one-line is
derived from `authors` and `venue`, so `summary` is usually omitted there.

### `type` and what each one adds

| `type` | also required | also accepted |
|---|---|---|
| `publication` | `authors`, `status`, `entryType` | `collaboration`, `editors`, `venue`, `abstract`, `arxiv`, `primaryClass`, `bibcode`, `doi`, `citekey`, `citations` |
| `software` | — | `repo`, `authors`, `version`, `role`, `doi` |
| `education` | `institution` | `degree`, `thesis`, `supervisors`, `location` |
| `position` | `institution` | `role`, `location` |
| `award`, `grant` | `tier` | `amount`, `declined`, `funder` |
| `presentation` | `kind` | `event`, `location` |
| `mentoring` | `student` | `institution`, `coSupervisors`, `outputs` |
| `teaching` | — | `institution`, `course`, `role` |
| `service`, `outreach` | — | `organization`, `role` |
| `media` | `outlet` | — |

`status`: `in-prep` · `submitted` · `accepted` · `published`
`kind`: `invited` · `contributed` · `poster` · `seminar` · `organizer` · `attended`
`tier`: `major` · `minor`

**`tier`** exists because the CV separates *Major Fellowships & Awards* and
*Major Grants* from *Small Grants* and *Travel Awards*. `type` × `tier` gives
those four buckets, and `config/presets.json` maps each to a heading.

**`presentation`** covers everything that used to be split across "Invited
Talks", "Selected Presentations" and "Conferences & Workshops" — `kind` carries
the distinction, including `attended` for a meeting where you presented nothing.

### `location` — a place, never an institution

`location` is what the conference map pins, so it has one format:

```
City, ST, Country      US and Canada — "Cleveland, OH, USA", "Toronto, ON, Canada"
City, Country          everywhere else — "Lausanne, Switzerland"
Online                 a meeting with no venue
```

Not `MIT, USA` — that is an institution, and a geocoder cannot place it. Not
`TO, CA` either: `CA` reads as California, which is the failure this format
exists to prevent, and it puts the pin 3,500 km from Toronto without ever
looking wrong.

After adding one, resolve its coordinates once and commit them:

```bash
node scripts/geocode-places.mjs           # fills in only what is missing
node scripts/geocode-places.mjs --check   # exit 1 if anything is unplaced
```

Coordinates live in `config/places.json` so the site and CI never call a
geocoder. The script skips anything not in the format above, and checks the
`matched` string it wrote — Nominatim answers "Durham, UK" with the county, not
the city. Correct a wrong pin by hand; the script never overwrites one.

A talk whose location is missing or unsettled is not dropped — it is listed
under the map as not placed. That is deliberate, so a missing coordinate is
visible rather than silent.

### Publications must produce valid BibTeX

The renderer emits a `.bib` file, so publication entries carry everything a
correct entry needs. Two rules matter:

- **Authors are structured, never display strings.** Write
  `{"family": "Starkman", "given": "Nathaniel", "me": true}` — not
  `{"name": "N. Starkman"}`, which is rejected. From the split the renderer
  produces both `Starkman, Nathaniel` for BibTeX and `N. Starkman` for the site.
  Use `{"literal": "…"}` only for a non-person byline. `suffix` holds Jr./III so
  sorting stays correct.
- **List every author, in order.** Never pre-truncate with "et al." — renderers
  truncate per preset, and a truncated list makes the BibTeX wrong. For a
  collaboration paper with hundreds of authors, set `collaboration` to the
  byline and list the named authors.

`entryType` is the BibTeX type and is **not** derivable from `status` — a
published conference paper is `inproceedings`, a preprint is `misc`. `venue`
uses BibTeX-native names (`journal`, `booktitle`, `publisher`, `school`,
`series`, `volume`, `number`, `pages`, `address`) so the mapping is direct.
`citekey` defaults to `id`; set it only to preserve a key already cited
elsewhere.

`bibcode` is the 19-character ADS identifier, e.g. `2022ApJ...935..167A`. The
ADS URL derives from it, so **do not add a separate link for ADS**. Omit it
until the paper is actually on ADS. `arxiv` is the bare number
(`2606.21774`), with `primaryClass` like `astro-ph.GA`.

### `links` — a closed vocabulary

`rel` must be one of:

```
paper  preprint  doi  repo  code  docs  data  slides  event  homepage
```

Closed on purpose: it drives the README icon trail, the website buttons, and
the CV glyphs from one definition. Needing a new value is a schema change, not
a data change — edit `schema/item.schema.json` and every renderer in the same
PR, or it renders as nothing.

`repo` is the *paper's* repository; `code` is the software itself.

### Dates

`{ "start": "2024", "present": true }` renders "2024 –".
`{ "start": "2018", "end": "2024" }` renders "2018 – 2024".
Setting both `end` and `present` is rejected. Use the coarsest precision you
actually know — `"2025"` is honest; an invented `"2025-01-01"` is not.

### `refs`

Items point at each other by bare id. A media entry references the paper it
covered; a talk references the paper it presented. This replaces the LaTeX
`\hyperref` labels.

## 3. Validate before pushing

```bash
npm install          # once
npm run validate     # every data file against the schema — the quick one
npm test             # everything CI runs, below
```

`npm test` is six gates, and CI runs all of them on **every** pull request
whatever it touched:

| | |
|---|---|
| `test:unit` | the loader, preset resolution, the render model, BibTeX escaping |
| `test:schema` | the schema, `<date.start>-<id>.json` filenames, refs, cross-links, and the bad fixtures still being rejected |
| `test:bibtex` | one entry per publication, braces balanced, maths in abstracts intact |
| `build` | the site compiles |
| `test:a11y` | every heading and link has an accessible name |
| `test:links` | every internal href, anchor and asset in `dist/` resolves |

CI additionally compiles the four CV PDFs and asserts the one-page CV is one
page and the two-page CV is two. An invalid item fails the check rather than
silently vanishing from a render — the failure this whole setup exists to
prevent.

Every pull request also gets a live preview URL, posted as a comment.

One check is required to merge: **CI Pass**, which is green only when every
other job in `ci.yml` is. A job that fails to trigger at all therefore blocks
the pull request instead of leaving it green with nothing run.

## 4. Open the PR

- Branch `add/<id>`, e.g. `add/eas-2026-s10`.
- **One item per PR.** They then never conflict and each is reviewable at a glance.
- Fill in the pull request template.
- Title: `Add <type>: <title>`.
- Milestone: **♾️&➡** by default, for pull requests and issues alike.
  It is the standing milestone for this repo rather than a release marker, so
  assign it unless something more specific applies:

  ```bash
  gh pr edit <number> --milestone "♾️&➡"
  gh issue edit <number> --milestone "♾️&➡"
  ```

  Copy the title exactly — it is `U+267E U+FE0F & U+27A1`, and an emoji that
  merely looks the same will not match.

## Do not

- **Do not** edit `README.md` in [nstarman/nstarman] by hand — it is generated.
- **Do not** edit the built PDFs under `cv/`, the generated `.bib`, or `dist/`.
- **Do not** put two items in one file.
- **Do not** change an `id` after merge — `refs` elsewhere point at it.
- **Do not** invent a `link.rel` value, or add an ADS link instead of `bibcode`.
- **Do not** write an author as a display string, or truncate an author list.
- **Do not** hand-write star counts or citation numbers that a script fetches.

## Why it is shaped this way

Three artefacts used to restate the same facts — a 1119-line LaTeX CV, the
profile README, and a Jekyll site — and they drifted. The site sat unchanged for
over a year while the CV gained new submissions. The old CV even tried to solve
this, with a Python script stripping `% SKIP: (*)` markers out of the `.tex` and
then injecting `\vspace{-10pt}` to repair the layout.

The idea was right; the mechanism was fragile. Here the selection lives in data
(`cvs`, `summary`/`details`, `tier`) and the renderers read it. Adding a conference is
one small file, and it appears everywhere at once.
