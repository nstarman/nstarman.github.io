# AGENTS.md

How to add something to the database and open a pull request.

This repo holds one source of truth. The JSON in `data/` renders into the
website, the profile README at [nstarman/nstarman], four CV PDFs, and a BibTeX
file. Adding a conference, a paper, or a package means adding **one file** —
never editing a rendered output by hand.

The principles are in [`.specify/memory/constitution.md`](.specify/memory/constitution.md)
and win any conflict; this file is how to do the work. What the system does is
specified, area by area, under [`specs/`](specs/):

| spec | covers |
|---|---|
| [`data-model`](specs/data-model/spec.md) | items, lists, the schema, every field and the rules tests hold |
| [`cv-presets`](specs/cv-presets/spec.md) | `config/presets.json` and how a CV selects and prints items |
| [`cards`](specs/cards/spec.md) | the card naming grammar, presets, embeds, exports |
| [`renderers`](specs/renderers/spec.md) | the site's pages, `/records/`, the CV PDFs, the `.bib`, the test gates |
| [`refresh`](specs/refresh/spec.md) | the scripts and workflows that keep fetched snapshots current |

[nstarman/nstarman]: https://github.com/nstarman/nstarman

---

## 1. Add one file

`data/` is **flat**. One item, one file, named for its start date and its id:

```
data/<date.start>-<id>.json

data/2025-01-stream-members-only.json     date: { "start": "2025-01" }
data/2019-5th-gaia-challenge-conference-talk.json   date: { "start": "2019" }
```

The date comes first so `ls data/` reads chronologically; use exactly the
precision `date.start` has, and do not invent a month it does not carry.
Correcting a date therefore renames the file.

The `id` *is* the identity — refs, `[…](item:id)` cross-links and the published
`/records/<id>.json` URL all point at it, and it must never change after merge.
CI checks that the filename is exactly `<date.start>-<id>.json`, so neither half
can drift from the record. There are no
per-type folders: `type` already carries that, and a flat space means an item
like a conference talk can be interpreted differently by context rather than
being pinned to one directory.

Bare enumerations — refereeing venues, review panels — are *not* one file per
item. A single string with no date, no links of its own and no presets does not
deserve a file. They live in `data/lists/<id>.json` against
`schema/list.schema.json`:

```jsonc
{
  "$schema": "../../schema/list.schema.json",
  "id": "peer-review",                // = filename stem, and what a preset names
  "entries": [
    "Journals — Astronomy & Astrophysics · …",
    "Panels — National Science Foundation project funding panel"
  ]
}
```

An entry is one line of prose and may carry `[text](url)` exactly as an item's
`details` does. A preset section renders one by naming it instead of matching:
`"peer-review": { "heading": "Peer Review & Panels", "icon": "publications", "list": "peer-review" }`.

**`data/*.json` is items only.** Configuration lives outside that namespace, in
`config/` — currently `config/presets.json`, which defines the CV presets.
Putting it in `data/` would make the loader and `npm run validate` treat it as
a malformed item.

## 2. Write the item

Every item shares one envelope; `type` then adds required and optional fields.
Start from a sibling file rather than from scratch — editors pick up the schema
from the `$schema` key.

```jsonc
{
  "$schema": "../schema/item.schema.json",
  "id": "stream-members-only",        // lowercase-kebab; file is <date.start>-<id>.json, NEVER changed after merge
  "type": "publication",              // see the table below
  "cvs": ["np", "2page"],           // which CV presets include it; omit for none
  "featured": true,                   // surface on the website landing page
  "date": { "start": "2025-01" },     // YYYY | YYYY-MM | YYYY-MM-DD
  "title": "Stream Members Only: …",
  "shortTitle": "Stream Members Only",   // optional: the title cut down for a card
  "nickTitle": "Stream Members Only",    // optional: its name in a sentence, ≤ 32 characters
  "summary": "One line. Always rendered, including in the 2-page CV.",
  "details": "Elaboration. Long CVs and website only — dropped from short presets.",
  "detailsComplete": "Only the complete CV shows this. For a GPA.",
  "links": [ { "rel": "paper", "url": "https://…" } ],
  "refs":  ["trackstream"],           // other items, by bare id
  "tags":  ["streams", "machine-learning"],
  "internal": "Maintainer note. Never rendered."
}
```

Every field, each `type`'s required and accepted fields, and the rules behind
them are in [`specs/data-model/spec.md`](specs/data-model/spec.md). What follows
is what to *do* for each kind of item.

- **Any item.** `summary` renders everywhere, `details` on the website and the
  long CVs, `detailsComplete` on the complete CV alone — a GPA is the case it
  exists for. `cvs` picks the presets that list it
  ([`specs/cv-presets/spec.md`](specs/cv-presets/spec.md)). Use the coarsest
  date you know. `links[].rel` is a closed set; needing a new one is a schema
  change, not a data change.
- **Title and role.** `title` is the name of the thing — a job title for a
  plain job, otherwise the program, fellowship, grant, award, course, committee,
  package or event. My part in it ("Postdoctoral Fellow", "Co-I", "TA",
  "Volunteer") goes in `role`, left out when the title already is my part; a
  role that repeats its title fails the tests. Rows print title, role, then who.
- **A fellowship.** Named, awarded support held by me is `type: "fellowship"`,
  never a `position` (a post) or a `grant` (funding for a project): `tier`, the
  host in `institution`, who awards it in `funder`, and a `role`. A fellowship
  that pays for a post refs it, and the post refs it back.
- **A publication.** Write every author, in order, as `{ "family", "given" }`
  with `"me": true` on mine — never a display string, never "et al.". Set
  `entryType` (not derivable from `status`) and `venue` in BibTeX's own names.
  Add `bibcode` only once the paper is on ADS, and never an ADS link. Set
  `refs` to the packages of mine it used, its main package first. A proceeding
  of a full paper sets `preliminaryOf` to it. Leave `abstract`, `doi`,
  `citations` and a journal `bibcode` to the refresh workflow
  ([`specs/refresh/spec.md`](specs/refresh/spec.md)).
- **A research highlight.** Give the paper a `highlight` (`image` under
  `public/highlights/`, `topic`, `alt`, `description`), and work the paper into
  its topic's introduction in `HIGHLIGHT_TOPICS` (`src/lib/data.js`) with
  `[](item:<id>)` rather than only appending its card. A card that draws
  several papers together is its own `type: "highlight"` item with the papers
  in `refs`.
- **A software logo.** Mirror it rather than copy it: give the highlight a
  `source` (`repo`, `path`, and any `sha` — the schema requires one) and run the
  script, which makes `image` and rewrites `sha` to the blob it mirrored. Prefer a
  `.webp` image for anything but a tiny SVG.

  ```bash
  node scripts/sync-software-figures.mjs
  ```

- **A conference or a talk.** A conference I organized is `kind: "organizer"`
  with my part in `role` ("SOC", "LOC", "Organizing Committee"), never a
  "Role: …" detail line — the tests reject one. A talk about software or the
  community rather than science sets `"professional": true`, and lists under
  Professional & Software Talks instead of with the science talks.
- **A talk or anything with a `location`.** Write a place, not an institution:
  `City, ST, Country` in the US and Canada (`Toronto, ON, Canada`, never
  `TO, CA`), `City, Country` elsewhere, or `Online`; the CV reads that shape to drop
  the state or abbreviate the country, so a new country needs its code in
  `config/countries.json`. An `accepted` talk has no
  location. Then resolve and commit its coordinates, and check the `matched`
  string the script wrote; correct a wrong pin by hand.

  ```bash
  node scripts/geocode-places.mjs
  ```

  ```bash
  node scripts/geocode-places.mjs --check
  ```

- **A mentee.** A `mentoring` item with a `person` and a `slug` gets a profile.
  Their awards and talks go in its `achievements`, never as items of their own;
  each `journey` organization must be in `config/places.json`. Tie their papers
  to them with `"mentee": "<mentoring id>"` on the author.
- **A card.** Every card is a named preset; see
  [`specs/cards/spec.md`](specs/cards/spec.md) for the naming grammar, the
  embed pages and the Card Builder. A new look is a new preset in
  `SITE_PRESETS`, never a class of its own.

## 3. Validate before pushing

```bash
npm install          # once
npm run validate     # every data file against the schema — the quick one
npm test             # everything CI runs, below
```

`npm test` is seven gates (`test:schema`'s files run inside `test:unit`), and CI runs all of them on **every** pull request
whatever it touched:

| | |
|---|---|
| `test:unit` | the loader, preset resolution, the render model, BibTeX escaping |
| `test:schema` | the schema, `<date.start>-<id>.json` filenames, refs, cross-links, and the bad fixtures still being rejected |
| `test:bibtex` | one entry per publication, braces balanced, maths in abstracts intact, each paper with a `bibcode` compared field by field against the ADS export in `config/bibtex-reference.json` |
| `build` | the site compiles |
| `test:kit` | a paper site built from a snapshot with only `@nstarkman/research-kit` draws an entry as `/publications/` does |
| `test:a11y` | every heading and link has an accessible name |
| `test:links` | every internal href, anchor and asset in `dist/` resolves |

CI additionally compiles the four CV PDFs and asserts the one-page CV is one
page and the two-page CV is two. An invalid item fails the check rather than
silently vanishing from a render — the failure this whole setup exists to
prevent.

To compile a saved builder selection to a PDF without the site, run
`npm run build:cv -- <selection.json> [out.pdf]` (needs the `typst` binary; `TYPST=` names
one). It draws the selection as the builder's Compile does
([`renderers`](specs/renderers/spec.md), FR-028).

Every pull request also gets a live preview URL, posted as a comment.

One check is required to merge: **CI Pass**, which is green only when every
other job in `ci.yml` is. A job that fails to trigger at all therefore blocks
the pull request instead of leaving it green with nothing run.

## 4. Open the PR

- Branch `add/<id>`, e.g. `add/eas-2026-s10` — the rule for a data item's
  branch; other branches have no naming rule.
- **One item per PR.** They then never conflict and each is reviewable at a glance.
- Fill in the pull request template.
- Title: `Add <type>: <title>`.
- Milestone: **♾️&➡**, the standing milestone for this repo rather than a
  release marker. `.github/workflows/milestone-prs.yml` sets it on every pull
  request when it opens; set it by hand only on an issue:

  ```bash
  gh issue edit <number> --milestone "♾️&➡"
  ```

  Copy the title exactly — it is `U+267E U+FE0F & U+27A1`, and an emoji that
  merely looks the same will not match.

## Feature work with Spec Kit

Adding an item is sections 1–4. A change goes through Spec Kit when it changes
what an area spec says the system does — a new option, control, field, workflow
or rule, however small; data items, fixes that bring the code back in line with
its spec, and refactors don't. When unsure, it does: a feature that skips the
steps leaves the area spec silent or wrong about it.

**Run the steps; do not write the feature's `spec.md` by hand, and do not skip
to editing the area spec.** In order, each from its own command (installed for
Claude Code and Copilot; the scripts they call are in `.specify/scripts/bash/`):

1. `/speckit-specify` — creates `specs/NNN-<name>/spec.md` from this repo's
   template, naming the area spec it folds into, and its quality checklist.
2. `/speckit-plan` — fills the plan and checks it against **every article of the
   constitution**, one row each; a VIOLATION needs a justification.
3. `/speckit-tasks`, then `/speckit-implement` — which works the tasks off and
   ticks them.
4. The last push: fold the requirements into the area spec (below) and delete
   the folder and `.specify/feature.json`.

A feature that adds a builder option says in its spec where the option lives — the global
panel for the whole CV, or its section's own settings row — by `specs/cv-presets/spec.md`
FR-027. An agent makes a feature's PR only after step 2 has passed, and says in the PR
which steps it ran. Review comments and CI fixes on an open PR are not new
features and need no new run.

The specs named for an area — `specs/data-model/`, `specs/cards/` and the rest —
describe the system as it is. A change to what one covers updates it in the
same pull request.

A feature's `specs/NNN-<name>/` folder is working material, `spec.md`
included. Its spec names the area spec it folds into. In the last push, fold
the feature's requirements into that area spec — rewritten as its current
contract, not appended as a changelog — or into a new `specs/<area>/spec.md`
where it fits no area, and delete the whole folder. CI's *Design notes stay on
their branch* step fails while any `specs/NNN-*` is tracked, so a feature PR
is red until then (constitution, Article X).

Do not run `/speckit-taskstoissues` unless asked. It opens GitHub issues, and
an issue here needs the ♾️&➡ milestone, which it does not set.

The plan and spec templates are this repo's own, in
`.specify/templates/overrides/`: the plan's Constitution Check is a row per
article, and a feature spec names the area spec it folds into
(`tests/speckit-templates.test.js` keeps the rows in step with the
constitution). They replace Spec Kit's core templates whole, so after
`specify integration upgrade`, diff them against the new ones in
`.specify/templates/`.

## Sites hosted in their own repos

Any repo under `nstarman/` that publishes to GitHub Pages from Actions appears
at `nstarkman.space/<repo>/`, laid onto this site without this site building
it — a package's docs, a skill collection, a tool run in the browser. So a repo
must not take the name of a path here: `webdev`, `cv`, `embed`, `cards`,
`research`, `people`, `publications`, `software`, `tools`, `records`, `files`,
`fonts`, `highlights`.

Such a repo looks like this site by using its layout, the npm package
[`@nstarkman/site-layout`](packages/site-layout/README.md), pinned to a release:

```bash
npm install --save-exact @nstarkman/site-layout@<version>
```

Its pages wrap themselves in `SiteLayout`:

```astro
---
import SiteLayout from '@nstarkman/site-layout/SiteLayout.astro';
---
<SiteLayout title="Skills — Nathaniel Starkman" section="/software/" repo="nstarman/skills">
  <main>…</main>
</SiteLayout>
```

`section` marks its nav entry; `repo` is where "Last updated" links. Its
`astro.config.mjs` sets `site: 'https://nstarkman.space'` and `base: '/<repo>'`.
Dependabot (`package-ecosystem: npm`) proposes each new release as a pull
request there. The layout imports only its stylesheet and icons and links
site-absolute, so it works under any `base`; `tests/site-layout.test.js` holds
it to that and builds a fixture site at `/demo/` with it.

### Releasing the layout

The package is `packages/site-layout/`, and this site uses it from there (an
npm workspace), so a change shows here at once and ships in the next release.
Versions are dates, `YYYYMMDD.0.N` — npm takes only three numbers — with `N`
counting fixes to that date's release. To release: set `version` in
`packages/site-layout/package.json`, add its section to `CHANGELOG.md` (with a
migration note if anything is removed or renamed), merge, then tag the merge
commit `site-layout-v<version>` and push the tag. `release-site-layout.yml`
checks the tag against the version, runs the unit tests and publishes with npm
trusted publishing — no token. A fix to an older release is made on
`versions/site-layout-v<YYYYMMDD>.x`, cut from its tag when first needed, and
backported to every release that has the bug.

The first version was published by hand (`npm publish --access public` from
`packages/site-layout`, as `nstarkman` on npm), since npm can trust a workflow
only for a package that exists; the workflow skips a version already on npm,
so that version's tag passes.

### A paper's own site: research-kit

A paper's site (made with [syw-site](https://github.com/nstarman/syw-site)) opens with the paper's
entry as `/publications/` draws it — without the context link — and shows its co-authors on a
collaborator map, its grants and its software. It draws them with this site's own code, from
`@nstarkman/research-kit`: four packages in `packages/` released together at one version —
`data-resolver` (the store `src/lib/data.js` builds, `collect`, readers), `card-builder` (`Card`,
`Publication`, the card-name interpreter, `SITE_PRESETS`), `collaborator-map` (`CollabMap`, the map
geometry), and `research-kit`, which re-exports them. Their components read data from
`@nstarkman/research-store`, which `astro.config.mjs` points at `src/lib/data.js`; a paper site points
it at a store built from its snapshot (`collect(id, fromGitHub(…))`: the item, what its `refs` reach,
the `config/` slices they use). Never import `src/lib/data.js` from a package.

For a paper's site: list its grants in the paper's `refs` (its funding), and put a card choice — a
`SITE_PRESETS` key, nothing else — in `cards/<id>.json` only if it should not be `paperSite`.

**Releasing the kit**: the four `package.json`s share one version, `YYYYMMDD.0.N`, each with a
`CHANGELOG.md` section (a test holds them together). Merge, tag the merge commit
`research-kit-v<version>` and push; `release-research-kit.yml` publishes all four, in dependency order,
with trusted publishing. Fixes are backported on `versions/research-kit-v<YYYYMMDD>.x`, like the layout's.
The first version of each was published by hand, as for the layout.

It is found from here as any software is: a `software` item in `data/`, its
page linked with an absolute `https://nstarkman.space/<repo>/` URL — a
site-absolute one fails `test:links`, since the page is not in this build.

## Do not

- **Do not** edit `README.md` in [nstarman/nstarman] by hand — it is generated (constitution, Article I).
- **Do not** edit the built PDFs under `cv/`, the generated `.bib`, or `dist/` (constitution, Article I).
- **Do not** put two items in one file (constitution, Article II).
- **Do not** change an `id` after merge — `refs` elsewhere point at it (constitution, Article III).
- **Do not** invent a `link.rel` value (constitution, Article IV).
- **Do not** add an ADS link instead of `bibcode` (constitution, Article V).
- **Do not** write an author as a display string, or truncate an author list (constitution, Article V).
- **Do not** hand-write star counts or citation numbers that a script fetches (constitution, Article V).

## Why it is shaped this way

Facts live in one place and renderers read them: see Articles I and VII of the
[constitution](.specify/memory/constitution.md).
