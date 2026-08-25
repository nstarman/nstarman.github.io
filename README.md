# nstarkman.space

Source for [nstarkman.space](https://nstarkman.space) — an Astro site, a CV
database, and the tooling that renders one into the other.

Everything comes out of `data/`. One JSON file per item, and the same database
renders the website, the [profile README][profile], the CV PDFs, and
[nstarkman_publications.bib](https://nstarkman.space/nstarkman_publications.bib). Adding a paper or
a conference is one small file.

**Adding something? Read [AGENTS.md](AGENTS.md).**

[profile]: https://github.com/nstarman/nstarman

## Layout

```
data/            one item per file, data/<date.start>-<id>.json — the source of truth
data/lists/      bare enumerations (peer review) as plain arrays
config/          things that are configuration rather than items: the CV presets,
                 the person, and the generated contributions list
schema/          the item JSON Schema, plus invalid fixtures the tests assert on
src/             the Astro site
cv/              the Typst CV template, and the portrait and QR it draws
tests/           vitest suites over src/lib and the generated data
scripts/         test, build and generation scripts
public/          served verbatim: CNAME, files/starkman_cv.pdf, and the fonts
                 the CV is compiled from
```

## Commands

```bash
npm install
npm run dev        # local server
npm run build      # static build into dist/
npm run build:all  # the site, then the four CV PDFs (needs typst)
npm test           # everything below, in order; CI runs it on every pull request
```

`npm test` is the whole gate, not a subset — `test:unit`, `test:schema`,
`test:bibtex`, a build, `test:a11y`, `test:links`. Each runs on its own too:

```bash
npm run test:unit    # vitest over src/lib and the generated data
npm run test:schema  # every record against schema/, including the invalid fixtures
npm run test:bibtex  # escaping, names, case protection, maths in abstracts
npm run test:a11y    # every link and heading on every built page has a name
npm run test:links   # every internal link, anchor, published record and PDF resolves
npm run validate     # the schema check alone, against data/*.json
```

`test:a11y` and `test:links` read `dist/`, so they need a build first — which is
why `npm test` builds in the middle rather than at the end.

## The CV

The four pre-built PDFs and the in-browser builder at `/cv/builder/` compile the
same `cv/cv.typ` from the same render model, so the PDF and the site cannot
disagree about what a preset contains. Under CI the Typst CLI reads `cv.json`
off disk; in the browser typst.ts is handed the same filename through its
virtual filesystem. Nothing forks.

### Styles

The builder adds a style menu beside **Compile PDF**:

| style | what it is |
|---|---|
| **Default** | what the pre-built PDFs are. Font Awesome and Academicons marks on links, section headings and the contact block. |
| **Default - 🎨** | the same CV with none of the marks. Where a glyph stood alone the word takes its place — a resource trail reads `code, docs` rather than two icons — and the PDF embeds no icon fonts at all. |

A style is one key on `cv.json`:

```json
{ "style": "plain" }
```

read by `cv.typ` as `cv.at("style", default: "default")`. **Only the builder
sets it.** The CLI never writes it, so every pre-built PDF is the default and
the one- and two-page contracts cannot be affected by a style. (Both hold at
one and two pages in either style regardless, which is worth knowing: words are
wider than glyphs.)

Adding a style is a branch in `cv.typ` behind that key plus an `<option>` in
`src/pages/cv/builder.astro` — not a second template. Call sites that pair a
mark with words go through one `marked()` helper, so the styles cannot drift
apart; only a mark standing *alone* needs a deliberate fallback, or it compiles
to an empty link.

## Generated data

Most of `data/` is written by hand. One file is not:
`config/contributions.json` — the open-source repositories with merged pull
requests that are not mine and have no Software card of their own.

```bash
node scripts/collect-contributions.mjs           # rewrite the list
node scripts/collect-contributions.mjs --check   # exit 1 if anything is new
```

It walks merged pull requests oldest-first through fixed date windows — the
GitHub search API caps a query at 1000 results — so a repository's first
appearance really is the first contribution. Forks, anything already rendered
as a Software card, and anything under `nstarman/` are dropped automatically;
`config/contributions-exclude.json` holds only the judgement calls the script
cannot make, such as papers and workshops that happen to be repositories.

`.github/workflows/refresh-contributions.yml` runs it monthly and opens a pull
request when something new appears — but only after the schema, build and a11y
gates pass on the regenerated file.

## Deployment

GitHub Pages via Actions (`.github/workflows/deploy.yml`), not a branch deploy:
Astro builds to `dist/`, which a branch deploy would mean committing — and
would publish the repo source instead of the built site.

`public/CNAME` ships the custom domain in the artifact so it survives every
deploy.

Every pull request also gets a full preview — `preview.yml` builds the site and
the four PDFs and deploys them to Cloudflare Pages, then posts the URL as a
sticky comment. GitHub Pages serves one deployment per repository and that one
is production, which is why previews live elsewhere. The job skips rather than
fails when the Cloudflare secrets are absent, so a fork does not see a red
tick. One page cannot work there: `/cv/builder/` needs a 27 MiB compiler wasm
and Cloudflare refuses any file over 25 MiB.

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
