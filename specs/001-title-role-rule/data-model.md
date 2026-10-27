# Data model: `title`, `role`, and the `fellowship` type

## Field meanings (every type)

- **`title`** — the name of the thing the item records: a job title for a plain job; otherwise
  the program, fellowship, grant, award, course, committee, package or event.
- **`role`** — my part in the thing `title` names. Optional. Absent when `title` already is my
  part. Never repeats the title (research.md R2). Accepted on `position`, `fellowship`, `grant`,
  `award` (new), `teaching`, `service`, `outreach`, `software`, with one schema description.

## `fellowship` (new type)

Named, awarded support held by me.

| field | | meaning |
|---|---|---|
| `tier` | required | `major` · `minor`, as a grant |
| `institution` | optional | the host where it was held |
| `institutionNames` | optional | shorter forms of the host, as a position |
| `funder` | optional | who awards it |
| `role` | optional | my part ("Postdoctoral Fellow") |
| `amount`, `declined` | optional | as a grant |
| `location` | optional | as a position |

Relationships: a fellowship that pays for a post refs it, and the post refs the fellowship
(Brinson ↔ `mit-postdoc`), as today.

## `position` (narrowed)

A post. Loses `tier`, `amount` and `funder` — the schema rejects them, so a fellowship can no
longer be typed `position` by mistake (Article VIII). Keeps `institution`, `institutionNames`,
`role`, `location`, `groupRoles`.

## Migration (FR-008, FR-011)

Only `type`, `title`, `role`, `institution`, `funder` change. `id`, filename, `details`, dates
and `cvs` do not. ⚑ = wording for the user to confirm in review.

### Fellowships

| id | type | title | role | institution (host) | funder |
|---|---|---|---|---|---|
| brinson-prize-fellowship | position → **fellowship** | Brinson Prize Fellowship | Prize Fellow → **Postdoctoral Fellow** | Brinson Foundation → **MIT Kavli Institute for Astrophysics and Space Research** | — → **Brinson Foundation** |
| pacific-postdoc-program | position → **fellowship** | Pacific Postdoc Program at the University of Washington → **Pacific Postdoc Program** | Pacific Postdoc Program Fellow → **Visiting Fellow** ⚑ | University of Washington | (unchanged) |
| massey-junior-fellow | position → **fellowship** | Massey Junior Fellow → **Junior Fellowship** | Junior Fellow → **—** | Massey College | — |
| nserc-cgs-d | grant → **fellowship** | (unchanged) | — | — → **University of Toronto** | (unchanged) |
| nserc-cgs-m | grant → **fellowship** | (unchanged) | — | — → **University of Toronto** | (unchanged) |
| nserc-pdf | grant → **fellowship** | (unchanged) | — | — | (unchanged) |
| university-of-toronto-graduate-fellowship-per-annum | grant → **fellowship** | (unchanged) | — | — | (unchanged) |

### Roles out of titles

| id | title → | role |
|---|---|---|
| ta-ast101-the-sun-and-its-neighbours | AST 101: The Sun and its Neighbours | TA |
| ta-ast201-stars-and-galaxies | AST 201: Stars and Galaxies | TA |
| lead-observer-ast101-325 | AST101-325 | Lead Observer |
| grader-honors-mechanics | Honors Mechanics | Grader |
| physics-instructor-ib-physics | IB Physics | Physics Instructor |
| executive-board-member-for-chabad-at-cwru | Chabad at CWRU | Executive Board Member |
| masseyscope-committee-member | MasseyScope Committee | Member |
| astronomy-on-tap-toronto-volunteer | Astronomy on Tap Toronto | Volunteer |
| astrotours-planetarium-presenter | AstroTours Planetarium | Presenter |
| astrotours-toronto-outreach-volunteer | AstroTours Toronto | Outreach Volunteer |
| astrotours-telescope-organizer | AstroTours Telescopes | Organizer |
| massey-telescopes-outreach-coordinator | Massey Telescopes | Outreach Coordinator |
| planet-party-toronto-volunteer | Planet Party Toronto | Volunteer |
| asa-astrostatistics-interest-group-student-paper-finalist | ASA Astrostatistics Interest Group Student Paper Competition | Finalist |
| goldwater-scholarship-honorable-mention, -2 | Goldwater Scholarship | Honorable Mention ⚑ |

Unchanged (the title is the thing and my part is implied or absent): every other position
(job titles, Astropy's `groupRoles`), `jwst-go-10246-cen-a` (role "Co-I"), software roles,
CASCA, Sigma Nu, the Massey House Committee, the Sigma Nu Alumni Advisory Board, the outreach
talks, and every other award.

## Validation rules

- Schema: `fellowship` in the type enum and its branch; `role` on `award`; `position` rejects
  `tier`, `amount`, `funder`; one `role` description everywhere.
- Fixtures in `schema/invalid/`: `position-with-tier.json`, `fellowship-without-tier.json`.
- `tests/integrity.test.js`: no `role` repeats its `title` (R2), naming each item.
- `tests/presets.test.js`: Grants & Fellowships and Professional Appointments hold the same ids
  before and after, for every preset (frozen in a fixture taken from `main`).
