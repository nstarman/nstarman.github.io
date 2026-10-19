# nstarman.github.io Constitution

## Core Principles

### I. One source of truth

Facts live in `data/`; behaviour is described in `specs/`. The website, profile
README, CV PDFs and `.bib` are rendered and never edited by hand.

*Why:* three hand-kept artefacts drifted. *Enforced:* generated outputs are
untracked or built; review.

### II. One item, one file

`data/<date.start>-<id>.json`; bare enumerations in `data/lists/`;
configuration in `config/`, never `data/`.

*Why:* no conflicts; `ls data/` reads chronologically. *Enforced:* `test:schema`.

### III. Identity is permanent

An `id`, `/records/<id>.json`, `/embed/<id>/`, `/cards/…`, and a published
paper's citekey never change after merge. A repo hosted at
`nstarkman.space/<repo>/` never takes a path this site uses.

*Why:* refs, cross-links, citations and outside embeds point at them.
*Enforced:* ref-integrity tests; the citekey freeze test
(`tests/fixtures/citekeys.json`, see VI); review.

### IV. Closed vocabularies change only through the schema

`link.rel`, `type`, `kind`, `tier`, `status`, highlight `topic`, software
`group`: a new value is a schema change plus every renderer, in one PR.

*Why:* otherwise it renders as nothing. *Enforced:* schema and renderer tests.

### V. Data is honest

Dates at the precision known. Authors structured, every one, in order. Stars,
citations, abstracts, coordinates and archive BibTeX come from scripts, never
by hand. ADS/SciX through `bibcode`, never a link.

*Enforced:* schema; refresh workflows.

### VI. Publications produce valid BibTeX matching ADS/SciX, but for the key

For a paper with a `bibcode`, every field of its entry the archive's export
also has (authors, title, journal, volume, pages, year, DOI, eprint, …) matches
that export; the citekey alone differs. A paper without a `bibcode` need only
be valid. The citekey is derived:

```
[<Collab>+]<Lead>:<year>:<citeslug ?? id>

<Collab>  the collaboration's distinctive word —
          "The Astropy Collaboration" → Astropy, "Euclid Collaboration" → Euclid
<Lead>    1 author   Family
          2 authors  Family1+Family2
          3+ authors Family1+
<year>    the year of date.start
```

Once a paper has a `bibcode` its key is frozen.

*Why:* the `.bib` is cited from and should never disagree with the archive.
*Enforced:* `npm run test:bibtex`, which compares each paper's BibTeX against
`config/bibtex-reference.json`; `tests/fixtures/citekeys.json`, the citekey
freeze.

### VII. Renderers read; they do not decide

Selection lives in data and presets — `cvs`, `summary`/`details`/
`detailsComplete`, `tier`, card names. A card's look is a named preset in
`SITE_PRESETS`, never a class of its own; `cardFace` is the one interpreter of
a card name; a second implementation (`cardlayout.js`) is held in step by tests.

*Enforced:* the preset-key test and the cardlayout tests.

### VIII. Failures are loud

An invalid item fails CI rather than vanishing; an unplaced talk is listed, not
dropped; the build and tests never call a network service — remote facts arrive
as committed snapshots.

*Enforced:* CI (`test:schema` rejects an invalid item); an unplaced talk is listed under the map.

### IX. Gates are mandatory

The six `npm test` gates and the CV page counts pass; **CI Pass** is required
to merge; one item per data PR; non-trivial logic leaves a test.

*Enforced:* `.github/workflows/ci.yml`; branch protection.

### X. Specs describe the system as it is

`specs/<area>/spec.md` is that area's current contract; a change to behaviour
updates its spec in the same PR. Feature folders `specs/NNN-*` and design notes
are branch working material and never reach `main`. History is git's.

*Why:* a well-specified repo, not an archive of its design. *Enforced:* the CI
step "Specs are current, not history" in `.github/workflows/ci.yml`; review.

## Governance

The constitution wins a conflict. `AGENTS.md` links it and does not restate its
articles. An amendment is a PR that changes the constitution and bumps its
version: major to remove or redefine an article, minor to add one, patch for
wording. The footer records the version, ratification date and the pinned Spec
Kit tag.

**Version**: 1.0.0 | **Ratified**: 2026-10-19 | **Last Amended**: 2026-10-19 | **Spec Kit**: v1.1.0
