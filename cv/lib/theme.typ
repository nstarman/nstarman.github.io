// The CV's palette and figures.
//
// Everything else in cv/ reads these: the template, and every style in
// styles.typ. Split out so a colour is stated once and the styles have
// somewhere to import it from rather than each carrying its own navy.
//
// The values come from starkman_long_cv.tex — one navy for every link, ORCID's
// own green, and a grey for what qualifies rather than says.

#let ink = rgb("#111111")
#let accent = rgb("#003399") // linkcolour: rgb(0, 0.2, 0.6)
#let faint = rgb("#808080") // \grayhref: gray 0.5
#let orcid = rgb("#A6CE39") // orcidlogocol
// The publication status pill, same two tints the website uses.
#let accentsoft = rgb("#EAF0F9")
#let accentline = rgb("#7FA6D9")
// The header sits on this. Barely there by intent — enough to read as one
// block rather than four columns that happen to be adjacent, not enough to
// look like a filled panel, and light enough to survive an office printer
// without banding.
#let headerwash = luma(250)

// ── figures ───────────────────────────────────────────────────────────────
// The document is set in old-style figures (see cv.typ). These are the two
// places that want something else back.

// Lining and tabular: equal-width, cap-height digits, for the places where
// figures form a column and have to align down the page rather than read as
// part of a sentence.
#let tnum(body) = text(number-type: "lining", number-width: "tabular", body)

// Lining but proportional, for identifiers rather than columns. An ORCID iD, an
// arXiv number or a postcode is transcribed digit by digit rather than read as
// a quantity, and old-style figures — which vary in height by design — make
// that harder for no gain.
#let lnum(body) = text(number-type: "lining", body)
