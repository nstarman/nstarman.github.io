# Research: one meaning for `title` and `role`, one type for fellowships

Every unknown from the plan's Technical Context, resolved. Code paths are from `main` at
`46ae3a4`.

## R1. Where `type` is switched on — what `fellowship` must reach

- **Decision**: add `fellowship` at each of these, in the same PR (Article IV):
  | where | today | change |
  |---|---|---|
  | `schema/item.schema.json` type enum + an `allOf` branch | 13 types | add `fellowship` with its fields (data-model.md) |
  | `config/presets.json` `grants-major` | `type: [grant, position]` | `[grant, fellowship]` |
  | `config/presets.json` `positions` | `position`, `not: tier` | `position` (the `not` goes: no position has a tier) |
  | `src/lib/cvmodel.js` `subject()` | cases `position`, `grant` | add `fellowship`; route every type through one rule (R3) |
  | `src/components/CvTimelineItem.astro:92` funder toggle | `['award','grant']` | add `fellowship` |
  | `src/pages/index.astro:17` Background | `byType('position','education')` | add `fellowship` (R5) |
  | `tests/placefmt.test.js:41`, `tests/presets.test.js` "a fellowship" | lists `position`/`grant` | add `fellowship`; rewrite the fellowship test |
- **Not affected**: cards (`CARD_TYPES` is publication/highlight/software), `/records/` (writes
  every item whatever its type), the collaborator map (ORCID roles), BibTeX (publications),
  `research-kit` `collect` (follows `refs`; no paper refs a fellowship today — checked: the only
  inbound ref to any of the seven is `mit-postdoc` → Brinson). `amount`/`declined` handling in
  `cvmodel.js` tests `type !== 'award'`, so a fellowship already prints its amount.
- **Alternatives**: `grant` + host field (rejected by the user: Q1); `position` (rejected).

## R2. The repetition test (FR-006)

- **Decision**: tokenize `title` and `role` (lowercase, split on non-letters/digits), stem each
  token by dropping a trailing `ship` then a trailing `s`; fail when the role's whole token
  sequence occurs contiguously in the title's. "Prize Fellow" ⊂ "Brinson Prize Fellowship" →
  fail; "Junior Fellow" ⊂ "Massey Junior Fellow" → fail; "Postdoctoral Fellow" vs "Brinson Prize
  Fellowship" → pass; "Fellow" vs "… Fellowship" → fail (it says nothing the title doesn't).
  Lives in `tests/integrity.test.js` beside the other whole-data rules, naming each item.
- **Rationale**: the rule is "the role says something the title does not", and a contiguous
  stemmed match is the smallest test that catches every repeat in today's data and passes every
  role that adds information.
- **Alternatives**: any shared word (flags "Postdoctoral Fellow"/"Fellowship" falsely);
  fuzzy similarity (opaque threshold, hard to explain in a failure).
- **Not tested**: the org repeating in the title ("Case Western Reserve University Merit
  Scholarship", funder CWRU) — many award names legitimately contain their funder. Review only.

## R3. One row rule (FR-007)

- **Decision**: `subject()` becomes one expression for every type that has a role:
  `[role, who]` joined by ", ", after the bold title. `who` is, by type: `position`,
  `education`, `teaching` → institution (with `institutionNames`); `grant`, `award` → funder
  (unless `funderOff`); `fellowship` → funder unless `funderOff`, else host `institution`;
  `service`, `outreach` → organization ?? institution; `media` → outlet. Presentation and
  mentoring keep their own subjects.
- **Rationale**: today `teaching`/`service`/`outreach`/`award` fall into `default:` which never
  prints `role`; moving roles out of titles without this would drop them from the CV.
- **Fellowship `who`**: the funder is what names the honour ("Brinson Foundation"); the host is
  usually also in a `refs`'d post (MIT). `funderOff` already exists per item in presets and
  selections, so switching the funder off falls back to the host rather than to nothing.

## R4. Migration wording (FR-001/FR-002/FR-009/FR-011)

- **Decision**: the per-item table in data-model.md. Titles keep the thing's name; the role
  moves out; where the role would repeat the title, it is dropped. Brinson's role is
  "Postdoctoral Fellow" (FR-009) and its `institution` becomes the host, MIT Kavli; "Brinson
  Foundation" moves to `funder`.
- **Detail lines don't move** (FR-010): only `title`, `role`, `type`, `institution`, `funder`
  change; `details` is untouched, so saved selections tick the same lines.
- **Open for the user's review in the PR**: Pacific's role ("Visiting Fellow") and Goldwater's
  ("Honorable Mention") are judgement calls; the table marks them.

## R5. The landing page's Background

- **Decision**: include `fellowship` in Background's `byType`, keeping the `2page` filter, so
  Brinson (the only `2page` fellowship) stays where it is. Its second part reads its
  `institution`, which becomes MIT Kavli — "Brinson Prize Fellowship, MIT Kavli Institute for
  Astrophysics and Space Research".
- **Alternative**: drop fellowships from Background (the MIT row already names Brinson). Rejected
  for now: the spec does not ask to change the landing page.

## R6. Out of scope, deliberately

- **"Role: …" detail lines** — 18 items (conference "Role: SOC/LOC", TA descriptions) carry a
  role-like first detail line. Moving them into `role` shifts every later line's index and
  breaks saved selections (FR-010); and `presentation` does not accept `role`. A follow-up
  feature, with a selection migration, can take them.
- **Teaching's `course`**: accepted, never set. Left alone; the course name stays the title.
- **Unifying `institution`/`organization`/`funder`/`outlet`**: out of scope per the spec.

## R7. Pending PRs

- **Decision**: #480 (Pacific), #482 (Massey), #483 (Brinson) are superseded — close them when
  this PR opens, linking it. #481, #484 and #485 touch no file this feature changes, so they land
  independently.
