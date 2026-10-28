# Refresh scripts and snapshots

**Covers**: `.github/workflows/refresh-*.yml`, `.github/workflows/card-layout-fuzz.yml`,
`.github/workflows/milestone-prs.yml`, `scripts/refresh-publications.mjs`,
`scripts/collect-stars.mjs`, `scripts/collect-skills.mjs`, `scripts/skills-index.mjs`, `scripts/collect-contributions.mjs`,
`scripts/collect-collaborators.mjs`, `scripts/collect-acknowledgements.mjs`,
`scripts/scrape-astropy-voting-members.mjs`, `scripts/scrape-astropy-team-history.mjs`,
`scripts/sync-software-figures.mjs`, `scripts/fetch-affiliations.mjs`,
`scripts/geocode-places.mjs`, `scripts/build-worldmap.mjs`,
`scripts/record-card-layouts.mjs`, `scripts/open-refresh-pr.sh`, `scripts/lib/`
**Status**: Current — describes the system as it is (constitution, Article X).

## Scope

Every fact the site states that lives somewhere else — ADS metadata, GitHub
stars and pull requests, ORCID histories, Astropy's team lists, upstream logos,
coordinates, the world outline, Chrome's layout of a card — and how it arrives:
a script fetches it, writes a committed **snapshot**, and a workflow proposes
the change for review. The build and the tests read only the snapshots
(constitution, Article VIII). Not covered: the fields the snapshots fill and
their schema (`specs/data-model/spec.md`); how pages, the README and the CVs
render them (`specs/renderers/spec.md`); what the card fixture and the fuzz
test hold `cardlayout.js` to (`specs/cards/spec.md`).

## Requirements

- **FR-001** Remote facts are committed snapshots: `config/stars.json`,
  `config/skills.json`, `config/contributions.json`, `config/collaborators.json`,
  `config/acknowledgements.json`, `config/astropy-voting-members.json`,
  `config/astropy-team-history.json`, `config/places.json`,
  `config/bibtex-reference.json`, `packages/collaborator-map/src/world-equal-earth.json`,
  `public/highlights/*` with `highlight.source.sha`, and the publication fields
  `abstract`, `bibcode`, `doi`, `citations` and author `affiliation` in `data/`.
  The site imports them (`src/lib/data.js`, `collabmap.js`, `places.js`,
  `worldmap.js`, `SoftwareSection.astro`, `pages/tools/index.astro`); no build step or test calls a network
  service, `tests/cardlayout.differential.test.js` excepted (FR-016)
  (Article VIII). *Enforced:* review — no check exists (Article VIII says so).
- **FR-002** Every generated snapshot carries a `$comment` naming its script and
  saying not to edit it by hand, and is written as 2-space JSON with a final
  newline in a deterministic order, so a rerun with nothing new is no diff
  (Article V). *Enforced:* `tests/contributions.test.js` ("is sorted oldest
  first, so a rerun produces the same file"), `tests/acknowledgements.test.js`
  ("is newest first"); review for the rest.
- **FR-003** A scheduled refresh never pushes to the default branch.
  `scripts/open-refresh-pr.sh <branch> <title> <body> <file>…` resets
  `<branch>` to `HEAD` (create, else force-PATCH), commits each listed file that
  differs from `HEAD` through the contents API (signed by GitHub, as the branch
  ruleset requires; message `Refresh <basename>`), and opens a PR against
  `GITHUB_REF_NAME` unless one is already open on that branch. A rerun replaces
  the last proposal rather than stacking on it. Each workflow exits early, with
  a line in the step summary, when its files are unchanged. *Enforced:* review.
- **FR-004** A PR opened with the workflow token triggers no workflow, so CI
  does not run on a refresh PR until someone pushes to its branch. Each refresh
  workflow therefore runs gates itself before proposing: see *Reference*.
  `refresh-publications` and `refresh-acknowledgements` put the gates' outcome
  in the PR body instead of failing. *Enforced:* the workflows.
- **FR-005** `scripts/refresh-publications.mjs` (env `ADS_API_TOKEN`, the
  secret `ADS_TOKEN`; exits 2 without it) asks ADS for each publication by its
  strongest identifier — `bibcode`, else `doi`, else `arxiv` without its
  version — and writes only what is missing or changed: an `abstract` where
  there is none; a `bibcode` where there is none or where an arXiv bibcode is
  superseded by a journal one, never the reverse and never one journal bibcode
  for another; a `doi` where there is none, never arXiv's `10.48550/`; and
  `citations` when it differs. An existing abstract is never replaced; ids and
  author lists are never touched. An abstract of 120 characters or fewer is
  dropped as a stub. *Enforced:* `tests/ads.test.js` ("fills only what is
  missing and never replaces an abstract", "replaces a preprint bibcode with a
  journal one, never the reverse", "ignores the arXiv-issued DOI", "drops a stub
  abstract and an invalid DOI, and updates the count").
- **FR-006** Where ADS has no abstract the script tries arXiv by id, then
  Crossref by DOI, then an arXiv title search accepted only on an exact
  normalized title match. Fetched markup is stripped and entities unescaped
  once; `$…$` maths is kept. *Enforced:* `tests/ads.test.js` ("cleans markup
  but keeps maths", "unescapes once", "reads arXiv and Crossref", "accepts a
  title search hit only on an exact title").
- **FR-007** The same run exports ADS's own BibTeX for every bibcode (all
  authors, `maxauthor: 0`) into `config/bibtex-reference.json`, keyed by ADS key
  and sorted, which `npm run test:bibtex` compares entries with (see
  `specs/renderers/spec.md`). `--check` writes nothing and exits 1 if anything
  would change. *Enforced:* `scripts/test-bibtex.mjs` ("is in
  config/bibtex-reference.json"); review for the export.
- **FR-008** `scripts/collect-stars.mjs` writes `config/stars.json` — the
  `stargazers_count` of every `repo` on a `software` item. A repository that
  cannot be read keeps its last count; one never counted is left out with a
  warning (Article V: counts are never hand-written). *Enforced:*
  `tests/cards.test.js` ("the stars button" — every software repo has a count).
- **FR-009** `scripts/collect-contributions.mjs` writes
  `config/contributions.json`: every repository with a merged PR authored by
  `nstarman`, found by GitHub search partitioned into fixed `PERIODS` to stay
  under the 1000-result ceiling, with its first PR date and PR count. It drops
  repositories in `config/contributions-exclude.json` (hand-curated), those
  linked from a `software` item, the user's own, and forks. Sorted by first
  date, then name. *Enforced:* `tests/contributions.test.js` ("contains nothing
  the exclude list drops", "does not repeat a package that already has a
  Software card", "lists no repository of his own", "lists each repository
  once").
- **FR-010** `scripts/collect-acknowledgements.mjs` (env `ADS_TOKEN`) writes
  `config/acknowledgements.json`: ADS papers whose `ack:` names one of four full
  spellings of the name — never the bare surname — and of which the owner is not an
  author. `exclude` (bibcodes) and each paper's `tags` are curated: an existing
  paper, matched by bibcode, arXiv id or DOI, keeps its tags; a new one gets a
  keyword guess, listed in the PR body to be checked. *Enforced:*
  `tests/acknowledgements.test.js` ("files every paper under a topic in the
  Topics menu", "contains nothing the exclude list drops", "lists each paper
  once").
- **FR-011** `scripts/collect-collaborators.mjs` writes
  `config/collaborators.json` from public ORCID employments and educations of
  every author with an `orcid` in `data/` or in
  `config/acknowledgements.json`, the site's own author included and marked
  `me: true` (placed on the maps, not counted as a collaborator); only the ORCID
  iD is sent. An unreadable or
  empty record is an empty `affiliations`, never a guess. Institution spellings
  are made to agree (case/punctuation, and containment only within one
  country), and each gets one city. `--new` looks up only people not yet in the
  file. *Enforced:* `tests/collaborators.test.js` ("has one entry per ORCID",
  "only lists people who actually appear as authors", "lists the site's author
  once, marked `me`, for the maps to place beside the co-authors", "gives each institution exactly one place", "spells each
  institution one way", "sorts each history newest first").
- **FR-012** The yearly collaborator refresh changes recorded history, so it
  opens an **issue**, not a PR: labelled `collaborators`, titled
  `Collaborator affiliations have changed on ORCID (<year>)`, carrying up to
  200 lines of diff and the gates' outcome, and skipped when an open issue has
  that title. The monthly acknowledgements refresh runs `--new` and proposes the
  additions as a PR. *Enforced:* `refresh-collaborators.yml`; review.
- **FR-013** `scripts/scrape-astropy-voting-members.mjs` writes
  `config/astropy-voting-members.json`: the list under the "Active Voting
  Members" heading of `https://www.astropy.org/team`, deduplicated and sorted.
  It throws, writing nothing, if the heading or list is missing. When the list
  is unchanged it keeps the old `read` date, so no PR is opened for a date
  alone. *Enforced:* `tests/astropy-voting-members.test.js` ("keeps only active
  members…", "refuses a changed page structure instead of silently writing an
  empty list", "records the source and a reproducible read date").
- **FR-014** `scripts/scrape-astropy-team-history.mjs [repo]` writes
  `config/astropy-team-history.json`: everyone named in a role in any revision
  of `astropy/astropy.org`'s `about.html`, `roles.txt`, `roles.json`,
  `team.rst` and `about.rst`, folded to one record per name with roles and
  first/last seen. Placeholders ("Unfilled", "TBD", "All …") are dropped. Run by
  hand only. *Enforced:* `tests/astropy-team-history.test.js` ("Astropy
  team-history parsers"); both Astropy snapshots feed "astropy-v5-paper
  ORCIDs".
- **FR-015** `scripts/sync-software-figures.mjs` re-makes `public/<image>` for
  each item with `highlight.source` when the upstream blob's SHA differs from
  `source.sha` or the image is missing, then writes the new `source.sha`. The
  target extension decides: SVG→`.svg` copied; SVG→`.webp` rasterized 512 px
  wide at quality 85; PNG→`.webp` via `cwebp -q 85`; any other pair throws. An
  item without `source` is never touched. `--check` exits 1 if any is stale.
  *Enforced:* review; `test:links` in the workflow checks the images resolve.
- **FR-016** `card-layout-fuzz.yml` runs `tests/cardlayout.differential.test.js`
  (`CARD_FUZZ=1`) against a dev server in Chromium on `macos-latest`, outside
  CI: weekly with `FC_RUNS=1000`, by hand (default 500, optional `seed` and
  `path` to replay), and when a PR is labelled `fuzz-cards` (300), after which
  the label is removed. A failure writes the counterexample to the step summary
  and uploads `fuzz-report` for 30 days. *Enforced:* the workflow.
- **FR-017** `milestone-prs.yml` sets the `♾️&➡` milestone on every PR when
  it is opened (`pull_request_target: opened`). *Enforced:* the workflow.
- **FR-018** Run by hand only, results committed: `geocode-places.mjs` (also
  run by `refresh-acknowledgements`), `scrape-astropy-team-history.mjs`,
  `fetch-affiliations.mjs`, `build-worldmap.mjs`, `record-card-layouts.mjs`.
  *Enforced:* review.
- **FR-019** `scripts/geocode-places.mjs` asks Nominatim (one request per 1.1 s)
  only for names missing from `config/places.json` — collaborator institutions
  and presentation `location`s in the settled format — and records `lat`, `lon`
  (4 decimals) and `matched`. It never overwrites an entry, so a hand
  correction or `sameAs` survives. `Online` and unsettled locations are
  reported and left unplaced. `--check` exits 1 if anything wanted is
  unplaced. *Enforced:* `tests/places.test.js` ("points every sameAs at a place
  with coordinates of its own", "writes each coordinate once"),
  `tests/integrity.test.js` ("places every journey stop"),
  `tests/confmap.test.js` ("accounts for every presentation exactly once").
- **FR-020** `scripts/fetch-affiliations.mjs` fills `affiliation` on
  publication authors from Crossref by DOI, matched on accent-folded family
  name, only where an author has none and Crossref names one; it inserts text
  so the file's formatting is kept. `--dry-run` writes nothing. *Enforced:*
  review.
- **FR-021** `scripts/build-worldmap.mjs` writes
  `packages/collaborator-map/src/world-equal-earth.json` from Natural Earth 110m land and lakes,
  projected to Equal Earth, 1000 units wide, simplified (Douglas–Peucker 0.7
  land, 0.25 lakes). *Enforced:* review; `tests/confmap.test.js` reads it
  through `packages/collaborator-map/src/worldmap.js`.
- **FR-022** `scripts/record-card-layouts.mjs [site]` (needs Playwright and a
  dev server) writes `tests/fixtures/software-cards.json`: each `flagship` and
  `major` package's card measured at widths 200, 280, 400, 640 and 808 px,
  light, plus dark at 400 and 808, and `syncKey` from `scripts/lib/cardsync.mjs`
  (a hash of the card rules of `site.css` and `Card.astro`). *Enforced:*
  `tests/cardlayout.test.js` (see `specs/cards/spec.md`).
- **FR-023** `scripts/collect-skills.mjs` writes `config/skills.json` from
  `nstarman/skills`' generated `index.json` (on `main`, or `SKILLS_REF`): every
  skill that repo registers, kept there or living in another repository, in
  the index's order (by name), as `name`, `description` and `href` (the
  skill's folder where it lives, at its ref), plus `from` — the home
  repository — for a skill whose `origin` is `external`. `scripts/skills-index.mjs`
  does the mapping and throws, so nothing is written, on a schema other than 1,
  an empty list, a missing or empty field, an unknown `origin`, a non-GitHub
  link or a duplicate name. The index's contract is that repo's `AGENTS.md`
  ("How it reaches the website"). *Enforced:* `tests/skills.test.js`.
- **FR-024** Google Scholar has no API and blocks CI runners, so its h-indices
  in `config/person.json` `metrics.googleScholar` are read by hand.
  `refresh-scholar-metrics.yml` is dispatch-only: given `hIndex`, `hIndexSince`
  and `since`, `scripts/set-scholar-metrics.mjs` writes them with `asOf` set to
  today, and a pull request is opened. The builder says so beside a Scholar
  h-index whose `asOf` is more than `SCHOLAR_STALE_DAYS` (183) old.
  *Enforced:* `tests/presets.test.js`.

## Key Entities

- **Snapshot** — a committed file holding a remote fact, written by one script.
- **Curated fields** — kept by their script across reruns: `exclude` and `tags`
  in `config/acknowledgements.json`, `config/contributions-exclude.json`, every
  existing entry and `sameAs` in `config/places.json`, an existing `abstract`.
- **Refresh branch** — `chore/refresh-<name>`, reset on each run (FR-003).
- **`scripts/lib/`** — `ads.mjs` (pure ADS/arXiv/Crossref parsing, tested
  without the network), `items.mjs` (`readItems()`, every `data/*.json` in
  filename order for plain node), `cardsync.mjs` (`syncKey`).

## Edge Cases

- **Upstream unreachable**: stars keep their last count; a publication logs
  `failed` and is skipped; an ORCID error gives that person an empty history;
  a missing upstream figure throws and stops the whole sync.
- **Not on ADS / no identifier**: logged and skipped; nothing is written.
- **A refresh PR has no milestone**: it is opened with the workflow token,
  which triggers no workflow, so `milestone-prs.yml` does not run for it
  (FR-004, FR-017); `open-refresh-pr.sh` sets none.
- **Gates fail on a refresh**: `refresh-stars`, `-contributions`,
  `-software-figures` and `-astropy-voting-members` stop before opening a PR;
  `refresh-publications` and `-acknowledgements` open it and say so; the
  collaborators issue says so.
- **A new `highlight.source`**: the schema requires `sha`, so it is present
  before the first sync; any value other than the upstream blob triggers a
  re-make.
- **Contributions after 2028**: `PERIODS` ends at `2028-12-31`; later PRs are
  not searched until a period is added.
- **A deleted file**: `open-refresh-pr.sh` only PUTs file contents, so a
  removal is never proposed.

## Reference

| workflow | cron (UTC) | script | writes | secret |
|---|---|---|---|---|
| `refresh-publications.yml` | `0 6 1 1,7 *` | `refresh-publications.mjs` | `data/*` (`abstract`, `bibcode`, `doi`, `citations`), `config/bibtex-reference.json` | `ADS_TOKEN` (as `ADS_API_TOKEN`) |
| `refresh-software-figures.yml` | `0 6 1 1,7 *` | `sync-software-figures.mjs` | `public/highlights/*`, `data/*` (`highlight.source.sha`) | — (`github.token`) |
| `refresh-stars.yml` | `0 6 1 * *` | `collect-stars.mjs` | `config/stars.json` | — (`github.token`) |
| `refresh-skills.yml` | `0 6 * * 1` | `collect-skills.mjs` | `config/skills.json` | — (`github.token`) |
| `refresh-contributions.yml` | `0 6 1 * *` | `collect-contributions.mjs` | `config/contributions.json` | — (`github.token`) |
| `refresh-acknowledgements.yml` | `30 6 1 * *` | `collect-acknowledgements.mjs`, `collect-collaborators.mjs --new`, `geocode-places.mjs` | `config/acknowledgements.json`, `config/collaborators.json`, `config/places.json` | `ADS_TOKEN` |
| `refresh-astropy-voting-members.yml` | `30 6 1 9 *` | `scrape-astropy-voting-members.mjs` | `config/astropy-voting-members.json` | — |
| `refresh-collaborators.yml` | `0 7 1 9 *` | `collect-collaborators.mjs` | an issue (nothing committed) | — |
| `card-layout-fuzz.yml` | `0 5 * * 1` | `tests/cardlayout.differential.test.js` | `fuzz-report` artifact on failure | — |
| `milestone-prs.yml` | — (`pull_request_target: opened`) | `gh pr edit --milestone` | the PR's milestone | — |

All but `milestone-prs` also run on `workflow_dispatch`. Gates run before
proposing:

| workflow | gates |
|---|---|
| `refresh-publications` | `test:schema`, `build`; `test:bibtex`, `bibtex.test.js`, `bibcompare.test.js` reported, never failing |
| `refresh-software-figures` | `test:schema`, `build`, `test:links` |
| `refresh-stars` | `test:schema`, `build` |
| `refresh-skills` | `test:schema`, `build` |
| `refresh-contributions` | `test:schema`, `build`, `test:a11y` |
| `refresh-acknowledgements` | `npm test`, `continue-on-error`, outcome in the PR body |
| `refresh-astropy-voting-members` | `npm test` (fails the job) |
| `refresh-collaborators` | `npm test`, `continue-on-error`, outcome in the issue |
