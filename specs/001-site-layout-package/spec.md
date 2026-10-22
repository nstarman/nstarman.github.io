# Feature Specification: the site layout as a released package

**Feature Branch**: `001-site-layout-package`

**Created**: 2026-10-22

**Status**: Draft

**Input**: User description: "Base.astro should be named something better. My website and the sites
hosted under nstarkman.space/<repo>/ (paper docs sites, skills, tools) must use the same layout,
which gets updated — but it must come from this repo, where I iterate on it. Can my website have
package releases of it?"

The agreed technical design is in [design.md](design.md), the input to `/speckit-plan`. When the
feature lands, its requirements are folded into `specs/renderers/spec.md` ("Hosted-sites layout",
FR-020) and this folder is deleted (constitution, Article X).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Iterate on the layout in the website, as today (Priority: P1)

The author changes the site's header, footer, navigation or styles in this repository and sees the
change on the website immediately, with no release step: the website renders its pages with the
very layout that will be released.

**Why this priority**: the website is where the layout is designed; packaging must not slow that.

**Independent Test**: change the footer text in the layout, run the dev server, see it on every page.

**Acceptance Scenarios**:

1. **Given** an edit to the layout, **When** the website is built or served, **Then** every page shows it
   without any install or release.
2. **Given** the renamed layout, **When** any page is built, **Then** it renders exactly as before the
   rename (no visual change from this feature).

---

### User Story 2 - Release the layout (Priority: P2)

When the layout is ready, the author tags a release from this repository; a workflow publishes it as
a public, versioned npm package that anyone can install without credentials.

**Why this priority**: releases are what make the hosted sites consistent and upgradeable.

**Independent Test**: tag a release; `npm view @nstarkman/site-layout@<version>` shows it, and a
fresh project installs it.

**Acceptance Scenarios**:

1. **Given** a release tag whose version matches the package, **When** the release workflow runs,
   **Then** the package is published publicly with that version and build provenance, without an
   npm token stored in the repository.
2. **Given** a tag whose version does not match the package, **When** the workflow runs, **Then** it
   fails without publishing.
3. **Given** a published version, **When** the author tries to publish the same version again,
   **Then** nothing is overwritten (npm versions are immutable).

---

### User Story 3 - A hosted site uses a released layout (Priority: P3)

A repository published at `nstarkman.space/<repo>/` (a paper's docs site, the skills page, a tool)
installs a pinned version of the layout and looks like the website, linking back to it correctly.

**Why this priority**: the reason the package exists; replaces the sparse-submodule recipe.

**Independent Test**: a minimal Astro project with `base: '/demo'` installs the package, renders a
page with the layout, and its nav links reach `nstarkman.space/research/` etc.

**Acceptance Scenarios**:

1. **Given** a hosted project pinned to a version, **When** it builds, **Then** its pages have the
   website's header, nav, footer, styles, icons and theme switch, with site-absolute links.
2. **Given** the page's `section` and `repo`, **When** it renders, **Then** the matching nav entry is
   marked and "Last updated" links to that repository.
3. **Given** a newer layout release, **When** the hosted project's dependency bot runs, **Then** it
   proposes the upgrade as a pull request.

### Edge Cases

- A layout change needs something new imported (a font, a script): the release contract (only its
  own stylesheet and icons) must hold or the change is redesigned; a test fails otherwise.
- A breaking change to the layout's properties: the package changelog carries a migration note.
- A bug fix to an older release: released as `<date>.N` from that release (date-versioning policy).
- The first publish of a new npm package may have to happen from the owner's account before
  trusted publishing can be configured.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The layout MUST have a descriptive name (`SiteLayout`) and live in its own package
  `@nstarkman/site-layout` inside this repository, with exactly what it needs: the layout, the
  site stylesheet and the icon sprite.
- **FR-002**: The website MUST render every page with that package's layout directly from the
  repository (no published copy), so edits show immediately.
- **FR-003**: The package MUST stay self-contained: it imports only its own stylesheet and icons, those
  import nothing, the stylesheet has no `@import` or `url(`, and every link is site-absolute.
- **FR-004**: The layout's properties stay `title`, `description`, `section`, `repo` with today's
  meanings and defaults.
- **FR-005**: Releases MUST be date-versioned in a semver-valid form (`YYYYMMDD.0.N`, research R6), tagged `site-layout-v<version>`,
  and published publicly to npm by a workflow using trusted publishing with provenance — no stored
  npm token — refusing a tag that does not match the package version.
- **FR-006**: The package MUST have a changelog; a breaking change carries a migration note.
- **FR-007**: The published package MUST contain only its files (layout, stylesheet, icons, readme,
  changelog, licence), checked before publishing.
- **FR-008**: `AGENTS.md` "Sites hosted in their own repos" MUST describe installing and pinning the
  package and replace the sparse-submodule recipe.

### Key Entities

- **Layout package**: `@nstarkman/site-layout` — `SiteLayout.astro`, the stylesheet, the icon sprite.
- **Release**: a date version, its tag, its npm publication and changelog section.
- **Hosted site**: a repository published at `nstarkman.space/<repo>/` that pins a version.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After the rename, every built page of the website is byte-identical in rendered HTML
  structure to before, apart from asset hashes.
- **SC-002**: `npm install @nstarkman/site-layout@<version>` works in a clean project with no npm login.
- **SC-003**: A minimal hosted Astro project builds with the package and its nav links resolve to the
  website.
- **SC-004**: No npm token is stored in any repository secret.

## Assumptions

- npm account `nstarkman` exists (created 2026-10-22); the `@nstarkman` scope is the account's.
- The whole site stylesheet ships, as today; splitting it is out of scope.
- No existing repository uses the sparse-submodule recipe yet (checked 2026-10-21), so no migration
  of hosted sites is needed.
- syw-site's docs template is the first consumer and is designed separately.
