# Feature Specification: One meaning for `title` and `role`, one type for fellowships

**Feature Branch**: `001-title-role-rule`

**Created**: 2026-10-26

**Status**: Draft

**Folds into**: specs/data-model/spec.md — FR-014's fellowship rule, the field reference table, and a new rule for `title` and `role`; the CV row's wording folds into specs/renderers/spec.md and the section matching into specs/cv-presets/spec.md (FR-005)

**Input**: User description: "Uniform title/role rule and one type for fellowships. Today `role` has no single meaning … `title` = the name of the thing; `role` = my part in it, one documented meaning across every type that accepts it, never repeating words of the title (enforced by a test); every fellowship one type with host and funder distinct, so Brinson can read 'Brinson Prize Fellowship, Postdoctoral Fellow, Brinson Foundation'. Existing data migrates to the rule; ids never change."

## Background: what the data does today

| `type` | items with `role` | what `role` holds | where my part actually lives |
|---|---|---|---|
| `position` | 3 of 11 | "Prize Fellow", "Junior Fellow", "Pacific Postdoc Program Fellow" | 8 put the job in `title` ("Postdoctoral Associate", "Coordinator"); the 3 fellowships put a program in `title` and repeat it in `role` |
| `grant` | 1 of 17 | "Co-I" (the schema's only documented meaning: my part in a team grant) | — |
| `software` | 10 of 27 | "lead developer", "maintainer" | printed on cards only |
| `teaching` | 0 of 5 | accepted, unused | inside `title`: "TA, AST 101: …", "Lead Observer: AST101-325" |
| `service`, `outreach` | 0 of 15 | accepted, unused | inside `title`: "MasseyScope Committee Member", "Astronomy on Tap Toronto Volunteer" |
| `award` | not accepted | — | inside `title`: "Finalist, ASA Astrostatistics…" |

Fellowships are split: data-model FR-014 says "a fellowship is a `position` that was awarded"
(Brinson, Pacific Postdoc Program, Massey Junior Fellow), yet NSERC CGS-D, CGS-M, NSERC PDF and
the University of Toronto Graduate Fellowship are `grant`. The Brinson record never says it is a
postdoctoral fellowship; the post it funds is `mit-postdoc`, which refs it.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Every CV row says each fact once (Priority: P1)

As the CV's owner, I read any row in any CV — the four PDFs, `/cv/`, the builder, a saved
selection compiled to a PDF — and each fact (the thing's name, my part in it, who hosted or
funded it) appears exactly once, in the same order for every section.

**Why this priority**: Repeated words ("Brinson Prize Fellowship, Prize Fellow, Brinson
Foundation") are what a reader sees, and they cost space on page-limited CVs.

**Independent Test**: Render the complete CV and check that no row's second part repeats a
word sequence of its title, and that the Brinson row reads "Brinson Prize Fellowship,
Postdoctoral Fellow, Brinson Foundation".

**Acceptance Scenarios**:

1. **Given** the Brinson record migrated to the rule, **When** any CV renders it, **Then** it
   reads "Brinson Prize Fellowship, Postdoctoral Fellow, Brinson Foundation" and nothing in the
   row repeats.
2. **Given** a plain job ("Postdoctoral Associate" at MIT Kavli) with no `role`, **When** it
   renders, **Then** it reads as today: "Postdoctoral Associate, MIT Kavli Institute for
   Astrophysics".
3. **Given** the JWST program with role "Co-I", **When** it renders, **Then** it reads as today.

---

### User Story 2 - A maintainer knows where my part goes (Priority: P1)

As the person (or agent) adding an item, I read one rule in the data-model spec and the schema's
description of `role`, and I know whether "TA", "Volunteer", "Co-I" or "Postdoctoral Fellow"
belongs in `title` or `role` — for every type the same way.

**Why this priority**: Without one rule, every new item re-creates the inconsistency.

**Independent Test**: A schema/test gate rejects a fixture whose `role` repeats words of its
`title`, and the schema's description of `role` is identical in meaning for every type that
accepts it.

**Acceptance Scenarios**:

1. **Given** a new item whose `role` repeats a word sequence of its `title` (e.g. title
   "Massey Junior Fellow", role "Junior Fellow"), **When** the tests run, **Then** they fail,
   naming the item.
2. **Given** the schema, **When** I read `role` on any type, **Then** its description says the
   same thing: my part in the thing the title names.

---

### User Story 3 - Fellowships are one kind of item (Priority: P2)

As the CV's owner, every fellowship — Brinson, NSERC CGS-D/M, NSERC PDF, the U of T Graduate
Fellowship, the Pacific Postdoc Program, Massey Junior Fellowship — is `type: "fellowship"`, carries
its host and its funder in distinct fields, and lands in Grants & Fellowships by one rule.

**Why this priority**: Two types for one kind of thing is why fellowship rows print
differently from each other; fixing the type follows from Story 1 but is a larger migration.

**Independent Test**: List every item that is a fellowship; all share one `type`; the
Grants & Fellowships section matches them by that type with no `position` special case.

**Acceptance Scenarios**:

1. **Given** the migrated data, **When** the presets resolve, **Then** Grants & Fellowships
   holds the same items as before, in the same order, and Professional Appointments holds the
   same posts as before.
2. **Given** a fellowship with a host distinct from its funder (Brinson: hosted at MIT,
   funded by the Brinson Foundation), **When** it is recorded, **Then** both are stored, in
   distinct fields, and neither is in `title`.

---

### User Story 4 - Teaching, service, outreach and awards follow the rule (Priority: P3)

The roles now inside titles ("TA", "Lead Observer", "Committee Member", "Volunteer",
"Finalist") move to `role`, and the title keeps only the thing's name.

**Why this priority**: These rows do not repeat today; moving them makes the data uniform but
changes how those rows read, so it follows the P1/P2 fix.

**Independent Test**: No item of these types has a known role word at the start or end of its
`title`; each row renders with its role in the same position as every other type's.

**Acceptance Scenarios**:

1. **Given** "TA, AST 101: The Sun and its Neighbours", **When** migrated, **Then** `title` is
   "AST 101: The Sun and its Neighbours" and `role` is "TA", and the row prints both once.

### Edge Cases

- A plain job, whose name *is* my part ("Postdoctoral Associate", "Coordinator"): `title`
  holds it and `role` is absent — never both.
- A `groupRoles` row (Astropy Coordinator · Strategic Planner · Core Developer): each
  position's `title` is its role in Astropy; unchanged.
- A team item where my part is the whole point (Co-I, Finalist, Volunteer): `role` holds it.
- A software item's `role` ("lead developer"): already my part in the package; the rule
  documents it and cards keep printing it.
- An award to a team (`recipient`): `recipient` stays the team; `role` is not a substitute.
- A word shared innocently (title "Postdoctoral Fellowship Program", role "Fellow"): the
  repetition test compares word sequences, so one shared word that is the role's head noun
  must be judged against the test's threshold (see FR-006).
- A saved builder selection that ticked a detail line of a migrated item: line indices must
  not move (data-model FR-007).
- A published `/records/<id>.json` consumer reading `role`: the field keeps its name; its
  values become consistent.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `title` MUST be the name of the thing the item records: a job title for a
  plain job; otherwise the program, fellowship, grant, award, course, committee, package or
  event.
- **FR-002**: `role` MUST mean my part in the thing `title` names, with the same documented
  meaning on every type that accepts it; it MUST be absent where `title` already is my part.
- **FR-003**: Every type whose items record something I did a part in — `position`, `grant`,
  `fellowship`, `teaching`, `service`, `outreach`, `software`, and `award` — MUST accept
  `role`; `award` gains it.
- **FR-004**: Every fellowship MUST be of a new `type`, `fellowship`: named, awarded support
  held by me, recording the host institution and the funder in distinct fields, with the
  `tier`, `amount` and `declined` a grant carries. Brinson, the Pacific Postdoc Program, the
  Massey Junior Fellowship, NSERC CGS-D, NSERC CGS-M, NSERC PDF and the University of Toronto
  Graduate Fellowship become `fellowship`. A `position` is a post and never carries `tier`; a
  `grant` is funding for a project, not for me. Adding the type updates every renderer that
  switches on `type` in the same change (constitution, Article IV).
- **FR-005**: The Grants & Fellowships CV section MUST select `grant` and `fellowship` items
  by type and tier alone, with no special case for a `position` carrying `tier`; every preset MUST list the same items
  in the same sections as before the migration.
- **FR-006**: A test MUST fail any item whose `role` repeats a word sequence of its `title`
  (case-insensitive, ignoring punctuation), with a threshold that catches "Junior Fellow" in
  "Massey Junior Fellow" and "Prize Fellow" in "Brinson Prize Fellowship"; it MUST name each
  failing item.
- **FR-007**: The CV row MUST print, for every type, title, then role, then host or funder,
  each once: "Brinson Prize Fellowship, Postdoctoral Fellow, Brinson Foundation";
  "AST 101: The Sun and its Neighbours, TA, University of Toronto". The title stays the bold
  part.
- **FR-008**: All existing data MUST migrate to the rule in the same change. No `id` changes
  and no file is renamed: filenames carry only date and id, so a change of `type` renames
  nothing.
- **FR-009**: The Brinson Prize Fellowship record MUST state that it is a postdoctoral
  fellowship, via its `role`, and still ref `mit-postdoc` (and be reffed by it).
- **FR-010**: Detail-line indices of every migrated item MUST stay the same, so saved builder
  selections tick the same lines.
- **FR-011**: The migration MUST cover every type in this change, including the roles now
  inside teaching, service, outreach and award titles (User Story 4), so the rule is true of
  all data when it lands.
- **FR-012**: The schema's description of `role` and of `title`, and AGENTS.md's "Write the
  item" guidance, MUST state FR-001 and FR-002.

### Key Entities

- **Item `title`**: the name of the thing recorded.
- **Item `role`**: my part in it; optional; never repeats the title.
- **Fellowship** (`type: "fellowship"`, new): named, awarded support held by a person, with a
  host institution, a funder, a tier and often an amount; may fund a separate post (`refs`).
- **Post (`position`)**: a job at an institution; its title is the job.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero items in `data/` have a `role` that repeats a word sequence of their
  `title` (today: 3).
- **SC-002**: All 7 fellowships are `type: "fellowship"` (today: 3 `position`, 4 `grant`),
  and no `position` carries `tier`.
- **SC-003**: Every one of the four CV presets lists the same set of items in the same
  sections before and after the migration.
- **SC-004**: The Brinson row reads "Brinson Prize Fellowship, Postdoctoral Fellow, Brinson
  Foundation" in every CV.
- **SC-005**: The `role` description is one sentence of the same meaning on every type in
  the schema, and the data-model spec states the rule once.

## Assumptions

- The Brinson role is "Postdoctoral Fellow" (the user's example); the program itself calls
  holders "Brinson Prize Fellows", which the header in `config/person.json` keeps.
- Massey's title becomes "Massey College Junior Fellowship" or similar with role "Junior
  Fellow"; Pacific's becomes "Pacific Postdoc Program" with a role such as "Visiting Fellow" —
  exact wording is settled per item in the migration, under FR-001/FR-002.
- Draft PRs #480, #482 and #483 (which delete `role`) are superseded by this feature and are
  closed or rebased onto it; #481, #484 and #485 are independent.
- Cards keep printing a role only for software; extending that is out of scope.
- `institution`, `organization`, `funder` and `outlet` keep their names; unifying "who"
  fields is out of scope beyond the fellowship host/funder split.

## On landing *(mandatory)*

When the feature lands, fold this spec's requirements into the area spec named
in **Folds into** — rewritten there as its current contract — and delete this
folder in the same PR (constitution, Article X).
