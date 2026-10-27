# Contract: a CV row's heading line

Every CV render (the four PDFs, `/cv/`, the builder, `npm run build:cv`) draws a row's heading
as the **bold title**, then `, role` if set, then `, who` if any — each once.

| type | who | example after migration |
|---|---|---|
| `position` | institution (`institutionNames` per the preset) | **Postdoctoral Associate**, MIT Kavli Institute for Astrophysics |
| `education` | institution | **PhD in Astronomy & Astrophysics**, University of Toronto |
| `fellowship` | funder, or the host institution when the funder is off (`funderOff`) or absent | **Brinson Prize Fellowship**, Postdoctoral Fellow, Brinson Foundation · **Junior Fellowship**, Massey College |
| `grant` | funder unless `funderOff` | **JWST GO 10246: …**, Co-I, STScI |
| `award` | funder unless `funderOff` | **ASA Astrostatistics Interest Group Student Paper Competition**, Finalist, ASA Astrostatistics Interest Group |
| `teaching` | institution | **AST 101: The Sun and its Neighbours**, TA, University of Toronto |
| `service`, `outreach` | organization, else institution | **Astronomy on Tap Toronto**, Volunteer, Department of Astronomy and Astrophysics, University of Toronto |
| `media` | outlet | unchanged |
| `presentation`, `mentoring`, `publication` | unchanged | unchanged |

Unchanged around it: the date column, the right column (amount or place), `(declined)`, the
recipient line, detail lines and their indices, `groupRoles` rows.
