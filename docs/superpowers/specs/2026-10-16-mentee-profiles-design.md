# Mentee profiles — design

Status: draft for approval · 2026-10-16

## Why

The site has to show a hiring or review committee that I work well with
students and that they do interesting, award-winning work. The point is
**their** work, shown next to the research we did together. It is not my CV
padded with their prizes.

What prompted this: PR #387 added the MIT News article about Charlotte Myers
being named a Goldwater Scholar as a `media` item. Every item in `data/` is
read as *mine*, so the site and the CV presented her press as mine. Right now
there is nowhere honest to put a mentee's own achievements.

## What exists today

- **Six `mentoring` items.** Each holds the mentee as one free-text string,
  `"student": "Charlotte Myers (MIT) with Prof. Lina Necib (MIT)"`. There is no
  name split, no ORCID and no level. Any talks are plain lines in `details`
  (Amir Abdul's are). The schema also allows `institution`, `coSupervisors`
  and `outputs`. One of the six, `massey-tutoring-program`, is a programme,
  not a person.
- **Paper bylines mark students.** `authors[].student` is
  `undergraduate | graduate`. `Card.astro` uses it to draw the stamp
  "student‡ 1st | 2nd" (the `students` extra). Nothing ties that mark to a
  mentoring item.
- **The collaborator map** (`CollabMap.astro`, `src/lib/collabmap.js`) is built
  from `config/collaborators.json`, which `scripts/collect-collaborators.mjs`
  generates from public ORCID records. It is keyed by ORCID, and pins resolve
  through `locate(organization)` in `config/places.json`. A person is on the
  map only if they have a dated post at a known place. The "Show" control is
  one flat `<select>`: Everyone, then every name. A byline links to
  `/research/?collab=<orcid>#collaborators`, and `mappick.js` reads that link
  to pre-select the person.
- **On the CV**, `cvmodel.js` prints a mentoring item as its title plus
  `student` and `institution`.

## Goals

1. **One mentee record per person**, the single source for everything below.
2. **A profile page per mentee**, for all five: Charlotte Myers, Amir Abdul,
   Connor McKeigan, Taisiia Karasova and Reem Hamraz. Plus a **`/people/`
   index** listing them, so every profile has a front door. A profile shows
   their photo, who they are, a link to their path on the collaborator map, a description of our research together,
   cards for our shared papers and software, and their own achievements.
3. **Every mentee on the collaborator map**, even with no ORCID and no shared
   paper. Pins are at their institutions, never their conferences. A
   **Mentees** option in "Show" sits before the names, with a separator line
   under it.
4. **A richer mini-profile on the map for mentees.** It is the existing panel
   plus a line about our research, their top achievements and a link to the
   profile. It is built from the same record, showing less than the profile.
5. **The paper stamp links to the profile.** "student‡ 1st" on any card goes
   to that student's profile page.
6. **CV lines.** A mentee's mentoring entry on my CV can list a few of their
   achievements I have chosen, e.g. "NeurIPS ML4PS workshop paper; 2026
   Goldwater Scholar".
7. **Fix the Goldwater entry.** The MIT News article belongs to Charlotte's
   record, not to me.

## Non-goals (for now)

- Mentee **cards** in the Card tool, a mentees section on `/research/`, and
  links to mentees from Research introductions. These come next, built on this
  record and the `/people/` index. I want mentees worked into the Research
  page eventually, so nothing here should make that harder.
- Pins for conferences on the collaborator map.
- Outcome lines ("now a PhD student at …"). The record should be able to grow
  one later, but nothing renders it yet.
- Co-supervisors as people. They stay text ("with Prof. Lina Necib").
- Profiles for programmes. Massey tutoring stays an ordinary mentoring item.

## Anti-goals: what would make this a failure even if it works

- Anything that reads as **me taking credit** for a student's award, talk or
  press. Their achievements never show up in my own Awards, Presentations or
  Media, on the site or on any CV.
- A profile so thin it looks padded.
- Facts written twice. Shared papers and software are referenced by id, never
  copied into the mentee record.

## The design, as decided

### Profile page — `/people/<slug>/`

This is Layout A from the mockups (top to bottom):

1. **Header.** Photo, falling back to initials. Name. Level and department,
   e.g. "Undergraduate, Physics & Astronomy, MIT". The years I mentored them.
   Co-supervisor(s). One highlight badge for a headline award ("2026
   Goldwater Scholar"). A link: "See their path on the collaborator map →".
   That link opens `/research/` with the map already showing this person.
   There is **no minimap on the profile.**
2. **Our research.** A few sentences that I write. Like the Research
   introductions, it may name a paper inline with `[](item:<id>)`.
3. **Papers & software together.** Real `Card.astro` cards using an existing
   site preset. Papers are those with the mentee among the authors, newest
   first. Software is the packages those papers `ref`, plus any software item
   that lists the mentee as an author. This section is left out when empty
   (Amir has no papers).
4. **Their achievements.** One dated list, newest first, of awards, talks and
   press. Each entry is labelled by kind and links out where it has a URL. For
   someone like Amir, whose record is mostly conferences, this is the core of
   the page.

The URL lives under `/people/`, so `people` joins the list of paths a hosted
repo must not take (AGENTS.md, "Sites hosted in their own repos").

### People index — `/people/`

One entry per mentee: photo or initials, name, level and institution, the
years mentored, the badge, and one line from `research`. Each links to the
profile. Ordered by mentoring start, newest first (my call). It is linked from
the site's navigation or footer; where exactly is left to the builder.

### Collaborator map

- **Every mentee is on the map.** Their journey comes from ORCID where they
  have one. Otherwise, or for posts ORCID lacks, it comes from a journey list
  on the mentee record. Amir: Howard University (home institution) and MIT,
  summer 2025 (where he worked with me).
- **Show:** Everyone, then **Mentees** (selects every mentee at once), then a
  separator, then all names alphabetically as now. Mentees stay in the name
  list too.
- **Mini-profile for a mentee:** the current panel (posts, and papers together
  under each post) plus the research line, their two or three most recent
  achievements, and "Full profile →".
- **Deep link:** `?collab=` accepts the mentee's slug as well as an ORCID, so
  someone with no ORCID can be linked to.
- Non-mentees are unchanged.

### Paper stamp

On every card, wherever the `students` extra draws "student‡ 1st", the part
for a student who has a profile is a link to `/people/<slug>/`. A student with
no profile stays plain text. Because the stamp is drawn once, in `Card.astro`
via `cardFace`, this reaches Research, Publications, the home page and the
embeds together. The embed page and `cardpdf`/`cardsvg` exports must agree, so
the link appears in the SVG/PDF as an `<a>` like every other card link.

### CV

The mentoring entry stays where it is. After it come the mentee's
achievements that I have marked for that CV preset, in the same `cvs: [...]`
way items are marked. Nothing is marked unless I mark it. Programme entries
(Massey) are unchanged.

## Calls I made (check these)

These were not discussed. Each is my judgement; overrule any of them.

1. **The mentee record is the existing `mentoring` item, extended**, rather
   than a new `person` type. It already is "one entry per mentee" and already
   appears on the CV. New fields:
   - `person`: `{ family, given, orcid?, level: "undergraduate" | "graduate" | … }`.
     Its presence is what makes an item a mentee with a profile; Massey simply
     lacks it.
   - `slug`: the profile URL segment, e.g. `charlotte-myers`. A separate field
     because existing ids (`charlotte-myers-mit-with-prof-lina-necib-mit`) can
     never change and are too long for a URL. Like an id, a slug never changes
     once published.
   - `photo`: path under `public/people/`.
   - `badge`: the headline line for the header.
   - `research`: the "Our research" prose.
   - `journey`: posts for the map, each
     `{ organization, city, region?, country, start, end?, role? }`, the same
     shape as `collaborators.json` affiliations. Every `organization` must
     resolve in `config/places.json` (run `geocode-places.mjs`; Howard
     University is new).
   - `achievements`: see 2.

   `institution` and `coSupervisors` are reused for the header. `outputs` and
   the free-text `student` remain for back-compat. Once `person` is set,
   `student` is derived for display and need not be hand-written.
2. **A mentee's achievements are nested in their record**, not separate files
   in `data/`. Each is `{ kind: award | talk | poster | press | program, date,
   title, event?, location?, outlet?, url?, cvs? }`. Separate items would need
   every renderer that lists my awards, talks and press to filter them out,
   and one missed filter is exactly the PR #387 failure. Nested, they cannot
   leak into my sections. The cost: a mentee's talks do not appear on my
   conference map, which goal 3 wants anyway.
3. **The paper's author entry points to the mentee by id**: a new optional
   `mentee: "<mentoring id>"` beside `student`. Matching by name or ORCID would
   drift. A test fails if a `mentee` points at an item without `person`, or if
   `student` is set and `mentee` names someone whose `person.level` disagrees.
4. **PR #387 is closed unmerged.** Its content becomes Charlotte's first
   achievement (`kind: press`, MIT News, 2026-04) alongside `kind: award`,
   2026 Goldwater Scholarship.
5. **Amir's `details` lines move to `achievements`.** These are the Leadership
   Alliance National Symposium (Jul 2025), the NSBP-NSHP Joint Annual
   Conference (Nov 2025), the APS Global Physics Summit (Mar 2026), and the
   SR-EIP / MSRP programmes as `kind: program`. His research title stays as
   the first line of `details`.
6. **The mini-profile's "top achievements"** are the most recent two or
   three, awards first.
7. **Sirui Wu** is marked `graduate` on four papers but has no mentoring item.
   That is out of scope here; flag it to me rather than invent a record.
8. **Migration keeps today's CVs unchanged.** Lines that move from `details`
   into `achievements` get `cvs` set to the presets the mentoring item prints
   in today. The np and 2-page CVs therefore render the same facts before and
   after slice 1, and the 2-page page-count check stays green. Any change to
   the CV line indexes the builder ticks is noted in the PR.
9. **Photo and journey are optional per person.** I write these facts for
   students; they do not publish them themselves the way ORCID data is
   published. The record, the page and the tests must work with neither. A
   mentee with no photo gets initials; a mentee with no journey and no ORCID
   post is listed in the map's list but has no pin, like an unplaced talk on
   the conference map. Whether to publish a given student's photo or
   hand-written posts is my decision per student, made before their data is
   added.

## Order of work

Each slice is one PR, tested and shippable on its own.

1. **Record.** Schema fields (`person`, `slug`, `photo`, `badge`, `research`,
   `journey`, `achievements`, `authors[].mentee`), loader helpers, validation
   tests and a bad fixture for each new constraint. Migrate all five mentees;
   I confirm institutions for Connor, Taisiia and Reem first.
   Close #387 and move its content into Charlotte's record.
2. **Profile page** `/people/<slug>/`, from the record, with cards from
   existing presets, and the `/people/` index.
3. **Map.** Mentees from records, journey fallback, the Mentees option and
   separator, slug deep links, the richer mini-profile.
4. **Stamp link** in `Card.astro`/`cardFace`, plus embed/SVG/PDF parity.
5. **CV.** Achievements marked with `cvs` print after the mentoring entry.

## Left to the builder

- Markup, styles and the exact preset used for profile cards, within the site's
  existing look and the rule that cards use only `SITE_PRESETS`.
- How the Mentees option highlights a group within `mappick.js`.
- Initials fallback styling; photo size and crop.
- Test layout, following the repo's existing `tests/` conventions.
