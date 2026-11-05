# Feature Specification: Collaborators placed from their paper affiliations

**Feature Branch**: `claude/collaborator-paper-affiliations`

**Created**: 2026-11-05

**Status**: Draft

**Folds into**: specs/refresh/spec.md — FR-011 (the collaborator file) and FR-012 (its yearly refresh issue)

**Input**: User description: "Collaborators with an empty ORCID record fall back to their paper affiliations. Today `scripts/collect-collaborators.mjs` (specs/refresh FR-011) builds `config/collaborators.json` only from public ORCID employments and educations, and an empty record stays an empty `affiliations`, so the person cannot be placed on the collaborator maps (the site's and a paper site's, e.g. Jagjit Singh Sidhu on the macro-lightning paper; 5 of 65 collaborators). When a collaborator's ORCID record has no employment and no education, the collector instead takes the affiliations recorded for that person on the site's own items (the `affiliation` of their author entry in `data/`), one entry per distinct institution, dated by the papers it appears on, marked as coming from a paper rather than ORCID, and placed through the same institution spelling and one-city-per-institution rules. ORCID data, when present, always wins; nothing is guessed beyond what an item records; a person with neither stays empty."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A co-author with an empty ORCID appears on the map (Priority: P1)

A co-author lists nothing on ORCID, but one of my papers on the site records where they were when
we wrote it. After the collaborator refresh, that co-author appears on the collaborator maps (the
site's, and a paper site's built from the site's data) at that institution, for the years of the
papers that record it.

**Why this priority**: It is the whole point: today such a co-author is missing from every map, which
reads as if they were not a collaborator. Jagjit Singh Sidhu on the macro-lightning paper is the case
that prompted it.

**Independent Test**: Run the collector on the current data. Sidhu's entry gains one affiliation,
Case Western Reserve University in Cleveland, dated 2020-06, marked as from a paper; the
macro-lightning paper site's map shows four people instead of three.

**Acceptance Scenarios**:

1. **Given** a co-author whose public ORCID record has no employment and no education, and one item
   whose author entry for them records an affiliation naming an institution, **When** the collector
   runs, **Then** their entry lists that institution once, with its place, dated by that item, and
   marked as taken from a paper.
2. **Given** the same co-author on several items that name the same institution in different
   spellings, **When** the collector runs, **Then** they get one entry for it, spelled as the file
   spells it elsewhere, dated from the earliest to the latest of those items.
3. **Given** the same co-author on items naming two different institutions, **When** the collector
   runs, **Then** they get two entries, newest first, like any history in the file.

---

### User Story 2 - ORCID stays the source whenever it says anything (Priority: P1)

A co-author who lists even one employment or education on ORCID keeps exactly the history ORCID gives,
whatever my items record.

**Why this priority**: The file is a record of what people publish about themselves; mixing sources
for one person would make it neither.

**Independent Test**: Run the collector before and after the change; every person whose ORCID record
is not empty has a byte-identical entry.

**Acceptance Scenarios**:

1. **Given** a co-author with any ORCID employment or education, **When** the collector runs,
   **Then** their entry is what ORCID gives and nothing from the items.
2. **Given** a co-author who later adds a position to ORCID, **When** the next refresh runs, **Then**
   their paper-derived entries are replaced by the ORCID history, and the yearly refresh issue shows
   that change.

---

### User Story 3 - Nothing is guessed (Priority: P2)

When neither ORCID nor any item says where a co-author was, they stay empty, and when an item's
affiliation cannot be tied to a known institution and place, it is left out and reported, not placed
somewhere plausible.

**Why this priority**: A wrong pin on a map is worse than a missing one.

**Independent Test**: Nicholas Earl and E. Sola (items record no affiliation) and the two people who
appear on no item stay empty; the collector's report lists them.

**Acceptance Scenarios**:

1. **Given** a co-author with an empty ORCID record whose items record no affiliation, **When** the
   collector runs, **Then** their `affiliations` stays empty.
2. **Given** an item affiliation that names no institution the collector can place, **When** the
   collector runs, **Then** it adds nothing for it and its report names the person and the
   unplaced affiliation text.

### Edge Cases

- An affiliation string names a department and a university ("Physics Department/CERCA/ISO, Case
  Western Reserve University, Cleveland, Ohio 44106-7079, USA"): the institution is the university;
  the department is not a separate entry.
- An affiliation names two institutions (a joint appointment): each becomes its own entry.
- An item has no date precision beyond a year: the entry is dated to that year.
- The ORCID lookup fails (network, unreadable record): the person is treated as unreadable, not as
  empty, and gets no paper fallback that run; FR-011's existing behaviour for an unreadable record
  holds.
- The site's own author (`me: true`) is never given paper-derived entries.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When a collaborator's public ORCID record is read and has no employment and no
  education, the collector MUST build their `affiliations` from the `affiliation` of their author
  entries (matched by ORCID iD) on the site's items.
- **FR-002**: Each paper-derived entry MUST be one institution, with the same place fields as an
  ORCID entry (organization, city, region, country), a `start` and `end` taken from the earliest and
  latest dates of the items that record it, no role, and a kind that marks it as from a paper.
- **FR-003**: Paper-derived institutions MUST go through the same spelling and one-place-per-
  institution rules as ORCID ones (FR-011), so the same institution is spelled and placed one way
  across the whole file.
- **FR-004**: An item affiliation MUST yield an entry only when it names an institution the collector
  can place from known data: an institution some collaborator's ORCID history already names (the
  site's place list is not used, since it also holds talk venues). Otherwise it yields nothing and
  the collector reports it.
- **FR-005**: A collaborator with any ORCID employment or education MUST get only ORCID entries.
- **FR-006**: A collaborator with neither ORCID data nor a placeable item affiliation MUST keep an
  empty `affiliations`.
- **FR-007**: The fallback MUST send nothing anywhere: it reads only the site's own items. FR-011's
  rule that only the ORCID iD is sent still holds.
- **FR-008**: The file's description MUST say that an entry marked as from a paper comes from the
  site's items, and that an empty `affiliations` now means neither ORCID nor any item records one.
- **FR-009**: The collaborator maps MUST place paper-derived entries exactly as they place ORCID
  ones.
- **FR-010**: The yearly refresh issue (FR-012) MUST show paper-derived entries in its diff like any
  other change.

### Key Entities

- **Collaborator**: a person with an ORCID iD who co-authored an item; has a history of
  affiliations.
- **Affiliation entry**: one institution with its place and dates; now from ORCID (employment or
  education) or from a paper.
- **Item affiliation**: the free-text `affiliation` on an author entry of an item in `data/`,
  as published on that paper.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Jagjit Singh Sidhu is placed on the collaborator maps at Case Western Reserve
  University, Cleveland, and the macro-lightning paper site's map shows all four of its authors.
- **SC-002**: Every collaborator whose ORCID record is not empty has an unchanged entry after the
  change.
- **SC-003**: No collaborator gains an entry whose institution does not appear, in some spelling, in
  an item affiliation for them.
- **SC-004**: Every collaborator still empty after a run is listed in the collector's report with
  the reason (no item affiliation, or affiliation not placeable).

## Assumptions

- Only items in `data/` are read. People who appear only in the acknowledgements list are out of
  scope; they stay empty unless ORCID fills in.
- Item affiliations come from the published papers (FR-020 fills them from ADS), so they are the
  person's affiliation at that time, which is why entries are dated by the items.
- The maps need no visual difference between ORCID and paper-derived entries; the marker is for the
  record and the refresh issue.
- A department, centre or institute inside a university is placed at the university.

## On landing *(mandatory)*

When the feature lands, fold this spec's requirements into the area spec named
in **Folds into** — rewritten there as its current contract — and delete this
folder in the same PR (constitution, Article X).
