# Research: collaborators placed from their paper affiliations

## R1. Which institution does a free-text affiliation name?

**Decision**: split the affiliation on commas, semicolons and slashes; a part names institution X
when its key (`orgKey`: lower-case, letters and digits only) equals the key of an organization that
some collaborator's ORCID history already lists. The canonical spelling and place of X are then the
ones the collector already computes. A part that matches nothing adds nothing.

**Rationale**: ADS affiliations put the institution as its own comma-separated part ("Physics
Department/CERCA/ISO, Case Western Reserve University, Cleveland, Ohio 44106-7079, USA"). Matching
whole parts against names the file already holds is the only way to pick the institution out
without guessing which part it is (spec FR-004, US3). It also guarantees a place: every ORCID
organization goes through `geocode-places.mjs`, so it has a pin or is already listed as unplaced.

**Alternatives rejected**:
- *Heuristic ("the part containing University/Institute/…")*: a guess; it would place "Dunlap
  Institute" and "University of Toronto" as two institutions, and fails on names without a keyword.
- *Also match the keys of `config/places.json`*: that file mixes institutions with presentation
  places ("A Coruña, Spain"), so a part such as a city could match a talk venue. The spec's "or the
  site's place configuration" is narrowed to ORCID organizations; the fold says so.
- *Prefix containment, as `canonicalOrganizations` does*: it needs both sides' country to agree, and
  an item affiliation has no structured country. Exact key match only.

## R2. Dates

**Decision**: `start` is the earliest and `end` the latest `date.start` of the items that record
that institution for the person, at the precision each item has.

**Rationale**: an item's date is when the paper appeared, which is when the printed affiliation held
(spec Assumptions). Article V forbids adding precision. `affiliationAt(orcid, item date)` then finds
the entry for that very paper, since the comparison is inclusive at equal precision.

**Note**: a year-only `end` compared with a later month in the same year ("2020" vs "2020-06") does
not cover it. ORCID's year-only dates already behave this way; nothing new.

## R3. Empty versus unreadable

**Decision**: the fallback runs only when both ORCID sections were read and returned no entries. A
failed request keeps today's behaviour (empty, logged) with no fallback.

**Rationale**: spec edge case; otherwise a network failure would silently swap a person's history
for their paper affiliations.

## R4. `--new` runs

**Decision**: a person already in the file keeps their stored entry under `--new` (today's rule); a
new person gets the fallback when their ORCID is empty. A full (yearly) run recomputes everyone.

## R5. Marker

**Decision**: `kind: "paper"` beside `employment` and `education`; `role: null`.

**Rationale**: `kind` is already the field that says where an entry came from. Nothing in `src/`,
`packages/` or `scripts/` reads `kind` (searched 2026-11-05), so the maps place the entry like any
other (spec FR-009) with no renderer change. `config/collaborators.json` has no schema; the value set
is documented in the file's `$comment` and the area spec.
