# Tasks: Professional Activities — a section group, and conference and service work sorted

**Input**: Design documents from `specs/001-professional-activities/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: requested — spec SC-002/SC-004/SC-005 and constitution Article IX (new logic leaves a
test). Before/after comparisons are one-off checks run from the scratchpad, not committed
fixtures: a frozen snapshot of data breaks on the next unrelated data PR (learned in #486).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1–US4, from spec.md

---

## Phase 1: Setup

- [ ] T001 From `origin/main`, write to the scratchpad (not the repo): each preset's resolved item ids (`resolve(name)` in `src/lib/presets.js`, all sections, sorted), and the text of the owner's Hubble selection compiled with `npm run build:cv -- "<Hubble CV>/starkman-cv-hubble.json" <scratch>/before.pdf` then `pdftotext -layout`.

---

## Phase 2: Foundational

**Purpose**: the schema and the presets learn the new fields and groups; nothing renders
differently yet.

- [ ] T002 In `schema/item.schema.json`, `presentation` branch: add `"role": { "$ref": "#/$defs/role" }` and `"professional": { "type": "boolean", "description": "True when the talk is about software or the community, not science; it then lists under Professional & Software Talks." }`.
- [ ] T003 In `src/lib/presets.js`: read `presets.$groups`; a preset `sections` entry naming a group id (or `{ "id": <group>, "sections": [...] , …overrides }`) expands into its sub-sections in group order (the subset, if given), each resolved as a section and carrying `group: { id, heading, short, icon }` (overrides apply to the group's own keys); throw on a group naming an unknown section, a section in two groups, or a group id equal to a section id. Sort per research.md R2: rank by group id if grouped else own id in `order`, then within a group by own id, stably. Exclude group ids from `presetNames`.
- [ ] T004 In `src/lib/cvmodel.js`, pass each section's `group` (or `null`) through to the model the PDF and pages read.
- [ ] T005 Tests in `tests/presets.test.js`: a group expands to consecutive sections carrying `group`; a subset lists only those; `order` naming the group moves all of it; `order` naming a sub-section moves it only within the group; the three load-time errors throw (use an inline presets object if `resolve` cannot take one — otherwise test via the real config after T009).

**Checkpoint**: `npm test` passes with no preset yet listing a group.

---

## Phase 3: User Story 1 — Professional work reads as one block (P1) 🎯 MVP

**Goal**: one "Professional Activities" heading over sub-headings, in all three renderers.

**Independent test**: the complete CV has one group heading and five sub-headings in order.

- [ ] T006 [US1] In `config/presets.json`: add `"$groups": { "professional": { "heading": "Professional Activities", "short": "Professional", "icon": "service", "sections": ["conferences-organized", "conferences-attended", "talks-professional", "peer-review", "service"] } }`; add `$sections` `conferences-organized` (heading "Conferences Organized", short "Organized", icon "conferences", match `presentation`, kind `organizer`), `conferences-attended` ("Conferences Attended", short "Attended", match `presentation`, kind `attended`, `not: { "professional": true }`), `talks-professional` ("Professional & Software Talks", short "Professional Talks", icon "talks", match `presentation`, `professional: true`, `not: { "kind": "organizer" }`); set `peer-review` heading "Peer Review & Panels", `service` heading "Service & Committees"; add `"not": { "professional": true }` to `talks-invited` and `talks-contributed`; remove `conferences`. In `complete` and `np`, replace `conferences` with `professional` and remove top-level `peer-review` and `service`; in `2page`, replace its `peer-review` and `service` entries with `{ "id": "professional", "sections": ["peer-review", "service"] }` at the first one's place.
- [ ] T007 [US1] In `cv/cv.typ`: add `subsection(title)` — small caps at `look.sub`, no rule, no mark, a small gap above and below — and in the body loop, when `s.group` is set and differs from the previous section's, draw `section(s.group.heading, mark: s.group.icon, …)` (respecting `headingof.at(s.group.id)`) before the sub-section; draw a grouped section's own heading with `subsection()` (still honouring its `headingof` `none`).
- [ ] T008 [P] [US1] In `src/components/CvView.astro`: wrap consecutive sections sharing `group.id` in `<section class="cvgroup" id="cv-<group id>">` with an `h2` group heading; render a grouped section's heading as `h3.cvsubhead`; keep talk runs (the conference map) working inside a group. Styles in `src/styles/cv/page.css` (sub-heading smaller than a section heading, no rule).
- [ ] T009 [P] [US1] In `src/components/CvToc.astro`: list a group once by its `short` (or heading), linking `#cv-<group id>`, with its sub-sections' `short` names indented beneath.
- [ ] T010 [US1] In `src/pages/webdev/cv.astro` and `src/lib/secorder.js`: the group heading gets its own move buttons and heading menu (keyed by group id); a sub-section's move buttons move it only among its group's siblings (disabled at the group's ends); drag-reorder (`holdDrag`) likewise; the group moves as one unit. Styles in `src/styles/cv/builder.css`.
- [ ] T011 [US1] Tests: `tests/secorder.test.js` — `move()` within a group and of a group; `tests/presets.test.js` — `complete` and `np` resolve the five sub-sections consecutively with `group.id === 'professional'`, `2page` resolves two; compare each preset's item ids with T001's scratch list (one-off; not committed).

**Checkpoint**: the complete CV shows the group in the PDF, on `/cv/complete/` and in the builder.

---

## Phase 4: User Story 2 — Organizing is told apart from attending (P1)

**Goal**: organized conferences carry their role; no "Role:" prefix remains.

**Independent test**: every `organizer` presentation reads "<title>, <role>"; no detail line
starts with "Role:".

- [ ] T012 [US2] In `src/lib/cvmodel.js` `subject()` and `src/components/CvTimelineItem.astro`: a presentation's heading prints title, then `role`, then its event/place as today ("JAXtronomy Workshop, SOC").
- [ ] T013 [P] [US2] Migrate per research.md R6, removing line 0 and setting `role`: `data/*-jaxtronomy-workshop.json`, `data/*-division-of-dynamical-astronomy-56.json`, `data/*-astropy-coordination-meeting.json`, `data/*-astrophysics-and-space-science-in-marche-iii-*.json` (role "SOC"); `data/*-gaia-hackathon.json`, `data/*-gaia-hackathon-2.json` (role "LOC"); `data/*-astropy-core-developer-conference-talk.json` (role "Maintainer, Cosmology and Units"). A `details` left empty is removed.
- [ ] T014 [P] [US2] Migrate per research.md R6, setting `role` and rewriting line 0 in place: `astronomy-11` (LOC; "Led a workshop on scientific plotting"), `comscicon-gta-2020` (Organizing Committee; "Toronto's first ComSciCon"), `comscicon-gta-2021` (Organizing Committee; "A workshop series for graduate students on science communication skills"), `astropy-2026-conference` (Coordination Committee and Strategic Planning Committee; "Moderated online discussion and helped moderate the AI sessions"), `sigma-nu-alumni-advisory-board` (Member; "Sustainability and Chapter Operations committees").
- [ ] T015 [P] [US2] Drop the "Role: " prefix in place, capitalizing the first letter: `ta-ast101-the-sun-and-its-neighbours`, `ta-ast201-stars-and-galaxies`, `lead-observer-ast101-325` (line 0); `nsf-reu-classe-participant-at-cornell`, `source-participant-at-case-western-reserve-university-cwru` (line 1).
- [ ] T016 [US2] In `tests/integrity.test.js`, add "no detail line starts with Role:" over `details` and `detailsComplete`; in `tests/cvmodel.test.js`, assert the JAXtronomy and .Astronomy 11 headings; fix any test that read a migrated line (`grep -rn "Role:" tests/`).

**Checkpoint**: SC-002 holds; the FR-036 repetition test passes on the new roles.

---

## Phase 5: User Story 3 — Professional talks have their own place (P2)

**Independent test**: the two talks appear only in Professional & Software Talks.

- [ ] T017 [US3] Set `"professional": true` in `data/2024-05-from-jax-to-galax.json` and `data/2022-03-astropy-core-developer-conference-talk.json`.
- [ ] T018 [US3] In `tests/presets.test.js`: in `complete`, both ids are in `talks-professional` and in no other section; no presentation marked professional is in `talks-invited`, `talks-contributed` or `conferences-attended`.

---

## Phase 6: User Story 4 — A saved selection still prints the same lines (P2)

**Independent test**: a v1 selection decodes to the migrated lines, settings and order.

- [ ] T019 [US4] In `src/lib/selection.js`: `VERSION = 2`; add `MIGRATIONS = { 1: { dropFirstLine: [the 7 ids of T013], sectionSplit: { conferences: ["conferences-organized", "conferences-attended"] }, intoGroup: { professional: ["conferences", "peer-review", "service"] } } }` and apply it in `decode()` to a v1 file before the rest of decoding, per `contracts/selection-v2.md` (lines; `heading`, `locationAt`, `prefix`, `columns`, `tally`; `spacing`/`place` keys `conferences.<part>`; `order`).
- [ ] T020 [US4] In `tests/selection.test.js`: a v1 fixture (inline) with lines `{ "jaxtronomy-workshop": [0, 1], "gaia-hackathon": [0], "toronto-phd": [0] }`, `heading.conferences`, `order` holding `conferences`, `service`, `peer-review` decodes to `{ "jaxtronomy-workshop": [0], "toronto-phd": [0] }`, both new headings, and `order` with `professional` at the first of their places; a v2 file round-trips unchanged; v3 is refused.
- [ ] T021 [US4] Rewrite the owner's Hubble selection as v2 by decoding and re-encoding it with `src/lib/selection.js` (a one-off node script in the scratchpad); compile it to `<scratch>/after.pdf` and diff its text with T001's: only headings may differ.

---

## Phase 7: Polish & cross-cutting

- [ ] T022 `npm test` (seven gates) and `scripts/build-cv-pdfs.sh`: one-page CV 1 page, two-page 2. If `2page` overflows, hide the group heading on `2page` (a preset override on the group entry) (research.md R8) and recheck.
- [ ] T023 Look at `/cv/complete/` and the builder (`/webdev/cv/`) in the preview server: the group, sub-headings, contents list, and moving a sub-section and the group.
- [ ] T024 Fold into the area specs (Article X): `specs/cv-presets/spec.md` — section groups (`$groups`, expansion, order, builder), the new and renamed sections and FR-005, FR-028 for presentations, selection v2 and its migration in FR-021; `specs/data-model/spec.md` — `presentation` `role` and `professional` in the reference table, no "Role:" prefix (with FR-036); `specs/renderers/spec.md` — how the PDF, `/cv/` and the contents list draw a group. AGENTS.md: a talk about software or the community sets `professional: true`; an organizer's role goes in `role`.
- [ ] T025 Delete `specs/001-professional-activities/` and `.specify/feature.json`; `git ls-files 'specs/0*'` empty.
- [ ] T026 Open the PR ("Professional Activities: a section group; organized vs attended; professional talks"), stating the Spec Kit steps run; rebuild and send the Hubble PDF after it merges.

---

## Dependencies

- T001 before any data or preset change.
- Foundational (T002–T005) blocks every story.
- US1 (T006–T011) needs T003–T004. T006 must land with T017 (the `not: professional` matches) or
  the two talks briefly list twice — do T017 right after T006.
- US2 data (T013) and US4 (T019) land together: removing a line without the selection migration
  would tick the wrong line.
- US3 needs T006.
- Polish after all stories.

## Parallel examples

- US1: T008 and T009 together after T007.
- US2: T013, T014, T015 together after T012.

## Implementation strategy

MVP is US1: the group on screen and on paper. US2 and US4 go together (role migration + selection
migration); US3 is two flags and a test. All land in one PR.
