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
Astro builds to `dist/`, which a branch deploy would mean committing.

`public/` carries two files that exist only to survive into the artifact:

- **`CNAME`** — the custom domain, so it is reapplied on every deploy.
- **`.nojekyll`** — Jekyll strips underscore-prefixed directories, and Astro
  emits every asset into `_astro/`. Nothing runs Jekyll today, but the failure
  mode if anything ever did is a site that returns 200 on every page with no
  CSS and no build failure to notice. `scripts/test-links.mjs` fails the build
  if the file is missing from `dist/`.

## History

This repo previously held an [academicpages][ap] Jekyll site — 211 files under
`_config.yml`, `_posts/`, `_publications/` and the rest. All of it went in the
rebuild and survives only in the git history. `files/starkman_cv.pdf` kept its
original URL.

[ap]: https://github.com/academicpages/academicpages.github.io
