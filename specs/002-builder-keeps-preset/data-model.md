# Data model: a selection's preset

## Selection (`starkman-cv-selection`, version 2)

| field | value | absent |
|---|---|---|
| `preset` | a key of `config/presets.json` (`complete`, `np`, `2page`, `1page`) | `complete` |

- Set by Start from (that preset) and by loading a file (the file's); the last wins.
- A value that names no preset: kept by `decode()`, laid out as `complete`, reported by `loadReport`.
- No version change.

## Render model, from a selection

| model field | from |
|---|---|
| sections, items, lines | resolved against `complete`, narrowed by the ticks (unchanged) |
| `preset`, `label`, `detail` | the selection's preset |
| a section's `groups` | its `groupBy` in the selection's preset, where that preset has the section; else `complete`'s |
| `spacing`, `card`, `place`, `heading`, `columns`, inline recipients, … | the selection (unchanged) |
