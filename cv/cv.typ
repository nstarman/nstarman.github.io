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
//   cv/lib/styles.json what each style is called and which headings it
//                      draws, for the builder; styles.typ checks it
//   cv/lib/gaps.json   the sizes of the gaps the builder can set
//
// So nothing here names a colour, a font or a glyph, and adding a style never
// touches this file.
//
//   typst compile --root . cv/cv.typ out.pdf

#import "lib/theme.typ": orcid, accentsoft, accentline, headerwash, tnum, lnum
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
#let (glyph, solo, trail, marked, headings, look) = styled(cv.at("style", default: "default"))
// The palette and type the style sets; for the default these are theme.typ's.
#let (ink, accent, faint) = (look.ink, look.accent, look.faint)
// A style with no portrait and no date gutter — adrn. The three places where a
// style differs in shape rather than value are the header, the entries, and the
// page's own running head, and each reads this.
#let flat = look.adrn
// The heading every section takes in a CV of several: the style's first.
#let usual = headings.keys().first()

// The gaps the builder can set, in points, at normal and at one-page density.
// One file, lib/gaps.json, so the builder converts between a multiple and
// points from the same figures this prints with.
#let GAPS = json("lib/gaps.json")

// How far apart a section's entries sit, keyed by section id — and the gap
// under its heading, keyed `<id>.heading`, and under the publications'
// student legend, keyed `publications.legend`. Each is `(value, unit)`: a
// multiple of the gap's own size (`x`) or a length in points (`pt`). Only the
// browser builder sets it, as with `style`, so the CLI PDFs and their page
// counts are untouched.
#let spacing = cv.at("spacing", default: (:))

/// The gap `key` asks for, of the kind named `name` in lib/gaps.json.
#let gap(key, name) = {
  let base = GAPS.at(name).at(if tight { "tight" } else { "normal" }) * 1pt
  let s = spacing.at(key, default: none)
  // A preset's own spacing — the long CVs set their publications 1.5× apart —
  // arrives here as the builder's does, so the two cannot disagree.
  if s == none { base } else if s.unit == "pt" { s.value * 1pt } else { s.value * base }
}

// How each section's heading prints, keyed by section id: `none`, hidden, or
// one of the style's heading variants. Builder-only too; a section absent —
// or naming a variant this style does not draw — takes the style's usual one.
#let headingof = cv.at("heading", default: (:))

// Where a part of a section sits, keyed `<id>.<part>`: so far only the
// publications' student legend, `below` its heading at the left (the
// default), below it at the `right`, or on the heading's own line, `title`.
// Builder-only too.
#let placeof = cv.at("place", default: (:))

// What the header card shows, part by part — the portrait, the address, the
// email, the website, each profile link by its service, the QR. Each is on
// unless a preset or the builder turns it off, and the card closes up around
// the gap.
#let card = cv.at("card", default: (:))
#let shows(part) = card.at(part, default: true) != false
// The email, the website or a profile link, set to "icon", prints its mark
// alone, and set to "text" its label alone.
#let mark(part, icon, label, fill: accent) = {
  let only = card.at(part, default: true)
  if only == "icon" { glyph(icon, size: 0.9em, fill: fill) }
  else if only == "text" { label }
  else { marked(icon, label, size: 0.9em, fill: fill) }
}
#let portrait = shows("portrait")
#let qr = shows("qr")
// The page format, a choice apart from the style and the length: none is the
// style's default paper; "a4" is A4 whatever the style. The builder sets it in the
// model, and a build can pass `--input page=…`.
#let paper = sys.inputs.at("page", default: cv.at("format", default: none))

#set document(title: p.name + " — " + cv.label, author: p.name)
// geometry scale=0.9 on A4, hmarginratio 1:1, vmarginratio 2:3
#set page(
  paper: if paper == "a4" { "a4" } else if flat { "us-letter" } else { "a4" },
  margin: if flat { (x: 1in, top: 0.85in, bottom: 1in) }
          else if tight { (x: 1.05cm, top: 0.95cm, bottom: 1.4cm) }
          else { (x: 1.05cm, top: 1.19cm, bottom: 1.78cm) },
  // fancyhdr in the reference: name, title and page number in grey, from the
  // second page on.
  footer: if flat { align(center, text(fill: faint, size: 10.5pt)[Last updated: #datetime.today().display("[year]-[month]-[day]")]) },
  header: if flat { context if counter(page).get().first() > 1 {
    set text(fill: faint, size: 10.5pt)
    grid(columns: (1fr, auto, 1fr), p.name, [Curriculum Vitae], align(right)[#counter(page).display()])
  } },
)
// New Computer Modern is Typst's own, so CI and the browser both have it — and
// it is Latin Modern's successor, the face the LaTeX CV was already set in.
#set text(
  font: look.font,
  size: look.size,
  fill: ink,
  lang: "en",
  // A CV is mostly numbers set inside sentences — years, volumes, pages. Lining
  // figures are cap-height, so each one reads as a small block of capitals
  // interrupting the line. Old-style figures carry ascenders and descenders and
  // sit in the text the way lowercase does. Columns of digits want the opposite
  // treatment and get it back individually below; #tnum is the helper.
  number-type: look.numbers,
)
#show strong: set text(weight: look.strong)

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

// What the card links to, by key: the email, the website and each profile by
// its service. ORCID keeps its own green, as it does in the LaTeX CV, and
// spells the identifier out rather than saying "ORCID".
#let services = p.profiles.map(pr => lower(pr.at("service", default: pr.label)))
#let linked = (
  email: link("mailto:" + p.email, mark("email", "email", p.email)),
  website: link(p.websiteUrl, mark("website", "globe", p.website)),
  ..p.profiles.map(pr => {
    let service = lower(pr.at("service", default: pr.label))
    let label = if service == "orcid" { p.orcid } else { pr.label }
    let fill = if service == "orcid" { orcid } else { accent }
    (service, link(pr.url, mark(service, service, label, fill: fill)))
  }).to-dict(),
)
#let profiles = services.filter(shows).map(k => linked.at(k)).join(h(3pt))

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
// The links print in `order`, a "/" breaking the line. By default the email
// and the website share one and the profiles the next.
#let order = card.at("order", default: ("email", "website", "/", ..services))
#let segments = order.fold(((),), (acc, k) => if k == "/" { acc + ((),) }
  else { acc.slice(0, -1) + (acc.last() + (k,),) })
// A line of profiles alone is set a size smaller, and closer, as it always was.
#let linkline(keys) = {
  if keys.all(k => k in services) { text(size: 8.2pt, keys.map(k => linked.at(k)).join(h(3pt))) }
  else { text(size: 8.9pt, keys.map(k => linked.at(k)).join[ #h(5pt) ]) }
}
#let contactlines = (
  ..if shows("address") { p.addressLines.map(l => text(size: 8.9pt, l)) },
  ..segments.map(seg => seg.filter(k => k in linked and shows(k))).filter(seg => seg.len() > 0).map(linkline),
)
// Four lines, as the card has by default, spread over the name column's height
// and line up with its edges. Any other number stacks at an even gap, centred:
// spread, fewer lines drifted apart and pulled the address's two lines from
// each other, and more could not fit.
#let fixed = contactlines.len() == 4

// Both columns hold four lines but at different sizes, so stacking them left
// the contact block 8pt shorter than the name block and, being centred in the
// same row, inset at the top and the bottom both. Measuring the name column and
// distributing the contact lines over exactly that height makes the two agree
// at both edges, and keeps agreeing if a title or an address line is added.
// adrn: a 20pt name, a grey dash and "Curriculum Vitae" in the section colour,
// then the titles and the contact line indented a list's 2em beneath. No
// portrait, no QR and no wash.
#let adrnheader = {
  set par(justify: false, leading: 0.65em)
  text(size: 20pt)[#p.name #h(0.3em) #text(fill: rgb("#cccccc"))[—] #h(0.3em) #text(fill: accent, weight: 300)[Curriculum Vitae]]
  v(0.8em)
  pad(left: 2em, {
    p.titles.map(strong).join(linebreak())
    linebreak()
    p.affiliationShort
    v(0.2em)
    if shows("email") { link("mailto:" + p.email)[#marked("email", p.email)]; h(1.2em) }
    if shows("website") { link(p.websiteUrl)[#marked("globe", p.website)] }
    linebreak()
    profiles
  })
}

#if flat { adrnheader } else { context {
  let h = measure(namecol).height
  // `outset`, not `inset`: the wash is drawn around the grid without taking
  // any space, so the header's geometry — and the page counts that depend on
  // it — are exactly as they were. Tighter vertically than horizontally: the
  // portrait and the QR already sit at the block's full height, so the same
  // gap top and bottom as at the sides reads as a margin rather than a hug.
  block(fill: headerwash, radius: 8pt, outset: (x: 9pt, y: 5pt), grid(
    // Without the portrait its column goes too, and the name opens the card.
    columns: (..if portrait { (hdr,) }, auto, 1fr, ..if qr { (hdr,) }),
    column-gutter: 11pt,
    align: (..if portrait { (left + horizon,) }, left + horizon, right + horizon, ..if qr { (right + horizon,) }),

    // Circular, as on the website. `clip` with a 50% radius does the crop, and
    // `cover` keeps the face centred instead of squashing the photo.
    ..if portrait { (box(clip: true, radius: 50%, width: hdr, height: hdr,
        image("assets/portrait.jpg", width: hdr, height: hdr, fit: "cover")),) },

    namecol,

    block(height: if fixed { h } else { auto }, {
      set par(justify: false, leading: 0.38em)
      set text(number-type: "lining")
      contactlines.join(if fixed { v(1fr) } else { v(2pt) })
    }),

    ..if qr { (link(p.websiteUrl, image("assets/qr.svg", width: hdr)),) },
  ))
} }
// The header is a block of its own, so it needs more clearance than two
// sections need from each other.
#v(if tight { 3pt } else { 6pt })

// ── headings ──────────────────────────────────────────────────────────────
// \titleformat{\section}{\Large\scshape\raggedright}{}{0em}{}[\titlerule]
// \titlespacing{\section}{0pt}{10pt}{10pt}, \titlerule default 0.4pt.
// `aside` is set at the right of the heading's line — the student legend,
// where it is placed there — on the title's baseline.
#let section(title, mark: none, variant: usual, below: gap("", "heading"), aside: none) = {
  // Above is the gap between two sections, below only between a heading and
  // its own first entry, so they should not be equal: 9.2pt each way left a
  // heading sitting almost on the entry above it.
  v(if flat { 26pt } else if tight { 8pt } else { 15pt })
  // `none` twice over: no mark named for this section, or a style that draws
  // none. Both mean the heading is the words alone.
  let g = if mark == none or flat { none } else { glyph(mark, size: 0.95em, fill: ink) }
  block(breakable: false, sticky: true)[
    #set par(justify: false, spacing: 0pt)
    #let words = text(size: look.headsize, weight: look.headweight, fill: look.headcolour)[
      #if g != none [#g #h(2pt)]
      #if look.smallcaps { smallcaps(title) } else { title }
    ]
    #(headings.at(variant))(if aside == none { words } else { words + h(1fr) + aside })
  ]
  // The reference leaves a full line under a heading's rule.
  v(if flat { below + 8pt } else { below })
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

// A student of mine, by level — the same colours and marks as the website.
#let stucolour = (undergraduate: rgb("#1E7F5C"), graduate: rgb("#8A4FB0"))
#let stumark = (undergraduate: "†", graduate: "‡")
#let bolded(sp) = sp.map(s => if s.b { strong(s.t) } else if s.at("student", default: none) != none {
  text(fill: stucolour.at(s.student))[#s.t#super(stumark.at(s.student))]
} else { s.t }).join()
#let linked(sp) = sp.map(s => if "url" in s and not s.url.starts-with("#") {
  link(s.url)[#s.t]
} else { s.t }).join()

// ── one entry ─────────────────────────────────────────────────────────────
// Title and subject share a line — "**Institution**, Role" — which is what
// keeps an entry to two lines rather than three.
#let entrybody(it, tail: none) = {
  strong(it.title)
  if it.subject.len() > 0 [, #bolded(it.subject)]
  if it.status != none [ #text(size: 9pt, style: "italic", fill: faint)[(#it.status)]]
  if it.links.len() > 0 [ #trail(it.links)]
  // Styles with no right-hand column hand the location in here, so it ends the
  // entry's own line instead of trailing the last detail line.
  if tail != none { tail }
  if it.recipient != none {
    if it.recipientInline { [, ] } else { linebreak() }
    text(size: look.sub)[#emph[to #it.recipient]]
  }
  for l in it.lines {
    linebreak()
    text(size: look.sub)[#linked(l)]
  }
}

// One grid for the whole section, so the date column finds a single width and
// every entry lines up — the LaTeX CV gets this from one tabularx per section.
#let entriesflat(items, gutter) = {
  for it in items {
    // The date opens the line, the location ends it, and the whole sits in a
    // list at \leftmargin=2em with \parskip a baseline apart.
    block(inset: (left: 2em), below: gutter - 1pt, {
      if it.when != none and str(it.when).len() > 0 [#it.when.replace(regex(" ?– ?"), "–"), ]
      entrybody(it, tail: if it.trailing != none and str(it.trailing).len() > 0 {
        text(fill: faint)[ — #it.trailing]
      })
    })
  }
}

#let entries(items, gutter) = if flat { entriesflat(items, gutter) } else {
  set par(justify: false)
  grid(
    columns: (auto, 1fr, auto),
    column-gutter: 12pt,
    row-gutter: gutter,
    align: (left + top, left + top, right + top),
    ..items
      .map(it => (
        tnum(text(size: look.sub)[#it.when]),
        entrybody(it),
        tnum(text(size: look.sub)[#it.trailing]),
      ))
      .flatten(),
  )
}

// ── publications ──────────────────────────────────────────────────────────
// Numbered, and the count runs through the Submitted / Accepted / Published
// subsections rather than restarting — enumerate[resume] in the LaTeX CV. It
// counts down: the list runs newest first, so the first paper is 1 and the
// newest the highest, and a new paper never renumbers the ones before it.
// The number column is as wide as the widest number, so that one starts at the
// margin as the dates do in every other section, and the rest align on the dot.
#let publication(n, it, numwidth) = {
  grid(
    // adrn: the number is a small grey figure in the 2em the list indents by.
    columns: (if flat { 2em } else { numwidth }, 1fr),
    column-gutter: if flat { 0.5em } else { 7pt },
    align: (right + top, left + top),
    if flat { text(size: 8.5pt, fill: faint)[#n] } else { tnum(text(size: look.sub)[#n.]) },
    {
      if it.byline.len() > 0 [#bolded(it.byline). ]
      // adrn sets the title as the link to the paper, in the link colour.
      let linkable = it.links.filter(l => l.icon in ("ads", "arxiv", "paper", "doi"))
      if flat and linkable.len() > 0 { link(linkable.first().url, emph(it.title)) } else { emph(it.title) }
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

// The key to those colours and marks, for a section with a student of mine
// in a byline.
#let hasstudents(section) = section.items.any(i => i.byline.any(s => s.at("student", default: none) != none))
#let studentkey = text(size: 9pt, fill: faint)[Students I supervised or advised:
  #text(fill: stucolour.undergraduate)[undergraduate#super(stumark.undergraduate)],
  #text(fill: stucolour.graduate)[graduate#super(stumark.graduate)].]

// The list's headline numbers, where the preset or the builder asks for them —
// the line a reader takes in before the list itself — and the h-index with its
// source, where one is asked for.
#let tallyline(t) = block(sticky: true, below: gap("publications.legend", "legend"), text(size: look.sub)[
  #strong[#t.total papers]#if t.submitted > 0 [ (#t.submitted submitted)]: #t.first first-author#if t.student > 0 [, #t.student led by students I supervised].#if t.at("h", default: none) != none [ h-index #t.h.value (#t.h.source).]
])

// `legend` is the key's alignment on its own line, or `none` where it has
// gone up onto the heading's.
#let publications(section, legend: left) = {
  if section.at("tally", default: none) != none { tallyline(section.tally) }
  if legend != none and hasstudents(section) {
    // Sticky, so a wider gap below it can never strand it at a page foot;
    // full width, or an auto block shrinks to the key and it cannot go right.
    block(sticky: true, width: 100%, {
      align(legend, studentkey)
      v(gap(section.id + ".legend", "legend"))
    })
  }
  let groups = if section.groups.len() > 0 { section.groups } else {
    ((label: none, ids: section.items.map(i => i.id)),)
  }
  let total = groups.map(g => section.items.filter(i => i.id in g.ids).len()).sum(default: 0)
  context {
    let numwidth = measure(tnum(text(size: look.sub)[#total.])).width
    let n = total + 1
    for g in groups {
      let picked = section.items.filter(i => i.id in g.ids)
      for it in picked {
        n -= 1
        publication(n, it, numwidth)
        v(gap(section.id, "publications"))
      }
    }
  }
}

// ── a grid of entries ─────────────────────────────────────────────────────
// Software only. The packages have no dates worth a gutter and no
// published-vs-other split to draw — the papers behind them are already in
// Publications — so they read better as a dense list of names.
#let softgrid(items, gutter, columns) = {
  set par(justify: false)
  grid(
    columns: (1fr,) * columns,
    column-gutter: 12pt,
    row-gutter: gutter,
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
#let plainlist(entries, gutter) = {
  set text(size: look.sub)
  if cv.detail == "summary" {
    entries.map(linked).join([, ])
  } else {
    // A tight list's own spacing is the leading — 0.5em, or 0.42em on one
    // page, at this 10.1pt — which is what lib/gaps.json gives as its size.
    list(indent: 4pt, spacing: gutter, ..entries.map(linked))
  }
  v(1pt)
}

// ── body ──────────────────────────────────────────────────────────────────
// Empty sections are already dropped by the resolver.
#for s in cv.sections {
  let choice = headingof.at(s.id, default: usual)
  // The legend goes up only onto a heading that is there.
  let keyplace = placeof.at(s.id + ".legend", default: "below")
  let keyup = (s.at("layout", default: none) == "publications" and choice != "none"
    and keyplace == "title" and hasstudents(s))
  if choice != "none" {
    section(
      s.heading,
      mark: s.at("icon", default: none),
      variant: if choice in headings { choice } else { usual },
      below: gap(s.id + ".heading", "heading"),
      aside: if keyup { studentkey } else { none },
    )
  } else {
    v(if tight { 8pt } else { 15pt })
  }
  if "layout" in s and s.layout == "list" {
    plainlist(s.entries, gap(s.id, "list"))
  } else if "layout" in s and s.layout == "grid" {
    softgrid(s.items, gap(s.id, "grid"), s.at("columns", default: 3))
  } else if "layout" in s and s.layout == "publications" {
    publications(s, legend: if keyup { none } else if keyplace == "right" { right } else { left })
  } else {
    entries(s.items, gap(s.id, "entries"))
  }
}
