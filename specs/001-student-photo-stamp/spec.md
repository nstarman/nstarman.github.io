# Feature Specification: Student photo stamp

**Feature Branch**: `feature/student-photo-stamp`
**Created**: 2026-10-19
**Status**: Implemented
**Input**: User description: "Add an option to the card to have the 'student' in the author placement be replaced by a circular photo, so it's e.g. '[photo] 1st'." Then: use it on the site; make the photo bigger; vertically centre the authorship text on the buttons' row for all cards.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A student's face beside their authorship (Priority: P1)

A reader of a paper card sees who my student was at a glance: where the card
shows my students' positions, each student with a photo on their mentoring
record appears as a small circular photo before their position — "[photo] 1st |
2nd" — instead of the word "student‡".

**Why this priority**: it is the feature; it makes the mentoring visible on the
cards a committee looks at.

**Independent Test**: open `/embed/pinns-mnras/?card=…-extras:position,students-students:photo-…`;
the stamp shows Charlotte's photo then "1st", and links to her profile.

**Acceptance Scenarios**:

1. **Given** a paper with a mentee author who has a photo, **When** its card's
   name has `students:photo`, **Then** that author's stamp is the photo, ringed
   in their level's colour, then their position; the word and its †/‡ are not
   shown.
2. **Given** the same card without `students:photo`, **Then** the stamp reads
   "student† 1st" as before.
3. **Given** a mentee author with no photo, **When** the name has
   `students:photo`, **Then** their stamp keeps "student‡ 1st".

---

### User Story 2 - The site uses it (Priority: P2)

The research carousels, and the mentee profiles that share their preset, show
photos without any reader choosing to.

**Why this priority**: the owner asked for the site to use the feature.

**Independent Test**: `/research/` and `/people/charlotte-myers/` show
Charlotte's photo in the stamp of both PINNs cards.

**Acceptance Scenarios**:

1. **Given** the `carousel` preset, **Then** its name includes `students:photo`.
2. **Given** an embed page with no `?card`, **Then** its default card is
   unchanged (photos are opt-in there, since other sites embed it).

---

### User Story 3 - Builders and exports (Priority: P3)

Someone making a card in the Card Builder can choose word or photo next to the
students option, and the SVG, PNG and PDF downloads show the circular photo.

**Independent Test**: tick students, choose photo; the preview and its SVG
download show the circle.

**Acceptance Scenarios**:

1. **Given** the students extra unticked, **Then** the word/photo choice is
   disabled.
2. **Given** a name with `students:photo` loaded into the builder, **Then** the
   photo choice is selected and the name round-trips.

---

### User Story 4 - Authorship level with the buttons (Priority: P2)

On every card whose position, students or year sit with the buttons under the
words or at the bottom, that text sits on the middle of the buttons' row, not
its foot.

**Independent Test**: on any carousel card, the vertical centre of the stamp
equals the vertical centre of the buttons (within a pixel).

**Acceptance Scenarios**:

1. **Given** a name that leaves the place's up-and-down out, **Then** the part
   is centred on the buttons' row.
2. **Given** `position:center:bottom`, **Then** it sits at the row's foot as it
   used to.

### Edge Cases

- A student with a photo but no profile cannot occur: a photo lives on a
  mentoring record, which gives the profile and so the link.
- Buttons wrapping to two rows: the part centres on the buttons' whole box.
- A side's buttons (`buttons:…:left|right`): unchanged; there up and down
  already has its own default.
- A card with no buttons: the photo's negative margin keeps it from growing the
  line.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The card-name grammar MUST accept a part `students:<word|photo>`;
  `word` is the default and is never written; any other value is rejected.
  `formatName` writes `students:photo` only where `extras` has `students`.
- **FR-002**: `cardFace` MUST expose `data-stuphoto` only where the students
  extra shows and the face is `photo`; the stylesheet reads nothing else to
  draw it (constitution, Article VII).
- **FR-003**: `studentStamp` MUST carry a mentee author's `photo` path from
  their mentoring record, and none for an author without one.
- **FR-004**: In photo face, a student with a photo MUST be drawn as a circle
  three quarters of a button high, ringed in `--stu-ug` or `--stu-grad`, with
  `alt=""` (the link's aria-label already names them); one without keeps the
  word.
- **FR-005**: The `carousel` site preset MUST use `students:photo`; no other
  preset changes.
- **FR-006**: The Card Builder MUST offer the word/photo choice beside the
  students extra, enabled only with it ticked, through `controlOps` and
  `readSpec`.
- **FR-007**: A place with the buttons under the words or at the bottom MUST
  default, up and down, to the middle of their row (`placeOf`), so the default
  is written nowhere and `:bottom` names the old foot.
- **FR-008**: The SVG, PNG and PDF exports MUST draw the photo as a circle,
  with no export code specific to it.

### Key Entities

- **Mentoring record `photo`**: a path under `public/`, e.g.
  `people/charlotte-myers.webp` — the one source of a student's face.
- **Stamp entry**: `{ student, pos, href?, name?, photo? }` from `studentStamp`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every mentee author with a photo shows it in the stamp of every
  carousel card they appear on (Charlotte ×2, Sirui ×2 on /research/ today).
- **SC-002**: The stamp's vertical centre is within 1px of the buttons'
  vertical centre on carousel cards.
- **SC-003**: All six `npm test` gates and the CV page counts pass; the
  software-card fixture changes by its hash alone.

## Assumptions

- "Bitter" in the owner's request meant "bigger".
- Embeds keep their default card; the owner can opt them in later.
- The centring applies to my position, the year and the context link alike,
  since they share the place grammar.
