// Every item in data/, for scripts that run under plain node. The site reads
// the same files through Vite's import.meta.glob in src/lib/data.js, which
// node cannot run.
//
// Paths are relative to the repository root, which is where npm runs scripts.

import fs from 'node:fs';

/** `[{ path, text, item }]` in filename order, which is date order. `text` is
 *  the file as written, for a script that edits it in place. */
export function readItems() {
  return fs.readdirSync('data').filter((f) => f.endsWith('.json')).sort().map((f) => {
    const path = `data/${f}`;
    const text = fs.readFileSync(path, 'utf8');
    return { path, text, item: JSON.parse(text) };
  });
}
