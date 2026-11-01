# Research

- **Decision**: the setting is the space *before* the heading, as the gap kind `run` (`above:` of the heading's block). **Rationale**: the user asked for the space before it; the legend/tally keys likewise name one gap each. **Alternatives**: space below the heading — not asked; one key for both — less control.
- **Decision**: heading at `look.size * 1.1` (12.1pt in the default style), `headweight`, `headcolour`. **Rationale**: the entries are at `look.size` (11pt); a sub-heading at `look.sub` (10.1pt) read as smaller than the text under it. **Alternatives**: `subsection()` — sized for a section group's members, which a run sits under, so too heavy.
