# Site layout package — agreed design (input to /speckit-plan)

Agreed with the author on 2026-10-22: the website keeps ownership and iteration; releases are
public npm packages under the author's npm account `nstarkman`, published by trusted publishing.

## Layout

```
packages/site-layout/
  package.json        name "@nstarkman/site-layout", version "YYYY.MM.DD", "type": "module",
                      "exports": { "./SiteLayout.astro", "./site.css", "./IconSprite.astro" },
                      "files": [those three, README.md, CHANGELOG.md, LICENSE],
                      peerDependencies: { "astro": "^<current major>" }, publishConfig.access "public"
  SiteLayout.astro    today's src/layouts/Base.astro, renamed; imports './site.css' and './IconSprite.astro'
  site.css            today's src/styles/global.css (moved, unchanged)
  IconSprite.astro    today's src/components/IconSprite.astro (moved, unchanged)
  README.md           install, props, base-path notes; CHANGELOG.md
```

- Root `package.json` gains `"workspaces": ["packages/*"]`; the website depends on
  `"@nstarkman/site-layout": "*"` resolved from the workspace, so its pages import
  `@nstarkman/site-layout/SiteLayout.astro` — the same file that is released.
- Every `import Base from '…/layouts/Base.astro'` (13 files) becomes `import SiteLayout from
  '@nstarkman/site-layout/SiteLayout.astro'` and `<Base …>` becomes `<SiteLayout …>`. Imports of
  `global.css` / `IconSprite` elsewhere follow the move.
- Props unchanged: `title`, `description` (default the site's), `section`, `repo` (default
  `nstarman/nstarman.github.io`).

## Releasing

- Date versions per the author's policy, in npm's semver form `YYYY.MMDD.N` (research R6); fixes
  bump N, from `versions/site-layout-v<YYYY.MMDD>.x` branches created on demand; every fix backported
  to every released version that has it.
- Tag `site-layout-v<version>` → `.github/workflows/release-site-layout.yml`: checks tag = package
  version, runs the package checks, `npm pack --dry-run` file-list check, then
  `npm publish --provenance --access public` with `permissions: id-token: write` (npm trusted
  publishing; no `NPM_TOKEN`).
- First publish: research whether npm requires the package to exist before a trusted publisher can
  be configured; if so, the author runs one `npm publish` from `packages/site-layout` after
  `npm login` (2FA), then configures the trusted publisher (owner `nstarman`, repo
  `nstarman.github.io`, workflow `release-site-layout.yml`).

## Tests and docs

- `tests/base-hosted.test.js` → `tests/site-layout.test.js`: the package's self-containment
  (imports only `./site.css` and `./IconSprite.astro`; those import nothing; no `@import`/`url(`),
  the `files` list, `exports` resolving, props documented in README.
- A smoke test: a temporary Astro project with `base: '/demo'` builds a page with the packed tarball
  (`npm pack`) and its nav hrefs are site-absolute.
- `AGENTS.md` "Sites hosted in their own repos": install `@nstarkman/site-layout@<version>`, wrap
  pages in `<SiteLayout section repo>`, set `site`/`base`, Dependabot (`npm`) proposes upgrades.
  The sparse-submodule recipe is removed.
- On landing: fold into `specs/renderers/spec.md` (FR-020 rewritten around the package; Covers
  updated), delete this folder.
