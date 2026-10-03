// A card, drawn again where the browser laid it out. src/lib/cardpdf.js reads
// the preview and writes card.json: the card's size and corners, and, in
// painting order, every box, figure, icon and line of text at its place in CSS
// px. The layout stays the CSS's; this only puts the same things on a page, as
// vector text with its links.
#let m = json("/card.json")
#let px = 0.75pt

#set document(title: m.title)
#set page(width: m.w * px, height: m.h * px, margin: 0pt, fill: none)
// A line's box is the font's ascender to its descender, as a browser's
// is, so the top the browser measured is the top here. Each line is placed on
// its own and never re-broken.
#set text(top-edge: "ascender", bottom-edge: "descender", hyphenate: false)

// IBM's static Plex files name each weight a family of its own — "IBM Plex
// Sans Medm", "IBM Plex Sans SmBld" — so a weight is asked for by that name,
// falling back to the family itself for a face set at its regular weight.
#let face(f, w) = (f + if w >= 600 { " SmBld" } else if w >= 500 { " Medm" } else { "" }, f)

#let corners(r) = (top-left: r.at(0) * px, top-right: r.at(1) * px, bottom-right: r.at(2) * px, bottom-left: r.at(3) * px)

#let draw(o) = {
  let body = if o.k == "box" {
    rect(
      width: o.w * px, height: o.h * px, radius: corners(o.r),
      fill: if o.fill != none { rgb(o.fill) },
      stroke: if o.stroke != none { o.sw * px + rgb(o.stroke) },
    )
  } else if o.k == "img" {
    box(width: o.w * px, height: o.h * px, radius: corners(o.r), clip: true,
      image(o.src, width: 100%, height: 100%, fit: o.fit))
  } else if o.k == "svg" {
    image(bytes(o.svg), format: "svg", width: o.w * px, height: o.h * px)
  } else {
    text(font: face(o.font, o.weight), weight: o.weight, size: o.size * px, fill: rgb(o.color), tracking: o.ls * px, o.s)
  }
  place(top + left, dx: o.x * px, dy: o.y * px, if o.href != none { link(o.href, body) } else { body })
}

#block(width: 100%, height: 100%, radius: corners(m.r), clip: true, for o in m.ops { draw(o) })
