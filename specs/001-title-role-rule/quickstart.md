# Quickstart: validating the feature

## Before you start

```bash
git switch 001-title-role-rule
npm install
```

Freeze every preset's sections from `main` first (the before/after fixture in
data-model.md, "Validation rules") — it must be taken before any data changes.

## 1. The schema holds the rule

```bash
npm run validate
npm run test:schema
```

Expect: every data file validates; `position-with-tier.json` and
`fellowship-without-tier.json` are rejected.

## 2. No role repeats its title

```bash
npx vitest run tests/integrity.test.js
```

Expect: pass. Temporarily set `"role": "Prize Fellow"` on Brinson and rerun — it fails naming
`brinson-prize-fellowship`.

## 3. Every preset lists the same items

```bash
npx vitest run tests/presets.test.js
```

Expect: Grants & Fellowships and Professional Appointments match the frozen fixture for `np`,
`2page`, `1page` and `complete`.

## 4. Rows read once

```bash
npx vitest run tests/cvmodel.test.js
```

Expect: the examples in [contracts/cv-row.md](contracts/cv-row.md) render as written.

## 5. Everything CI runs

```bash
npm test
```

Then compile the CVs and check the one-page CV is one page and the two-page is two
(`scripts/build-cv-pdfs.sh`, as CI does). Compile a saved selection
(`npm run build:cv -- <selection.json> out.pdf`) and check its ticked detail lines are the same
lines as before.
