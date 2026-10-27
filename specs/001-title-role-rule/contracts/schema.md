# Contract: the item schema for `title`, `role`, `fellowship`, `position`

What `schema/item.schema.json` accepts and rejects after this feature. Published records
(`/records/<id>.json`) carry the same fields, so this is also what an outside reader sees.

## Descriptions (identical wherever the field appears)

- `title`: "The name of the thing this records: a job title for a plain job; otherwise the
  program, fellowship, grant, award, course, committee, package or event."
- `role`: "My part in the thing the title names — Postdoctoral Fellow, Co-I, TA, Volunteer,
  lead developer. Leave it out when the title already is my part; it never repeats the title."

## Accepts

| type | gains | loses |
|---|---|---|
| `fellowship` (new) | `tier` (required), `institution`, `institutionNames`, `funder`, `role`, `amount`, `declined`, `location` | — |
| `award` | `role` | — |
| `position` | — | `tier`, `amount`, `funder` |

All other types unchanged.

## Rejects (fixtures in `schema/invalid/`)

| fixture | why |
|---|---|
| `position-with-tier.json` | a position is a post; an awarded one is a fellowship |
| `fellowship-without-tier.json` | a fellowship sorts by tier, as a grant |

## Rejected by test, not schema

- A `role` whose stemmed tokens occur contiguously in its `title`'s (research.md R2) —
  `tests/integrity.test.js`, one failure per item, naming it.

## Compatibility

- `/records/<id>.json` for the seven fellowships changes `type`; for Brinson, `institution`
  changes and `funder` appears. No id or URL changes.
- A research-kit snapshot of a paper whose `refs` reach a fellowship receives `type:
  "fellowship"`; none does today.
