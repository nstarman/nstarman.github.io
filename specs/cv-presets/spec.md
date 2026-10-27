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
  major), `grants-major` (grant *or* fellowship, major), `grants-minor` (grant,
  minor). `positions` is every `position`; none carries a tier.
- **FR-005b** Talks and conferences: `talks-invited` (invited, seminar) and
  `talks-contributed` (contributed, poster, accepted) hold science talks — neither takes a
  presentation marked `professional`; `conferences-organized` holds every `organizer`;
  `conferences-attended` every `attended` that is not marked; `talks-professional`
  (Professional & Software Talks) every marked presentation that is not an `organizer`. Peer
  Review & Panels is the `peer-review` list; Service & Committees the `service` items.
  *Enforced:* `tests/presets.test.js` ("a professional talk").
- **FR-005c** A **section group** (`$groups` in `config/presets.json`: a heading, short name,
  icon and ordered member sections) prints its members under one heading, each under a
  sub-heading. One is defined: Professional Activities — Conferences Organized, Conferences
  Attended, Professional & Software Talks, Peer Review & Panels, Service & Committees. Presets
  never list a group, so the prebuilt PDFs and `/cv/` pages never group; the builder's **Group
  Professional Activities** option (global panel, FR-027; off by default) switches it on, saved
  as the selection's `groups`. Switched on, `resolve(…, { groups })` gathers the members a preset
  lists, in the group's order, where the first of them stands, each carrying `group: { id,
  heading, short, icon }`; an empty member is dropped as any section is, and a group with none
  prints no heading. The group moves as one (at the earliest of its id and its members' in
  `order`) and its members only among themselves (`gather`, `moveGrouped` in `secorder.js`). The
  PDF draws the group's heading as a section heading and each member's as a small-caps
  sub-heading without a rule or mark; the builder draws the same and indents the members in its
  contents list. A group naming an unknown section, a section in two groups, or a group taking a
  section's id throws at load. *Enforced:* `tests/presets.test.js` ("a section group"),
  `tests/secorder.test.js` ("a grouped CV"), `tests/selectionmodel.test.js` ("a section group in
  a selection"). *Enforced:*
  `tests/presets.test.js` ("a fellowship").
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
- **FR-015** Detail tiers. An entry's lines are, in this order: a presentation's `talk`
  title, in “quotation marks” (inner double quotes become single), then its `details`
  lines, `Thesis: …`, `Supervisors: …`, then `detailsComplete` lines only when the
  preset is `includeAll`, then a mentee's achievements. Without the builder, the
  detail lines print only where the section's `detail` is `full`; `summary`
  (always rendered by the template) is unaffected. Achievements are gated by
  their own `cvs` (all of them on `includeAll`), not by `detail`, oldest first. A
  line is a label or a phrase, so it is shown without a final period (kept after an
  abbreviation such as "et al." and after an ellipsis), on the page and in the PDF; only
  the display drops it, the record is as written. Items listed on one line are written
  with a middle dot between them (a convention in the data, as in the PhD entry).
  *Enforced:* `tests/cvmodel.test.js` ("detail levels", "prints `detailsComplete`
  in the complete CV and nowhere else", "mentee achievements"),
  `tests/inline.test.js` ("a line does not end in a period", "a talk's title"), `tests/cvmodel.test.js`
  ("prints a talk's title first").
- **FR-016** The builder ticks lines by index into that one list, so
  `detailsComplete` and achievements are appended, never inserted, and an index
  means the same line whether or not they are shown. A talk's title is first because it
  is what a presentation's first line was before it had a field: a selection that ticked
  line 0 shows the title. `lineTier` names an index
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
- **FR-028** A row's heading is its title in bold, then `role` if it has one, then
  who it was with, each once: a position's, education's or teaching entry's
  institution; a grant's or award's funder; a fellowship's funder, or its host when
  it has none; a service or outreach entry's organization; media's outlet. A funder
  switched off (`funderOff`) prints nothing in its place. A presentation's is its `role`,
  then its event ("JAXtronomy Workshop, SOC"), its place where the builder puts it; mentoring
  and publications keep their own lines. The CV pages and the builder draw the same
  heading (`CvTimelineItem.astro`) as the PDF (`subject()` in `cvmodel.js`).
  *Enforced:* `tests/cvmodel.test.js` ("prints my role, then who it was with",
  "says each fellowship once", "says what I did at a conference I organized").
- **FR-020** The CV Builder (`/webdev/cv/`) renders the complete CV with a box on
  every entry and line, seeded from `np`, whose Start-from button shows lit on
  load until the selection changes. Compile PDF (with Download and
  the status) and the settings button sit in a bar just under the heading, stuck
  under the site header as the page scrolls, above the Start-from row (which keeps
  the count and Save Selection); Style and Page are in that button's
  "Settings for every section" panel, under Document, with how much of an
  institution's name prints (Institution names: Full, Shorter, Shortest, which sets every entry's, or Mixed
  when they differ). Each entry that has shorter names shows its institution as a
  menu of those names, in place of the text, so each is set on its own; and whether the middle column fills
  (`fill`, `true` only; absent is off), whether Education puts the university on its own line
  (`schoolBelow`, `true` only; absent is off), whether that entry's link icon ends the degree line rather than
  the university line (`linkOnDegree`, `true` only; absent is the university line), whether a mentee's papers are cited by identifier
  (`paperIds`, `true` only; absent is words), how amounts are written (Currency: USD, CAD /
  US$, CA$ / $, CA$). An award, grant or fellowship that names an institution (`funder`)
  shows it after its title, with a tick-box that turns it off for that entry. A
  tick-box under Right column ("Fill the middle column") sizes the right-hand column
  to the figures and places that fit in an inch, not to the longest, so one long range
  no longer reserves its width on every row and the middle text wraps later; it is
  still one column, and a longer text wraps inside it. Where more than half of the
  entries are longer than an inch (a section of places) it is as wide as it would be
  without the option; unticked, the column is as it was. A section in which no entry
  has right-hand text has no right-hand column, and no gutter for one, so the middle text
  uses the full width. A
  tick-box in the Education section's own settings puts each university on its own
  line, below the degree, with no comma, on the page and in the PDF; unticked, it follows the degree after a
  comma. While it is ticked, a second tick-box in the same settings, "Link icon on the degree line", moves each
  education entry's link icon from the end of the university line to the end of the degree line, in the PDF (the
  page draws that link in the date gutter, on no line); it is not offered, and does nothing, with the university
  on the degree's line. An education entry's homepage link is drawn as a graduation cap, in the PDF and in the
  page's date gutter; every other link, including a position's homepage, keeps its mark. A
  tick-box in the Students Advised & Mentored section's (`mentoring`) own settings cites a mentee's papers by identifier: each
  `[…](item:<id>)` in a mentoring entry's lines to a publication prints as
  its DOI (linked to doi.org, with the paper mark, as the Publications section writes it),
  else `arXiv:<id>` (with the arXiv mark), else keeps its words, on
  the page and in the PDF; unticked, the lines are in words. A
  preset may list `funderOff` — entries, by id, whose `funder` it leaves out, as
  `2page` and `1page` do for the two NSERC graduate scholarships so their lengths
  hold; Start from sets the tick-boxes to the preset's list, and a saved
  selection's own `funderOff` replaces it. That bar keeps Compile PDF, the settings button
  and Save Selection on one line. An entry that names a `recipient` has a tick-box
  beside its "To …" text in the preview, ticked by default; unticked, the PDF prints no recipient
  line for that entry (saved as `recipientOff`, a list of ids; Start from ticks every box, and no
  preset lists any), and the preview strikes the text through. The record, the website and the other
  entries are unchanged. *Enforced:* `tests/cvmodel.test.js` ("leaves an award's recipient line
  out"), `tests/selection.test.js`, `tests/builder-placement.test.js`. A person can: start from any preset
  (ticks its `memberIds`, its detail level, columns, place, spacing, inline
  recipients; `detailsComplete` lines start unticked unless the preset is
  `includeAll`) or from none; tick entries and individual lines; toggle "Select"
  on a partly ticked section; group or ungroup an institution's roles; reorder
  sections (buttons, or a long-hold drag); set grid columns, heading style,
  spacing, legend place, recipient-inline, PDF style and page format (the style's
  default paper, A4 or US Letter); turn header-card parts off and reorder its links; leave
  a section's places out, or, for a section of talks, print each place in the right column, below the title,
  in the title or not at all (one choice);
  open a publication list with its tally and an h-index
  from a source of their choosing; save and load a selection. Compile calls `cvModel('complete', ticked, keepLine, { prefix,
  order, group, locationAt, locationDetail, tally })`. *Enforced:* review.
- **FR-021** A saved selection (`selection.js`, format
  `starkman-cv-selection`, version 2) records the ticked ids, kept line indices
  per id (deduplicated, sorted, empties dropped), inline recipients, style,
  spacing, headings, place, prefix, order, columns (only 2–5 and not 3), group, card (parts and
  link order), `locationAt` (section id to where its places print: `below` the title, `title` or `none`;
  absent is the right column; an older file's `location: false` reads as `none` and `locationBelow`
  as `below`), `locationDetail` (how every place prints: `region: false` leaves out the province or
  state, `country: "code"` writes the country as its code; absent, as written), page
  format (`page`), tally (`true` or `{ hIndex }` per section), whether the
  right-hand column is capped (`trailcap`, `true` only) and how wide (`trailcapWidth`, inches, absent for 1.45), each entry's institution-name
  level (`namesFor`, entry id to 1 or 2; absent is full), how amounts are written
  (`currency`, `us` or `dollar`; absent is codes), the entries whose institution
  is switched off (`funderOff`, entry ids; absent is none), the awards whose recipient line is left
  out (`recipientOff`, entry ids; absent is none), whether Education puts the
  university on its own line (`schoolBelow`, `true` only), whether its link icon is on the degree line (`linkOnDegree`, `true` only), the section groups switched on (`groups`, group ids; absent is none), and the build's commit and dirty flag. An older file is brought up to version 2 before it is read, so it prints the lines it printed when saved: for the entries whose "Role:" line became `role`, that line's tick is dropped and later ticks move up one (a talk's title is its line 0); Conferences' section settings and place in `order` go to Organized, Attended and Professional & Software Talks; it is ungrouped. `decode` refuses non-JSON, a non-object,
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
- **FR-027** Where a builder option lives. An option that applies to the whole CV — Style,
  Page, Institution names, Currency, how a place prints (State or province, Country), the "Select" prefix, the right column's width (Cap its width, Cap width), section
  order, Group Professional Activities — is in the global "Settings for every section" panel. An option that applies to one
  section — Places (a talks section's place choice, in the column, below the title, in the title or none, instead), a publication list's Tally and Legend,
  Education's university below the degree, the mentoring section's papers by identifier — is in that section's own settings row (the sliders
  button on its heading), among its Items controls, and only there. A feature spec for a builder
  option says which. *Enforced:* `tests/builder-placement.test.js`.
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
  preset's, and the builder's Places box over both. An amount still prints, and a declined
  grant prints its amount then "(declined)"; any other declined entry
  prints "declined". A talk's place is its `location`, and a section of talks prints it in exactly one
  position, chosen with the builder's **Place** setting in that section's Items row (the saved
  `locationAt`): **Right column** (the default), **Below the title**, **In the title** or **None**.
  Below puts it, in italics, on a line of its own directly below its title line, before its other
  lines; In the title adds the whole place, as written, in parentheses ("EAS 26-S10 (Lausanne,
  Switzerland)"), or after a comma inside a label the title already ends in, "(Talk, Cambridge, MA, USA)"; the other positions then
  print nothing, so a section whose only right-hand text was places has no column. An amount,
  "declined" and "not attended" stay in the column; an entry with no place prints none of these. A
  title is the event's name and does not carry its place as text. The builder's preview shows each
  place where it will print. Other dated sections keep their Places box (`right` or `none`). No
  preset sets it, so the presets keep the place in the column.
  How a place prints is a whole-CV choice, **State or province** (shown by default) and **Country**
  (full by default, or its two-letter code), in the global panel and saved as `locationDetail`. It applies to
  every place the CV prints, in the column, below the title, in the title or on any dated entry:
  `Toronto, ON, Canada` prints `Toronto, Canada`, `Toronto, ON, CA` or `Toronto, CA`; a
  place with no province or country (`Lausanne, Switzerland` has no province; `Online` has neither)
  is unchanged as far as it has the part. The codes are in `config/countries.json` (ISO 3166-1
  alpha-2, and `UK`); a country with none prints as written, and a test fails until it has one.
  The builder's preview writes places the same way (`formatPlace`, `src/lib/placefmt.js`). No
  preset sets it. *Enforced:* `tests/placefmt.test.js`, `tests/cvmodel.test.js`
  ("writes a place as the options ask"), `tests/selection.test.js`, `tests/builder-placement.test.js`.
  *Enforced:* `tests/presets.test.js` ("print every entry's place…",
  "lets the builder leave a section's places out…"), `tests/cvmodel.test.js` ("where a talk's place prints"), `tests/talkplace.test.js`,
  `tests/selection.test.js`, `tests/builder-placement.test.js`.
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
  the style's default paper, `"a4"` (A4 whatever the style) or `"letter"` (US
  Letter). The builder's Page menu sets it in the model (`format`); a build may
  pass `--input page=…`. The pre-built PDFs keep each style's default page. On
  `"letter"`: the margins are one inch on every side; no text is set below 12pt,
  superscripts included; every page, the first too, is numbered "n of N" in the
  footer with no running header; the header card's email and website default to
  a line each (a card `order` that is set is kept); the contact block takes its
  own height; and the right-hand column is capped, as the builder's "Cap right
  column" option does, whether or not it is ticked. The cap is 1.45 in (`TRAILCAP_DEFAULT`) unless the builder's **Cap width** sets another,
  0.5 to 4 in (saved as `trailcapWidth`, absent for the usual; a value outside the range or not a number
  reads as the usual), one value for both: wide enough for the widest place in the records written shortest ("College Station,
  US", 1.43 in at 12pt: no province or state, the country as its code), so a CV that shortens its
  places keeps each on one line, and narrower than the widest in full ("College Station, TX, USA",
  1.90 in), which still wraps. In the builder, card links
  still in the other page's usual order take the chosen page's. *Enforced:*
  `tests/presets.test.js` (`cardOrder`), `npm run build:pdf` (the one- and
  two-page counts, and `scripts/test-column-cap.mjs`, which measures every place and holds
  both bounds of the usual cap), `tests/selection.test.js` (the width's range), `tests/selectionmodel.test.js`;
  the rest by review.

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
`recipientInline: true` and `spacing: { "publications.heading": 1.4x }`; `2page` also sets
`"talks-invited": 0.6x`, the space between its invited talks, which holds it to two pages against
the quoted titles' extra width (a title that wraps) and the peer-review list's journals.
