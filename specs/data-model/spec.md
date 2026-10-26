# Data model

**Covers**: `data/`, `data/lists/`, `schema/item.schema.json`, `schema/list.schema.json`,
`schema/invalid/`, `src/lib/data.js` (the loader; the store is `packages/data-resolver/src/store.js`), `packages/data-resolver/src/mentees.js`,
`config/places.json`, `config/journals.json`
**Status**: Current — describes the system as it is (constitution, Article X).

## Scope

What an item is, how it is stored and named, every field the schema accepts, and
the rules the schema cannot express that tests hold instead. Not covered: how a
CV selects items (`specs/cv-presets/spec.md`), how pages and outputs draw them
(`specs/renderers/spec.md`, `specs/cards/spec.md`), and the scripts that fill
fetched fields (`specs/refresh/spec.md`).

## Requirements

### Storage and identity

- **FR-001** `data/` is flat: one item per file, named `<date.start>-<id>.json`,
  the date at exactly the precision `date.start` has. Correcting a date renames
  the file. There are no per-type folders. *Enforced:* the loader,
  `src/lib/data.js`, throws on a file named otherwise, so every test and the
  build fail.
- **FR-002** `id` matches `^[a-z0-9]+(-[a-z0-9]+)*$` and never changes after
  merge (Article III): refs, `item:` cross-links, `/records/<id>.json` and
  `/embed/<id>/` point at it. *Enforced:* the schema; review for renames.
- **FR-003** `data/*.json` holds items only, each valid against
  `schema/item.schema.json`, which rejects unknown properties
  (`unevaluatedProperties: false`). Configuration lives in `config/`.
  *Enforced:* `tests/schema.test.js` ("accepts" every `data/*.json`) and
  `npm run validate`.
- **FR-004** Every rule the schema adds has a fixture in `schema/invalid/`,
  named for the one rule it breaks, and every fixture is rejected. *Enforced:*
  `tests/schema.test.js` ("rejects").
- **FR-005** A bare enumeration — a string per entry, no date, no links of its
  own, no presets — is not an item. It lives in `data/lists/<id>.json` as
  `{ "id", "entries": [string, …] }`, its `id` the filename stem; an entry is
  one line of prose that may carry `[text](url)`. A preset section names it with
  `list`. *Enforced:* `tests/schema.test.js` against `schema/list.schema.json`;
  review for the id matching the stem.

### The envelope

- **FR-006** Every item has `id`, `type`, `date` and `title`, and may have
  `cvs`, `featured`, `shortTitle`, `nickTitle` (≤ 32 characters), `summary`,
  `details`, `detailsComplete`, `links`, `refs`, `tags` and `internal`.
  `internal` is never rendered. *Enforced:* the schema.
- **FR-007** `summary`, `details` and `detailsComplete` are three tiers, widest
  first; where each renders is `specs/cv-presets/spec.md`. `details` may be a
  string or one string per line; `detailsComplete` is appended after `details`,
  the thesis and the supervisors, so a line's index is the same with or without
  it. *Enforced:* `tests/cvmodel.test.js`.
- **FR-008** `cvs` names CV presets: `np`, `2page`, `1page`. The complete CV
  takes every item regardless. *Enforced:* the schema.
- **FR-009** A date is `{ start, end?, present? }`, each date `YYYY`, `YYYY-MM`
  or `YYYY-MM-DD` at the precision known (Article V). `end` and `present`
  together are rejected. `{ start, present: true }` renders "2024 –";
  `{ start, end }` renders "2018 – 2024". *Enforced:* the schema
  (`end-and-present.json`, `bad-date.json`); `tests/data.test.js` ("dateLabel").
- **FR-010** `links` is a list of `{ rel, url, … }` with `rel` from a closed set:
  `paper`, `preprint`, `doi`, `repo`, `code`, `docs`, `data`, `slides`, `event`,
  `homepage`. A new value is a schema change plus every renderer in one PR
  (Article IV). `repo` is a paper's repository; `code` is the software itself.
  *Enforced:* the schema (`unknown-link-rel.json`); review for the renderers.
- **FR-011** `refs` are bare ids of other items, and every one resolves. A media
  entry refs the paper it covered; a talk the paper it presented; a paper the
  packages of mine it used, its main package first, and the `grant`s that funded it
  (a paper's site lists them as its funding; nothing here changes for them); a package
  its own paper. *Enforced:* `tests/integrity.test.js` ("resolves every ref");
  `tests/research-kit.test.js` (a paper's grants).
- **FR-012** Prose fields may link another item as `[text](item:<id>)`, and every
  such target resolves. *Enforced:* `tests/integrity.test.js` ("resolves every
  [text](item:id) cross-link").

### Types

- **FR-013** `type` is one of the values in *Reference*, and each adds the fields
  listed there; a field outside its type's list is rejected. *Enforced:* the
  schema; `tests/data.test.js` ("byType … every type in the database is one the
  schema allows").
- **FR-014** `tier` (`major` · `minor`) is required on an `award` or `grant`
  and sorts it, with `type`, into a CV section: an `award` is an honour or
  prize, a `grant` is funding. A fellowship is a `position` that was awarded:
  it sets `tier` and sits with Grants & Fellowships while staying a position.
  Which `type` × `tier` pairs have a section is `specs/cv-presets/spec.md`.
  *Enforced:* the schema (`award-without-tier.json`); `tests/presets.test.js`
  ("is a position that sits with Grants & Fellowships").
- **FR-015** A `position` with `groupRoles` prints with every other role at the
  same `institution` that sets it, as one row. *Enforced:* `tests/cvmodel.test.js`.
- **FR-016** A `software` item's `group` is its area on `/software/` by purpose
  (headings, order and introductions in `SOFTWARE_GROUPS`, `src/lib/data.js`);
  its `tier` (`flagship` · `major` · `minor` · `utility`) sets its card; `order`
  places it within `major`, lower first, absent counting as 0. *Enforced:* the
  schema (`software-without-group.json`, `software-order-not-integer.json`).
- **FR-017** A `presentation`'s `kind` distinguishes invited, contributed,
  poster, seminar, organizer, `attended` (presented nothing) and `accepted`
  (accepted, never given). An `accepted` talk has no `location`. A `presentation`'s
  `talk` is the title of the talk or poster, a non-empty string without quotation marks
  (renderers add them) and with the inline links `details` allows; no other type has it.
  A note that is not a title (a role, a lecturer's post) stays in `details`, so `talk`
  is the only text a renderer quotes. *Enforced:* the schema
  (`presentation-without-kind.json`, `talk-on-non-presentation.json`, `talk-empty.json`),
  `tests/talktitle.test.js` (no title lost or doubled, a role never a title); review for
  `accepted` without `location`.

### Publications

- **FR-018** A publication carries what a correct BibTeX entry needs:
  `authors`, `status` (`in-prep` · `submitted` · `accepted` · `published`) and
  `entryType` (the BibTeX type, not derived from `status`). `venue` uses
  BibTeX's own names (`journal`, `booktitle`, `publisher`, `school`, `series`,
  `volume`, `number`, `pages`, `address`, `year`, `month`); `venue.year` and
  `venue.month` are set only where the issue's differ from `date.start`.
  *Enforced:* the schema (`missing-status.json`, `publication-without-entrytype.json`,
  `venue-month-without-year.json`); `npm run test:bibtex`.
- **FR-019** An author is `{ family, given, suffix?, me?, student?, orcid?, mentee?,
  affiliation? }`, or `{ literal }` for a non-person byline; never a display
  string. `me` is set on exactly one author. Every author is listed, in order,
  never truncated; a large collaboration sets `collaboration` and lists the
  named authors (Article V). *Enforced:* the schema (`author-name-not-split.json`);
  review for completeness and for the one `me`.
- **FR-020** `bibcode` is the 19-character ADS identifier, set once the paper is
  on ADS; the ADS link derives from it and is never written as a link. `arxiv`
  is the bare number, with `primaryClass`. *Enforced:* the schema
  (`bad-bibcode.json`); `tests/data.test.js` ("synthesises ADS from a bibcode").
- **FR-021** The citekey is derived, never written (Article VI); `citeslug`
  names its last part where it is not the `id`. *Enforced:* `tests/bibtex.test.js`,
  `tests/fixtures/citekeys.json`.
- **FR-022** A proceeding of a paper that exists in full sets `preliminaryOf` to
  that paper's id, on the proceeding only; it resolves to a publication.
  *Enforced:* `tests/integrity.test.js` ("resolves every preliminaryOf").
- **FR-023** `authorPosition` is set only where the credit differs from the
  `me` author's index; otherwise the position is derived. *Enforced:*
  `tests/data.test.js` ("authorPosition").
- **FR-024** Every `venue.journal` in `data/` has a short name in
  `config/journals.json`. *Enforced:* `tests/data.test.js` ("venueLine, short").

### Highlights

- **FR-025** A `highlight` block is `{ topic, image, alt, description, source? }`.
  `topic` is `extragalactic` · `galactic` · `cmb` · `dm-direct-detection` ·
  `software`; `image` is a path `highlights/<file>` under `public/`.
  `software` is in the schema but deliberately absent from `HIGHLIGHT_TOPICS`
  (`src/lib/data.js`), so its cards are kept and not shown (Article IV).
  *Enforced:* the schema (`highlight-without-topic.json`, `highlight-without-alt.json`).
- **FR-026** A publication or software item may carry `highlight`; a synthesis
  of several papers is its own item, `type: "highlight"`, with the papers in
  `refs`. *Enforced:* the schema (`highlight-without-refs.json`).
- **FR-027** A highlight with `source: { repo, path, sha }` has its image
  mirrored from that repository by `scripts/sync-software-figures.mjs`; `sha`
  is the blob last mirrored, required by the schema and rewritten by the script. A highlight without `source` has a hand-made image the
  script leaves alone. *Enforced:* the schema (`highlight-source-without-sha.json`).

### Mentees

- **FR-028** A `mentoring` item with `person: { family, given, level, orcid? }`
  is a mentee with a profile at `/people/<slug>/`. `slug` is required with
  `person`, and every profile field (`slug`, `photo`, `badge`, `research`,
  `journey`, `achievements`) requires `person`. `level` is `undergraduate` ·
  `graduate` · `postbac` · `postdoc` · `summer-associate`. *Enforced:* the schema
  (`mentee-slug-without-person.json`, `mentee-person-bad-level.json`);
  `tests/integrity.test.js` ("gives every mentee a slug of their own", "gives
  every mentee ORCID once").
- **FR-029** `journey` is a list of `{ organization, city?, region?, country,
  start, end?, role? }`, each `organization` a name in `config/places.json`.
  *Enforced:* `tests/integrity.test.js` ("places every journey stop").
- **FR-030** `achievements` are `{ kind, date, title, event?, location?, outlet?,
  url?, cvs? }`, `kind` `award` · `talk` · `poster` · `press` · `program`. They
  live in the mentee's record, never as items of their own; their `cvs` name
  real presets within the mentoring item's own `cvs`. *Enforced:* the schema
  (`mentee-achievement-bad-kind.json`); `tests/integrity.test.js` ("keeps an
  achievement's cvs within its mentoring item's own", "names only real presets").
- **FR-031** A paper is tied to its mentee by `mentee: "<mentoring id>"` on the
  author, which resolves to a mentoring item with a `person`; the profile finds
  its papers and their software from that. An author's `student`, where set,
  agrees with the mentee's `person.level`. *Enforced:* `tests/integrity.test.js`
  ("resolves every authors[].mentee", "agrees an author's student level");
  `tests/mentees.test.js`.

### Amounts

- **FR-034** An `amount` is `{ currency, value, valueMax?, perAnnum? }` and is shown
  by the one formatter `money()`: with its code, `USD 360,000`, `CAD 20,000–30,000
  p.a.`, unless a style is asked for. The CV builder's Currency menu asks for `us`
  (the D replaced by a sign: `US$360,000`, `CA$23,000`) or `dollar` (`$360,000`,
  `CA$23,000`); a currency with no sign keeps its code in every style. The style
  is a choice for a CV, saved in a selection as `currency`, and the builder's
  page shows its amounts in it; the website always uses codes. A figure in prose
  is written once, as the token `{amount}` in `details`, `detailsComplete` or
  `summary`, standing for the record's own `amount` in the same style; a record
  that uses the token without an `amount` fails the data tests. *Enforced:* `tests/data.test.js` ("money"), `tests/cvmodel.test.js`,
  `tests/selection.test.js`, `tests/integrity.test.js` ("has an amount behind every
  {amount}").

### Institution names

- **FR-035** An `education` or `position` record may list `institutionNames`:
  alternatives to its `institution`, longest first. In the CV builder each such
  entry's institution is a menu of its names — its own (full), the first
  alternative (shorter) or the last (shortest) — and the settings panel's
  Institution names menu sets every entry's at once. The choice is saved per
  entry (`namesFor` in a selection; absent is full) and a record with fewer
  alternatives prints the last it has. Roles are grouped by `institution`
  whichever name prints. *Enforced:* `tests/cvmodel.test.js` ("prints an
  institution as its name level asks…"), `tests/selection.test.js`, the schema.

### Places

- **FR-032** `location` is a place, never an institution: `City, ST, Country` in
  the US and Canada, `City, Country` elsewhere, or `Online`. *Enforced:* review;
  `scripts/geocode-places.mjs` skips anything else.
- **FR-033** Coordinates live in `config/places.json`, so neither the build nor
  the tests call a geocoder (Article VIII); only `scripts/geocode-places.mjs`
  does (`specs/refresh/spec.md`). A second name for the same campus is
  `{ "sameAs": "<other name>" }`, never a second copy of the coordinates.
  *Enforced:* `tests/places.test.js`; `node scripts/geocode-places.mjs --check`
  exits 1 if anything is unplaced.

## Key Entities

- **Item** — one file in `data/`; the envelope plus its type's fields.
- **List** — one file in `data/lists/`; an id and its entries.
- **Author** — structured name, flags (`me`, `student`) and links (`orcid`, `mentee`).
- **Highlight** — a picture, alt text, a few sentences and a topic, on a paper,
  package or synthesis.
- **Place** — a `config/places.json` entry: coordinates and the matched string,
  or a `sameAs`.

## Edge Cases

- **A talk with no or unplaced `location`** is listed under the map as not
  placed, never dropped (`tests/confmap.test.js`).
- **A paper not yet on ADS** has no `bibcode`; its BibTeX need only be valid.
- **An in-prep paper** sorts ahead of every dated item and carries no year
  (`tests/data.test.js`).
- **A team award** sets `recipient` so it does not read as personal.

## Reference

| `type` | required | also accepted |
|---|---|---|
| `publication` | `authors`, `status`, `entryType` | `collaboration`, `editors`, `venue`, `abstract`, `arxiv`, `primaryClass`, `bibcode`, `doi`, `citeslug`, `citations`, `authorPosition`, `preliminaryOf`, `highlight` |
| `software` | `tier`, `group` | `repo`, `authors`, `version`, `role`, `doi`, `order`, `highlight` |
| `education` | `institution` | `institutionNames`, `degree`, `thesis`, `supervisors`, `location` |
| `position` | `institution` | `institutionNames`, `role`, `location`, `groupRoles`, `tier`, `amount`, `funder` |
| `award`, `grant` | `tier` | `amount`, `declined`, `funder`, `recipient`, `recipientInline` |
| `presentation` | `kind` | `event`, `location`, `talk` |
| `mentoring` | `student` | `institution`, `coSupervisors`, `outputs`, and for a profile `person`, `slug`, `photo`, `badge`, `research`, `journey`, `achievements` |
| `teaching` | — | `institution`, `course`, `role` |
| `service`, `outreach` | — | `organization`, `role`, `kind` (`invited` · `contributed`), `location` |
| `media` | `outlet` | — |
| `highlight` | `highlight`, `refs` | — |
