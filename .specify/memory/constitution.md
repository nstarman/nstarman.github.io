# nstarman.github.io Constitution

## Core Principles

### I. One source of truth

Items live in `data/`; facts fetched from elsewhere live in committed
snapshots in `config/`; behaviour is described in `specs/`. Until an area has a
spec, `AGENTS.md` and the code describe it. The website, profile README, CV
PDFs and `.bib` are rendered and never edited by hand.

*Why:* three hand-kept artefacts drifted. *Enforced:* generated outputs are
untracked or built; review.

### II. One item, one file

`data/<date.start>-<id>.json`; bare enumerations in `data/lists/`;
configuration in `config/`, never `data/`.

*Why:* no conflicts; `ls data/` reads chronologically. *Enforced:* `test:schema`.

### III. Identity is permanent

An `id`, `/records/<id>.json`, `/embed/<id>/`, `/cards/…`, and a paper's
citekey once it has a `bibcode` never change after merge. A repo hosted at
`nstarkman.space/<repo>/` never takes a path this site uses.

*Why:* refs, cross-links, citations and outside embeds point at them.
*Enforced:* the ref-integrity tests (`tests/integrity.test.js`) catch a
dangling ref; `tests/fixtures/citekeys.json` fails when a frozen key changes
(see VI); review catches an id renamed together with its refs.

### IV. Closed vocabularies change only through the schema

`link.rel`, `type`, `kind`, `tier`, `status`, highlight `topic`, software
`group`: a new value is a schema change plus every renderer, in one PR. A value
may sit in the schema ahead of its renderer only when deliberately held back and
documented as such (the highlight topic `software` is the case).

*Why:* otherwise it renders as nothing. *Enforced:* the schema; review — no test
ties the schema's enums to the renderers.

### V. Data is honest

Dates at the precision known. Authors structured, every one, in order. Stars,
citations, abstracts and archive BibTeX come from scripts, never by hand.
Coordinates are geocoded by `scripts/geocode-places.mjs` and corrected by hand
only where the geocoder is wrong (`sameAs` entries are hand-written too).
ADS/SciX through `bibcode`, never a link.

*Enforced:* the schema; the refresh workflows, which rewrite their snapshots;
review between runs.

### VI. Publications produce valid BibTeX matching ADS/SciX, but for the key

For a paper with a `bibcode`, every field both its entry and the archive's
export have matches, under the normalisation and exclusions of
`compareToArchive` in `src/lib/bibcompare.js`: `abstract` and `note` are never
compared, and for an arXiv bibcode neither are the venue, DOI and date fields.
The citekey alone differs. A paper without a `bibcode` need only be valid. The
citekey has one format,

```
[<Collab>+]<Lead>:<year>:<citeslug ?? id>
```

defined by `citekey()` in `src/lib/bibtex.js`, whose tests are its
specification. Once a paper has a `bibcode` its key is frozen.

*Why:* the `.bib` is cited from and should never disagree with the archive.
*Enforced:* `npm run test:bibtex` against `config/bibtex-reference.json`;
`tests/fixtures/citekeys.json`, the citekey freeze.

### VII. Renderers read; they do not decide

Selection lives in data and presets — `cvs`, `summary`/`details`/
`detailsComplete`, `tier`, card names. A card's look is a named preset in
`SITE_PRESETS`, never a class of its own; `cardFace` is the one interpreter of
a card name; a second implementation (`cardlayout.js`) is held in step by tests.

*Enforced:* the preset-key test (`tests/cards.test.js`) and the cardlayout tests
(`tests/cardlayout*.test.js`); review for "never a class of its own".

### VIII. Failures are loud

An invalid item fails CI rather than vanishing; an unplaced talk is listed, not
dropped; the build and tests never call a network service — remote facts arrive
as committed snapshots.

*Enforced:* CI (`test:schema` rejects an invalid item); `tests/confmap.test.js`
(an unplaced talk is listed); review for "the build and tests never call a
network service" — no check exists.

### IX. Gates are mandatory

The six `npm test` gates and the CV page counts pass; **CI Pass** is required
to merge; one item per data PR; non-trivial logic leaves a test.

*Enforced:* `.github/workflows/ci.yml` and the repository ruleset requiring
**CI Pass**; review for one item per data PR and for a test behind new logic.

### X. Specs describe the system as it is

A spec under `specs/` is the current contract for what it covers. A change to
behaviour updates that spec in the same PR; a spec the change supersedes is
rewritten or deleted, never kept beside its replacement. Design notes that are
not specs (`docs/superpowers/`) stay on their branch. When a feature lands, its
`specs/NNN-*/` folder keeps `spec.md` alone; the planning files Spec Kit writes
beside it (`plan.md`, `tasks.md`, `research.md`, `data-model.md`,
`quickstart.md`, `contracts/`, `checklists/`) are deleted in the same PR.
History is git's.

*Why:* a well-specified repo, not an archive of its design. *Enforced:* review;
the CI step "Design notes stay on their branch" in `.github/workflows/ci.yml`
rejects `docs/superpowers/` and each of those planning files.

## Governance

The constitution wins a conflict. `AGENTS.md` links it and does not restate its
articles. An amendment is a PR that changes the constitution and bumps its
version: major to remove or redefine an article, minor to add one, patch for
wording. Amend by editing this file under these rules; `/speckit-constitution`
is not used to amend it, since it rewrites from Spec Kit's template and its own
versioning rule. The footer records the version, ratification date and the
pinned Spec Kit tag.

**Version**: 1.0.0 | **Ratified**: 2026-10-19 | **Last Amended**: 2026-10-19 | **Spec Kit**: v1.1.0
