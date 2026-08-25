<!--
  Adding an item? Fill in the first section and delete the second.
  Changing code, schema or templates? Delete the first and fill in the second.
  Conventions live in AGENTS.md.
-->

## Adding an item

**Type:** <!-- publication | software | education | position | award | grant | presentation | mentoring | teaching | service | media | outreach -->
**File:** `data/<date.start>-<id>.json`
**In CV presets:** <!-- np / 2page / 1page — or "none".
                        The "complete" CV takes everything regardless. -->

- [ ] One item, one new file — nothing else touched
- [ ] `id` is lowercase-kebab, and the filename is `<date.start>-<id>.json`
- [ ] Every `link.rel` is from the closed vocabulary, and every URL resolves
- [ ] Elaboration is in `details`, not `summary` (`details` is dropped from the short CVs)
- [ ] `npm run test:schema` passes locally

**Publications only**

- [ ] Authors are `family`/`given`, not display strings
- [ ] The author list is complete and in order — not pre-truncated with "et al."
- [ ] `entryType` is the right BibTeX type (`misc` for a preprint, not `article`)
- [ ] `bibcode` set if the paper is on ADS — and no separate ADS link added

---

## Changing code or schema

**What and why:**

- [ ] `npm run test:schema` passes
- [ ] If a `link.rel` value or a `type` was added, every renderer was updated in this PR
- [ ] If a constraint was added, `schema/invalid/` gained a fixture proving it is enforced
