# CV presets

**Covers**: `config/presets.json`, `src/lib/presets.js`, `src/lib/cvmodel.js`,
`src/lib/selection.js`, `src/lib/secorder.js`, `src/pages/webdev/cv.astro` (what
it lets a person change), the page-count check in `scripts/build-cv-pdfs.sh`
**Status**: Current — describes the system as it is (constitution, Article X).

## Scope

How a CV decides what it contains and how much each entry says: the section
definitions and presets in `config/presets.json`, their resolution into ordered
sections of items (`resolve`), the flat render model built from that
(`cvModel`), the CV Builder's controls and its saved-selection file, and the
assertion that the one- and two-page PDFs have that many pages. Not covered:
item fields, `cvs`, `tier`, `groupRoles` and `detailsComplete` as data
(`specs/data-model/spec.md`); the CV pages, `dist/cv/<preset>.json`, the Typst
template and its compilation (`specs/renderers/spec.md`); the CV's software
cards (`specs/cards/spec.md`).

## Requirements

- **FR-001** `config/presets.json` holds `$sections` (each section defined once,
  by id) and the presets. Every top-level key not starting with `$` is a preset;
  there are exactly four, `complete`, `np`, `2page`, `1page`, in that order. An
  unknown preset name throws. *Enforced:* `tests/presets.test.js` ("are the four
  the site offers", "reject a name that does not exist").
- **FR-002** A preset's `sections` list names sections in order, either as a bare
  id or as `{ "id", …overrides }`. An override replaces that key of the shared
  definition; a `null` value removes it (`"groupBy": null` on `1page`). An id not
  in `$sections` throws. *Enforced:* `tests/presets.test.js` ("gives every preset
  the one shared definition", "lets a preset override a key, and null remove one").
- **FR-003** A section's `match` is an AND over item fields; an array value means
  any of. `match.not`, the same shape, excludes an item where every field in it
  holds. *Enforced:* `tests/presets.test.js` ("a fellowship … sits with Grants &
  Fellowships, not Professional Appointments").
- **FR-004** An item appears in a curated preset only when its `cvs` names the
  preset *and* it matches a section. A preset with `includeAll: true` (only
  `complete`) ignores `cvs` and takes every item matching a section. No section
  matches `type: "highlight"`, so no CV shows one. *Enforced:*
  `tests/presets.test.js` ("takes everything for the complete CV…", "only
  includes an item whose cvs list names the preset").
- **FR-005** The award/grant buckets are `type` × `tier`: `awards-major` (award,
  major), `grants-major` (grant *or* position, major), `grants-minor` (grant,
  minor). A `position` with a `tier` (a fellowship) is excluded from `positions`
  and lands in `grants-major`. *Enforced:* `tests/presets.test.js` ("a
  fellowship").
- **FR-006** `items` arrive newest-first. `"sort": "tier"` reorders a section by
  `flagship`, `major`, `minor`, `utility`, then `order` (absent = 0), stably.
  `limit` then keeps the first N. *Enforced:* `tests/presets.test.js` ("honours a
  section limit, keeping the newest", "orders software by tier").
- **FR-007** Each resolved section carries `dropped` = (items matching the
  section, ignoring `cvs` and the builder's ticks) − (items shown).
  *Enforced:* `tests/presets.test.js` ("counts what it leaves out").
- **FR-008** A section that resolves to no items and no list entries is omitted.
  *Enforced:* `tests/presets.test.js` ("drops a section that resolves to nothing").
- **FR-009** A section with `list: "<id>"` renders the entries of
  `data/lists/<id>.json` verbatim, with layout `list`; it is selected whole under
  the key `list:<id>` (no item id has a colon). *Enforced:*
  `tests/presets.test.js` ("selects a list section whole, by its list: key").
- **FR-010** A heading gets "Select " in front only when the caller asks for it
  for that section (`prefix[id] === "select"`), the section shows fewer items
  than match it, and the heading does not already start with "Select". The
  pre-built presets never ask, so no pre-built CV says "Select"; only the CV
  Builder does. *Enforced:* `tests/presets.test.js` ("says "Select" only where
  asked, and only on a selection").
- **FR-011** `short` on a section is the name the contents list uses where short
  of room (`src/components/CvToc.astro`). *Enforced:* review.
- **FR-012** Section defaults when unset: `layout` `timeline`, `columns` 3,
  `groupBy` / `cluster` / `icon` / `page` null, `collapsed` false, `detail` the
  preset's. A preset may also set `place`, `spacing` (keyed `<id>.<part>`) and
  `recipientInline`; `resolve` passes them through. *Enforced:* review.
- **FR-013** `order` (from the builder) puts the named section ids first, in that
  order; the rest keep their preset order after them; unknown ids are ignored.
  `move(order, id, dir)` swaps one step and returns `order` unchanged at an end
  or for an id not in it. *Enforced:* `tests/presets.test.js` ("section order"),
  `tests/secorder.test.js`.
- **FR-014** `memberIds(name)` is what the preset actually renders — after
  limits — including `list:<id>` keys. *Enforced:* `tests/presets.test.js`
  ("reports what a preset renders, not what merely opted in").
- **FR-015** Detail tiers. An entry's lines are, in this order: its `details`
  lines, `Thesis: …`, `Supervisors: …`, then `detailsComplete` lines only when the
  preset is `includeAll`, then a mentee's achievements. Without the builder, the
  detail lines print only where the section's `detail` is `full`; `summary`
  (always rendered by the template) is unaffected. Achievements are gated by
  their own `cvs` (all of them on `includeAll`), not by `detail`, oldest first.
  *Enforced:* `tests/cvmodel.test.js` ("detail levels", "prints `detailsComplete`
  in the complete CV and nowhere else", "mentee achievements").
- **FR-016** The builder ticks lines by index into that one list, so
  `detailsComplete` and achievements are appended, never inserted, and an index
  means the same line whether or not they are shown. `lineTier` names an index
  `base`, `complete` or `achievement`. *Enforced:* `tests/cvmodel.test.js`
  ("appends a complete-only line last…", "keeps an achievement the builder ticks
  by its own index", "tells achievements from complete-only lines…").
- **FR-017** `groupBy` accepts only `"status"`, giving groups In Preparation,
  Submitted, Accepted, Published in that order, empty ones dropped; any other
  value throws. *Enforced:* `tests/cvmodel.test.js` ("groups by status, newest
  state first").
- **FR-018** In a section with `cluster: "institution"`, roles at one institution
  print as one row (id `group:<institution>`, titles joined by `groupTitle`, dates
  spanning them, every role's lines) when there are two or more and either every
  role sets `groupRoles` or the builder's `group[institution]` says so; the
  builder's choice wins either way. *Enforced:* `tests/cvmodel.test.js` ("merges
  roles at one institution into one row, unless kept apart", "lets the builder
  group any institution…").
- **FR-019** `cvModel` is the one model the CV pages, `dist/cv/<preset>.json` and
  the builder all use; every row has the fields `cv.typ` reads. *Enforced:*
  `tests/cvmodel.test.js` ("has the fields cv.typ reads…").
- **FR-020** The CV Builder (`/webdev/cv/`) renders the complete CV with a box on
  every entry and line, seeded from `np`. A person can: start from any preset
  (ticks its `memberIds`, its detail level, columns, place, spacing, inline
  recipients; `detailsComplete` lines start unticked unless the preset is
  `includeAll`) or from none; tick entries and individual lines; toggle "Select"
  on a partly ticked section; group or ungroup an institution's roles; reorder
  sections (buttons, or a long-hold drag); set grid columns, heading style,
  spacing, legend place, recipient-inline, PDF style and page format (the style's
  default paper, or A4); turn header-card parts off and reorder its links; leave
  a section's places out; open a publication list with its tally and an h-index
  from a source of their choosing; save and load a selection. Compile calls `cvModel('complete', ticked, keepLine, { prefix,
  order, group, location, tally })`. *Enforced:* review.
- **FR-021** A saved selection (`selection.js`, format
  `starkman-cv-selection`, version 1) records the ticked ids, kept line indices
  per id (deduplicated, sorted, empties dropped), inline recipients, style,
  spacing, headings, place, prefix, order, columns (only 2–5 and not 3), group, card (parts and
  link order), location (sections whose places are left out, `false` only), page
  format (`page`), tally (`true` or `{ hIndex }` per section), and the build's commit and dirty flag. `decode` refuses non-JSON, a non-object,
  another format, a newer version, a missing or oversized (> 5000) entry list and
  a malformed line map, each with a readable message; it drops unknown fields
  and bad values, and returns an unknown style rather than refusing. `loadReport`
  says how many entries were restored and, for missing ones, the `git checkout
  <commit>` that recovers them. *Enforced:* `tests/selection.test.js`.
- **FR-021a** In the builder, a publication list shows above its entries what
  the PDF prints there — the tally, where ticked, with its h-index, and the key
  to the students' colours and marks, where a ticked paper has a student in its
  byline — counted from the ticked entries and placed as the Legend's place says
  (below, right, or on the heading's line), updating as ticks and options change.
  *Enforced:* review.
- **FR-022** CI's "CV PDFs" step (`npm run build:pdf`, `scripts/build-cv-pdfs.sh`)
  compiles every `dist/cv/*.json`, then fails unless `starkman-cv-1page.pdf` has
  1 page and `starkman-cv-2page.pdf` has 2 (the largest `/Count` in the PDF).
  *Enforced:* `.github/workflows/ci.yml` step "CV PDFs".
- **FR-023** `card` on a preset turns parts of the PDF's header card off by name:
  `portrait`, `address`, `email`, `website`, `qr`, or a profile by its `service`;
  everything else shows. The email, the website or a profile set to `"icon"`
  shows its mark without its label, and `"text"` its label without its mark.
  `card.order` lists the email, the website and the profiles in the order they
  print, `"/"` breaking the line; absent, the email and website share a line and
  the profiles take the next. The builder's card controls set the same. *Enforced:*
  `tests/presets.test.js` ("show every part of the card…"),
  `tests/selection.test.js` ("carries the card through a round trip…").
- **FR-024** `location: false` on a preset or a section leaves its entries'
  places out of the right-hand column; a section's own `location` wins over the
  preset's, and the builder's Places box over both. An amount still prints.
  *Enforced:* `tests/presets.test.js` ("print every entry's place…",
  "lets the builder leave a section's places out…"), `tests/cvmodel.test.js`.
- **FR-025** A section may set `tally: true` to open with its publications'
  headline numbers — how many papers, how many still submitted, how many I wrote
  first and how many a student I supervised led — counted from the records, or
  `tally: { "hIndex": "ads" | "scholar" | "scholar-since" }` to add an h-index,
  said with its source, since the sources disagree: ADS's is computed from the
  records' citation counts, Google Scholar's two are read by hand into
  `config/person.json` (`specs/refresh/spec.md`, FR-024, for how they are kept
  current). The builder's Tally box and h-index menu choose the same, over the
  preset's. *Enforced:* `tests/presets.test.js` ("tally").
- **FR-026** The page format is a choice apart from the style and the length:
  the style's default paper, or `"a4"` whatever the style. The builder's Page
  menu sets it in the model (`format`); a build may pass `--input page=…`. The
  pre-built PDFs keep each style's default page. *Enforced:* review.

## Key Entities

- **Section definition** (`$sections.<id>`): `heading`, `short?`, `icon`,
  `match` (with `not?`) *or* `list`, `layout?` (`publications`, `grid`),
  `groupBy?`, `cluster?`, `sort?`, `page?`, `limit?`, `columns?`, `detail?`,
  `collapsed?`, `tally?`.
- **Preset**: `label`, `detail` (`full` | `summary`), `includeAll?`,
  `sections`, `place?`, `spacing?`, `recipientInline?`, `card?`, `location?`.
- **Resolved CV** (`resolve`): `name`, `label`, `detail`, `includeAll`, `place`,
  `recipientInline`, `spacing`, `card`, and sections each with `items` (or `entries` and
  `key`) and `dropped`.
- **Render model** (`cvModel`): `preset`, `label`, `detail`, `place`, `spacing`,
  `person`, sections with `groups`, `entries` (spans), and rows (`id`, `when`,
  `title`, `subject`, `byline`, `venue`, `summary`, `lines`, `trailing`,
  `recipient`, `recipientInline`, `status`, `links`).
- **Selection file**: see FR-021.

## Edge Cases

- `award` × `minor` and `position` × `minor` match no section: such an item is in
  no CV, `complete` included. No such item exists today.
- A `list` naming a file not in `data/lists/` resolves to no entries and the
  section is silently omitted (`lists.get(...) ?? []`).
- `cvs` values are an enum without `complete` (`schema/item.schema.json`); a new
  preset needs a schema change too.
- A limit with `dropped > 0` does not prefix a pre-built heading (FR-010).
- The page-count loop `continue`s past a missing PDF, so renaming `1page` or
  `2page` would skip the check rather than fail it.
- `detail: "summary"` drops the thesis and supervisors lines too, not only
  `details`.

## Reference

| Preset | detail | includeAll | sections (overrides) |
|---|---|---|---|
| `complete` | full | yes | all 18, incl. `languages`, `courses` |
| `np` | full | — | 16: all but `languages`, `courses` |
| `2page` | summary | — | education, positions, grants-major (6), awards-major (6), publications (10), software (8, 4 cols), talks-invited (8, full), mentoring (5, full), peer-review, service |
| `1page` | summary | — | education, positions, grants-major (4), awards-major (4), publications (5, no groupBy), software (6, 3 cols) |

`2page` and `1page` also set `place: { "publications.legend": "title" }`,
`recipientInline: true` and `spacing: { "publications.heading": 1.4x }`.
