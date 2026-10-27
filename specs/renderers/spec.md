# Renderers

**Covers**: `src/pages/` (but `embed/`, `cards/` and `webdev/card.astro`), `packages/site-layout/`,
`packages/data-resolver/`, `packages/collaborator-map/`, `packages/research-kit/`, `src/lib/data.js`, `src/lib/confmap.js`, `packages/collaborator-map/src/collabmap.js`, `packages/collaborator-map/src/worldmap.js`,
`packages/data-resolver/src/places.js`, `packages/data-resolver/src/mentees.js`, `packages/data-resolver/src/bibtex.js`, `src/lib/bibcompare.js`,
`src/lib/typstcompile.js`, `cv/`, `scripts/publish-data.mjs`, `scripts/build-cv-pdfs.sh`,
`scripts/test-a11y.mjs`, `scripts/test-links.mjs`, `scripts/test-bibtex.mjs`, `package.json`
scripts, `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `.github/workflows/release-site-layout.yml`,
`.github/workflows/release-research-kit.yml`
**Status**: Current — describes the system as it is (constitution, Article X).

## Scope

Everything that reads `data/` and `config/` and produces an output: the site's pages, the
published records, the CV PDFs, the `.bib`, the layout other repos borrow, and the gates that
hold them. Not covered: what an item may contain (`specs/data-model/spec.md`); how a preset
selects and prints items (`specs/cv-presets/spec.md`); every card, `/embed/`, `/cards/` and the
Card Builder (`specs/cards/spec.md`); the scripts and workflows that refresh `config/`
snapshots (`specs/refresh/spec.md`).

## Requirements

### Loader

- **FR-001** `src/lib/data.js` is the one loader: it reads `data/*.json` through Vite's
  `import.meta.glob` (inlined at build) and `data/lists/*.json` into `lists`, and throws on any
  file not named `<date.start>-<id>.json`. It builds the **store** —
  `createStore({ items, lists, config })` of `@nstarkman/data-resolver`
  (`packages/data-resolver/src/store.js`) over the items and the `config/` snapshots — and
  exports every name of it, so the site's modules import from `data.js` as they always have, and
  the card and map packages import the same module as `@nstarkman/research-store` (FR-025). `items` sorts newest first by `date.start` as a
  string, with `status: "in-prep"` ahead of everything. Plain-node scripts read the same files
  through `scripts/lib/items.mjs`. *Enforced:* `tests/data.test.js` ("sorts newest first, with
  work in preparation ahead of it"); importing the loader in `tests/integrity.test.js` is the
  filename check.
- **FR-002** Display derivations live in the store (`store.js`, re-exported by `data.js`) and nowhere else: `displayName` ("N.
  Starkman"), `authors()` (truncation that elides to the owner — "J. Nibauer, …, N. Starkman, et
  al." — never past the owner), `authorPosition` (index of the `me` author; `collaboration` takes no
  slot; `authorPosition` overrides), `dateLabel` ("2024 –", "2018 – 2024", "In Prep" for
  in-prep), `links()` (ADS synthesised from `bibcode`, the preprint from `arxiv`, ordered by
  `REL_ORDER`), `venueUrl` (published only; never an arXiv `10.48550/` DOI, never ADS),
  `primaryLink`, `softwarePapers`, `softwareUsed`. *Enforced:* `tests/data.test.js`.

### Site pages

- **FR-003** `/` (`index.astro`) shows `config/person.json`'s name, role, contacts and bio; the
  first five `featured` publications as `PRESET.home` cards; a Background timeline of the
  `position`, `fellowship` and `education` items whose `cvs` include `2page`, grouped by `institutionGroups`;
  and the software lead and `major` packages (`SoftwareSection tail={false}`). *Enforced:* build;
  review.
- **FR-004** `/publications/` lists every publication but `in-prep`, newest first, with a year
  rail, a topic filter over `tags`, and an author-position filter whose stops come from
  `positionStops` (a stop that admits no new papers, or all of them, is dropped). A proceeding
  with `preliminaryOf` naming a listed paper is drawn under it as `PRESET.proceeding`, not on
  its own. Each entry carries the anchor `#pub-<id>`. After the list, **Assists** draws
  `config/acknowledgements.json`'s papers as `PRESET.assist` cards, outside the author filter.
  *Enforced:* `tests/integrity.test.js` ("resolves every preliminaryOf to a publication");
  `test:links` for anchors; review.
- **FR-005** `/research/` shows, in order: the collaborator map; **Research Highlights**, only
  when any card exists — one section per `HIGHLIGHT_TOPICS` entry (`data.js`) that has a card,
  in that array's order, anchored `#hl-topic-<key>`, with its introduction, a sideways-scrolling
  carousel of `PRESET.carousel` cards (`type: "highlight"` syntheses first, then papers with a
  `highlight`, each newest first, anchored `#hl-<id>`) and a row of the packages those papers
  used (`softwareUsed`); then the conference map. A topic absent from `HIGHLIGHT_TOPICS` (today
  `software`) is not shown. *Enforced:* build; review.
- **FR-006** In a topic introduction, `[](item:<id>)` becomes an inline-card link named by the
  item's `nickTitle` (falling back to `shortTitle`, `title`): to `#hl-<id>` when the item has a
  highlight, to `/software/#sw-<id>` for a package, else to the paper's `primaryLink`. An id that
  names no item throws, failing the build. *Enforced:* build (`research.astro` throws);
  `tests/integrity.test.js` checks `item:` links in item prose but not in `HIGHLIGHT_TOPICS`.
- **FR-007** `/software/` draws every `software` item in `SOFTWARE_GROUPS` (`data.js`) order,
  anchored `#sw-group-<key>`, each with its introduction; a group with no package is skipped.
  Within a group: the `flagship` lead, `major` cards by `order` then newest first, then `minor`
  and `utility` A–Z packed into boxes. After every group, `config/contributions.json`'s repos. A
  CSS-only radio filter keeps only packages with a paper (`softwarePapers`). Each package is
  anchored `#sw-<id>`. *Enforced:* build; review.
- **FR-008** `/people/` lists every `mentoring` item with a `person` (`mentees()`), linking each
  to `/people/<slug>/`. A profile shows the name, level, institution, dates, co-supervisors,
  `badge`, a link to the person on the collaborator map, the `research` text, papers whose
  author names the mentee (`mentee: <id>`) and the packages those papers are about, and
  `achievements` newest first; an empty section is left out. *Enforced:* `tests/mentees.test.js`,
  `tests/integrity.test.js` (`describe('mentees')`).
- **FR-009** `/cv/` renders the `np` preset; `/cv/<preset>/` each other preset in
  `config/presets.json` (today `complete`, `2page`, `1page`); `/cv/<preset>.json` is
  `cvModel(preset)` for every preset including `np`. Each CV page links its PDF at
  `/cv/starkman-cv-<preset>.pdf`, and items to `/records/<id>.json`. *Enforced:*
  `tests/presets.test.js` ("are the four the site offers"), `tests/cvmodel.test.js`;
  `test:links` once the PDFs are built.
- **FR-010** `/tools/` lists the Web Dev tools (`/webdev/cv/`, `/webdev/card/`,
  `/webdev/tiers/`) and tools in their own repos; it is linked from the footer, not the nav.
  Its Agent Skills cards are `config/skills.json` (see `specs/refresh/spec.md`, FR-023); a skill that
  lives in another repository says "from <owner/repo>" under its text, and a line above the cards
  links to the install instructions in nstarman/skills' README.
  `/webdev/cv/` renders the `complete` CV with a checkbox per entry and line, seeded from `np`,
  and compiles a PDF in the browser through `src/lib/typstcompile.js` (typst.ts, `cv/**/*.typ`
  globbed, the compiler wasm gzipped by `scripts/gzip-compiler.mjs` into `src/generated/`).
  `/webdev/tiers/` lists each package under its `tier`. *Enforced:* build; review.
- **FR-011** `/404.html` exists, linking home, publications, software and the CV. *Enforced:*
  build; review.

### Maps

- **FR-012** The conference map (`conferenceMap()` in `confmap.js`) puts every `presentation`
  in exactly one of: a pin at its `location` (resolved by `locate()` in `places.js` against
  `config/places.json`, following `sameAs`), one `Online` pin at `ONLINE_AT` (lat −70, lon 0),
  `unsettled` (a location `locate` cannot place), `unplaced` (no location), or `accepted`
  (`kind: "accepted"`, left off the map). A pin is a place, sized by area (`radius(n) =
  2.8·√n`); places alphabetical, talks newest first. `unsettled` and `unplaced` are listed under
  the map as "not placed yet" — never dropped. Each talk's line names its `talk` title in
  “quotation marks”, then any `details` note, joined by " — ". *Enforced:* `tests/confmap.test.js` ("accounts
  for every presentation exactly once", "leaves off a talk that was accepted but never given",
  "refuses a location a geocoder would misread, rather than guessing", "a talk's title on the map").
- **FR-013** The collaborator map (`collaboratorMap()` in `collabmap.js`) has one entry per
  person in `config/collaborators.json` with at least one dated, placeable post, plus every
  mentee (with `pins: []` if nothing places); a mentee's `journey` fills posts ORCID lacks. A
  pin carries the papers (and Assists) dated within that post; the rest are `unplacedPapers`.
  People sort by surname. `collabHref(key)` is `/research/?collab=<key>#collaborators`, or null
  for someone not on the map. *Enforced:* `tests/collabmap.test.js`.
- **FR-014** Both maps project with Equal Earth (`worldmap.js`) onto a committed outline
  (`packages/collaborator-map/src/world-equal-earth.json`), inline SVG with no tiles, separate coincident pins with
  `spread`, and colour by `hueFor` (golden angle). *Enforced:* `tests/collabmap.test.js`
  ("the Equal Earth projection", "agrees with the published formula").

### Published files

- **FR-015** `scripts/publish-data.mjs`, run by `predev` and `prebuild`, empties
  `public/records/` and writes each item to `/records/<id>.json` (named by `id`, not filename),
  its `$schema` rewritten to `./item.schema.json`, beside a copy of `schema/item.schema.json`.
  `public/records/` is git-ignored. These URLs never move (Article III). *Enforced:*
  `test:links` (the first five records' `$schema` resolve); review.
- **FR-016** The profile README at `github.com/nstarman/nstarman` is rendered there, not here.
  Its scripts read from this repo, via the GitHub API at `main`, the raw `data/*.json` and
  `config/person.json` — not `/records/` — and, from `dist/cards/` of a build of this repo at
  `main`, `/cards/index.json` and `/cards/<id>-<light|dark>.svg` (`specs/cards/spec.md`, FR-007).
  Nothing in this repo triggers that refresh. *Enforced:* review.
- **FR-017** `/nstarkman_publications.bib` is `toBibliography()` (`bibtex.js`) over every
  publication but `in-prep`, served as `text/plain`. Every entry's type is the item's
  `entryType`; authors are "Family, Given", a `collaboration` braced and leading; the title is
  double-braced; `venue.year`/`venue.month` win over `date.start` and months are never mixed;
  `adsurl` comes from `bibcode`; a non-`published` status is the `note`. The citekey is
  `citekey()`, per constitution Article VI. *Enforced:* `tests/bibtex.test.js`
  (`describe('citekey')` and the `tests/fixtures/citekeys.json` freeze), `test:bibtex`.
- **FR-018** `test:bibtex` (`scripts/test-bibtex.mjs`) checks the whole bibliography — one entry
  per publication, braces balanced, `&` escaped, no raw en/em dash, titles brace-protected, a
  submitted paper is `@misc` with a `note`, abstract maths intact, every author "Family, Given" —
  and that each paper with a `bibcode` is in `config/bibtex-reference.json` and matches it under
  `compareToArchive` (`bibcompare.js`; Article VI). *Enforced:* `test:bibtex`;
  `tests/bibcompare.test.js`.

### CV PDFs

- **FR-019** `scripts/build-cv-pdfs.sh` runs after `npm run build`: for each `dist/cv/*.json` it
  copies the model to `cv/cv.json` (git-ignored) and compiles `cv/cv.typ` with the Typst CLI
  (`--font-path public/fonts --ignore-system-fonts`) to `dist/cv/starkman-cv-<preset>.pdf`, also
  copied to `public/cv/`. It fails on an "unknown font family" warning; where `pdffonts` exists,
  on any face in the complete CV outside the vendored ones; and unless `1page` is one page and
  `2page` two. It copies the `np` PDF to `/files/starkman_cv.pdf`. *Enforced:* CI step "CV PDFs".
- **FR-028** `npm run build:cv -- <selection.json> [out.pdf]` (`scripts/build-cv.mjs`) compiles a saved
  builder selection without the site, through the builder's own `modelFromSelection` (so laid out as the
  selection's `preset`, cv-presets FR-020), with the template, fonts and Typst arguments of FR-019 (`TYPST=`
  names the binary). The output defaults to `<selection>.pdf` beside the file, and both paths are
  taken from where the command was run. `--model` prints the render model as JSON and compiles
  nothing. A selection with nothing ticked, an unreadable or newer-format file, a missing Typst, a
  Typst failure or an "unknown font family" warning exits non-zero with a message and no PDF, and
  `cv/cv.json` is not left behind; an entry the database no longer holds is dropped, as in the
  builder.
- **FR-029** The builder and `build:cv` draw one selection as one CV. The model is
  `modelFromSelection(sel)` (`src/lib/selectionmodel.js`) over a decoded selection, and it uses every
  field `decode` returns but the provenance (`savedAt`, `site`). The builder's Compile calls it on `decode(JSON.stringify(currentSelection()))`, the same
  `currentSelection()` Save writes, so the saved file and the compiled CV name the same settings;
  the page builds no model any other way. *Enforced:* `tests/selectionmodel.test.js` — the page calls
  the function and not `cvModel`, the function reads every field, and the command's model equals the
  function's; the PDF compile runs where Typst is installed. The builder keeps compiling with its own
  copy of the compiler, so a line may set differently from the command's PDF by a compiler version.

### Hosted-sites layout

- **FR-020** The layout, `SiteLayout.astro`, with the site stylesheet `site.css` and
  `IconSprite.astro`, is the npm package `@nstarkman/site-layout` in `packages/site-layout/`. This
  site uses it from there (an npm workspace); sites at `nstarkman.space/<repo>/` install a pinned
  release. It imports only `./site.css` and `./IconSprite.astro`; IconSprite imports nothing, and
  `site.css` has no `@import` or `url(`. Its hrefs are site-absolute, so under a hosted site's `base`
  they still reach this site. It takes `title`, `description`, `section` (the nav entry to mark) and
  `repo` (default `nstarman/nstarman.github.io`), which the footer's "Last updated" links to at
  `https://github.com/<repo>`. The package contains exactly those three files, `README.md`,
  `CHANGELOG.md`, `LICENSE` (MIT) and `package.json`. Versions are `YYYYMMDD.0.N` (`N` counts fixes),
  each with a `CHANGELOG.md` section; a tag `site-layout-v<version>` publishes it to npm with trusted
  publishing and provenance, no token, refusing a tag that differs from the version. *Enforced:*
  `tests/site-layout.test.js` (imports, exports, packed files, version and changelog, and a fixture
  site built under `base: '/demo'`); `.github/workflows/release-site-layout.yml`.
- **FR-025** A paper's own site (syw-site) draws the paper's entry, card and collaborator map with this
  site's own code through four packages released together at one version, `YYYYMMDD.0.N`:
  `@nstarkman/data-resolver` (the store; `collect`; readers), `@nstarkman/card-builder` (`Card`,
  `Publication` and the parts they draw with, the card-name interpreter and `SITE_PRESETS`, `maths`),
  `@nstarkman/collaborator-map` (`CollabMap`, its geometry, the conference maps' shared `worldmap`,
  `mappick`, `mapzoom` and `map.css`), and `@nstarkman/research-kit`, which depends on the three at
  exactly its version and re-exports their entry points. This site imports them from
  `packages/` (npm workspace). Their components read data only from `@nstarkman/research-store`, which
  the consumer aliases to a module exporting a store's names (here `src/lib/data.js`) and loads
  through Vite in dev and build (`ssr.noExternal` and, Astro 7 prerendering in its own environment,
  `environments.prerender.resolve.noExternal`, both `[/^@nstarkman\//]`). The data modules the card and map read —
  `mentees`, `places`, `inline`, `bibtex`, `urls` (`siteHref`) — are in `data-resolver`;
  `card-builder` depends on `collaborator-map` too, for the byline's links to a co-author on the map.
  *Enforced:* `tests/research-kit.test.js` (one version, exact dependencies, changelog sections);
  `tests/kit/paper-site.test.js` (FR-026).
- **FR-026** `collect(id, reader)` returns a paper's **snapshot** (schema 1): the item and the items
  reached from it — its `refs` (software and each package's own papers, grants, highlights) and the
  mentees on its authors — as they are in `data/` without `internal`, the `config/` slices they use
  (collaborators who are its co-authors, the places they need, its journals, its packages' stars), the
  `cards/<id>.json` choice (default `paperSite`), and `source` (repository, ref, commit). `fromDisk(root)`
  and `fromGitHub({ repo, ref })` (one tree listing, then raw files of that commit) read the same files.
  A store built from a snapshot gives the site's own answers for the item. *Enforced:*
  `tests/research-kit.test.js` (every card item: disk ≡ GitHub; snapshot store ≡ site store; a missing
  file named with what referred to it); `tests/kit/paper-site.test.js` (a fixture site with only
  research-kit and a snapshot draws `stream-convexity-rate`'s entry exactly as `/publications/` does,
  and `paperSite` without the context link).
- **FR-027** A tag `research-kit-v<version>` publishes the four packages, in dependency order, with
  trusted publishing and provenance and no token, refusing a tag that differs from any package's
  version and skipping a version already on npm; a backport is published under `backport-<date>` so
  `latest` stays the newest. *Enforced:* `.github/workflows/release-research-kit.yml`.
- **FR-021** A hosted repo never takes a top-level path this site uses (Article III; see
  *Reference*). *Enforced:* review — no test lists the paths.

### Gates

- **FR-022** `npm test` runs `test:unit` (all of `tests/**/*.test.js` but `tests/kit/`, which includes
  `test:schema`'s two files), `test:bibtex`, `build`, `test:kit` (`tests/kit/`, which compares with the
  build), `test:a11y`, `test:links`, stopping at the first failure. `test:a11y` fails on any `<a>` without `href`, or `<a>`, `<button>` or `<h1–6>`
  in `dist/` without an accessible name (text, `aria-label`, `aria-labelledby`, `img alt`, `svg
  title`; `title` alone fails). `test:links` fails on a site-absolute href, cross-page or in-page
  anchor that does not resolve in `dist/`, a duplicate `id` on a page, or a page or entry anchor
  `/embed/index.json` names that is missing. *Enforced:* `package.json`; the scripts.
- **FR-023** CI (`ci.yml`, every pull request and push to `main`) runs, in order: "Design notes
  stay on their branch", `test:unit`, `test:schema` and `test:bibtex`, `build`, `test:kit`, `test:a11y`,
  `build:pdf`, `test:links` (after the PDFs, so their links are checked), then uploads `dist/`.
  On a pull request, `preview` deploys that artifact to Cloudflare Pages (without `CNAME` and
  files over 25 MiB) and comments the URL; with no secrets it passes without deploying. **CI
  Pass** needs `test` and `preview`, allowing `preview` to be skipped, and is the one required
  check. *Enforced:* `.github/workflows/ci.yml`; the repository ruleset.
- **FR-024** `deploy.yml`, on push to `main` or by hand, runs `npm test`, `build:pdf`, checks
  that Pages' `build_type` is `workflow`, and deploys `dist/` to GitHub Pages only from the
  default branch. *Enforced:* `.github/workflows/deploy.yml`.

## Key Entities

- **Item / list** — the records `data.js` loads (`specs/data-model/spec.md`).
- **CV model** — `cvModel(preset)`, the JSON both `/cv/` pages and `cv.typ` read
  (`specs/cv-presets/spec.md`).
- **Highlight topic** / **software group** — `[key, heading, introduction]` in
  `HIGHLIGHT_TOPICS` (introduction a list of paragraphs) / `SOFTWARE_GROUPS`.
- **Pin** — conference map `{place, lat, lon, x, y, talks, r, hue}`; collaborator map
  `{organization, place, role, start, end, x, y, papers}`.

## Edge Cases

- **`test:links` without PDFs** (`npm test`, or `deploy.yml`, which runs it before `build:pdf`):
  PDF links are skipped and counted, not reported missing.
- **A proceeding whose full paper is `in-prep`**: listed on its own on `/publications/`.
- **A `[](item:id)` in a topic introduction naming nothing**: the build throws.
- **A mentee with nothing placeable**: kept on the collaborator map with no pins.
- **A talk with location `TO, CA`-style**: `unsettled`, listed with "recorded as …".
- **A topic with no card, a software group with no package**: not rendered.

## Reference

Top-level paths the build serves (`dist/`), which a hosted repo must not take: `cv`, `embed`,
`cards`, `research`, `people`, `publications`, `software`, `tools`, `webdev`, `records`,
`files`, `fonts`, `highlights`, `_astro`, plus `nstarkman_publications.bib`, `404.html`.

| npm script | runs |
|---|---|
| `predev` / `prebuild` | `publish-data.mjs`, `gzip-compiler.mjs` |
| `validate` | `scripts/validate.mjs` over `data/*.json` |
| `test:unit` | `vitest run` |
| `test:schema` | `vitest run tests/schema.test.js tests/integrity.test.js` |
| `test:bibtex` | `scripts/test-bibtex.mjs` |
| `test:a11y` / `test:links` | `scripts/test-a11y.mjs` / `scripts/test-links.mjs` over `dist/` |
| `build:pdf` | `scripts/build-cv-pdfs.sh` |
| `test` | `test:unit && test:bibtex && build && test:a11y && test:links` |
