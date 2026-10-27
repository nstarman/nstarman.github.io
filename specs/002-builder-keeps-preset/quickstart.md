# Quickstart: check the builder keeps its preset

Prerequisites: `npm install`, the `typst` binary (0.14.2), a build (`npm run build && bash scripts/build-cv-pdfs.sh`).

1. `npm test` — the selection and model tests ([contract](contracts/selection-preset.md)) pass.
2. Builder (`npm run dev`, `/webdev/cv/`): Start from 1P, Compile → 1 page, laid out as
   `public/cv/starkman-cv-1page.pdf`. Start from 2P → 2 pages, as `starkman-cv-2page.pdf`.
3. Save Selection after Start from 1P; `npm run build:cv -- <file> out.pdf` → 1 page; the file
   carries `"preset": "1page"`.
4. Start from 1P, tick an invited talk, Compile → it prints under Invited Talks.
5. An older file (no `preset`), e.g. the owner's Hubble selection: `npm run build:cv` gives the same
   PDF as before the change (compare page count and text with `pdftotext`).
6. Edit a saved file to `"preset": "nope"`, load it → the report says it lays out as the complete CV.
