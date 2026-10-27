# Data model: the tally option

## `tally` (a preset section's, and a selection's by section id)

| value | counts | h-index |
|---|---|---|
| `true` | the list's papers | none |
| `{ "hIndex": "ads" \| "scholar" \| "scholar-since" }` | the list's papers | that source's |
| `{ "of": "record" }` | the whole record | none |
| `{ "of": "record", "hIndex": … }` | the whole record | that source's |

Absent `of` is the list. Any other `of` value is dropped by `decode()` (counts the list).

## The whole record

Every `publication` whose `status` is not `in-prep`. A count — of the list or the record — never
includes an in-prep paper.

## Presets

`1page` and `2page` `publications`: `"tally": { "of": "record" }`.

## Selection

No version change: `of` is a new optional key inside an existing field; a file without it means
what it meant.
