# Cards

**Covers**: `src/components/Card.astro`, `src/lib/cardname.js`, `src/lib/cards.js`,
`src/lib/cardlayout.js`, `src/lib/cardpdf.js`, `src/lib/cardsvg.js`,
`src/lib/card.typ`, `src/lib/cardbuilder/`, `src/pages/embed/`,
`src/pages/cards/`, `src/pages/webdev/card.astro`
**Status**: Current — describes the system as it is (constitution, Article X).

## Scope

Every card the site draws — the software tiers, the research carousels, a
proceeding under its paper, the Assists, the home page's papers, the CV's
software — and the ways a card leaves the site: the embed pages, the Card
Builder's downloads, and the software-card SVGs the profile README shows. Not
covered: the inline-card in a research introduction, which is a text-sized link
rather than a card and is never exported.

## Requirements

- **FR-001** Every card is `src/components/Card.astro` given a **name**: a string
  of `key:value[:subvalue]` parts joined by `-`, in the grammar under
  *Reference*. The name is the card's whole spec. *Enforced:* `tests/cards.test.js`
  ("card names").
- **FR-002** A name is always *written* in full, in the order of the grammar
  table, with the look last; it may be *read* with parts in any order and with
  the optional parts left out. `parseName(formatName(x))` round-trips every value
  of every axis. Lists inside a part are comma-separated, never `+`. *Enforced:*
  `tests/cards.test.js`.
- **FR-003** `cardFace` (`src/lib/cardname.js`) is the one interpreter of a name:
  every data attribute and custom property the stylesheet reads, and the
  buttons' list in its order, come from it, given the facts `cardFacts`
  (`src/lib/cards.js`) gathers. `Card.astro` and the embed page both draw from
  it. A new axis is a new key there. *Enforced:* `tests/cards.test.js`,
  `tests/cardgroups.test.js`.
- **FR-004** The website uses only the presets in `SITE_PRESETS`
  (`src/lib/cards.js`), each named on a page by its key —
  `<Card preset={PRESET.<key>} …>` — never written out. The keys the pages use,
  plus `TIER_PRESET`'s, are exactly `SITE_PRESETS`'s keys. A card never gets a
  class of its own for a look: a new look is a new preset. *Enforced:* the
  "presets are exactly the cards the website renders" test in
  `tests/cards.test.js`; review for "never a class of its own".
- **FR-005** Each publication, synthesis (`type: "highlight"`) and package has an
  embed page at `/embed/<id>/`, which renders every part and lets
  `?card=<name>` and `?theme=light|dark` choose which show, so one static page
  serves every name. `/embed/index.json` lists the items and presets;
  `/embed/resize.js` sizes card iframes. These URLs never move (Article III).
- **FR-006** The Card Builder (`/webdev/card/`) writes a name and nothing else;
  `cardFace` reads it. Its SVG, PNG and PDF downloads are drawn in the browser
  from one measurement of the live preview (`src/lib/cardpdf.js`); the layout is
  the CSS's alone. Its pure modules are tested in `tests/cardbuilder.test.js`.
- **FR-007** `/cards/<id>-<light|dark>.svg` and `/cards/index.json` are drawn at
  build, in node, for every `flagship` and `major` package, at
  `CARD_SVG_WIDTH`, by `src/lib/cardlayout.js` — a second implementation of the
  CSS for the `TIER_PRESET` presets only. It throws on any name asking for more
  than it draws. *Enforced:* `tests/cardlayout.test.js` (it reproduces the
  browser's recorded measurement in `tests/fixtures/software-cards.json`, and
  that recording's hash of the card CSS and `Card.astro` is current),
  `tests/cardlayout.property.test.js`, `tests/cardlayout.differential.test.js`.
- **FR-008** A software card's stars button reads `config/stars.json`, shown in
  `buttons:all` only at `STARS_MIN` (40) stars or more; under it the key is
  optional and appears only where a name lists `stars`.
- **FR-009** The `students` extra draws each student of mine on a paper with
  their position; where the author names a mentee (`authors[].mentee`) it links
  to their profile, with an aria-label naming them. Under `students:photo` a
  mentee with a `photo` is drawn as that photo, the word and its mark hidden;
  `data-stuphoto` from `cardFace` alone decides it. The photo is a circle three
  quarters of a button high, ringed in their level's colour, with `alt=""`
  since the link's aria-label names them; a mentee without a photo keeps the
  word. The `carousel` preset alone uses `students:photo`; an embed's default
  card does not. The Card Builder offers word or photo beside the students
  extra, enabled only with it ticked, and a loaded name round-trips. The SVG,
  PNG and PDF downloads draw the circle with no code of their own for it.
  *Enforced:* `tests/cards.test.js` ("the students extra", "student stamp"),
  `tests/cardbuilder.test.js` ("carries the students' photo face").
- **FR-010** My position and my students' stamp, the year and the context
  link, placed with buttons that sit under the words or at the bottom, default
  up and down to the middle of the buttons' row (`placeOf`, `src/lib/cardname.js`) — of their whole box
  where they wrap to two rows — so the default is written nowhere; `:bottom`
  names the row's foot. Buttons in a side area keep that area's own default.
  On a card with no buttons, a student's photo does not make its line taller.
  *Enforced:* `tests/cards.test.js` ("place a part with the buttons, at the end
  away from them left out").

## Key Entities

- **Name** — the card's spec string; see *Reference*.
- **Preset** — an entry of `SITE_PRESETS`: `{ key, slug, where }`.
- **Facts** — what `cardFacts` gathers from an item for `cardFace`: its links,
  author position, students, venue, status, stars, figure.

## Edge Cases

- **The hash test fails**: the card's CSS or `Card.astro` changed. Run
  `node scripts/record-card-layouts.mjs` (needs `npm i --no-save playwright` and a
  dev server), read the fixture's diff as the change in layout, and fix
  `cardlayout.js` until the rest pass. The recording is at 200, 280, 400, 640 and
  808 px, light at each and dark too at the README's widths (400 and 808), so
  wrapping and a second row of buttons are measured.
- **A property test fails**: it prints a seed; replay with `FC_SEED` and
  `FC_PATH`. `FC_RUNS=1000` tries more cases.
- **A name `parseName` cannot read** is rejected, not drawn as a default card.

## Reference

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
| students | how my students show, where `extras` has `students`: `word` (left out), "student‡ 1st", or `photo`, each student's photo from their mentoring record as a circle three quarters of a button high, ringed in their level's colour, "[photo] 1st" — the word kept for one with no photo — `students:photo` |
| year | where the year sits, a `<place>`: `year:top:right`. Where my position is in the same place, the two read as one, "1st \| 2026"; apart, each sits in its own |
| buttons | the link buttons: `all`, `none`, or the keys to keep (`ads`, `preprint`, `code`, …), each once, in the order they are drawn — `buttons:code,ads,preprint`; `all` is every one in the item's own order; and `empty`, as many as asked, each a button's room with nothing in it, for laying them out — `buttons:empty,ads,empty,preprint:2`; and `year`, `position` and `context`, the parts so named, each among the buttons rather than in a place of its own — in a grid a row of its own, at the buttons' place across — and `paperbutton`, the paper button, first where left out — `buttons:year,paperbutton:right`; then `:1`–`:12`, the buttons to a row before the next — `buttons:all:2` — or `:fit`, as many as fit, as the website has them; left off, as near square as they go, ⌈√n⌉ to a row for the n shown; then their area — `left`, `center` (left out: under the words), `right` or `bottom` (the card's full width) — and their place in it: in a side, its `top` (left out), `center` or `bottom`, then across it, `left`, `center` or `right`, toward the card's edge left out; under the words or at the bottom, `left` (left out), `center` or `right` — `buttons:all:fit:right`, `buttons:all:bottom:center`. A side holds its figure and its buttons stacked, the figure above and the buttons at the side's foot, beside the center's last line — up and down there is the figure's alone. **Groups:** the buttons are individual elements, and `buttons` may be given again — the first is the card's own and each part after it another group, with its own keys, its count to a row and its area and place (`buttons:code,docs:left-buttons:stars:right`). Every key is in one group (`all`, in one; `empty`, in any). A group in the card's buttons' area sits in a slot of their box at its place; one in another area (`left`, `center`, `right`, `bottom`) has a box of its own there, and `top` is a strip of the card's padding. Only the first group has `paperbutton`, `year`, `position` and `context`. In the Card Builder a button is sent to another group from its → menu (the first group's order line, or a group's own line under Groups), or dragged in the preview — onto a button of another group, to join it there, or onto an area, to make a group there or join the one that is; each group has its own area, place and rows |
| paper | a paper's button of words, first in the buttons' box and as high as a button: its label, a word of up to 16 letters or digits — `paper:paper`, as the home page has it — or `icon`, the paper glyph; then where it links, `journal`, `arxiv`, `ads` or `site` — left out, the article where it is out, else arXiv; then `grey`, in the greys of the site's word buttons rather than the accent. Left out, no such button; with nowhere to link, none — `paper:pdf:arxiv` |
| `<place>` | where my position, the year and the context link each sit: in an area, then at a place in it. With the buttons, in their area — the default, at the end away from them and, under the words or at the bottom, level with the middle of their row — up and down and across it, `<area>[:<v>][:<h>]`: `year:right:top`, `position:center:bottom` for the row's foot; a `center` alone after the area is up and down, so `center` across is written after its up and down. Or in the top area, or the bottom one where the buttons are not, a strip of the card's padding made for it: `left` (left out), `center` or `right` — `context:bottom:right`. Not an area away from the buttons |
| space | room between the card's slots. Every card is one grid with every area always there — the left, center and right areas in columns; title, figure, authors, venue, text, the buttons under the words and the bottom area in rows — a part left out taking no room. Between two slots, a track named by them, in their default order — a figure moved among the center's parts leaves the names where they are: rows `top_left` · `top_center` · `top_right` (from the top area, there or not, to the left area, the center and the right area, each its own — a length only) · `title_figure` · `figure_authors` · `authors_venue` · `venue_text` · `text_buttons` (to the buttons under the words) · `center_bottom` (to the bottom area), columns `left_center` · `center_right`, each `0`–`64` px or `flex`: a row fits its content, so a flex row takes what room is left — `space:title_figure=flex` sinks all under the title — and the center fills its column, so a flex column shares the width with it, a part each: `center_right=flex` gives the space beside the center half, `left_center=flex,center_right=flex` centers it in a third. `center_right=24` widens the gap before the right area. Left out, as it is |
| look | how it is drawn, as comma-separated `key=value` settings, each on its own: `textsize`, `padding`, `corners`, `buttons` (each a step — `minor` · `compact` · `standard` · `feature` · `display` — for the text size, and every length inside the card with it; the padding; the corner radius; the link buttons — each may instead be a size in px: text 8–40, to a tenth, `textsize=15.5`; padding 0–64, the same on every side, `padding=12`; corners 0–64; buttons 12–64, their icon half that); `titlesize`, the title's own, a step or 8–60 px — left out, it follows the text size, and a step alone does not set it —; `<part>size` and `<part>weight`, a part's own size, 8–40 px to a tenth, and weight, `regular` · `medium` · `bold`, for `body` (the summary or details), `authors`, `venue`, `position`, `year` and `context` — left out, as the card has it, `look:authorssize=12,venueweight=medium`; `<part>style`, `normal` (left out) or `italic`, for those and the `title`, `look:yearstyle=italic`; `<part>face`, `sans`, `serif` or `mono` — left out, its own — for those and the `title`, `look:titleface=mono`; `titleweight`, `regular` · `medium` · `bold`, or `mine` — bold where I am first author and regular otherwise — left out, medium, or regular where I am past second author; `frame`, the white around a figure, `none`, a step or 0–32 px, its corners then following the card's; `buttongap`, the space between the link buttons, 0–32 px or 0–100% of a button's size, `buttongap=50%`; `partgap`, the space above each part, 0–32 px to a tenth, `partgap=8.8`, as the research carousels have it; and `background` (`none` · `light`, half the site's tint, as /publications/ sets a paper's highlight · `normal` · `dark`). A setting left out is `standard` on a card that fills its width, and on one of a set width follows it (a 320px card no wider than it is high reads as `standard`). The four at one step are written as the step alone — `look:feature` — and a step may lead the settings, `look:feature,padding=minor` |

Parts may come in any order, and `figure`, `title`, `area`, `authors`, `extras`, `venue`, `context`, `position`, `students`, `year`, `buttons`, `paper`, `space` and `look` may be left out
(`figure` `none`, `area` `none`, `authors` `none`, `extras` `none`, `context`, `position` and `year` with the buttons, `students` `word`, `buttons` `all` under the words, `space` `none` and the look above; a left-out title is `nick` in a box of set height at `minor` text size when no wider than it is high, `short` there when wider, and `full:split` anywhere else; such a box may leave out `text` too, and has none); a name is always *written* in full, in the order above, but for the look's settings where they are the box's own.
Lists are comma-separated — a `+` would read as a space in a URL query.

The website's cards fill their width — a grid sets it — and fit their content, and it uses only
the presets in `SITE_PRESETS` (`src/lib/cards.js`), each named by its key —
`<Card preset={PRESET.softwareFlagship} …>` — never written out, and a test holds
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
that leaves `students` out gets only mine. `students:photo` draws, for each
student whose mentoring record has a `photo`, that photo as a ringed circle in
place of the word and its mark — "[photo] 1st"; one without keeps "student‡".
The research carousels use it (`carousel`, which mentee profiles share); an
embed's default card does not, so a page that embeds one is unchanged.

Each publication, synthesis and package can be embedded at `/embed/<id>/`,
with any card named in the query — `?card=size:640:160-figure:none-text:summary-buttons:all:right-look:standard`
— plus `?theme=light|dark`. The page renders every part and the axes choose
which show, so one static page serves every combination. `/embed/index.json`
lists the items and presets; `/embed/resize.js` sizes card iframes to fit.
Like an `id`, these URLs must not move once published.

`/webdev/card/` — under Tools, in the footer — is the point-and-click way in.
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
`/cards/index.json`, which lists them) are the `flagship` and `major` packages' cards, for the profile
README, drawn at build by a static endpoint (`src/pages/cards/`) in plain node. `src/lib/cardlayout.js`
lays one out — a second implementation of the CSS, for the `softwareFlagship` and `softwareMajor`
presets (`TIER_PRESET`) at a set width (`CARD_SVG_WIDTH`) — measuring text from the Plex files, shaped by HarfBuzz as Chrome shapes it
(`src/lib/textmeasure.js`) and handing the same model `cardpdf.js` measures to `cardsvg.js`. It throws
on any name that asks for more than it draws. `tests/cardlayout.test.js` keeps it in step: its
colours, steps and formulas are read from `site.css` (`packages/site-layout/`); it must reproduce what the browser measured
for every such card (`tests/fixtures/software-cards.json`); and that measurement is stamped with a hash of the
card's CSS and `Card.astro` (`scripts/lib/cardsync.mjs`). **When that hash test fails, the card's CSS
has changed:** run `node scripts/record-card-layouts.mjs` (needs `npm i --no-save playwright` and a
dev server) to measure again, read the fixture's diff as the change in layout, and fix `cardlayout.js`
until the rest pass. The recording is at several widths (200 to 808 px), so wrapping and a second row of buttons are measured, not reasoned about.
`tests/cardlayout.property.test.js` (fast-check) holds what must be true of any card it draws — nothing dropped, nothing past the padding, buttons never overlapping — over generated widths, texts and buttons; `FC_RUNS=1000` tries more, and a failure prints a seed to replay (`FC_SEED`, `FC_PATH`). A new look for those presets is a change to `cardlayout.js` first.

The inline-card in a research introduction is not a card in this sense and is
not exported: a text-sized iframe sits badly in prose.
