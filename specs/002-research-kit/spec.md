# Feature Specification: research-kit — the card and the collaborator map as packages

**Feature Branch**: `002-research-kit`

**Created**: 2026-10-23

**Status**: Draft

**Folds into**: `specs/cards/spec.md` (the card renderer and `cards/<id>.json`) and
`specs/renderers/spec.md` (the packages, their releases, the collaborator map); `specs/data-model/spec.md`
for the paper → grant refs

**Input**: User description: "Paper docs sites (syw-site) should open with the paper's card exactly as the
Research page shows it, minus Context; their Info tab shows a collaborator map of the paper's co-authors
and the grants that funded it; their Cite tab says how to cite the software the paper used. The card logic
becomes a package, @nstarkman/card-builder, vendored by this repo; the map too; both share a data
resolver; and the three ship together as @nstarkman/research-kit. A paper site resolves the card from this
repo's data on GitHub — cards/<id>.json holding only card choices, the data reached through refs — and
keeps a snapshot, refreshed by a weekly (and manually runnable) bot."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The website runs on the packages, unchanged (Priority: P1)

The card, its name interpreter, the Research page's publication entry and the collaborator map move into
packages in this repository; the website imports them through the npm workspace, and every page renders
as it did.

**Why this priority**: one card interpreter (Article VII) — a paper site must draw the card with the same
code as the website, so the website has to use the packages first.

**Independent Test**: build `main` and the branch; every built page is identical apart from asset hashes
(as for the site-layout package).

**Acceptance Scenarios**:

1. **Given** the moved components, **When** the site builds, **Then** all pages match `main`'s, the card
   and cardlayout tests pass, and `/embed/` and `/cards/` are unchanged.
2. **Given** an edit in a package, **When** the dev server runs, **Then** the website shows it at once.

---

### User Story 2 - Resolve an item's card data from files anywhere (Priority: P1)

Given an item id and a way to read this repository's files — from disk, or from GitHub at a ref — the data
resolver returns everything the card, the collaborator map, the funding list and the software citations
need, by following the item's `refs` and reading the `config/` snapshots it uses.

**Why this priority**: it is how a paper site gets the card without a second copy of any fact.

**Independent Test**: for every published item, resolving from disk and from a GitHub-like reader over the
same files gives identical results, and the card rendered from the result matches the website's.

**Acceptance Scenarios**:

1. **Given** `stream-convexity-spatial`, **When** it is resolved, **Then** the result has the paper, its
   highlight (summary, thumbnail), its software (in `refs` order, each with how to cite it), its co-authors
   with their places, its grants, and its card choices.
2. **Given** a reader that fails on a file, **When** resolving, **Then** it fails naming the file and the
   ref that led to it.

---

### User Story 3 - Card choices per item (Priority: P2)

`cards/<id>.json` records what `data/` does not: which card name a paper site draws (by default the
Research page's entry without Context) and card-specific settings. No file means the default.

**Acceptance Scenarios**:

1. **Given** no `cards/<id>.json`, **When** a paper site draws the card, **Then** it is the Research entry
   without Context.
2. **Given** a `cards/<id>.json` naming another preset key, **When** resolved, **Then** that preset is used.
3. **Given** an unknown key or preset in a `cards/` file, **When** tests run, **Then** they fail.

---

### User Story 4 - Released as one kit (Priority: P2)

`@nstarkman/data-resolver`, `@nstarkman/card-builder` and `@nstarkman/collaborator-map` are released
together, at one version, with `@nstarkman/research-kit` depending on all three at that version and
re-exporting them; a tag `research-kit-v<version>` publishes all four with trusted publishing.

**Acceptance Scenarios**:

1. **Given** a tag whose version matches all four packages, **When** the workflow runs, **Then** the four
   are published (resolver first) with provenance, a version already on npm skipped.
2. **Given** packages at different versions, **When** tests run, **Then** they fail.
3. **Given** a clean project, **When** it installs `@nstarkman/research-kit@<version>`, **Then** it can render
   a card and a collaborator map from a resolved snapshot.

---

### User Story 5 - The paper's funding (Priority: P3)

A publication lists the grants that funded it in `refs`; the resolver returns them (title, funder,
dates) for the paper site's Info tab. The CV and the website are unaffected by those refs.

### Edge Cases

- An item with no highlight: the card is drawn without a figure or summary, as on the website.
- A co-author with no known place: listed under the map as not placed, as `/research/` does.
- A ref to an item that is not public (`internal`-only fields): never in the resolved result.
- Files read from GitHub at a ref other than `main` (a pinned commit): the resolver takes the ref.
- A release with a breaking change to the resolved shape: `schema` in the result is bumped and the
  changelog carries a migration note.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `packages/data-resolver/` (`@nstarkman/data-resolver`) MUST export `resolve(id, read)` →
  a resolved object (`schema: 1`) with the item, its highlight, software (with citation data: DOI, BibTeX
  key or repository), co-authors (with places for the map), grants, and card choices; `read(path)` is
  injected and returns a file's text. It MUST NOT read anything not reached from the item.
- **FR-002**: `packages/card-builder/` (`@nstarkman/card-builder`) MUST hold `Card.astro`,
  `Publication.astro`, the card-name grammar and interpreter (`cardname.js`, `cardFace`) and
  `SITE_PRESETS`; the website MUST import them from the package and keep no copy (Article VII).
- **FR-003**: `packages/collaborator-map/` (`@nstarkman/collaborator-map`) MUST render a map for a
  given set of resolved co-authors (the website: all collaborators; a paper site: one paper's).
- **FR-004**: `packages/research-kit/` (`@nstarkman/research-kit`) MUST depend on the three at the same
  version and re-export their entry points.
- **FR-005**: The site's built pages MUST be unchanged by the move (SC-001).
- **FR-006**: `cards/<id>.json` MUST hold only card choices (a `SITE_PRESETS` key, card settings),
  validated by a schema; the default for paper sites is a new preset key, the Research entry without
  Context.
- **FR-007**: All four packages MUST share one version, `YYYYMMDD.0.N`, released from one tag by one
  workflow with trusted publishing (as `@nstarkman/site-layout`), fixes backported to every release
  line that has the bug.
- **FR-008**: The packages MUST NOT require the network; the website's tests never call one (Article VIII).
- **FR-009**: A publication MAY list `grant` items in `refs`; tests MUST accept it and the CV MUST not
  change because of it.
- **FR-010**: `AGENTS.md` "Sites hosted in their own repos" MUST describe research-kit for paper sites.

### Key Entities

- **Resolved card** (`schema: 1`): what a paper site snapshots as `docs/card.json`.
- **Card choices** (`cards/<id>.json`): preset key and settings.
- **The kit**: four packages, one version.

## Success Criteria *(mandatory)*

- **SC-001**: Every built page of the website is identical to `main`'s apart from asset hashes.
- **SC-002**: Resolving every published item from disk and from a GitHub-like reader gives identical
  results.
- **SC-003**: A minimal project with only `@nstarkman/research-kit` renders the
  `stream-convexity-spatial` card from its resolved snapshot exactly as `/embed/` does for the same preset.
- **SC-004**: One tag publishes all four packages, without a stored npm token.

## Assumptions

- The website repository is public, so its `data/` and `config/` can be read from GitHub at a ref.
- First publication of each new package is by hand from the `nstarkman` npm account (as for
  site-layout), then trusted publishing.
- syw-site's use of the kit (`syw-site card`, the tabs) is specified in nstarman/syw-site.
