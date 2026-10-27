# Quickstart: validating the count line

```bash
git switch 001-tally-whole-record
npm install
npx vitest run tests/presets.test.js tests/selection.test.js tests/builder-placement.test.js
```

Expect: `tally(…)` leaves in-prep papers out; `{ of: "record" }` gives the record's numbers on a
5-paper list; `decode()` keeps `of: "record"` and drops any other `of`.

```bash
npm test
npm run build && scripts/build-cv-pdfs.sh
pdftotext public/cv/starkman-cv-1page.pdf - | grep papers
pdftotext public/cv/starkman-cv-2page.pdf - | grep papers
```

Expect: the same "19 papers (5 submitted): …" line on both; one page and two pages.

Builder (`npm run dev`, `/webdev/cv/`): Start from 1P — Tally and Whole record ticked, preview
shows 19; untick Whole record — preview shows the ticked count; Compile PDF matches; Save, reload.
