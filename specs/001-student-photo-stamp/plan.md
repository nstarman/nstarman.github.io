# Implementation Plan: Student photo stamp

**Branch**: `feature/student-photo-stamp` | **Date**: 2026-10-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-student-photo-stamp/spec.md`

## Summary

A new card-name part, `students:photo`, read by `cardFace` into `data-stuphoto`;
`Card.astro` always renders each student's photo (from `studentStamp`) beside
the word, and CSS shows one or the other. The `carousel` preset opts in. A
place with the buttons now defaults to the middle of their row in `placeOf`.

## Technical Context

**Language/Version**: JavaScript (ES modules), Astro 5 static site
**Primary Dependencies**: Astro; sharp (images, existing); Playwright (fixture recording only, `--no-save`)
**Storage**: JSON in `data/`; images in `public/people/`
**Testing**: vitest (`tests/cards.test.js`, `tests/cardbuilder.test.js`, `tests/cardlayout*.test.js`); `npm test` gates
**Target Platform**: static site, embeds, SVG/PNG/PDF exports
**Project Type**: web (static)
**Constraints**: the name's grammar round-trips; `cardFace` is the one interpreter; embeds render every part
**Scale/Scope**: one grammar part, one face attribute, one preset, one default

## Constitution Check

- **I/VII** One source, renderers read: the photo comes from the mentoring record; `cardFace` decides, CSS draws. ✅
- **IV** Closed vocabularies: no `link.rel` or `type` added. ✅
- **VII** "Never a class of its own": the look is a name part, used through a preset. ✅
- **IX** Gates and tests: grammar, face, stamp and builder tests; fixture re-recorded. ✅
- **X** Specs as they are: `specs/cards/spec.md` updated in this PR; this folder keeps `spec.md` alone when it lands. ✅

## Project Structure

### Documentation (this feature)

```text
specs/001-student-photo-stamp/
├── spec.md              # kept
├── plan.md              # this file — deleted before merge (Article X)
├── tasks.md             # deleted before merge
└── checklists/          # deleted before merge
```

### Source Code (repository root)

```text
src/lib/cardname.js           # grammar part, cardFace attribute, placeOf default
src/lib/cards.js              # studentStamp photo; carousel preset
src/components/Card.astro     # the photo in the stamp
src/styles/global.css         # the circle, its ring, the word hidden
src/lib/cardbuilder/          # word/photo control (model.js, builder.js)
specs/cards/spec.md           # grammar reference and requirements
tests/                        # cards, cardbuilder; fixtures/software-cards.json
```

**Structure Decision**: extend the existing card modules; no new files but the spec.

## Complexity Tracking

None.
