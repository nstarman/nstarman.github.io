# Research: site layout package

## R1 First publish and trusted publishing

- **Decision**: version 1 is published by hand (`npm login` as `nstarkman` with 2FA, then
  `npm publish --access public` in `packages/site-layout`, after the PR merges, from a checkout of
  the tag). Then configure the trusted publisher on npmjs.com (GitHub Actions; owner `nstarman`, repo
  `nstarman.github.io`, workflow `release-site-layout.yml`, no environment) and set the package's
  publishing access to "require 2FA and disallow tokens". Every later release goes through the workflow.
- **Rationale**: OIDC publishing works for packages that already exist with a configured publisher;
  guides for new packages publish once by hand. A configuration not yet used expires after 48 hours
  (GitHub changelog, 2026-10-02), so configuring ahead is fragile. The manual version is built from the
  same tag and gets the same CI checks.
- **Alternatives**: a temporary `NPM_TOKEN` secret for the first publish (rejected: SC-004).

## R2 Release job runtime

- **Decision**: Node 24 (npm 11) in the release job; `permissions: id-token: write, contents: read`;
  `npm publish --provenance --access public`.
- **Rationale**: trusted publishing needs npm ≥ 11.5.1; CI's Node 22 ships npm 10. Provenance is
  automatic with trusted publishing; the flag is explicit.

## R3 Shipping an Astro component

- **Decision**: ship `.astro` source with `exports` subpaths, `"type": "module"`, keyword
  `astro-component`, `peerDependencies.astro: "^7"`; no build step.
- **Rationale**: Astro compiles `.astro` files from `node_modules` (its documented way to publish
  components); the website's own workspace symlink exercises the same path.

## R4 Testing a hosted site without the network (Art. VIII)

- **Decision**: `tests/fixtures/hosted-site/` — `astro.config.mjs` with `site: 'https://nstarkman.space'`,
  `base: '/demo'`, one page using `<SiteLayout section="/research/" repo="nstarman/demo">`. The test runs
  `astro build --root tests/fixtures/hosted-site` with the repo's installed Astro and checks: the build
  succeeds, nav `href`s are site-absolute (`/research/`, not `/demo/research/`), the section is marked,
  and "Last updated" links to `nstarman/demo`. The tarball contents are checked with
  `npm pack --dry-run --json` (offline) against the `files` list.
- **Rationale**: same resolution path a hosted site uses (bare import from `node_modules`), no install.

## R5 Licence

- **Decision**: the package is MIT (as figkit), with its own `LICENSE`; the website repo itself stays
  unlicensed, unchanged.
- **Rationale**: a public npm package needs a licence to be usable; the author can change it before
  the first publish.

## R6 Versioning (npm needs semver)

- **Problem**: the author's tags are `vYYYY.MM.DD` with fixes `vYYYY.MM.DD.N`. npm versions must be
  semver: three numbers, no leading zeros, and a `-N` suffix is a prerelease that sorts *before* its
  release. So `2026.10.22.1` and `2026.01.05` are invalid on npm.
- **Decision (author, 2026-10-22)**: **`YYYYMMDD.0.N`** — `20261022.0.0`, its fixes `20261022.0.1`,
  `20261022.0.2`. The tag is `site-layout-v<version>`, e.g. `site-layout-v20261022.0.0`.
- **Rationale**: fixed length; valid semver (checked with `semver`: valid, sorts by date, fixes after
  their release and before the next date). Each date is a new major, which is honest for date
  versioning (no compatibility promise across releases): `^20261022.0.0` takes that release's fixes
  and never a later release; Dependabot proposes the next one.
- **Alternatives**: `YYYY.MMDD.N` (variable length; `^` would take a whole year of releases);
  `YYYY.M.D` with `-N` fixes (a fix sorts before its release and is skipped on install).
