# Implementation Plan: the site layout as a released package

**Branch**: `001-site-layout-package` | **Date**: 2026-10-22 | **Spec**: [spec.md](spec.md)

**Input**: [spec.md](spec.md) and the agreed [design.md](design.md)

## Summary

Move the layout (`src/layouts/Base.astro` → `SiteLayout.astro`), the site stylesheet
(`src/styles/global.css` → `site.css`) and the icon sprite into `packages/site-layout/`, the npm
package `@nstarkman/site-layout`. The website consumes it through an npm workspace, so the files it
renders are the files that ship. A tag `site-layout-v<YYYYMMDD.0.N>` publishes it to npm with trusted
publishing (OIDC + provenance); the first version is published once by hand ([research](research.md) R1).

## Technical Context

**Language/Version**: Astro 7 components, CSS, Node 22 (CI) / Node 24 + npm ≥ 11.5.1 (release job, for OIDC)

**Primary Dependencies**: astro (peer, `^7`), npm workspaces; nothing new

**Storage**: N/A

**Testing**: vitest (`npm run test:unit`), the site build, a fixture hosted-site build (offline)

**Target Platform**: npm registry; Astro projects deployed to GitHub Pages under `nstarkman.space/<repo>/`

**Project Type**: website + one publishable component package in the same repo

**Performance Goals**: N/A (no rendered change)

**Constraints**: no rendered change to the website; the build and tests never call a network
service (Art. VIII); package self-contained (FR-003)

**Scale/Scope**: 3 moved files; ~20 import/path updates; 1 workflow; 1 test file replaced; docs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Check | Status |
|---|---|---|
| I One source of truth | The layout has one copy, in `packages/site-layout/`; the site imports it from there; hosted sites pin releases of it, never copies. | ✅ |
| III Identity is permanent | No URL changes; the package adds no page. | ✅ |
| VII Renderers read | `cardlayout.js` keeps reading the sprite and tokens from the one stylesheet (new path). | ✅ |
| VIII Failures are loud / no network | The hosted-site smoke test builds a fixture inside the repo against installed `node_modules`; the packed-file check uses `npm pack --dry-run --json` (offline). Only the release workflow talks to npm. | ✅ |
| IX Gates | New tests run in `test:unit`; the release job reruns them before publishing. | ✅ |
| X Specs as they are | Requirements fold into `specs/renderers/spec.md` FR-020 and this folder is deleted in the same PR. | ✅ (on landing) |

Re-check after design: unchanged, all pass.

## Project Structure

### Documentation (this feature)

```text
specs/001-site-layout-package/
├── spec.md, design.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/package.md     # the package's public contract
└── tasks.md                 # /speckit-tasks
```

### Source Code (repository root)

```text
package.json                         + "workspaces": ["packages/*"], dep "@nstarkman/site-layout": "*"
packages/site-layout/
├── package.json                     contracts/package.md
├── SiteLayout.astro                 ← src/layouts/Base.astro (git mv), imports ./site.css, ./IconSprite.astro
├── site.css                         ← src/styles/global.css (git mv)
├── IconSprite.astro                 ← src/components/IconSprite.astro (git mv)
├── README.md, CHANGELOG.md, LICENSE (MIT)
src/pages/**/*.astro (13)            import SiteLayout from '@nstarkman/site-layout/SiteLayout.astro'
src/layouts/Embed.astro              imports site.css / IconSprite from the package
src/lib/cardlayout.js                sprite ?raw from the package
scripts/lib/cardsync.mjs             reads packages/site-layout/site.css
tests/{cards,cardlayout,cardgroups}.test.js   stylesheet path
tests/base-hosted.test.js → tests/site-layout.test.js
tests/fixtures/hosted-site/          minimal Astro project, base '/demo' (smoke test)
.github/workflows/release-site-layout.yml
.github/dependabot.yml               unchanged (hosted sites add their own npm entry)
AGENTS.md                            "Sites hosted in their own repos" rewritten
specs/renderers/spec.md              FR-020 rewritten
```

**Structure Decision**: one workspace package beside the site; the site stays the root project.
Comments that say "global.css" are updated to "site.css" where they name the file.

## Complexity Tracking

None.
