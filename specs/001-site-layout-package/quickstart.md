# Quickstart: validating the site layout package

From the repository root after `npm ci`.

1. **No visible change (US1, SC-001)**: build `main` and the branch and compare page HTML with asset
   hashes masked:
   ```bash
   npm run build && cp -r dist /tmp/after   # on the branch; same into /tmp/before on main
   diff -r <(cd /tmp/before && find . -name '*.html' -exec sed -E 's/[A-Za-z0-9_-]{8}\.(css|js)/H.\1/g' {} +) \
           <(cd /tmp/after  && find . -name '*.html' -exec sed -E 's/[A-Za-z0-9_-]{8}\.(css|js)/H.\1/g' {} +)
   ```
   Expect no differences.
2. **Edit shows immediately (US1)**: change the footer text in
   `packages/site-layout/SiteLayout.astro`, `npm run dev`, see it on `/` and `/research/`; revert.
3. **Package contract (FR-003, FR-007)**: `npm run test:unit` — `tests/site-layout.test.js` checks the
   imports, the stylesheet, `exports`, and `npm pack --dry-run --json` file list.
4. **Hosted site (US3, SC-003)**: the same test builds `tests/fixtures/hosted-site` (`base: '/demo'`)
   and checks site-absolute nav links, the marked section and the repo link.
5. **Release (US2)**: after merge, first version by hand (research R1); then for a later version:
   bump `version`, add the changelog section, merge, push `site-layout-v<version>`; the workflow
   publishes; `npm view @nstarkman/site-layout versions` lists it with provenance.
   A mismatched tag fails the workflow before `npm publish`.
