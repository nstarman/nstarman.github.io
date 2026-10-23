# Data model

## Snapshot (`collect(id, read)` → a paper site's `docs/card.json`), schema 1

```json
{
  "schema": 1,
  "root": "stream-convexity-spatial",
  "source": { "repo": "nstarman/nstarman.github.io", "ref": "main", "sha": "<commit>" },
  "items": [ { "...": "each reached item exactly as in data/, without `internal`" } ],
  "config": {
    "stars": { "<repo>": 123 }, "journals": { "...": "only venues used" },
    "collaborators": { "people": [ "...only the co-authors" ] }, "places": { "...": "only places used" }
  },
  "card": { "preset": "paperSite" }
}
```

Reached from the root: `refs` (software, grants, highlight items), the root's `highlight`, mentees named on
its authors (`mentee`), `preliminaryOf` partners. Adding an optional field keeps schema 1.

## `cards/<id>.json`

`{ "$schema": "../schema/card.schema.json", "preset": "<SITE_PRESETS key>" }` — no other facts.
