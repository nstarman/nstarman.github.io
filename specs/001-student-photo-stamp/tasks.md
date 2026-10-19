# Tasks: Student photo stamp

**Input**: Design documents from `/specs/001-student-photo-stamp/`

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Foundational

- [x] T001 [US1] Grammar part `students:<word|photo>` in `parseName`/`formatName` (`src/lib/cardname.js`); tests in `tests/cards.test.js`
- [x] T002 [US1] `data-stuphoto` in `cardFace`; test in `tests/cards.test.js`
- [x] T003 [US1] `photo` on `studentStamp` entries (`src/lib/cards.js`); test in `tests/cards.test.js`

## Phase 2: User Story 1 — A student's face (P1) 🎯 MVP

- [x] T004 [US1] Render the photo in the stamp (`src/components/Card.astro`)
- [x] T005 [US1] Circle, ring and word hiding in `src/styles/global.css`; photo ¾ of a button high
- [x] T006 [US1] Re-record `tests/fixtures/software-cards.json` (hash only)

## Phase 3: User Story 3 — Builder and exports (P3)

- [x] T007 [P] [US3] Word/photo control in `src/lib/cardbuilder/model.js` and `builder.js`; test in `tests/cardbuilder.test.js`
- [x] T008 [US3] Confirm SVG/PDF exports draw the circle with no export change

## Phase 4: User Story 2 — The site uses it (P2)

- [x] T009 [US2] `students:photo` on the `carousel` preset (`src/lib/cards.js`)
- [x] T010 [P] [US2] Photos for Charlotte, Amir, Taisiia and Sirui in `public/people/`

## Phase 5: User Story 4 — Level with the buttons (P2)

- [x] T011 [US4] `placeOf` defaults up-and-down to `center` under the words or at the bottom; tests updated in `tests/cards.test.js`
- [x] T012 [US4] Browser check: stamp centre within 1px of the buttons' centre (SC-002)

## Phase 6: Polish

- [x] T013 Update `specs/cards/spec.md`: the `students` row, the `<place>` default, the students paragraph, the left-out parts list, the carousel's use (Article X)
- [x] T014 Re-record the fixture after the CSS change; run all six gates and the CV page counts
- [x] T015 Delete `plan.md`, `tasks.md` and `checklists/` before merge, keeping `spec.md` (Article X)
