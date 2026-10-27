# Contract: `preset` in a selection

## File

```jsonc
{ "format": "starkman-cv-selection", "version": 2, "preset": "1page", "items": [ … ], … }
```

- `encode(sel)` writes `preset` when the selection has one.
- `decode(text)` returns `preset` as written when it is a string; otherwise absent.
- `loadReport` adds a line when `preset` names no preset: it lays out as the complete CV.

## `modelFromSelection(sel)`

For `sel.preset` = P naming a preset (else P = `complete`):

- `model.preset === P`, `model.label === preset(P).label`, `model.detail === preset(P).detail`.
- For every section id S in P: the section's `groups` are what P's `groupBy` for S makes of the ticked
  items (none when P sets `groupBy: null`).
- Everything else as before this feature.

Invariant: for each preset P, a selection holding P's resolved ids, `preset: P` and P's recorded
options gives a model whose `preset`, `label`, `detail`, section ids, item ids per section and
section `groups` equal `cvModel(P)`'s.

## CLI

`npm run build:cv -- <file>` goes through `modelFromSelection`, so it follows; no change of its own.
