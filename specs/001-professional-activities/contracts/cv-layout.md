# Contract: how a CV draws Professional Activities

The same in the PDF, on `/cv/<preset>/` and in the builder.

```
PROFESSIONAL ACTIVITIES                              ← section heading (style's usual, icon, rule)
  Conferences Organized                              ← sub-heading: small caps, entry size, no rule, no icon
  Aug 2026  Astrophysics and Space Science in Marche III: …, SOC          Jesi, IT
  Oct 2024  JAXtronomy Workshop, SOC                                      New York, US
  Conferences Attended
  Feb 2023  The Future of Astrophysical Data Infrastructure               Online
  Professional & Software Talks
  May 2024  Globular Clusters and Their Tidal Tails (Talk)                Toronto, CA
            "From JAX to Galax"
  Mar 2022  Astropy Core Developer Conference (Talk), Maintainer, Cosmology and Units   Boston, US
  Peer Review & Panels
  • Journals — …
  Service & Committees
  2019 – 2024  …
```

- Order: the group's place among sections, then its sub-sections, both as the preset and the
  builder's `order` say (research.md R2).
- An empty sub-section is left out; a group with none is left out.
- A sub-section keeps its own layout (timeline, list) and every per-section setting.
- `/cv/` contents list: "Professional" once, its sub-sections' short names beneath, indented.
- Anchors: the group `#cv-professional`; sub-sections keep `#cv-<section id>`.
- Builder: the group heading has its own move buttons and heading menu (`none` hides only the
  group heading); each sub-section moves within the group and keeps its checkbox and settings.
- A presentation's heading line: title, `role`, then its place — "JAXtronomy Workshop, SOC".
