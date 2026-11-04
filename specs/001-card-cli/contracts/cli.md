# Contract: `npm run build:card`

```
npm run build:card -- <id> [<name | preset key>] [--theme light|dark] [--width N] [out.svg|.png|.pdf]
node scripts/build-card.mjs …   # the same
```

- Positionals: the id; then the output if it ends in `.svg`, `.png` or `.pdf`, else the name. A
  second name, or a second output, is an error.
- Writes one file; prints `<out>  <bytes> bytes` (as `build:cv`).
- Paths are relative to where the command was run.
- Exit 2 on bad arguments (usage printed); exit 1 on a failed draw (unknown id, non-card item,
  unreadable name, filling card with no width, figure not found, Typst failure). No file is left
  on failure.
