# Quickstart

1. `npm run validate` — every publication has `refereed`.
2. `npx vitest run tests/cvmodel.test.js tests/selection.test.js`.
3. Take a saved selection, add `"refereed": { "publications": "split" }`, run `node scripts/build-cv.mjs sel.json out.pdf`; the Publications section shows "Refereed Journal Articles", "Refereed Proceedings", "Other".
4. Same selection without the key: `--model` output identical to `main`'s.
