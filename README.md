# nstarkman.space

Source for [nstarkman.space](https://nstarkman.space) — an Astro site, a CV
database, and the tooling that renders one into the other.

Everything comes out of `data/`. One JSON file per item, and the same database
renders the website, the [profile README][profile], the CV PDFs, and
[publications.bib](https://nstarkman.space/publications.bib). Adding a paper or
a conference is one small file.

**Adding something? Read [AGENTS.md](AGENTS.md).**

[profile]: https://github.com/nstarman/nstarman

## Layout

```
data/            one item per file, data/<date.start>-<id>.json — the source of truth
data/lists/      bare enumerations (peer review) as plain arrays
config/          CV preset definitions — config, not items
schema/          the item JSON Schema, plus invalid fixtures the tests assert on
src/             the Astro site
cv/              the Typst CV template, and the portrait and QR it draws
scripts/         test and generation scripts
public/          served verbatim: CNAME, files/starkman_cv.pdf, and the fonts
                 the CV is compiled from
```

## Commands

```bash
npm install
npm run dev        # local server
npm run build      # static build into dist/
npm test           # schema + bibtex + accessible-name checks; CI runs this on every PR
npm run build:all  # the site, then the four CV PDFs (needs typst)
```

## Deployment

GitHub Pages via Actions (`.github/workflows/deploy.yml`), not a branch deploy:
Astro builds to `dist/`, which a branch deploy would mean committing — and
would publish the repo source instead of the built site.

`public/CNAME` ships the custom domain in the artifact so it survives every
deploy.

**Jekyll never runs.** Source "GitHub Actions" serves the uploaded artifact
verbatim, so Astro's underscore-prefixed `_astro/` is untouched — the live site
serves it while no `.nojekyll` exists anywhere, which is the proof. A
`.nojekyll` would also be unshippable: `upload-pages-artifact` strips every
dotfile from the tarball.

That leaves one thing holding the guarantee up, and it lives in the web UI
where nothing in the repo can see it change. So `deploy.yml` asserts
`build_type == workflow` against the API before it builds, and fails with the
setting to correct rather than publishing a styleless site.

## History

This repo previously held an [academicpages][ap] Jekyll site — 211 files under
`_config.yml`, `_posts/`, `_publications/` and the rest. All of it went in the
rebuild and survives only in the git history. `files/starkman_cv.pdf` kept its
original URL.

[ap]: https://github.com/academicpages/academicpages.github.io
