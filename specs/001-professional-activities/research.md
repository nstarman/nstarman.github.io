# Research: Professional Activities

Code paths from `main` at `c736942`.

## R1. How a group is represented

- **Decision**: `config/presets.json` gains `$groups`, each `{ heading, short?, icon?, sections:
  [section ids] }`. A preset's `sections` list may name a group id (or `{ "id": <group>,
  "sections": [...] }` to list a subset, as `2page` does). `resolve()` (src/lib/presets.js)
  expands a group in place into its sub-sections, each resolved exactly as a section is today and
  carrying `group: { id, heading, short, icon }`. Output stays a flat `sections` array.
- **Rationale**: every consumer — `cvmodel.js`, `cv/cv.typ`, `CvView.astro`, `CvToc`, the builder —
  already walks a flat list; a `group` property on consecutive sections is the smallest change each
  must learn (open a group heading when `group.id` changes; draw the section heading as a
  sub-heading). `CvView` already groups consecutive sections into runs for the talk map; the group
  is the same pattern.
- **Alternatives**: nested `sections` in the model (every consumer rewritten); a heading-only
  pseudo-section (breaks "empty sections are dropped" and the builder's per-section controls).

## R2. Ordering and the builder

- **Decision**: `order` (the builder's) may name group ids and section ids. Sort key: a section's
  rank is its group's rank (by group id) if grouped, else its own; within a group, by its own id's
  rank, falling back to the preset's order. So a group moves as one unit and its sub-sections move
  within it. `secorder.js`'s `move()` moves a sub-section only among its group's siblings and a
  group among top-level entries.
- A group with all sub-sections empty disappears with them (empty sections are already dropped,
  FR-008 in cv-presets).
- Per-section builder controls (`heading`, `locationAt`, `spacing`, `place`, `prefix`, `columns`,
  `tally`) stay keyed by section id (the selection's `group` is keyed by institution and is untouched) and apply to sub-sections unchanged. The
  group heading gets a `heading` entry of its own under the group id (`none` hides it).

## R3. How each renderer draws a group

- **PDF** (`cv/cv.typ`, body loop at the end): when `s.group` differs from the previous section's,
  call `section(group.heading, mark: group.icon, …)`; then draw the sub-section's heading with a
  new `subsection(title)` — small caps at the entry size, no rule, no mark — instead of `section()`.
- **HTML** (`src/components/CvView.astro`): consecutive sections sharing `group.id` are wrapped in a
  `cvgroup` with an `h2`-level heading; the sub-section heading renders as `h3` with class
  `cvsubhead`. `CvToc.astro` lists the group once, its sub-sections indented. Styles for both in
  `src/styles/cv/`.
- **Builder** (`src/pages/webdev/cv.astro` + `secorder.js`): the group heading carries its own
  up/down buttons and heading-variant menu; sub-sections keep theirs, moving within the group.
- `tests/a11y` and `test:links` cover the new headings and anchors (`#cv-<group id>`).

## R4. The new sections

| id | heading | match |
|---|---|---|
| `conferences-organized` | Conferences Organized | `presentation`, kind `organizer` |
| `conferences-attended` | Conferences Attended | `presentation`, kind `attended`, not `professional: true` |
| `talks-professional` | Professional & Software Talks | `presentation`, `professional: true`, not kind `organizer` |
| `peer-review` (kept) | Peer Review & Panels | list `peer-review` |
| `service` (kept) | Service & Committees | `service` |

`talks-invited` and `talks-contributed` gain `not: { professional: true }`. `conferences` is
removed. Group `professional`: heading "Professional Activities", short "Professional", icon
`service`; sub-sections in the order above. `complete` and `np` list the group where
`conferences` stood, and drop `peer-review` and `service` from their top level; `2page` lists
`{ "id": "professional", "sections": ["peer-review", "service"] }` where those two stood.

`matches()` already supports `not` and array values; a boolean field compares with `includes`, so
`professional: true` works as is.

## R5. The professional mark

- **Decision**: `presentation` accepts `professional: true` (boolean, absent = false). Set on
  `from-jax-to-galax` and `astropy-core-developer-conference-talk`.
- **Rationale**: `kind` is how a talk came about (invited, contributed, organizer…) and stays so;
  the mark is a separate, yes/no fact. A boolean is the smallest schema change.
- **Alternatives**: a new `kind` value (conflates how with what; JAX is contributed, Astropy Core
  Dev attended); an enum `track` (no third value is asked for).

## R6. "Role: …" lines (17 now; the Massey talk series went with #487)

| id | role → | line at the same index → | line removed? |
|---|---|---|---|
| jaxtronomy-workshop, division-of-dynamical-astronomy-56, astropy-coordination-meeting, astrophysics-and-space-science-in-marche-iii-… | SOC | — | yes (line 0) |
| gaia-hackathon, gaia-hackathon-2 | LOC | — | yes (line 0) |
| astronomy-11 | LOC | "Led a workshop on scientific plotting" | no |
| comscicon-gta-2020 | Organizing Committee | "Toronto's first ComSciCon" | no |
| comscicon-gta-2021 | Organizing Committee | "A workshop series for graduate students on science communication skills" | no |
| astropy-2026-conference | Coordination Committee and Strategic Planning Committee | "Moderated online discussion and helped moderate the AI sessions" | no |
| astropy-core-developer-conference-talk | Maintainer, Cosmology and Units | — | yes (line 0) |
| sigma-nu-alumni-advisory-board | Member | "Sustainability and Chapter Operations committees" | no |
| ta-ast101-…, ta-ast201-…, lead-observer-ast101-325 | (unchanged) | prefix "Role: " dropped, first letter kept capital | no |
| nsf-reu-classe-participant-at-cornell, source-participant-at-case-western-… | — | prefix dropped: "Summer research position…" | no |

The Astropy Core Developer role cannot be "Core Developer": the title already says it, and the
FR-036 test would fail. 7 items lose line 0; every other line keeps its index.

## R7. Saved selections (FR-009)

- **Decision**: bump `VERSION` in `src/lib/selection.js` to 2; `decode()` migrates a v1 file:
  - `lines`: for the 7 items of R6 that lose line 0, drop 0 and shift each other index down by one.
  - section-keyed settings (`heading`, `locationAt`, `prefix`, `columns`, `tally`, and the
    `<id>.…` keys of `spacing` and `place`): copy `conferences`'s value to `conferences-organized`
    and `conferences-attended`; in `order`, replace `conferences` with `professional` and drop
    `peer-review` and `service` from the top level (they now move inside the group), keeping the
    first position any of them held.
  - The table lives beside `decode()` as `MIGRATIONS[1]`, data rather than code paths.
- **Rationale**: the builder and `build-cv.mjs` both read through `decode()`, so every old file —
  the Hubble one and any other — is migrated on load, with nothing to remember to run.
- The owner's Hubble file is also rewritten as v2 (by loading and re-encoding), so it reads plainly.

## R8. Pages and counts

- `2page` gains a group heading above two sub-headings: about one line more than today. CI's
  page-count check guards it; if it overflows, the plan's fallback is `heading: none` on the group
  for `2page` (a per-preset override, R1).
