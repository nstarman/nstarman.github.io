# Tasks: One meaning for `title` and `role`, one type for fellowships

**Input**: Design documents from `specs/001-title-role-rule/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: requested — spec FR-006 (a repetition test), SC-003 (presets unchanged), and
constitution Article IX (new logic leaves a test).

**Organization**: by user story, after a setup freeze and a foundation every story needs.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1–US4, from spec.md

---

## Phase 1: Setup

**Purpose**: freeze what must not change, before any data moves.

- [X] T001 Write `tests/fixtures/sections-before.json`: for each preset in `config/presets.json` (`np`, `2page`, `1page`, `complete`), map each section id to the ordered list of item ids it resolves to on `main` (via `src/lib/presets.js`). Generate it with a one-off node script run from the current tree before T005; commit the fixture, not the script.
- [X] T002 [P] Write `tests/fixtures/detail-lines-before.json`: for every item in data-model.md's migration tables, its `detailLines()` text (`@nstarkman/data-resolver/inline.js`, `{ complete: true }`), so FR-010 can be checked line by line.

---

## Phase 2: Foundational

**Purpose**: the schema and the renderers learn `fellowship` and the one row rule. No data
changes yet, so every gate still passes at the end of this phase.

- [X] T003 Add `fellowship` to the `type` enum in `schema/item.schema.json`, with an `allOf` branch: `tier` required (`major` · `minor`); optional `institution`, `institutionNames`, `funder`, `role`, `amount`, `declined`, `location`, each defined as on `grant`/`position`.
- [X] T004 In `schema/item.schema.json`, give `role` on `award` and on every type that accepts it (`position`, `fellowship`, `grant`, `award`, `teaching`, `service`, `outreach`, `software`) the one description from `contracts/schema.md`; give `title` in the envelope its description from the same file.
- [X] T005 Add `schema/invalid/fellowship-without-tier.json` (a `fellowship` with no `tier`) and confirm `tests/schema.test.js` rejects it.
- [X] T006 In `config/presets.json`, set `grants-major.match.type` to `["grant", "position", "fellowship"]` (the `position` entry is removed in T021).
- [X] T007 In `src/lib/cvmodel.js` `subject()`, implement the row rule of research.md R3 and `contracts/cv-row.md`: `[role, who]` joined by ", " for `position`, `education`, `fellowship`, `grant`, `award`, `teaching`, `service`, `outreach`, `media`, with `who` per type; a fellowship's `who` is its funder unless `funderOff`, else its `institution`. Leave `presentation`, `mentoring`, `publication` as they are.
- [X] T008 [P] In `src/components/CvTimelineItem.astro:92`, include `fellowship` in the types whose funder the builder can switch off.
- [X] T009 [P] In `src/pages/index.astro:17`, add `fellowship` to Background's `byType(...)`, keeping the `2page` filter.
- [X] T010 [P] In `tests/placefmt.test.js:41`, add `fellowship` to the type list.
- [X] T011 Add row-wording tests to `tests/cvmodel.test.js` for each row of `contracts/cv-row.md`, using inline item objects (not data), including a fellowship with `funderOff` falling back to its host.

**Checkpoint**: `npm test` passes with no data changed.

---

## Phase 3: User Story 1 — Every CV row says each fact once (P1) 🎯 MVP

**Goal**: the three rows that repeat today read once; Brinson says it is postdoctoral.

**Independent test**: the complete CV's Brinson row reads "Brinson Prize Fellowship,
Postdoctoral Fellow, Brinson Foundation"; Massey and Pacific repeat nothing.

- [X] T012 [P] [US1] `data/2024-02-brinson-prize-fellowship.json`: `type` → `fellowship`; `role` → `"Postdoctoral Fellow"`; `institution` → `"MIT Kavli Institute for Astrophysics and Space Research"`; add `"funder": "Brinson Foundation"`. Keep `id`, `tier`, `amount`, `details`, `refs`, `links`.
- [X] T013 [P] [US1] `data/2026-10-pacific-postdoc-program.json`: `type` → `fellowship`; `title` → `"Pacific Postdoc Program"`; `role` → `"Visiting Fellow"` (⚑ owner to confirm in review). Keep `institution`, `funder`, `details`.
- [X] T014 [P] [US1] `data/2019-09-massey-junior-fellow.json`: `type` → `fellowship`; `title` → `"Junior Fellowship"`; remove `role`. Keep `institution` ("Massey College"), `tier`, `details`.
- [X] T015 [US1] Update `tests/cvmodel.test.js:139` and any test reading these three items' `type`, `role` or row text, so they assert the new wording.
- [X] T016 [US1] Run `npx vitest run tests/presets.test.js tests/cvmodel.test.js`; Grants & Fellowships still lists the three (via T006).

**Checkpoint**: US1 deliverable — the repeated rows are gone.

---

## Phase 4: User Story 2 — A maintainer knows where my part goes (P1)

**Goal**: one documented rule and a test that enforces it.

**Independent test**: a fixture item whose `role` repeats its `title` fails, naming the item.

- [X] T017 [US2] In `tests/integrity.test.js`, add "no role repeats its title": tokenize `title` and `role` (lowercase, split on non-alphanumerics), stem each token by dropping a trailing `ship` then a trailing `s`, and fail when the role's whole token sequence occurs contiguously in the title's; one failure per item, naming its id (research.md R2). Include unit cases: "Prize Fellow"/"Brinson Prize Fellowship" fails, "Junior Fellow"/"Massey Junior Fellow" fails, "Postdoctoral Fellow"/"Brinson Prize Fellowship" passes, "Co-I"/"JWST GO 10246: …" passes.
- [X] T018 [P] [US2] In `AGENTS.md` §2 "Write the item", add the rule in two sentences — `title` is the thing's name; `role` is my part in it, left out when the title is already my part, never repeating it — and add `fellowship` to the type bullets (a fellowship sets `tier`, its host in `institution`, its funder in `funder`).

**Checkpoint**: the test passes on the data from US1 and would have failed on `main`.

---

## Phase 5: User Story 3 — Fellowships are one kind of item (P2)

**Goal**: all seven fellowships are `fellowship`; `position` is only a post.

**Independent test**: every preset's sections equal `tests/fixtures/sections-before.json`;
no `position` has `tier`.

- [ ] T019 [P] [US3] Retype to `fellowship`, nothing else changing but `institution`: `data/*-nserc-cgs-d.json` and `data/*-nserc-cgs-m.json` (add `"institution": "University of Toronto"`), `data/*-nserc-pdf.json`, `data/2018-09-university-of-toronto-graduate-fellowship-per-annum.json`.
- [ ] T020 [US3] In `schema/item.schema.json`, remove `tier`, `amount` and `funder` from the `position` branch and reject them there; add `schema/invalid/position-with-tier.json`.
- [ ] T021 [US3] In `config/presets.json`, set `grants-major.match.type` to `["grant", "fellowship"]` and remove `positions.match.not` (no position carries a tier).
- [ ] T022 [US3] Rewrite `tests/presets.test.js` "a fellowship" (line 210): assert the seven ids are `fellowship` and sit in `grants-major`, and that no `position` has `tier`; add "every preset lists the same sections as before", comparing against `tests/fixtures/sections-before.json`.
- [ ] T023 [P] [US3] Update `tests/research-kit.test.js:115` if its `byType('grant')[0]` now picks a different item; keep it testing a `grant`.

**Checkpoint**: SC-002 and SC-003 hold.

---

## Phase 6: User Story 4 — Teaching, service, outreach and awards follow the rule (P3)

**Goal**: every role now inside a title moves to `role`.

**Independent test**: each migrated row prints as in `contracts/cv-row.md`; the T017 test
passes; detail lines match `tests/fixtures/detail-lines-before.json`.

- [ ] T024 [P] [US4] Teaching — set `title`/`role` per data-model.md: `data/*-ta-ast101-the-sun-and-its-neighbours.json`, `data/*-ta-ast201-stars-and-galaxies.json`, `data/*-lead-observer-ast101-325.json`, `data/*-grader-honors-mechanics.json`, `data/*-physics-instructor-ib-physics.json`.
- [ ] T025 [P] [US4] Service — `data/*-executive-board-member-for-chabad-at-cwru.json`, `data/*-masseyscope-committee-member.json`, per data-model.md.
- [ ] T026 [P] [US4] Outreach — `data/*-astronomy-on-tap-toronto-volunteer.json`, `data/*-astrotours-planetarium-presenter.json`, `data/*-astrotours-toronto-outreach-volunteer.json`, `data/*-astrotours-telescope-organizer.json`, `data/*-massey-telescopes-outreach-coordinator.json`, `data/*-planet-party-toronto-volunteer.json`, per data-model.md.
- [ ] T027 [P] [US4] Awards — `data/*-asa-astrostatistics-interest-group-student-paper-finalist.json` (title "ASA Astrostatistics Interest Group Student Paper Competition", role "Finalist"); `data/*-goldwater-scholarship-honorable-mention.json` and `-2.json` (title "Goldwater Scholarship", role "Honorable Mention", ⚑ owner to confirm).
- [ ] T028 [US4] Add a test in `tests/cvmodel.test.js` that every item in `tests/fixtures/detail-lines-before.json` still yields the same `detailLines()` (FR-010); then fix any test that asserted an old title of these items (`grep -rn` each old title in `tests/`).

**Checkpoint**: the rule is true of all data.

---

## Phase 7: Polish & cross-cutting

- [ ] T029 `npm test` (all seven gates), then `scripts/build-cv-pdfs.sh` and check the one-page CV is one page and the two-page is two.
- [ ] T030 Compile the owner's saved Hubble selection with `npm run build:cv -- <selection.json> <scratch>.pdf` and check its ticked detail lines print the same text (FR-010); do not overwrite the owner's PDF.
- [ ] T031 Fold into the area specs (Article X), rewritten as the current contract: `specs/data-model/spec.md` — FR-014 (fellowship is its own type), a new rule for `title` and `role` with its enforcement, the reference table (`fellowship` row; `role` on `award`; `position` without `tier`/`amount`/`funder`); `specs/cv-presets/spec.md` FR-005 (grants-major is grant × fellowship); `specs/renderers/spec.md` — the CV row heading per `contracts/cv-row.md`.
- [ ] T032 Delete `specs/001-title-role-rule/` and `.specify/feature.json`; confirm CI's "Design notes stay on their branch" step would pass (`git ls-files 'specs/0*'` is empty).
- [ ] T033 Open the PR (title "One meaning for title and role; a fellowship type"), saying it ran `/speckit-specify`, `/speckit-plan`, `/speckit-tasks`, `/speckit-implement`; then close #480, #482 and #483 with a comment linking it.

---

## Dependencies

- Setup (T001–T002) before anything touches data.
- Foundational (T003–T011) blocks every story.
- US1 (T012–T016) needs T003, T006, T007.
- US2 (T017–T018) needs US1's data so the test passes; the test itself can be written in parallel.
- US3 (T019–T023) needs US1 (the three already retyped) for T020/T021 to pass.
- US4 (T024–T028) needs T007 (rows print `role` for these types) and T002.
- Polish after all stories.

## Parallel examples

- Foundational: T008, T009, T010 together, after T007.
- US1: T012, T013, T014 together.
- US3: T019 and T023 together; then T020 → T021 → T022.
- US4: T024, T025, T026, T027 together; then T028.

## Implementation strategy

MVP is US1 on top of the foundation: the three repeating rows fixed and Brinson saying
"Postdoctoral Fellow". US2 locks the rule in; US3 finishes the type; US4 makes the rule true of
all data. All land in one PR (spec FR-008, FR-011): a story is a checkpoint, not a release.
