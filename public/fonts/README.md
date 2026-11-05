# Fonts

Vendored, not installed. `scripts/build-cv-pdfs.sh` compiles with
`--font-path public/fonts --ignore-system-fonts`, so the CV PDFs use these files
and nothing else — the same output on any machine, including a CI runner with no
fonts of its own. The in-browser CV builder loads the same files over HTTP from
`/fonts/`, which is why they live under `public/`.

The script refuses to build if one is missing, and checks afterwards that the
built PDF carries no other face.

| file | used for | licence |
|---|---|---|
| `NewCM10-{Regular,Bold,Italic,BoldItalic}.otf` | body text | GUST Font License (OFL-style) |
| `FontAwesome5Free-Solid-900.otf` | section marks, link marks | icons CC BY 4.0, font SIL OFL 1.1 |
| `FontAwesome5Brands-Regular-400.otf` | GitHub, ORCID | as above |
| `academicons.otf` | ADS, arXiv | SIL OFL 1.1 |
| `card/IBMPlex{Sans,Mono}-{Regular,Medium,SemiBold}{,Italic}.otf` | a card, laid out and exported by the Card Builder | SIL OFL 1.1, `card/LICENSE.txt` |
| `card/Newsreader-{Regular,Medium,SemiBold}{,Italic}.ttf` | the same, for a part set in the serif | SIL OFL 1.1, `card/LICENSE-Newsreader.txt` |
| `Lato-{Lig,LigIta,Reg,Bol}.ttf` | the `adrn` CV style | SIL OFL 1.1 |

Lato is there for the `adrn` style, which mimics [adrn/cv][adrn] — these are
the same four faces that CV vendors, taken from it, so the style is set in the
type it is copying rather than in a lookalike. It leans on the Light/Regular
distinction rather than on a bold, hence four files for what looks like two.

[adrn]: https://github.com/adrn/cv

New Computer Modern is Latin Modern's successor, the face the LaTeX CV this
replaces was set in. Font Awesome 5 and Academicons are the same two icon
packages that CV loaded, so the marks are the drawings it used rather than
lookalikes.

The card faces are the files a card is both laid out and drawn in: the embed
page `/embed/<id>/` loads them (`src/styles/card-faces.css`), so the Card
Builder measures a card in the same files its SVG, PNG and PDF are set in.
Plex is IBM's static OpenType, unaltered, from the
[IBM/plex](https://github.com/IBM/plex) releases `@ibm/plex-sans@1.1.0` and
`@ibm/plex-mono@2.5.0`. Newsreader, the site's serif, is cut from Google Fonts'
variable files (`ofl/newsreader` in [google/fonts](https://github.com/google/fonts),
version 1.003) into static instances, so the browser and Typst draw one and the same
cut whatever each does with a variable font's axes (Chrome sets the optical
size from the font size). `scripts/card-serif.py` makes them, the same bytes on each run:
optical size 16, weights 400, 500 and 600, upright and italic, each weight
named a family of its own as IBM's files are ("Newsreader Medm"), which is how
`src/lib/card.typ` asks for a weight. A fixed optical size means a card's serif
is the 16 px cut at every size, where the site's pages, from Google, vary it.

They sit in `card/` so the CV builder, which loads every face at the top of
this folder, does not fetch them too. Only what a card can ask for is here:
400, 500 and 600, upright and italic, in each family.
