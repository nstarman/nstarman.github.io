// The CV template.
//
// Reads cv.json — a render model already resolved by src/lib/cvmodel.js, so
// every question of "which items, in what order, with how much detail" is
// answered before this file runs. That is deliberate: the same model feeds the
// website, so the PDF and the site cannot disagree.
//
// Two runtimes, one template. In CI the typst CLI reads cv.json off disk; in
// the browser typst.ts is handed the same filename through its virtual
// filesystem. Nothing forks.
//
// The design follows starkman_long_cv.tex — 12pt Latin Modern, small-caps
// section headings over a hairline rule, one navy for every link, and glyphs
// rather than the words "code" and "docs". Set 11pt here rather than 12, which
// keeps most of the reading gain without the page count.
//
// Three files, and this is the document:
//
//   cv/cv.typ          the header, the section shapes, and the body loop
//   cv/lib/theme.typ   the palette, and the figures that are not old-style
//   cv/lib/styles.typ  the marks, and one unit per style — see the README
//
// So nothing here names a colour, a font or a glyph, and adding a style never
// touches this file.
//
//   typst compile --root . cv/cv.typ out.pdf

#import "lib/theme.typ": ink, accent, faint, orcid, accentsoft, accentline, headerwash, tnum, lnum
#import "lib/styles.typ": styled

#let cv = json("cv.json")
#let p = cv.person

// A page budget, not a style: same type, less air between entries. Only the
// one-page CV needs it — squeezing the two-page one was leaving it cramped at
// the top and two-thirds empty at the bottom.
#let tight = cv.preset == "1page"

// Which style. Each is a self-contained unit in lib/styles.typ answering how a
// mark is drawn beside words (`marked`), standing alone (`solo`), and in a run
// of them (`trail`). Only the browser builder sets the key, so the CLI PDFs are
// always the default and their page-count contracts are unaffected.
#let (glyph, solo, trail, marked) = styled(cv.at("style", default: "default"))

#set document(title: p.name + " — " + cv.label, author: p.name)
// geometry scale=0.9 on A4, hmarginratio 1:1, vmarginratio 2:3
#set page(
  paper: "a4",
  margin: if tight { (x: 1.05cm, top: 0.95cm, bottom: 1.4cm) }
          else { (x: 1.05cm, top: 1.19cm, bottom: 1.78cm) },
)
// New Computer Modern is Typst's own, so CI and the browser both have it — and
// it is Latin Modern's successor, the face the LaTeX CV was already set in.
#set text(
  font: "New Computer Modern",
  size: 11pt,
  fill: ink,
  lang: "en",
  // A CV is mostly numbers set inside sentences — years, volumes, pages. Lining
  // figures are cap-height, so each one reads as a small block of capitals
  // interrupting the line. Old-style figures carry ascenders and descenders and
  // sit in the text the way lowercase does. Columns of digits want the opposite
  // treatment and get it back individually below; #tnum is the helper.
  number-type: "old-style",
)

#set par(
  justify: true,
  spacing: 0pt,
  leading: if tight { 0.42em } else { 0.5em },
)
#show link: set text(fill: accent)

// ── header ────────────────────────────────────────────────────────────────
// Four columns across the full measure rather than five centred lines: a QR to
// the website, the portrait, who he is, and how to reach him. Same information,
// about half the height.
#let hdr = 2.0cm // the portrait and the QR are square and set the block height

// ORCID keeps its own green, as it does in the LaTeX CV, and spells the
// identifier out rather than saying "ORCID".
#let profiles = p.profiles.map(pr => {
  let service = lower(pr.at("service", default: pr.label))
  let mark = service
  let label = if service == "orcid" { p.orcid } else { pr.label }
  link(pr.url, marked(mark, label, size: 0.9em,
                      fill: if service == "orcid" { orcid } else { accent }))
}).join(h(3pt))

// Who he is. Sets the height the contact column matches.
#let namecol = {
  set par(justify: false, leading: 0.3em)
  text(size: 19pt)[#p.name]
  linebreak()
  v(2pt)
  text(size: 11pt)[#p.titles.join(linebreak())]
  linebreak()
  text(size: 11pt)[#p.affiliationShort]
}

// How to reach him, as separate lines rather than one wrapped paragraph, so
// they can be distributed rather than merely stacked. Every figure here is
// transcription data — street number, postcode, ORCID iD — so it stays lining.
#let contactlines = p.addressLines.map(l => text(size: 8.9pt, l)) + (
  text(size: 8.9pt)[
    #link("mailto:" + p.email)[#marked("email", p.email, size: 0.9em)]
    #h(5pt)
    #link(p.websiteUrl)[#marked("globe", p.website, size: 0.9em)]
  ],
  text(size: 8.2pt)[#profiles],
)

// Both columns hold four lines but at different sizes, so stacking them left
// the contact block 8pt shorter than the name block and, being centred in the
// same row, inset at the top and the bottom both. Measuring the name column and
// distributing the contact lines over exactly that height makes the two agree
// at both edges, and keeps agreeing if a title or an address line is added.
#context {
  let h = measure(namecol).height
  // `outset`, not `inset`: the wash is drawn around the grid without taking
  // any space, so the header's geometry — and the page counts that depend on
  // it — are exactly as they were. Tighter vertically than horizontally: the
  // portrait and the QR already sit at the block's full height, so the same
  // gap top and bottom as at the sides reads as a margin rather than a hug.
  block(fill: headerwash, radius: 8pt, outset: (x: 9pt, y: 5pt), grid(
    columns: (hdr, auto, 1fr, hdr),
    column-gutter: 11pt,
    align: (left + horizon, left + horizon, right + horizon, right + horizon),

    // Circular, as on the website. `clip` with a 50% radius does the crop, and
    // `cover` keeps the face centred instead of squashing the photo.
    box(clip: true, radius: 50%, width: hdr, height: hdr,
        image("assets/portrait.jpg", width: hdr, height: hdr, fit: "cover")),

    namecol,

    block(height: h, {
      set par(justify: false, leading: 0.38em)
      set text(number-type: "lining")
      contactlines.join(v(1fr))
    }),

    link(p.websiteUrl, image("assets/qr.svg", width: hdr)),
  ))
}
// The header is a block of its own, so it needs more clearance than two
// sections need from each other.
#v(if tight { 3pt } else { 6pt })

// ── headings ──────────────────────────────────────────────────────────────
// \titleformat{\section}{\Large\scshape\raggedright}{}{0em}{}[\titlerule]
// \titlespacing{\section}{0pt}{10pt}{10pt}, \titlerule default 0.4pt.
#let section(title, mark: none) = {
  // Above is the gap between two sections, below only between a heading and
  // its own first entry, so they should not be equal: 9.2pt each way left a
  // heading sitting almost on the entry above it.
  v(if tight { 8pt } else { 15pt })
  // `none` twice over: no mark named for this section, or a style that draws
  // none. Both mean the heading is the words alone.
  let g = if mark == none { none } else { glyph(mark, size: 0.95em, fill: ink) }
  block(breakable: false, sticky: true)[
    #set par(justify: false, spacing: 0pt)
    #text(size: 15.6pt)[
      #if g != none [#g #h(2pt)]
      #smallcaps(title)
    ]
    #v(4.5pt)
    #line(length: 100%, stroke: 0.4pt + ink)
  ]
  v(if tight { 4pt } else { 7pt })
}

// ── spans ─────────────────────────────────────────────────────────────────
// Emphasis and links arrive as spans, not markup — a literal "*" would print.
// Submitted / in prep, as the website marks them. Replaces the Submitted and
// Published subsection headings: the status belongs to the paper, not to a
// bracket of the list, and one flat numbered run reads as the bibliography it
// is rather than three short lists.
#let statuspill(status) = box(
  fill: accentsoft,
  stroke: 0.4pt + accentline,
  radius: 1.6pt,
  inset: (x: 2.6pt, y: 1.2pt),
  outset: (y: 1.4pt),
  text(size: 6.2pt, fill: accent, tracking: 0.4pt, weight: "medium", upper(status)),
)

#let bolded(sp) = sp.map(s => if s.b { strong(s.t) } else { s.t }).join()
#let linked(sp) = sp.map(s => if "url" in s and not s.url.starts-with("#") {
  link(s.url)[#s.t]
} else { s.t }).join()

// ── one entry ─────────────────────────────────────────────────────────────
// Title and subject share a line — "**Institution**, Role" — which is what
// keeps an entry to two lines rather than three.
#let entrybody(it) = {
  strong(it.title)
  if it.subject.len() > 0 [, #bolded(it.subject)]
  if it.status != none [ #text(size: 9pt, style: "italic", fill: faint)[(#it.status)]]
  if it.links.len() > 0 [ #trail(it.links)]
  if it.recipient != none {
    linebreak()
    text(size: 10.1pt)[#emph[to #it.recipient]]
  }
  for l in it.lines {
    linebreak()
    text(size: 10.1pt)[#linked(l)]
  }
}

// One grid for the whole section, so the date column finds a single width and
// every entry lines up — the LaTeX CV gets this from one tabularx per section.
#let entries(items) = {
  set par(justify: false)
  grid(
    columns: (auto, 1fr, auto),
    column-gutter: 12pt,
    row-gutter: if tight { 4.5pt } else { 8pt },
    align: (left + top, left + top, right + top),
    ..items
      .map(it => (
        tnum(text(size: 10.1pt)[#it.when]),
        entrybody(it),
        tnum(text(size: 10.1pt)[#it.trailing]),
      ))
      .flatten(),
  )
}

// ── publications ──────────────────────────────────────────────────────────
// Numbered, and the count runs through the Submitted / Accepted / Published
// subsections rather than restarting — enumerate[resume] in the LaTeX CV.
#let publication(n, it) = {
  grid(
    columns: (1.6em, 1fr),
    column-gutter: 4pt,
    align: (right + top, left + top),
    tnum(text(size: 10.1pt)[#n.]),
    {
      if it.byline.len() > 0 [#bolded(it.byline). ]
      emph(it.title)
      if it.venue != none [. #it.venue]
      if it.status != none [ #statuspill(it.status)]
      // The article and preprint marks belong with the citation; the code and
      // data marks are secondary, so they go grey at the end.
      let cite = it.links.filter(l => l.icon in ("ads", "arxiv", "paper", "doi"))
      let rest = it.links.filter(l => not (l.icon in ("ads", "arxiv", "paper", "doi")))
      let cited = cite
        .map(l => if l.label == l.rel {
          // The label is the bare rel — "paper", "repo" — which is a word the
          // mark was standing in for, so it serves when the mark is gone.
          link(l.url, solo(l.icon, l.label, size: 0.9em))
        } else {
          link(l.url, marked(l.icon, lnum(l.label), size: 0.9em))
        })
        .join(h(5pt))
      if cite.len() > 0 [ #cited]
      if rest.len() > 0 [ #h(1fr) #trail(rest, tint: faint)]
    },
  )
}

#let publications(section) = {
  let n = 0
  let groups = if section.groups.len() > 0 { section.groups } else {
    ((label: none, ids: section.items.map(i => i.id)),)
  }
  for g in groups {
    let picked = section.items.filter(i => i.id in g.ids)
    for it in picked {
      n += 1
      publication(n, it)
      v(if tight { 3pt } else { 6.6pt })
    }
  }
}

// ── a grid of entries ─────────────────────────────────────────────────────
// Software only. The packages have no dates worth a gutter and no
// published-vs-other split to draw — the papers behind them are already in
// Publications — so they read better as a dense list of names.
#let softgrid(items) = {
  set par(justify: false)
  grid(
    columns: (1fr, 1fr, 1fr),
    column-gutter: 12pt,
    row-gutter: 6pt,
    ..items.map(it => block(breakable: false)[
      #let rest = if it.links.len() > 0 { it.links.slice(1) } else { () }
      #strong(if it.links.len() > 0 {
        link(it.links.at(0).url)[#it.title]
      } else { it.title })
      #if rest.len() > 0 [ #trail(rest, size: 0.92em)]
      #if it.summary != none {
        linebreak()
        text(size: 9.4pt)[#it.summary]
      }
    ]),
  )
  v(2pt)
}

// ── a bare list ───────────────────────────────────────────────────────────
// Refereeing venues, review panels. No dates, so no date column.
#let plainlist(entries) = {
  set text(size: 10.1pt)
  if cv.detail == "summary" {
    entries.map(linked).join([, ])
  } else {
    list(indent: 4pt, ..entries.map(linked))
  }
  v(1pt)
}

// ── body ──────────────────────────────────────────────────────────────────
#for s in cv.sections {
  section(
    s.heading,
    mark: s.at("icon", default: none),
  )
  if "layout" in s and s.layout == "list" {
    plainlist(s.entries)
  } else if "layout" in s and s.layout == "grid" {
    softgrid(s.items)
  } else if "layout" in s and s.layout == "publications" {
    publications(s)
  } else {
    entries(s.items)
  }
}
