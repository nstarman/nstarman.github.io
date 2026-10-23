# Implementation Plan: research-kit

**Branch**: `002-research-kit` | **Date**: 2026-10-23 | **Spec**: [spec.md](spec.md)

## Summary

Turn the data layer into a store (`@nstarkman/data-resolver`) that the website builds from `data/` and a
paper site builds from a snapshot of raw records; move the card (`Card`, `Publication`, the card-name
interpreter, presets) and the collaborator map into packages that reach the store through an aliased
import; ship the three and an umbrella (`@nstarkman/research-kit`) at one version from one tag. Add
`cards/<id>.json` with a `paperSite` preset, and allow grants in a paper's `refs`. The site renders
exactly as before ([research](research.md)).

## Technical Context

**Language/Version**: JS (ES modules), Astro 7 components; Node 22 (CI), Node 24 (release)
**Primary Dependencies**: none new (the packages reuse what the site has)
**Storage**: `data/`, `config/` (unchanged); `cards/` (new, choices only)
**Testing**: vitest; the page diff; a fixture paper site built offline
**Project Type**: website + four workspace packages
**Constraints**: no visible change (SC-001); no network in tests (Art. VIII); one card interpreter (Art. VII)
**Scale/Scope**: ≈ 30 importers of `data.js` unchanged; Card/Publication/CollabMap and 5 lib files move

## Constitution Check

| Article | Check | Status |
|---|---|---|
| I One source of truth | snapshots are raw records copied by a tool, never edited; derived values never stored | ✅ |
| II One item, one file | `cards/<id>.json` is configuration, not an item; outside `data/` | ✅ |
| III Identity is permanent | no URL or id changes; `/embed/` unchanged | ✅ |
| IV Closed vocabularies | no new `rel`/type; grants already a type; `refs` already open | ✅ |
| V Data is honest | nothing hand-copied; the snapshot keeps the source commit | ✅ |
| VI BibTeX | untouched | ✅ |
| VII Renderers read | the card interpreter moves whole into a package the site imports; a new look is a preset (`paperSite`) | ✅ |
| VIII Failures loud, no network | readers injected; tests use disk and a fake GitHub; a missing file fails naming it | ✅ |
| IX Gates | new tests in `test:unit`; CI unchanged; release job reruns them | ✅ |
| X Specs as they are | folds into cards, renderers, data-model specs; folder deleted on landing | ✅ (on landing) |

## Project Structure

```text
packages/data-resolver/     store.js (createStore: today's data.js functions), collect.js, readers.js
packages/card-builder/      Card.astro, Publication.astro (+ Byline, Venue, VenueBits, ButtonList, LinkIcon(s),
                            SoftwareRow, Inline), cardname.js, cards.js, maths.js, inline.js
packages/collaborator-map/  CollabMap.astro, collabmap.js, places.js (locate over the store), map.css
packages/research-kit/      package.json (three deps, one version), index re-exports
src/lib/data.js             builds the store from the glob + config; re-exports its functions
astro.config.mjs            alias @nstarkman/research-store → src/lib/data.js
cards/                      <id>.json (choices); schema/card.schema.json
.github/workflows/release-research-kit.yml
tests/research-kit.test.js, tests/fixtures/paper-site/
```

**Structure Decision**: four workspace packages beside `site-layout`; components that only the website
uses stay in `src/`.

## Phases (for /speckit-tasks)

1. Store: `createStore` in the package; `data.js` re-exports; page diff unchanged.
2. Card: move the card's components and libs; alias; page diff unchanged.
3. Map: move it; `people` prop for one paper; page diff unchanged.
4. Collect: `collect`, readers, the snapshot; disk ≡ fake GitHub for every item.
5. `cards/` + `paperSite` preset; grants in `refs`.
6. research-kit, one version, release workflow; fixture paper site.
7. Docs (AGENTS.md, area specs folded), folder deleted.

## Complexity Tracking

| Deviation | Why | Simpler alternative rejected |
|---|---|---|
| A consumer-supplied alias (`@nstarkman/research-store`) | package components must reach a store the consumer builds | threading a prop through ~20 call sites |
