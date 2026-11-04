# Quickstart: Card images from the command line

Prerequisites: `npm install`; Playwright's Chromium (`npx playwright install chromium` once).

1. `npm run build:card -- macro-lightning` → writes
   `macro-lightning--size_320_400-figure_center_auto_link-title_short_link-authors_none-text_none-extras_position-buttons_all_fit-look_standard-light.png`
   (640 × 800 px, twice the card's 320 × 400).
2. `npm run build:card -- macro-lightning card.svg` and `… card.pdf` → the SVG and the PDF; open
   each: the title and buttons are links, the PDF's text selectable.
3. Compare with the builder: open `/webdev/card/`, pick macro-lightning, light, SVG, Download; the
   two SVGs are byte-identical.
4. `npm run build:card -- macro-lightning --theme dark` → the `-dark.png`.
5. `npm run build:card -- macro-lightning carousel` → fails: a width is needed;
   `… carousel --width 400` → drawn 400 px wide.
6. `npm run build:card -- no-such-id`, `… x.gif`, `… --theme blue` → each exits non-zero, no file.
7. `npx vitest run tests/cardcli.test.js` passes.
