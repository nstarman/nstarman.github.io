# AGENTS.md

How to add something to the database and open a pull request.

This repo holds one source of truth. The JSON in `data/` renders into the
website, the profile README at [nstarman/nstarman], three CV PDFs, and a BibTeX
file. Adding a conference, a paper, or a package means adding **one file** —
never editing a rendered output by hand.

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
  "id": "refereeing",                 // = filename stem, and what a preset names
  "entries": [
    "Astronomy & Astrophysics",
    "JOSS — [commensurability: …](https://joss.theoj.org/papers/…)"
  ]
}
```

An entry is one line of prose and may carry `[text](url)` exactly as an item's
`details` does. A preset section renders one by naming it instead of matching:
`{ "id": "refereeing", "heading": "Journal Refereeing", "list": "refereeing" }`.

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

### `summary` vs `details` vs `detailsComplete`

This replaces the old LaTeX `% SKIP` preprocessor. Three tiers, widest first:

| field | where it renders |
|---|---|
| `summary` | everywhere, including the 1-page CV |
| `details` | the website and the np and complete CVs; dropped by 1-page and 2-page |
| `detailsComplete` | the complete CV alone |

Put the elaboration — thesis title, award citation, what the grant paid for —
in `details`. Publications are the exception: their one-line is derived from
`authors` and `venue`, so `summary` is usually omitted there.

`detailsComplete` is for a fact that is true and on the record but does not
belong on a CV you hand someone — a GPA is the case it exists for. It is
appended after `details`, the thesis and the supervisors, so a line index means
the same thing whether or not it is included; the CV builder ticks lines by
index, and inserting in the middle would silently move every tick after it.

The complete CV is identified by `includeAll` in `config/presets.json`, not by
its name, so nothing hard-codes which preset is the unabridged one.

### `type` and what each one adds

| `type` | also required | also accepted |
|---|---|---|
| `publication` | `authors`, `status`, `entryType` | `collaboration`, `editors`, `venue`, `abstract`, `arxiv`, `primaryClass`, `bibcode`, `doi`, `citekey`, `citations`, `highlight` |
| `software` | `tier`, `group` | `repo`, `authors`, `version`, `role`, `doi`, `highlight` |
| `education` | `institution` | `degree`, `thesis`, `supervisors`, `location` |
| `position` | `institution` | `role`, `location`, `groupRoles` |
| `award`, `grant` | `tier` | `amount`, `declined`, `funder` |
| `presentation` | `kind` | `event`, `location` |
| `mentoring` | `student` | `institution`, `coSupervisors`, `outputs` |
| `teaching` | — | `institution`, `course`, `role` |
| `service`, `outreach` | — | `organization`, `role` |
| `media` | `outlet` | — |
| `highlight` | `highlight`, `refs` | — |

`status`: `in-prep` · `submitted` · `accepted` · `published`
`kind`: `invited` · `contributed` · `poster` · `seminar` · `organizer` · `attended` · `accepted`
`tier`: `major` · `minor`

**`groupRoles`** on a `position` prints it with every other role at the same
`institution` that sets it, as one row — "Coordinator, Strategic Planner & Core
Developer, Astropy". Only roles that opt in are grouped; the CV builder can turn
grouping off per section.

**`tier`** exists because the CV separates *Grants & Fellowships* and *Awards*
from *Small Grants* and *Travel Awards*. `type` × `tier` gives those four
buckets, and `config/presets.json` maps each to a heading. A fellowship is
funding, so it is a `grant`; an `award` is an honour or a prize.

**`group`** on a `software` item is its area on `/software/`, by what it is
for rather than what it is written in — `astropy`, `foundations`, `dynamics`,
`dark-matter`, `numerics` or `utilities`. The areas' headings, order and
one-line introductions are `SOFTWARE_GROUPS` in `src/lib/data.js`; a new area
is a schema change plus a line there. Within an area, `tier` sets the card:
`lead` (one package, the largest), then `headline`, `other` and `useful`, each
smaller.

**`presentation`** covers everything that used to be split across "Invited
Talks", "Selected Presentations" and "Conferences & Workshops" — `kind` carries
the distinction, including `attended` for a meeting where you presented
nothing, and `accepted` for a talk accepted but never given because you could
not go. An `accepted` talk has no `location` — you were never there — and the
map leaves it off.

### Research highlights

`/research/` opens with a grid of cards — a picture, a title, a few sentences,
and the links out. Every paper can have one: give the publication a
`highlight`.

```jsonc
"highlight": {
  "image": "highlights/stream-members-only.png",   // file at public/highlights/…
  "topic": "galactic",                             // extragalactic | galactic | cmb | dm-direct-detection | software
  "alt": "What the picture shows",
  "description": "Two or three plain sentences. May carry [text](url)."
}
```

`topic` groups the card on the page and is required: `extragalactic` · `galactic`
· `cmb` · `dm-direct-detection` · `software`. A topic with no card is not shown; a new topic
is a schema change plus `HIGHLIGHT_TOPICS` in `src/lib/data.js`. `software` is
deliberately absent from that list: a card under it is written and kept, but
not shown until the topic is added there.

Each topic opens with an introduction, written in `HIGHLIGHT_TOPICS`, that
tells the story its papers belong to. Where it mentions a paper it writes
`[](item:<id>)`, and that becomes a text-sized inline-card named by the paper's
`nickTitle` and linking to its card. The cards then run in a row that scrolls
sideways, newest first, with prev/next buttons. A paper added to a topic
should be worked into its introduction, not just appended to the row.

A highlight that draws several papers together is its own item, `type:
"highlight"`, with the same `highlight` block and the papers in `refs`. Its card
lists them, each linking to that paper's card — or straight out to the paper if
it has none yet. Syntheses lead the grid; paper cards follow, newest first. The
section renders only once there is a card to show.

A software item's figure is its own logo, never its paper's figure, and is
best **mirrored** from the package's repository, not copied by hand: give the
highlight a `source` and let the script make the image.

```jsonc
"source": { "repo": "GalacticDynamics/unxt", "path": "docs/_static/favicon.png" }
```

```bash
node scripts/sync-software-figures.mjs   # makes `image`, and writes source.sha
```

`source.sha` is the git blob it mirrored. Every six months (1 January and 1
July), a workflow re-runs the script and opens a pull request when an upstream
file has changed. To pick up a new logo sooner, run *Refresh software figures*
by hand from the Actions tab. Any change made to an image lives in the script,
so it is reviewed along with that pull request. Today `image`'s extension
decides: a `.webp` is made at quality 85 from a PNG, or from an SVG drawn 512
px wide; an `.svg` is the SVG copied as is. Prefer `.webp` for anything but a
tiny SVG — a painted logo's SVG can run to thousands of lines. A highlight
without a `source` has a custom image, which the script leaves alone. Avoid
custom images where you can.

### Cards — one component, named by what they show

Every card on the site — the software tiers, the research carousels, a
proceeding under its paper, the Assists, the home page's papers, the CV's software — is `src/components/Card.astro`,
given a **preset**. A preset's name is its spec: `key:value[:subvalue]` parts
joined by `-` (`src/lib/cardname.js`) — its size, where its figure and buttons sit, what it
shows, then its look.

```
size:fill:fit-figure:center:auto-title:short-authors:none-text:none-extras:position,year-buttons:all
    fills its column at standard size: the short title, figure and "1st | 2026"
size:320:400-figure:center:auto-title:short-authors:none-text:none-extras:position,year-buttons:all-look:standard
    the same in a 320 × 400 box
size:480:120-figure:none-title:full:whole-authors:full:marked-text:none-extras:venue-buttons:ads,code:right-look:textsize=compact,buttons=feature
    a 480px strip: byline and venue, ADS and code links at the end, the buttons a step larger
```

| key | values |
|---|---|
| size | `<width>:<height>`, each set or not. The width: `fill`, filling its container, or 120–1600 px. The height: `fit`, growing with its content, or 40–1600 px — a set height, which the content is fitted inside, clipped and never grown by, so cards side by side can share one: `size:fill:200` is a row of cards of one height, `size:640:160` a box |
| figure | the highlight figure: `none` (the default), `center[:<slot>]:<size>` — in the center, below the `title` (the default, left out), or above it at `top`, or below the `authors`, the `venue` or the `text` — `figure:center:authors:auto` — or `<side>:<v>[:<h>]:<size>`, in the `left` or `right` side, at the `top`, `center` or `bottom` of the card's height and, narrower than its column, at its `left`, `center` (the default, left out) or `right` — `figure:left:top:right:120px`. The size is its own width in its column, apart from the column's: `auto`, filling it; `10`–`100`, that share of it in percent; or `8px`–`800px`. `:link` at the end makes it a link to the item, as the website has it |
| title | `full:split` (the default: where the short title is part of the full one, only that part is at the title's weight and the rest is regular) · `full:whole` (all of it at the title's weight) · `short` (`shortTitle`) · `nick` (`nickTitle`), each falling back to the longer one · `none`; then `:link` to make it a link to the item itself — the paper, the package — as the website has it, or `:site` to its entry on this site, `/publications/#pub-<id>` or `/software/#sw-<id>`; `:ads` to its ADS abstract; or `:journal` to where it was published — the journal's own page, or its DOI — left off, the title is words; then `:status`, a pill after it — `submitted` or `accepted`, a paper not yet out — `title:full:split:status`; and last, where it sits: `:top`, across the card above all else, the figure, the center and the sides starting under it — `title:short:link:top` — and there up and down, `top` (left out), `center` or `bottom`, where the top area is higher than the title, a `center` alone being up and down — `title:nick:top:bottom` — or, left off, the center, the words' own column; and very last, across that area, `:center` or `:right` — left off, at its left — `title:nick:right`, `title:nick:top:top:center` |
| area | the areas are fixed — the top area, the left side, the center, the right side and the bottom area — and the parts move between them: the title to the top or the center, the figure to a side or the center, the buttons to a side, the center or the bottom. A side holds its figure and its buttons stacked, the figure above. An area is there when something is in it, or when the name gives it, `area:<left|right|top|bottom>` — then there with nothing in it too: an empty side a column of its width, 3em left out; an empty top or bottom a strip of the card's padding, its height `min=<0–400>` or a line's, `area:top:min=24` — and with the title or the buttons in it, at least that high. Each side's settings are a part of its own, `area:left:…` and `area:right:…`, given once, comma-separated: its width — `min=<0–800>`, at least so many px, growing to fit what is in it; `share=<5–95>`, that share of the card's width; or `buttons`, as wide as its buttons laid out — left out, as what is in it has it, a figure of px setting the least; and the corners it wins, `top` over the top area and `bottom` over the bottom one, running the card's full height beside them while they keep to the center — left out, they win their corners. `area:left:share=25,top` |
| authors | a paper's byline, on its own — and never without me: past the cut it elides to my name, "J. Nibauer, …, N. Starkman, et al.": `none` · `short` (the first three, two at `minor` text size, then "et al.") · `full` (up to eight) · `1`–`20`, so many, `authors:5`; then `:fit`, fewer names to that many where they would run past one line — the venue after them, where it is, included — `authors:full:fit`, as it is redrawn at each width, on the embed pages only; then `:plain` (the default) or `:marked` (my students coloured, with † and ‡); then `:orcid` to link each co-author to their ORCID, or `:site` to the papers we wrote together on the collaborator map at /research/ — where they have one |
| text | `none` · `summary` · `details` — the record's own summary and details (for a paper, its highlight's description); then across the center, `:center` or `:right` — left off, its left — `text:summary:center` |
| extras | `none`, or any of `venue` (where and when it appeared — the venue line, with its year), `status` (a paper not yet out, `submitted` or `accepted`, as a pill at the end of the venue line), `position` (my author position, "1st", where the `position` part puts it), `students` (my students among the authors, each with their position, alone or beside mine — "student‡ 1st | 2nd"), `year` (the year, where the `year` part puts it), `role` (my `role` in a package), `context` (a link to its topic on /research/) |
| venue | the venue line, where `extras` has `venue`: the journal's name `full` or `short` — its short name from `config/journals.json`, `ApJ` for The Astrophysical Journal, which every journal in `data/` must have —; then `:unlinked`, the name not a link to the article; then `:undated`, without its year; then `:noarxiv`, none at all for a paper in no journal yet, rather than its arXiv number; then `:above`, its own line above the authors' rather than below it; then across the center, `center` or `right` — left out, at its left — or, in place of the last two, `authors`, in the authors' area, after them, or `:before` them, `authors:before` — or `beside`, its own area beside theirs, a column on their line, at their right, or `:before`, their left, then the left column's width, `5`–`95` (%) or `20`–`800px`, the right taking the rest, `beside:before:40` — the space between the two columns `authors_venue`'s — `venue:short:undated:right`, `venue:full:above`, `venue:short:authors`. Left out, `venue:full` |
| context | where the context link sits, a `<place>`: `context:bottom:right`, as /publications/ has it |
| position | where my author position sits, a `<place>`: `position:top:right` |
| year | where the year sits, a `<place>`: `year:top:right`. Where my position is in the same place, the two read as one, "1st \| 2026"; apart, each sits in its own |
| buttons | the link buttons: `all`, `none`, or the keys to keep (`ads`, `preprint`, `code`, …), each once, in the order they are drawn — `buttons:code,ads,preprint`; `all` is every one in the item's own order; and `empty`, as many as asked, each a button's room with nothing in it, for laying them out — `buttons:empty,ads,empty,preprint:2`; and `year`, `position` and `context`, the parts so named, each among the buttons rather than in a place of its own — in a grid a row of its own, at the buttons' place across — and `paperbutton`, the paper button, first where left out — `buttons:year,paperbutton:right`; then `:1`–`:12`, the buttons to a row before the next — `buttons:all:2` — or `:fit`, as many as fit, as the website has them; left off, as near square as they go, ⌈√n⌉ to a row for the n shown; then their area — `left`, `center` (left out: under the words), `right` or `bottom` (the card's full width) — and their place in it: in a side, its `top` (left out), `center` or `bottom`, then across it, `left`, `center` or `right`, toward the card's edge left out; under the words or at the bottom, `left` (left out), `center` or `right` — `buttons:all:fit:right`, `buttons:all:bottom:center`. A side holds its figure and its buttons stacked, the figure above and the buttons at the side's foot, beside the center's last line — up and down there is the figure's alone. **Groups:** the buttons are individual elements, and `buttons` may be given again — the first is the card's own and each part after it another group, with its own keys, its count to a row and its area and place (`buttons:code,docs:left-buttons:stars:right`). Every key is in one group (`all`, in one; `empty`, in any). A group in the card's buttons' area sits in a slot of their box at its place; one in another area (`left`, `center`, `right`, `bottom`) has a box of its own there, and `top` is a strip of the card's padding. Only the first group has `paperbutton`, `year`, `position` and `context`. In the Card Builder a button is sent to another group from its → menu (the first group's order line, or a group's own line under Groups), or dragged in the preview — onto a button of another group, to join it there, or onto an area, to make a group there or join the one that is; each group has its own area, place and rows |
| paper | a paper's button of words, first in the buttons' box and as high as a button: its label, a word of up to 16 letters or digits — `paper:paper`, as the old site had it — or `icon`, the paper glyph; then where it links, `journal`, `arxiv`, `ads` or `site` — left out, the article where it is out, else arXiv; then `grey`, in the greys of the site's word buttons rather than the accent. Left out, no such button; with nowhere to link, none — `paper:pdf:arxiv` |
| `<place>` | where my position, the year and the context link each sit: in an area, then at a place in it. With the buttons, in their area — the default, at the end away from them — up and down and across it, `<area>[:<v>][:<h>]`: `year:right:top`; a `center` alone after the area is up and down, so `center` across is written after its up and down. Or in the top area, or the bottom one where the buttons are not, a strip of the card's padding made for it: `left` (left out), `center` or `right` — `context:bottom:right`. Not an area away from the buttons |
| space | room between the card's slots. Every card is one grid with every area always there — the left, center and right areas in columns; title, figure, authors, venue, text, the buttons under the words and the bottom area in rows — a part left out taking no room. Between two slots, a track named by them, in their default order — a figure moved among the center's parts leaves the names where they are: rows `top_left` · `top_center` · `top_right` (from the top area, there or not, to the left area, the center and the right area, each its own — a length only) · `title_figure` · `figure_authors` · `authors_venue` · `venue_text` · `text_buttons` (to the buttons under the words) · `center_bottom` (to the bottom area), columns `left_center` · `center_right`, each `0`–`64` px or `flex`: a row fits its content, so a flex row takes what room is left — `space:title_figure=flex` sinks all under the title — and the center fills its column, so a flex column shares the width with it, a part each: `center_right=flex` gives the space beside the center half, `left_center=flex,center_right=flex` centers it in a third. `center_right=24` widens the gap before the right area. Left out, as it is |
| look | how it is drawn, as comma-separated `key=value` settings, each on its own: `textsize`, `padding`, `corners`, `buttons` (each a step — `minor` · `compact` · `standard` · `feature` · `display` — for the text size, and every length inside the card with it; the padding; the corner radius; the link buttons — each may instead be a size in px: text 8–40, to a tenth, `textsize=15.5`; padding 0–64, the same on every side, `padding=12`; corners 0–64; buttons 12–64, their icon half that); `titlesize`, the title's own, a step or 8–60 px — left out, it follows the text size, and a step alone does not set it —; `<part>size` and `<part>weight`, a part's own size, 8–40 px to a tenth, and weight, `regular` · `medium` · `bold`, for `body` (the summary or details), `authors`, `venue`, `position`, `year` and `context` — left out, as the card has it, `look:authorssize=12,venueweight=medium`; `<part>style`, `normal` (left out) or `italic`, for those and the `title`, `look:yearstyle=italic`; `<part>face`, `sans`, `serif` or `mono` — left out, its own — for those and the `title`, `look:titleface=mono`; `titleweight`, `regular` · `medium` · `bold`, or `mine` — bold where I am first author and regular otherwise — left out, medium, or regular where I am past second author; `frame`, the white around a figure, `none`, a step or 0–32 px, its corners then following the card's; `buttongap`, the space between the link buttons, 0–32 px or 0–100% of a button's size, `buttongap=50%`; `partgap`, the space above each part, 0–32 px to a tenth, `partgap=8.8`, as the research carousels have it; and `background` (`none` · `light`, half the site's tint, as /publications/ sets a paper's highlight · `normal` · `dark`). A setting left out is `standard` on a card that fills its width, and on one of a set width follows it (a 320px card no wider than it is high reads as `standard`). The four at one step are written as the step alone — `look:feature` — and a step may lead the settings, `look:feature,padding=minor` |

Parts may come in any order, and `figure`, `title`, `area`, `authors`, `extras`, `venue`, `context`, `position`, `year`, `buttons`, `paper`, `space` and `look` may be left out
(`figure` `none`, `area` `none`, `authors` `none`, `extras` `none`, `context`, `position` and `year` with the buttons, `buttons` `all` under the words, `space` `none` and the look above; a left-out title is `nick` in a box of set height at `minor` text size when no wider than it is high, `short` there when wider, and `full:split` anywhere else; such a box may leave out `text` too, and has none); a name is always *written* in full, in the order above, but for the look's settings where they are the box's own.
Lists are comma-separated — a `+` would read as a space in a URL query.

The website's cards fill their width — a grid sets it — and fit their content, and it uses only
the presets in `SITE_PRESETS` (`src/lib/cards.js`), each named by its key —
`<Card preset={PRESET.softwareLead} …>` — never written out, and a test holds
the pages to the keys. Never give a card a class of its own for a
look: a new look is a new preset, and so is available everywhere at once.

What a name makes of an item — every data attribute and custom property the
stylesheet reads, and the buttons' list in its order — is `cardFace` in
`src/lib/cardname.js`, given the facts `cardFacts` (`src/lib/cards.js`)
gathers. `Card.astro` draws from it, and the embed page runs the same source,
so a card and its embed cannot disagree; a new axis is a new key there.

The `students` extra, on a paper with a student of mine among its authors
(`student` on that author), shows each of them beside my position, in author
order: "student‡ 1st | 2nd" where they were first and I second, "1st | student‡
4th" where they were fourth. The student is in their colour — † undergraduate,
‡ graduate — with a hover saying so. It stands alone, or goes with `position`; a preset
that leaves `students` out gets only mine.

Each publication, synthesis and package can be embedded at `/embed/<id>/`,
with any card named in the query — `?card=size:640:160-figure:none-text:summary-buttons:all:right-look:standard`
— plus `?theme=light|dark`. The page renders every part and the axes choose
which show, so one static page serves every combination. `/embed/index.json`
lists the items and presets; `/embed/resize.js` sizes card iframes to fit.
Like an `id`, these URLs must not move once published.

`/webdev/card/` — under Web Dev, in the footer — is the point-and-click way in.
It also draws the images, in the browser, from the live preview: nothing is
rendered at build time, so any combination can be had as a file. One
measurement, `src/lib/cardpdf.js` — every box, figure, icon and line of text where
the CSS put it — feeds all three. As an SVG, `src/lib/cardsvg.js` writes it:
vector text, the figures inside, each link an `<a>`. As a PNG, that SVG is
rasterized on a canvas at twice its size, with the card's own faces
(`public/fonts/card/`) put into it as data: URIs, since an SVG drawn as an image
cannot reach the page's. As a PDF, Typst (`src/lib/card.typ`, with the compiler
the CV builder uses) sets it again in the same faces, its text selectable and its
links live. The layout stays the CSS's alone, so a new axis needs nothing in any
of them.

The page `src/pages/webdev/card.astro` is markup and thin wiring; the builder is
a module, `src/lib/cardbuilder/`, whose `index.js` lists its public API and
what each file is for. `model.js` (the controls ⇄ a name), `geometry.js`,
`settings.js` and `facts.js` are pure and tested in `tests/cardbuilder.test.js`;
`overlay.js`, `preview.js`, `download.js` and `builder.js` are the browser side.
Its styles are `src/styles/card-builder.css` (the page) and
`card-builder-preview.css` (injected into the preview frame). Like the cards
themselves the builder never decides how a card looks — it writes a name and
`cardFace` reads it. A new control is a part in the name's grammar first, then
its `controlOps` and `readSpec` lines in `model.js`, then its markup.

**Software cards as images, without a browser.** `/cards/<id>-<light|dark>.svg` (and
`/cards/index.json`, which lists them) are the lead and headline packages' cards, for the profile
README, drawn at build by a static endpoint (`src/pages/cards/`) in plain node. `src/lib/cardlayout.js`
lays one out — a second implementation of the CSS, for the `softwareLead` and `softwareHeadline`
presets (`TIER_PRESET`) at a set width (`CARD_SVG_WIDTH`) — measuring text from the Plex files, shaped by HarfBuzz as Chrome shapes it
(`src/lib/textmeasure.js`) and handing the same model `cardpdf.js` measures to `cardsvg.js`. It throws
on any name that asks for more than it draws. `tests/cardlayout.test.js` keeps it in step: its
colours, steps and formulas are read from `global.css`; it must reproduce what the browser measured
for every such card (`tests/fixtures/software-cards.json`); and that measurement is stamped with a hash of the
card's CSS and `Card.astro` (`scripts/lib/cardsync.mjs`). **When that hash test fails, the card's CSS
has changed:** run `node scripts/record-card-layouts.mjs` (needs `npm i --no-save playwright` and a
dev server) to measure again, read the fixture's diff as the change in layout, and fix `cardlayout.js`
until the rest pass. The recording is at several widths (200 to 640 px), so wrapping and a second row of buttons are measured, not reasoned about.
`tests/cardlayout.property.test.js` (fast-check) holds what must be true of any card it draws — nothing dropped, nothing past the padding, buttons never overlapping — over generated widths, texts and buttons; `FC_RUNS=1000` tries more, and a failure prints a seed to replay (`FC_SEED`, `FC_PATH`). A new look for those presets is a change to `cardlayout.js` first.

The inline-card in a research introduction is not a card in this sense and is
not exported: a text-sized iframe sits badly in prose.

### `location` — a place, never an institution

`location` is what the conference map pins, so it has one format:

```
City, ST, Country      US and Canada — "Cleveland, OH, USA", "Toronto, ON, Canada"
City, Country          everywhere else — "Lausanne, Switzerland"
Online                 a meeting with no venue
```

Not `MIT, USA` — that is an institution, and a geocoder cannot place it. Not
`TO, CA` either: `CA` reads as California, which is the failure this format
exists to prevent, and it puts the pin 3,500 km from Toronto without ever
looking wrong.

After adding one, resolve its coordinates once and commit them:

```bash
node scripts/geocode-places.mjs           # fills in only what is missing
node scripts/geocode-places.mjs --check   # exit 1 if anything is unplaced
```

Coordinates live in `config/places.json` so the site and CI never call a
geocoder. A name that is the same campus as another — "University of Chicago" and
"The University of Chicago" — is written `{ "sameAs": "<other name>" }`, not a
second copy of the coordinates; `tests/places.test.js` fails on a repeat. The script skips anything not in the format above, and checks the
`matched` string it wrote — Nominatim answers "Durham, UK" with the county, not
the city. Correct a wrong pin by hand; the script never overwrites one.

A talk whose location is missing or unsettled is not dropped — it is listed
under the map as not placed. That is deliberate, so a missing coordinate is
visible rather than silent.

### Publications must produce valid BibTeX

The renderer emits a `.bib` file, so publication entries carry everything a
correct entry needs. Two rules matter:

- **Authors are structured, never display strings.** Write
  `{"family": "Starkman", "given": "Nathaniel", "me": true}` — not
  `{"name": "N. Starkman"}`, which is rejected. From the split the renderer
  produces both `Starkman, Nathaniel` for BibTeX and `N. Starkman` for the site.
  Use `{"literal": "…"}` only for a non-person byline. `suffix` holds Jr./III so
  sorting stays correct.
- **List every author, in order.** Never pre-truncate with "et al." — renderers
  truncate per preset, and a truncated list makes the BibTeX wrong. For a
  collaboration paper with hundreds of authors, set `collaboration` to the
  byline and list the named authors.

`entryType` is the BibTeX type and is **not** derivable from `status` — a
published conference paper is `inproceedings`, a preprint is `misc`. `venue`
uses BibTeX-native names (`journal`, `booktitle`, `publisher`, `school`,
`series`, `volume`, `number`, `pages`, `address`) so the mapping is direct.
`citekey` defaults to `id`; set it only to preserve a key already cited
elsewhere.

A workshop or conference proceeding of a paper that exists in full sets
`preliminaryOf` to that paper's id. `/publications/` then lists it as an
micro-card (title, venue, year, links) under the full paper rather than as its own entry; BibTeX
keeps both. Set it on the proceeding, never on the paper.

`bibcode` is the 19-character ADS identifier, e.g. `2022ApJ...935..167A`. The
ADS URL derives from it, so **do not add a separate link for ADS**. Omit it
until the paper is actually on ADS. `arxiv` is the bare number
(`2606.21774`), with `primaryClass` like `astro-ph.GA`.

Every six months (1 January and 1 July) `scripts/refresh-publications.mjs`,
run by `.github/workflows/refresh-publications.yml`, asks ADS for each
publication and opens a pull request for what is missing or changed: `abstract`,
`bibcode` (a preprint's is replaced by the journal's), `doi` and `citations`.
Where ADS has no abstract, arXiv and Crossref are tried. It never replaces an
existing abstract, and needs the repository secret `ADS_TOKEN`; locally,
`ADS_API_TOKEN=… node scripts/refresh-publications.mjs`.

### `links` — a closed vocabulary

`rel` must be one of:

```
paper  preprint  doi  repo  code  docs  data  slides  event  homepage
```

Closed on purpose: it drives the README icon trail, the website buttons, and
the CV glyphs from one definition. Needing a new value is a schema change, not
a data change — edit `schema/item.schema.json` and every renderer in the same
PR, or it renders as nothing.

`repo` is the *paper's* repository; `code` is the software itself.

A software card's last button is its stars (for a package with at least `STARS_MIN`, 40; under it the link is `optional`: left out of `buttons:all`, shown where a name lists it — `buttons:code,docs,stars` — and a pill in the Card Builder, unticked) — `stars` among the `buttons` keys — from `config/stars.json`,
a snapshot of each `repo`'s GitHub stars that `scripts/collect-stars.mjs` rewrites and
`.github/workflows/refresh-stars.yml` proposes monthly as a pull request. Do not edit it by hand.

### Dates

`{ "start": "2024", "present": true }` renders "2024 –".
`{ "start": "2018", "end": "2024" }` renders "2018 – 2024".
Setting both `end` and `present` is rejected. Use the coarsest precision you
actually know — `"2025"` is honest; an invented `"2025-01-01"` is not.

### `refs`

Items point at each other by bare id. A media entry references the paper it
covered; a talk references the paper it presented. This replaces the LaTeX
`\hyperref` labels.

## 3. Validate before pushing

```bash
npm install          # once
npm run validate     # every data file against the schema — the quick one
npm test             # everything CI runs, below
```

`npm test` is six gates, and CI runs all of them on **every** pull request
whatever it touched:

| | |
|---|---|
| `test:unit` | the loader, preset resolution, the render model, BibTeX escaping |
| `test:schema` | the schema, `<date.start>-<id>.json` filenames, refs, cross-links, and the bad fixtures still being rejected |
| `test:bibtex` | one entry per publication, braces balanced, maths in abstracts intact |
| `build` | the site compiles |
| `test:a11y` | every heading and link has an accessible name |
| `test:links` | every internal href, anchor and asset in `dist/` resolves |

CI additionally compiles the four CV PDFs and asserts the one-page CV is one
page and the two-page CV is two. An invalid item fails the check rather than
silently vanishing from a render — the failure this whole setup exists to
prevent.

Every pull request also gets a live preview URL, posted as a comment.

One check is required to merge: **CI Pass**, which is green only when every
other job in `ci.yml` is. A job that fails to trigger at all therefore blocks
the pull request instead of leaving it green with nothing run.

## 4. Open the PR

- Branch `add/<id>`, e.g. `add/eas-2026-s10`.
- **One item per PR.** They then never conflict and each is reviewable at a glance.
- Fill in the pull request template.
- Title: `Add <type>: <title>`.
- Milestone: **♾️&➡** by default, for pull requests and issues alike.
  It is the standing milestone for this repo rather than a release marker, so
  assign it unless something more specific applies:

  ```bash
  gh pr edit <number> --milestone "♾️&➡"
  gh issue edit <number> --milestone "♾️&➡"
  ```

  Copy the title exactly — it is `U+267E U+FE0F & U+27A1`, and an emoji that
  merely looks the same will not match.

## Sites hosted in their own repos

Any repo under `nstarman/` that publishes to GitHub Pages from Actions appears
at `nstarkman.space/<repo>/`, laid onto this site without this site building
it — a package's docs, a skill collection, a tool run in the browser. So a repo
must not take the name of a path here: `webdev`, `cv`, `embed`, `cards`,
`research`, `publications`, `software`, `tools`.

Such a repo looks like this site by using its layout. It adds this repo as a
git submodule at `site/` — shallow, and checked out to the three files it
uses, so it carries one commit of about 4 MB rather than the whole site:

```bash
git submodule add --depth 1 https://github.com/nstarman/nstarman.github.io site
git config -f .gitmodules submodule.site.shallow true
git -C site sparse-checkout set --no-cone \
  /src/layouts/Base.astro /src/components/IconSprite.astro /src/styles/global.css
```

`shallow` is committed, in `.gitmodules`; the sparse checkout is not, so a
fresh clone repeats that last line after `git clone --recurse-submodules`.
CI needs neither: `actions/checkout` with `submodules: true` fetches one
commit already, and the build reads only those three files.

Its pages wrap themselves in `Base.astro`:

```astro
---
import Base from '../../site/src/layouts/Base.astro';
---
<Base title="Skills — Nathaniel Starkman" section="/software/" repo="nstarman/skills">
  <main>…</main>
</Base>
```

`section` marks its nav entry; `repo` is where "Last updated" links. Its
`astro.config.mjs` sets `site: 'https://nstarkman.space'` and `base: '/<repo>'`.
Dependabot (`package-ecosystem: gitsubmodule`) proposes each change to this
site's design as a pull request there. `Base.astro` imports only its stylesheet
and icons and links site-absolute, so it works from the submodule;
`tests/base-hosted.test.js` holds it to that.

It is found from here as any software is: a `software` item in `data/`, its
page linked with an absolute `https://nstarkman.space/<repo>/` URL — a
site-absolute one fails `test:links`, since the page is not in this build.

## Do not

- **Do not** edit `README.md` in [nstarman/nstarman] by hand — it is generated.
- **Do not** edit the built PDFs under `cv/`, the generated `.bib`, or `dist/`.
- **Do not** put two items in one file.
- **Do not** change an `id` after merge — `refs` elsewhere point at it.
- **Do not** invent a `link.rel` value, or add an ADS link instead of `bibcode`.
- **Do not** write an author as a display string, or truncate an author list.
- **Do not** hand-write star counts or citation numbers that a script fetches.

## Why it is shaped this way

Three artefacts used to restate the same facts — a 1119-line LaTeX CV, the
profile README, and a Jekyll site — and they drifted. The site sat unchanged for
over a year while the CV gained new submissions. The old CV even tried to solve
this, with a Python script stripping `% SKIP: (*)` markers out of the `.tex` and
then injecting `\vspace{-10pt}` to repair the layout.

The idea was right; the mechanism was fragile. Here the selection lives in data
(`cvs`, `summary`/`details`, `tier`) and the renderers read it. Adding a conference is
one small file, and it appears everywhere at once.
