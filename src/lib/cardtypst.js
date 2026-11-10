// A card model as a PDF, with the `typst` binary and src/lib/card.typ, as scripts/build-cv.mjs makes the CV.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

/** @param {object} model  the card model  @param {Record<string, Uint8Array>} figures  each figure's `src` in the model → its bytes */
export function pdfFromModel(model, figures = {}, { typst = process.env.TYPST ?? 'typst' } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'card-'));
  try {
    fs.copyFileSync(path.resolve('src/lib/card.typ'), path.join(dir, 'card.typ'));
    fs.writeFileSync(path.join(dir, 'card.json'), JSON.stringify(model));
    for (const [src, bytes] of Object.entries(figures)) fs.writeFileSync(path.join(dir, src.replace(/^\//, '')), bytes);
    const r = spawnSync(typst, ['compile', '--root', dir, '--font-path', path.resolve('public/fonts/card'), '--ignore-system-fonts', 'card.typ', 'out.pdf'], { cwd: dir, encoding: 'utf8' });
    if (r.error) throw new Error(`could not run ${typst}: ${r.error.message} (set TYPST=/path/to/typst)`);
    if (r.status !== 0 || /unknown font family/.test(r.stderr)) throw new Error(`typst failed: ${r.stderr.trim()}`);
    return fs.readFileSync(path.join(dir, 'out.pdf'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
