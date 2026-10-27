# Feature Specification: Professional Activities — a section group, and conference and service work sorted

**Feature Branch**: `001-professional-activities`

**Created**: 2026-10-27

**Status**: Draft

**Folds into**: specs/cv-presets/spec.md — section groups, the new sections and the builder's
handling of them; specs/data-model/spec.md — `role` on a presentation, the professional mark,
FR-036's rule applied to "Role: …" lines; specs/renderers/spec.md — how a group draws on `/cv/`
and in the PDF

**Input**: User description: "Professional Activities: an umbrella CV section with sub-sections,
and a clean split of conference and service work … Conferences Organized, Conferences Attended,
Professional & Software Talks, Peer Review & Panels, Service & Committees … a presentation can be
marked professional … `presentation` accepts `role`, and the 'Role: …' detail lines that are a
role move into `role` … a saved builder selection's ticked line indices are shifted so the same
lines stay ticked."

## Background: what the CV does today

- A preset is a flat list of sections. There is no way to put several sections under one heading.
- **Conferences** holds both conferences I organized (`kind: organizer`) and ones I only attended
  (`kind: attended`), so organizing and attending read alike.
- An organized conference keeps its role as a first detail line: "Role: SOC", "Role: LOC",
  "Role: Organizing Committee member for Toronto's first ComSciCon". Eighteen items have a
  "Role: …" line; for some it is a role (SOC, LOC, a committee), for others a description
  ("Role: Designed and ran weekly course tutorial sections…").
- A talk that is about software or the community rather than science ("From JAX to Galax", given
  at *Globular Clusters and Their Tidal Tails*; my talk at the *Astropy Core Developer
  Conference*) has nowhere to go but the science Presentations or Conferences.
- **Peer Review** is a list section; **Professional Service** holds committees and memberships.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Professional work reads as one block (Priority: P1)

As the CV's owner, I see a single **Professional Activities** heading on the CV, and under it
smaller headings — Conferences Organized, Conferences Attended, Professional & Software Talks,
Peer Review & Panels, Service & Committees — each with entries laid out as any section's, date
column and all.

**Why this priority**: It is the organization the owner asked for, and every other story fills
it.

**Independent Test**: Render the complete CV and the `np` CV: one "Professional Activities"
heading appears; its sub-headings follow in the preset's order; nothing in them appears elsewhere.

**Acceptance Scenarios**:

1. **Given** a preset that lists the group, **When** any CV renders, **Then** it prints one
   group heading, then each non-empty sub-section under its own sub-heading, in the preset's order.
2. **Given** a preset in which every sub-section of the group is empty, **When** it renders,
   **Then** the group heading is left out, as an empty section is today.
3. **Given** the PDF, the `/cv/<preset>/` page and the builder, **When** each draws the group,
   **Then** headings, sub-headings, order and entries match.

---

### User Story 2 - Organizing is told apart from attending (Priority: P1)

As the CV's owner, the conferences I organized and the ones I only attended are separate
sub-sections, and an organized one reads with my role in it: "Astrophysics and Space Science in
Marche III, SOC, Jesi".

**Why this priority**: The organizing roles are service that the flat Conferences list hides.

**Independent Test**: Every `organizer` presentation is in Conferences Organized with its role
on the heading line; every `attended` one is in Conferences Attended.

**Acceptance Scenarios**:

1. **Given** the JAXtronomy Workshop (organizer, "Role: SOC"), **When** it renders, **Then** it
   is in Conferences Organized and reads "JAXtronomy Workshop, SOC" with its place, and no
   "Role: SOC" detail line remains.
2. **Given** .Astronomy 11 ("Role: Local Organizing Committee member and lead workshop on
   scientific plotting"), **When** migrated, **Then** its role is "LOC" and the rest stays a
   detail line ("Led a workshop on scientific plotting") at the same index.
3. **Given** a "Role: …" line that is a description, not a role (teaching's "Role: Designed and
   ran…", a summer position's "Role: summer research position"), **When** migrated, **Then** it
   stays a detail line at the same index, without the "Role: " prefix.

---

### User Story 3 - Professional talks have their own place (Priority: P2)

As the CV's owner, a talk about software or the community is marked professional and lists under
**Professional & Software Talks**, not with the science talks.

**Why this priority**: It corrects how two talks are presented; the group must exist first.

**Independent Test**: "From JAX to Galax" and the Astropy Core Developer Conference talk appear
only in Professional & Software Talks; Invited Talks and Presentations hold only science talks.

**Acceptance Scenarios**:

1. **Given** "From JAX to Galax" marked professional, **When** any CV renders, **Then** it is in
   Professional & Software Talks, with its title and conference as today, and in no other section.
2. **Given** an unmarked talk, **When** it renders, **Then** it stays where it is today.

---

### User Story 4 - A saved selection still prints the same lines (Priority: P2)

As the CV's owner, a selection I saved in the builder (my Hubble CV's) compiles after this
change with the same detail lines ticked, even where a "Role: …" line was removed.

**Why this priority**: The owner compiles CVs from saved selections; silently ticking the wrong
line would change a submitted CV.

**Independent Test**: Compile the owner's Hubble selection before and after; for every item, the
printed detail lines are the same text.

**Acceptance Scenarios**:

1. **Given** a selection that ticked line 1 of an item whose line 0 ("Role: SOC") is removed,
   **When** the selection is migrated, **Then** it ticks line 0, the same text.
2. **Given** a selection that ticked only the removed "Role:" line, **When** migrated, **Then**
   nothing is ticked for that item (the role now prints on the heading line instead).

### Edge Cases

- A short preset (`2page`, `1page`) that keeps only some sub-sections prints the group with just
  those; one with none prints no group.
- A presentation marked professional *and* organizer: it is a conference I organized and lists
  in Conferences Organized; the professional mark only moves talks (contributed, invited,
  seminar, attended-with-talk).
- An attended conference at which I gave a professional talk (Astropy Core Developer Conference):
  it lists once, in Professional & Software Talks.
- The builder's section order (`order`) names a sub-section: it moves within its group; the group
  moves as one unit among sections.
- A sub-section switched off in the builder: the group prints without it.
- The `/cv/` page's contents list: the group appears once, its sub-sections indented beneath.
- A role line naming two roles ("Coordination Committee and Strategic Planning Committee;
  moderated online discussion…"): the roles go to `role`, the rest stays a detail line.
- `Massey Telescope Public Talk Series` is deleted by PR #487; if that lands first, it is not
  migrated here.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A preset MUST be able to list a **section group** in place of a section: a heading
  (and short name, icon) and an ordered list of sub-sections, each a section as defined today.
- **FR-002**: A group MUST render as one heading followed by each non-empty sub-section under a
  sub-heading, entries laid out as that sub-section's own layout; a group with no non-empty
  sub-section MUST be omitted.
- **FR-003**: The PDF, the `/cv/<preset>/` pages and the builder MUST draw a group with the same
  headings, sub-headings, order and entries.
- **FR-004**: In the builder, sub-sections MUST be orderable within their group and switchable
  like sections; the group MUST move as one unit; a saved selection MUST record this and
  reproduce it.
- **FR-005**: The `complete` and `np` presets MUST list a group "Professional Activities" with
  sub-sections, in this order: Conferences Organized (`organizer`), Conferences Attended
  (`attended`), Professional & Software Talks (presentations marked professional), Peer Review &
  Panels (the `peer-review` list), Service & Committees (`service`). The `2page` preset MUST list
  the group with the sub-sections it lists today (Peer Review & Panels, Service & Committees).
- **FR-006**: A presentation MUST be able to carry a professional mark; a marked presentation that
  is not `organizer` MUST list in Professional & Software Talks and in no science talk section.
- **FR-007**: A presentation MUST accept `role`, meaning my part in the event (data-model
  FR-036), and its CV heading MUST print title, role, then its place as today.
- **FR-008**: Every "Role: …" detail line MUST be migrated: where it states a role, the role moves
  to `role` and any remainder stays a detail line at the same index; where it is a description,
  it stays at the same index without the "Role: " prefix. No "Role: " prefix remains in the data,
  enforced by a test.
- **FR-009**: Where FR-008 removes a line, every saved selection the owner keeps (the Hubble
  selection) MUST be migrated so each item ticks the same text; a migration step MUST exist that
  does this for any saved selection given to it.
- **FR-010**: "From JAX to Galax" and the Astropy Core Developer Conference talk MUST be marked
  professional.
- **FR-011**: Every preset MUST list the same items overall before and after; only their sections
  change as FR-005 and FR-006 say.
- **FR-012**: Teaching, Outreach and Students Advised & Mentored MUST stay sections of their own,
  outside the group.

### Key Entities

- **Section group**: a heading with an ordered list of sub-sections; listed by a preset as a
  section is.
- **Sub-section**: a section (match or list) that renders under a group's heading.
- **Professional mark**: on a presentation, says it is about software or the community, not
  science.
- **Presentation `role`**: my part in an event (SOC, LOC, Organizing Committee, Core Developer).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The complete CV has exactly one "Professional Activities" heading, with five
  sub-headings in the order of FR-005.
- **SC-002**: 100% of `organizer` presentations list in Conferences Organized with a role on the
  heading line; 0 detail lines in the data start with "Role:" (today: 18).
- **SC-003**: The two professional talks appear only in Professional & Software Talks.
- **SC-004**: The owner's Hubble selection compiles to the same detail-line text for every item
  before and after.
- **SC-005**: Every preset lists the same item ids before and after.
- **SC-006**: The one-page and two-page CVs keep their page counts.

## Assumptions

- The sub-section headings are those of FR-005; "Service & Committees" keeps today's service items
  (committees, the Sigma Nu board, CASCA membership); splitting memberships out is not asked for.
- `kind` keeps meaning how a talk came about; the professional mark is separate from it.
- The group's sub-headings are visually subordinate to section headings (smaller, no icon); the
  exact look is settled in the plan, in both the PDF and HTML styles.
- MasseyScope's merge (PR #487) is independent; this feature migrates whatever "Role:" lines exist
  when it is implemented.
- Selections other than the Hubble one are not known to exist; FR-009's migration step can be run
  on any that turn up.

## On landing *(mandatory)*

When the feature lands, fold this spec's requirements into the area spec named
in **Folds into** — rewritten there as its current contract — and delete this
folder in the same PR (constitution, Article X).
