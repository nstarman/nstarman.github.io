// The CV's styles — one self-contained unit each.
//
// A style answers three questions and nothing else:
//
//   glyph  how a mark is drawn beside words
//   solo   how a mark standing alone is drawn, given the word behind it
//   trail  how a run of marks — a resource trail — is drawn
//
// Everything else about the CV is the same in every style: the same type, the
// same spacing, the same sections, from the same render model. That is why a
// style is an entry in the dictionary below rather than a second template —
// two templates would be two things to keep in agreement, and the page-count
// contracts hold in either style only because the layout is shared.
//
// Adding one is an entry in STYLES and an <option> in
// src/pages/cv/builder.astro. Nothing in cv.typ changes: it names no font, no
// glyph and no style, and asks `styled()` for whichever one cv.json chose.

#import "theme.typ": accent

// ── the marks ─────────────────────────────────────────────────────────────
// The same fonts the LaTeX CV uses — Font Awesome 5 Free Solid, its Brands
// companion, and Academicons — vendored in public/fonts/. Real glyphs rather
// than traced SVGs: they hint and scale like type, and they take a fill, so one
// definition serves every colour.
#let FA = "Font Awesome 5 Free Solid"
#let FAB = "Font Awesome 5 Brands"
#let AI = "Academicons"

// name -> (family, codepoint), keyed by the names presets.json and REL_ICON use
#let MARKS = (
  // link trails
  ads: (AI, "\u{E9CB}"),
  arxiv: (AI, "\u{E974}"),
  zenodo: (FA, "\u{F1C0}"), // \faIcon{database}, as in the LaTeX header
  paper: (FA, "\u{F15C}"), // file-alt
  repo: (FA, "\u{F6E3}"), // hammer — the reproducible-paper mark
  github: (FAB, "\u{F09B}"),
  code: (FA, "\u{F121}"),
  docs: (FA, "\u{F05A}"), // info-circle
  data: (FA, "\u{F1C0}"), // database
  slides: (FA, "\u{F15C}"),
  link: (FA, "\u{F0C1}"),
  email: (FA, "\u{F0E0}"), // envelope
  globe: (FA, "\u{F0AC}"),
  orcid: (FAB, "\u{F8D2}"),
  // section marks
  education: (FA, "\u{F19C}"), // university
  positions: (FA, "\u{F6FF}"), // network-wired
  publications: (FA, "\u{F15C}"), // file-alt
  awards: (FA, "\u{F559}"), // award
  grants: (FA, "\u{F0D6}"), // money-bill
  talks: (FA, "\u{F51C}"), // chalkboard-teacher
  conferences: (FA, "\u{F0C0}"), // users
  mentoring: (FA, "\u{E068}"), // people-arrows
  teaching: (FA, "\u{F5D1}"), // apple-alt
  service: (FA, "\u{F2B5}"), // handshake
  panels: (FA, "\u{F0E3}"), // gavel
  outreach: (FA, "\u{F234}"), // user-plus
  media: (FA, "\u{F1EA}"), // newspaper
)

#let icon(name, size: 1em, fill: accent) = {
  let (family, glyph) = MARKS.at(name, default: MARKS.link)
  text(font: family, size: size, fill: fill, glyph)
}

// ── the styles ────────────────────────────────────────────────────────────
#let STYLES = (
  // What the pre-built PDFs are, and what the CLI always compiles.
  default: (
    glyph: (name, size: 1em, fill: accent) => icon(name, size: size, fill: fill),
    solo: (name, word, size: 1em, fill: accent) => icon(name, size: size, fill: fill),
    trail: (links, size: 1em, tint: accent) => links
      .map(l => link(l.url, icon(l.icon, size: size, fill: tint)))
      .join(h(3pt)),
  ),

  // The same CV with none of the marks — for anywhere a row of glyphs is
  // unwelcome: a plain-text ATS, a printer that renders symbol fonts badly, or
  // simply a preference. The PDF then embeds no icon font at all.
  //
  // Where a glyph stood beside words the words carry on alone; where one stood
  // *by itself* the word it was standing in for takes its place, or the link
  // would compile to nothing. Smaller than the mark it replaces: a word set at
  // the glyph's optical size out-shouts the entry it belongs to.
  plain: (
    glyph: (name, size: 1em, fill: accent) => none,
    solo: (name, word, size: 1em, fill: accent) => text(size: size, fill: fill, word),
    trail: (links, size: 1em, tint: accent) => links
      .map(l => link(l.url, text(size: size * 0.86, fill: tint, l.label)))
      .join([, ]),
  ),
)

/// The style cv.json names, with the one helper every style shares.
///
/// `marked` is derived rather than restated per style: a mark with words beside
/// it is the same decision as the mark itself, so a style that answers `glyph`
/// has already answered this, and the two cannot drift apart.
#let styled(name) = {
  let s = STYLES.at(name, default: STYLES.default)
  s + (
    marked: (name, body, size: 1em, fill: accent) => {
      let g = (s.glyph)(name, size: size, fill: fill)
      if g == none { body } else { [#g #body] }
    },
  )
}
