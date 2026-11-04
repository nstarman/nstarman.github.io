# Research: Card images from the command line

## Decision 1: draw in a headless browser with the builder's own code

- **Decision**: (b) — Playwright's Chromium on the dev server's `/embed/<id>/`, calling
  `downloadCard` from `src/lib/cardbuilder/download.js` with an iframe preview, and saving the
  browser's download.
- **Rationale**: the builder's download *is* the contract (FR-001: "the same image the builder
  downloads"). Running the same function on the same CSS is identical by construction; there is
  nothing to keep in step. A spike drew macro-lightning's default card as SVG, PNG and PDF in ~8 s,
  file names exactly `cardexport.js`'s.
- **Alternatives considered**:
  - (a) Extend `src/lib/cardlayout.js` to publication presets (figure, authors, venue, buttons),
    with recorded fixtures. Plain node, no browser — but a further hand-written copy of the card
    CSS for far more axes than the two software presets, every one of which needs browser recordings
    and property tests to stay honest (Article VII). The software-card path exists because the
    README images are built in CI at every build; a slide card is drawn on demand, so a browser is
    acceptable.
  - Driving `/webdev/card/`'s form with clicks: same output, but brittle against every UI change.
  - A built `dist/` served statically: needs a full `npm run build` first (minutes), and `dist/`
    holds no importable `cardpdf.js`/`download.js` modules.

## Decision 2: start the dev server in-process

- **Decision**: `import { dev } from 'astro'` on a free port, bound to 127.0.0.1, stopped when done.
  Run `scripts/gzip-compiler.mjs` first when `src/generated/typst_ts_web_compiler_bg.wasm.gz` is
  missing (the PDF's compiler, otherwise made by `predev`).
- **Rationale**: one command, no server for the owner to start; ~1 s to come up.
- **Alternatives**: require `npx astro dev` running (as `record-card-layouts.mjs` does) — an extra
  step for the person who just wants a slide image.

## Decision 3: resolve the name in the page

- **Decision**: id → item, preset key → slug, default → `defaultSlug`, then
  `formatName(parseName(…))` — all in the page, from the modules the builder uses.
- **Rationale**: the store (`src/lib/data.js`) needs Vite's `import.meta.glob`; the page already has
  it. Writing the name in full gives the builder's own file name.
- A name that fills its width with no `--width` fails; with it, the iframe is that wide, as the
  builder's stage would be.

## Decision 4: viewport

- **Decision**: 1280 × 800, where the root font size is 16 px (as `record-card-layouts.mjs`).
