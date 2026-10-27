# Contract: saved selection v2

`format: "starkman-cv-selection"`, `version: 2`. Same fields as v1; `order` may also name a group
id (`"professional"`).

## Reading a v1 file

`decode()` accepts v1 and migrates it, so the builder and `npm run build:cv` read old files
unchanged:

1. **Detail lines** — for each of `jaxtronomy-workshop`, `division-of-dynamical-astronomy-56`,
   `astropy-coordination-meeting`, `astrophysics-and-space-science-in-marche-iii-big-bang-big-st`,
   `gaia-hackathon`, `gaia-hackathon-2`, `astropy-core-developer-conference-talk`: drop index 0,
   subtract 1 from every other index. An item left with none has no entry.
2. **Section settings** — a value keyed `conferences` (in `heading`, `locationAt`, `prefix`,
   `columns`, `tally`) is copied to `conferences-organized` and `conferences-attended`; a key
   `conferences.<part>` in `spacing` or `place` likewise; the `conferences` keys are dropped.
3. **Order** — `conferences`, `peer-review` and `service` are removed from `order` and
   `professional` is put at the first position any of them held.

Nothing else changes. A v2 file is read as is; a v3 or later is refused, as today.

## Guarantee

For every item, the detail lines a v1 selection printed before this feature are the lines it
prints after (spec SC-004).
