# Data model: site layout package

No stored data. The entities are the package, a release and a hosted site; their shapes are in
[contracts/package.md](contracts/package.md).

- **Release** = `version` (`YYYY.MMDD.N`, research R6) ⇔ tag `site-layout-v<version>` ⇔ a
  `## <version>` section in `CHANGELOG.md` ⇔ one immutable npm version. The release workflow refuses
  a tag whose version differs from `package.json`, or a missing changelog section.
- **Fix release**: same `YYYY.MMDD`, `N + 1`, cut from `versions/site-layout-v<YYYY.MMDD>.x`
  (created on demand from the tag) and backported to every released version with the bug.
- **Hosted site**: an Astro project with `site: 'https://nstarkman.space'`, `base: '/<repo>'`, and
  `"@nstarkman/site-layout": "<exact version>"`.
