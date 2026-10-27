# Quickstart: validating Professional Activities

```bash
git switch 001-professional-activities
npm install
```

Before changing data, compile the owner's Hubble selection on `main` and keep the text:

```bash
npm run build:cv -- "<Hubble CV folder>/starkman-cv-hubble.json" <scratch>/before.pdf
pdftotext -layout <scratch>/before.pdf <scratch>/before.txt
```

## 1. Schema and data

```bash
npm run validate
npx vitest run tests/schema.test.js tests/integrity.test.js
```

Expect: pass; no detail line starts with "Role:"; every role passes the FR-036 repetition test.

## 2. Presets and the group

```bash
npx vitest run tests/presets.test.js tests/secorder.test.js
```

Expect: `complete` and `np` resolve the five sub-sections, consecutive, each with
`group.id === 'professional'`; `2page` resolves two; each preset's item ids equal those on `main`;
a sub-section moved by `order` stays inside its group.

## 3. Selections

```bash
npx vitest run tests/selection.test.js
```

Expect: a v1 fixture decodes to the migrated lines, settings and order of
[contracts/selection-v2.md](contracts/selection-v2.md).

## 4. Rendering

```bash
npm test
scripts/build-cv-pdfs.sh
```

Expect: all seven gates; one-page 1 page, two-page 2; the complete PDF shows the layout of
[contracts/cv-layout.md](contracts/cv-layout.md).

## 5. The owner's selection

Compile the Hubble selection again to `<scratch>/after.pdf`; diff its text with `before.txt`.
Expect: headings change as the contract says; every detail line under every item is the same text.
