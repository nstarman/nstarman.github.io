# Contract: saved selection v2

`format: "starkman-cv-selection"`, `version: 2`. v1's fields plus `groups`, the section groups
switched on (`["professional"]`; absent = none). With a group on, `order` may name its id.

## Reading a v1 file

`decode()` accepts v1 and migrates it, so the builder and `npm run build:cv` read old files
unchanged:

1. **Detail lines** — for each of `jaxtronomy-workshop`, `division-of-dynamical-astronomy-56`,
   `astropy-coordination-meeting`, `astrophysics-and-space-science-in-marche-iii-big-bang-big-st`,
   `gaia-hackathon`, `gaia-hackathon-2`: drop index 0, subtract 1 from every later index; for
   `astropy-core-developer-conference-talk`, whose line 0 is its talk's title, the same with index
   1. An item left with none has no entry.
2. **Section settings** — a value keyed `conferences` (in `heading`, `locationAt`, `prefix`,
   `columns`, `tally`) is copied to `conferences-organized`, `conferences-attended` and
   `talks-professional`; a key `conferences.<part>` in `spacing` or `place` likewise; the
   `conferences` keys are dropped.
3. **Order** — `conferences` in `order` is replaced by those three ids, in that order.
4. **Groups** — none; a v1 file is ungrouped, as it was.

Nothing else changes. A v2 file is read as is; a v3 or later is refused, as today.

## Guarantee

For every item, the detail lines a v1 selection printed before this feature are the lines it
prints after (spec SC-004).
