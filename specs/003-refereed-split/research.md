# Research: Refereed split

- **Decision**: `refereed: "journal" | "proceedings" | false`, required. **Rationale**: the maintainer's need is "refereed journal", and a peer-reviewed workshop paper is refereed but not a journal. **Alternatives**: boolean (cannot tell the workshop paper apart); deriving from `entryType`/`venue.journal` (submitted papers are `@misc`, and `galactic-amnesia` has no venue yet).
- **Decision**: split is opt-in per section (`"split"`), not a new `groupBy`. **Rationale**: `groupBy: "status"` stays the inner order inside the journal run; a selection had no way to set `groupBy`. **Alternatives**: `groupBy: "refereed"` — loses the status runs.
- **Decision**: run headings ride on the existing `groups` list as `heading`. **Rationale**: the PDF already walks `groups`; one optional field, absent when off, keeps old models identical.
