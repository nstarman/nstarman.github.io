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
| **adrn** | a close mimic of [adrn/cv](https://github.com/adrn/cv). Lato rather than a serif, steel-blue headings over a light rule, US Letter with 1in margins, no portrait or QR, dates inline instead of in a gutter, and a running head. Values are taken from that repo's `apw-cv.cls`, not eyeballed. |

A style is one key on `cv.json`:

```json
{ "style": "plain" }
```

read by `cv.typ` as `cv.at("style", default: "default")`. **Only the builder
sets it.** The CLI never writes it, so every pre-built PDF is the default and
the one- and two-page contracts cannot be affected by a style. `plain` holds at one and two pages too, though that was
not a given — words are wider than glyphs. **`adrn` does not, and cannot:** US
Letter with 1in margins is about a third less text area than this A4 setup, so
the one-page preset runs to two. That is a property of the design being copied,
not something spacing can recover.

Adding a style is a branch in `cv.typ` behind that key plus an `<option>` in
`src/pages/cv/builder.astro` — not a second template. Call sites that pair a
mark with words go through one `marked()` helper, so the styles cannot drift
apart; only a mark standing *alone* needs a deliberate fallback, or it compiles
to an empty link.

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
