# Mentee Profiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every mentee one record that drives a profile page, a `/people/` index, a place on the collaborator map, a link from the paper stamp, and chosen lines on the CV.

**Architecture:** The record is the existing `mentoring` item, extended with `person`, `slug`, `photo`, `badge`, `research`, `journey` and `achievements`. A paper author points to it with `authors[].mentee`. One new module, `src/lib/mentees.js`, answers every question about mentees. The pages, `collabmap.js`, `Card.astro` and the CV all read from it and never from the raw items.

**Tech Stack:** Astro (static), vanilla JS, JSON Schema 2020 (ajv), vitest, Typst CV via `cvmodel.js`.

**Spec:** `docs/superpowers/specs/2026-10-16-mentee-profiles-design.md`

## Global Constraints

- Each task ships as its own PR. Branch: `add/mentee-<slice>`. Milestone `♾️&➡`. `npm test` must pass, along with the CI CV page-count check (1-page CV = 1 page, 2-page = 2).
- A mentee's achievements never appear in the owner's Awards, Presentations or Media, on the site or on any CV.
- Shared papers and software are referenced by id, never copied into the record.
- An `id` never changes after merge, and neither does a `slug` once published.
- `people` is a reserved path: add it to the AGENTS.md list "a repo must not take the name of a path here".
- Cards use only `SITE_PRESETS` keys (`PRESET.<key>`). Never write a slug out or give a card a class of its own.
- The migration leaves today's CV output unchanged (spec call 8).
- Photo and journey are optional per mentee. Every page, the map and the tests work without them (spec call 9).
- Co-supervisors stay text. Massey tutoring gets no `person` and no profile.

## Review Focus

1. **A mentee with no ORCID post and no `journey`**, e.g. Reem before her institution is known. She is listed under the map with no pin, and the map's aria-label count does not count her pin. Test: Task 5.
2. **A mentee whose ORCID posts and `journey` describe the same post** (Charlotte at MIT). It gets one pin, not two. Test: Task 5.
3. **Achievement dates of mixed precision** (`"2026"`, `"2025-07"`, `"2026-04-23"`) sort newest first without a year-only date jumping ahead of a dated one in the same year. Test: Task 1.
4. **A paper author marked `student` with no `mentee`** (Sirui Wu). The stamp stays plain text, and the build does not fail. Test: Task 6.
5. **`?collab=<slug>` naming no mentee, or an ORCID no longer on the map.** The map falls back to Everyone with nothing marked. Test: Task 5.

---

## File Structure

| File | Responsibility |
|---|---|
| `schema/item.schema.json` | New mentoring fields; `authors[].mentee` |
| `schema/invalid/mentee-*.json`, `author-mentee-not-an-id.json` | One broken rule each |
| `src/lib/mentees.js` (new) | Every mentee lookup and derivation |
| `tests/mentees.test.js` (new) | Unit tests for `mentees.js` |
| `tests/integrity.test.js` | Cross-item rules the schema can't see |
| `src/lib/inline.js` | `achievementLines()` for CV lines |
| `src/lib/cvmodel.js`, `src/components/CvView.astro` | Append achievement lines |
| `data/*-mentoring files` | Migration (five mentees) |
| `data/2025-12-pinns-neurips.json`, `data/2026-06-pinns-mnras.json` | `mentee` on Charlotte's author entry |
| `config/places.json` | Howard University (+ any new institution) |
| `src/pages/people/index.astro`, `src/pages/people/[slug].astro` (new) | Index and profile |
| `src/styles/people.css` (new) | Their styles |
| `src/layouts/Base.astro` | Nav entry |
| `src/lib/collabmap.js`, `src/components/CollabMap.astro`, `src/lib/mappick.js` | Mentees on the map |
| `src/components/Card.astro` | Stamp link |
| `tests/fixtures/software-cards.json` | Re-recorded after the `Card.astro` change |
| `AGENTS.md` | Document the fields and the reserved path |

---

### Task 1: The mentee record — schema, `mentees.js`, integrity rules

**Files:**
- Modify: `schema/item.schema.json` (the `mentoring` `then` branch ~L488; the author object ~L763)
- Create: `schema/invalid/mentee-slug-without-person.json`, `mentee-achievement-bad-kind.json`, `mentee-journey-without-organization.json`, `mentee-person-bad-level.json`, `author-mentee-not-an-id.json`
- Create: `src/lib/mentees.js`, `tests/mentees.test.js`
- Modify: `tests/integrity.test.js`, `AGENTS.md` (the `mentoring` row of the type table, plus a short "Mentees" subsection)

**Interfaces:**
- Produces, in `src/lib/mentees.js`:
  - `mentees(): Item[]`: the mentoring items with `person`, newest `date.start` first.
  - `menteeById(id: string): Item | undefined` and `menteeBySlug(slug: string): Item | undefined`.
  - `menteeName(m): string`: `"Charlotte Myers"`, from `person.given` + `person.family`.
  - `profileHref(m): string`: `/people/<slug>/`.
  - `menteePapers(m): Item[]`: publications with an author whose `mentee === m.id`, newest first.
  - `menteeSoftware(m): Item[]`: unique software items, in first-seen order. These are the `refs` of `menteePapers(m)` that resolve to `type: 'software'`, followed by software items with an author whose `mentee === m.id`.
  - `achievements(m): Achievement[]`: newest first. When two dates share a prefix, the more precise one sorts first (`"2026-04"` before `"2026"`).
  - `topAchievements(m, n = 3): Achievement[]`: awards first, then the rest, each group newest first, truncated to `n`.
  - `Achievement = { kind: 'award'|'talk'|'poster'|'press'|'program', date: string, title: string, event?, location?, outlet?, url?, cvs?: string[] }`.

Schema additions to the mentoring branch:
- `person`: `{ family, given, orcid?, level: enum ["undergraduate","graduate","postbac","postdoc"] }`. `family` and `given` are required, `additionalProperties: false`, and `orcid` uses the existing pattern.
- `slug`: pattern `^[a-z0-9]+(-[a-z0-9]+)*$`.
- `photo`: pattern `^people/[a-z0-9-]+\.(webp|jpg|png)$`.
- `badge` and `research`: string, `minLength 1`.
- `journey`: an array of `{ organization, city, region?, country, start, end?, role? }`. `organization`, `country` and `start` are required; `start`/`end` use the item date pattern.
- `achievements`: an array of the `Achievement` shape. `kind`, `date` and `title` are required; `url` uses the link URL rule; `cvs` uses the item `cvs` items.
- `dependentRequired`: `slug`, `photo`, `badge`, `research`, `journey` and `achievements` each require `person`, and `person` requires `slug`.
- On the author object: `mentee`, matching the id pattern.

- [ ] **Step 1: Write the five fixtures**, each a minimal mentoring item (or publication, for the author one) that breaks exactly the rule its name says. `mentee-person-bad-level.json` uses `"level": "phd"`.
- [ ] **Step 2: Run `npx vitest run tests/schema.test.js`**. Expected: the five new `rejects …` cases FAIL, because they are accepted.
- [ ] **Step 3: Add the schema fields above.** Run step 2 again. Expected: all pass, and every `data/*.json` is still accepted.
- [ ] **Step 4: Write `tests/mentees.test.js`.** Build items in-test and call the pure helpers, or mock `data.js` the way `tests/data.test.js` does. Assert:
  - `achievements()` orders `[{date:'2026'},{date:'2026-04'},{date:'2025-07'}]` as `2026-04, 2026, 2025-07` (Review Focus 3).
  - `topAchievements()` puts an older award ahead of a newer talk.
  - `menteeSoftware()` drops duplicates when two papers ref the same package.
  - `menteeName({person:{given:'Amir',family:'Abdul'}}) === 'Amir Abdul'`.
  - `profileHref({slug:'amir-abdul'}) === '/people/amir-abdul/'`.
- [ ] **Step 5: Run it.** Expected: FAIL, module not found.
- [ ] **Step 6: Implement `src/lib/mentees.js`** against `items`, `resolve` and `byType` from `data.js`. Keep the sort and merge logic in exported pure functions that take arrays, so the tests need no data.
- [ ] **Step 7: Run it.** Expected: PASS.
- [ ] **Step 8: Add to `tests/integrity.test.js`:**
  - every `authors[].mentee` resolves to a mentoring item with `person`;
  - where that author also has `student`, it equals `person.level`;
  - slugs are unique;
  - every `journey[].organization` resolves through `locate()` (`src/lib/places.js`);
  - every `achievements[].cvs` entry is a preset name in `config/presets.json`;
  - the existing `item:` cross-link check also scans `research`.
- [ ] **Step 9: Run `npm run test:schema && npx vitest run tests/mentees.test.js`.** Expected: PASS (no data uses the fields yet).
- [ ] **Step 10: Document in AGENTS.md** the new fields, the rule that achievements live in the mentee's record and never as the owner's items, and `authors[].mentee`. Commit: `Add the mentee record: schema, helpers, integrity rules`.

### Task 2: Achievement lines on the CV

**Files:**
- Modify: `src/lib/inline.js`, `src/lib/cvmodel.js:98-116`, `src/components/CvView.astro:44-48`
- Test: `tests/cvmodel.test.js`

**Interfaces:**
- Consumes: `achievements(m)` from Task 1.
- Produces: `achievementLines(item, preset: string, { complete = false } = {}): Span[][]` in `inline.js`. It returns one line per achievement, oldest first so the CV reads as a progression, keeping those where `complete || a.cvs?.includes(preset)`. A line is ``[title](url)`` (or plain title), then ` — ${event ?? outlet}` where present, then ` (${dateLabel})`, passed through `spans()`.

Achievement lines go **after** everything `detailLines()` returns, so existing line indexes keep their meaning. They are gated by their own `cvs`, **not** by `s.detail === 'full'`, because a 2-page CV that drops details can still carry a marked achievement. When a `keepLine` is given, an achievement line's index is `detailLines(item, …).length + i`. `CvView.astro` does the same, so the website CV and the PDF agree.

- [ ] **Step 1: Write tests in `tests/cvmodel.test.js`** with an in-test mentoring item carrying two achievements, one with `cvs: ['2page']` and one with no `cvs`. Assert:
  - the 2page row's `lines` end with the marked one only, even though 2page drops `details`;
  - the np row has neither, because neither is marked np;
  - complete has both;
  - with `keepLine = (id, i) => i === 0`, no achievement line is kept.
- [ ] **Step 2: Run `npx vitest run tests/cvmodel.test.js`.** Expected: FAIL.
- [ ] **Step 3: Implement `achievementLines`** and append it in `rowOf` and `CvView.astro` as described.
- [ ] **Step 4: Run step 2 again.** Expected: PASS. Then run the full `npx vitest run`. Expected: PASS, with no real data affected yet.
- [ ] **Step 5: Commit:** `Print a mentee's marked achievements under their CV entry`.

### Task 3: Migrate the five mentees, and move the Goldwater press to Charlotte

**Input needed from the owner before starting** (spec slice 1): the institution and city for **Connor McKeigan** (presumed University of Toronto), **Taisiia Karasova** (presumed MIT) and **Reem Hamraz** (unknown). Also ORCIDs if known, the level for each, a photo for any mentee the owner clears, and the `research` prose and `badge` for each. **Do not invent any of these.** Where one is missing, leave the field out, which is legal.

**Files:**
- Modify: the five mentoring files in `data/` (`charlotte-myers-…`, `amir-abdul-howard`, `connor-mckeigan-…`, `taisiia-karasova-…`, `reem-hamraz-…`)
- Modify: `data/2025-12-pinns-neurips.json`, `data/2026-06-pinns-mnras.json` (Charlotte's author entry gets `"mentee": "charlotte-myers-mit-with-prof-lina-necib-mit"`)
- Modify: `config/places.json` via `node scripts/geocode-places.mjs` (Howard University, plus any new institution)
- Optional: `public/people/<slug>.webp`

Known data. All five also get `coSupervisors` from their titles: Prof. Lina Necib for Charlotte and Taisiia, and Prof. Ting Li for Connor. `title` and `student` stay as they are.
- **Charlotte**: slug `charlotte-myers`. Person: Myers, Charlotte, undergraduate, ORCID `0009-0005-9329-8196`. Badge `2026 Goldwater Scholar`. Achievements:
  - `award`, `2026-04`, `Barry Goldwater Scholarship`, url `https://news.mit.edu/2026/three-mit-named-2026-goldwater-scholars-0423`;
  - `press`, `2026-04`, `Three from MIT named 2026 Goldwater Scholars`, outlet `MIT News`, same url.
- **Amir**: slug `amir-abdul`. Person: Abdul, Amir, undergraduate. Journey:
  - `Howard University`, Washington, DC, US, start supplied by the owner, no end;
  - `Massachusetts Institute of Technology`, Cambridge, MA, US, `2025-06` to `2025-08`, role `Summer research student`.

  His four `details` lines after the title become achievements:
  - `program`, `2025-06`, `Leadership Alliance SR-EIP and MIT Summer Research Program (MSRP)`;
  - `talk`, `2025-07`, Leadership Alliance National Symposium;
  - `talk`, `2025-11`, 2025 NSBP-NSHP Joint Annual Conference;
  - `talk`, `2026-03`, 2026 APS Global Physics Summit.

  `details` keeps only `Baryon Modeling in External Galaxies with Stellar Streams`.

- [ ] **Step 1: Capture today's CV.** With a small node script in the scratchpad that imports `cvModel`, write `cvModel(p)` for `np`, `2page`, `1page` and `complete` to `before-<p>.json`.
- [ ] **Step 2: Edit the five records and the two papers.** Set each moved achievement's `cvs` to the presets where `before-*.json` shows that line, so the visible text is unchanged. Run the geocoder.
- [ ] **Step 3: Run `npm run validate && npm run test:schema`.** Expected: PASS.
- [ ] **Step 4: Capture `after-<p>.json`** and diff the rendered line texts per item. Expected: no difference in the text on any preset. Only the line order inside Amir's entry may change, and that must be noted in the PR. If the CV builder's saved ticks for Amir shift, list them in the PR.
- [ ] **Step 5: Run `npm test`.** Expected: PASS. Run `npm run build:pdf` if Typst is available, and check that 1page is 1 page and 2page is 2 pages.
- [ ] **Step 6: Commit:** `Record five mentees, and Charlotte's Goldwater as hers`.
- [ ] **Step 7: Flag Sirui Wu to the owner** (spec call 7). Sirui is marked `graduate` on four papers but has no mentoring item. Do not create a record.
- [ ] **Step 8: Ask the owner before closing PR #387** (nstarman/nstarman.github.io#387) with a comment pointing to this PR. Closing it is outward-facing.

### Task 4: Profile pages and the `/people/` index

**Files:**
- Create: `src/pages/people/[slug].astro`, `src/pages/people/index.astro`, `src/styles/people.css`
- Modify: `src/layouts/Base.astro:20-26` (add `{ href: '/people/', label: 'People' }` after Research; my call, from the spec's "navigation or footer")
- Modify: `AGENTS.md` (add `people` to the reserved-path list)

**Interfaces:**
- Consumes: everything in Task 1's Produces. The map link is `/research/?collab=<slug>#collaborators`, which Task 5 makes work. Until Task 5 lands, it opens the map on Everyone. That is acceptable, and `test:links` passes because the anchor exists.

The profile follows Layout A, in this order:
1. **Header.** Photo, or an initials disc when there is no photo. `<h1>` name. A meta line: level, `institution`, the mentoring years via `dateLabel`, and "with" plus `coSupervisors` when set. The badge pill when there is a badge. The link "See their path on the collaborator map →".
2. **"Our research"** with `research` rendered through `spans()` so `[](item:id)` works. Left out if there is no `research`.
3. **"Papers & software together"**: `<Card preset={PRESET.carousel}>` for `menteePapers`, then `<Card preset={PRESET.softwareMinor}>` for `menteeSoftware`. The section is left out when both are empty.
4. **"Achievements"**: a `<ul>` of `achievements(m)`, each with its date, a kind label, the title (linked when there is a `url`), and the event or outlet.

`getStaticPaths` comes from `mentees()`. The index lists `mentees()` with photo or initials, name, level and institution, years, badge, and the first sentence of `research`. Each entry links to `profileHref`.

- [ ] **Step 1: Build the pages.** Run `npm run build`. Expected: `dist/people/index.html` plus five profile pages.
- [ ] **Step 2: Run `npm run test:a11y && npm run test:links`.** Expected: PASS. In particular, the initials disc needs an accessible name or `aria-hidden` next to the `<h1>`.
- [ ] **Step 3: Check in the browser** with `npm run dev`. Charlotte shows two paper cards and her software. Amir shows no cards section and four achievements. Reem, with no photo, shows initials. Check at 375 px wide and in dark mode. Take screenshots for the PR.
- [ ] **Step 4: Commit:** `Add mentee profile pages and the /people/ index`.

### Task 5: Every mentee on the collaborator map

**Files:**
- Modify: `src/lib/collabmap.js`, `src/components/CollabMap.astro`, `src/lib/mappick.js`, `src/styles/map.css`
- Test: `tests/collabmap.test.js`

**Interfaces:**
- Consumes: `mentees()`, `menteeName`, `profileHref` and `topAchievements` from Task 1.
- Produces: each person from `collaboratorMap()` gains:
  - `key: string`: the ORCID, or the mentee's slug when there is no ORCID;
  - `mentee?: { slug, href, research, top: Achievement[] }`.

  The function `collabHref(orcid)` becomes `collabHref(key: string)`. Its existing callers pass ORCIDs and are unchanged.

Merge rule (my call, from the spec's "ORCID wins, the record fills gaps"): start from the ORCID posts. Add each `journey` post whose `organization` has no ORCID post overlapping its dates. A mentee with no ORCID entry is built from `journey` alone. A mentee with no placeable post is still in `people`, with `pins: []` (spec call 9), and is never dropped by the `posts.length === 0` guard.

Show control:
- `<option value="">Everyone</option>`, then `<option value="mentees">Mentees</option>`, then `<option disabled>──────────</option>`, then the names as now.
- `show('mentees')` shows the pins, trails and list entries carrying `data-mentee`.
- `?collab=` matches a list entry's `data-key` (ORCID or slug). An unmatched value falls back to Everyone with nothing marked (Review Focus 5).

Mini-profile: inside a mentee's `<li>`, after the posts `<ol>` and hidden with it, add a `.cmap-mentee` block: the first sentence of `research`, `top` as a short list, and "Full profile →" linking to `href`.

- [ ] **Step 1: Write tests in `tests/collabmap.test.js`.** Assert:
  - every slug in `mentees()` appears once in `collaboratorMap()` with `mentee.slug` set;
  - Charlotte has no MIT pin duplicated by her journey (Review Focus 2);
  - a mentee with neither ORCID nor journey has `pins.length === 0` and is present (Review Focus 1). Mock or temporarily stub data so the test does not depend on Reem's record staying empty;
  - Amir has pins at Howard University and MIT;
  - `collabHref('amir-abdul') === '/research/?collab=amir-abdul#collaborators'`.
- [ ] **Step 2: Run `npx vitest run tests/collabmap.test.js`.** Expected: FAIL.
- [ ] **Step 3: Implement** the merge in `collaboratorMap()`, and `key`/`data-key`/`data-mentee` in the markup. Make the aria-label count only placed pins.
- [ ] **Step 4: Run step 2 again.** Expected: PASS.
- [ ] **Step 5: Implement the Show option, separator, slug deep link and mini-profile** in `CollabMap.astro` and `mappick.js`. Check in the browser:
  - picking Mentees shows exactly the five, with the separator unselectable;
  - `/research/?collab=amir-abdul#collaborators` opens on Amir;
  - `?collab=nobody` shows Everyone;
  - the mini-profile's "Full profile →" lands on his page;
  - non-mentee panels (Jo Bovy) are unchanged.
- [ ] **Step 6: Change the profile link to use the slug.** Update the Task 4 profile link to `collabHref(slug)` if it was hard-coded. Run `npm test`. Expected: PASS.
- [ ] **Step 7: Commit:** `Put every mentee on the collaborator map`.

### Task 6: The paper stamp links to the profile

**Files:**
- Modify: `src/components/Card.astro:72` and `:193-195`
- Modify: `tests/fixtures/software-cards.json` (re-recorded)
- Test: `tests/cards.test.js`

**Interfaces:**
- Consumes: `menteeById` and `profileHref` from Task 1.
- Produces: in `students`, each entry gains `href?: string`. Where it is set, the `.c-stu` span is an `<a class="c-stu …" href={href}>` with the same text and title. Where it is not set, the span is unchanged (Review Focus 4).

`cardpdf.js` picks up links through `closest('a[href]')`, so the SVG, PNG and PDF exports get the link with no change there. `cardFace` needs no new key, because visibility is unchanged.

- [ ] **Step 1: Write a test** that renders, or builds the facts for, `pinns-mnras` and asserts its stamp contains `href="/people/charlotte-myers/"`. Write another that a fixture paper with `student` and no `mentee` has no `<a>` in its stamp. Follow `tests/cards.test.js`'s existing approach. If it only tests pure facts, test the `students` derivation by extracting it into `cards.js` as `studentStamp(item): { student, pos, href? }[]`.
- [ ] **Step 2: Run `npx vitest run tests/cards.test.js`.** Expected: FAIL.
- [ ] **Step 3: Implement it.** Run step 2 again. Expected: PASS.
- [ ] **Step 4: Expect `tests/cardlayout.test.js`'s hash test to FAIL**, because `Card.astro` changed. Run `npm i --no-save playwright`, start a dev server, then run `node scripts/record-card-layouts.mjs`. Read the fixture diff. Software cards carry no stamp, so expect no layout change. Then run `npx vitest run tests/cardlayout*.test.js`. Expected: PASS.
- [ ] **Step 5: Check in the browser.** The carousel on `/research/`, `/publications/` and `/embed/pinns-mnras/` all show "student† 1st" as a link. The `/webdev/card/` SVG download of that card has an `<a>` around it. Run `npm test`. Expected: PASS.
- [ ] **Step 6: Commit:** `Link a student's stamp to their profile`.
