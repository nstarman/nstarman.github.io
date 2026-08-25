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

New Computer Modern is Latin Modern's successor, the face the LaTeX CV this
replaces was set in. Font Awesome 5 and Academicons are the same two icon
packages that CV loaded, so the marks are the drawings it used rather than
lookalikes.
