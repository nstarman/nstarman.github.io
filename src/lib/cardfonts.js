// The faces a card is drawn in, as the layout engine takes them: the files in public/fonts/card/,
// which are the ones card-faces.css names and the Card Builder's PNG and PDF carry. The engine is
// given them directly, so no @font-face is fetched (specs/001-takumi-card-renderer, research D4).
import fs from 'node:fs';
import path from 'node:path';
import { faceOf } from './cardsvg.js';

const DIR = 'public/fonts/card';

let loaded;

/**
 * Every face, as `{ name, data, weight, style }` for takumi-paint's `fonts`. Read once. Relative to
 * the working directory, which is the repository root for the build, the tests and the scripts: a
 * path from import.meta.url would point into dist/ once the build has bundled this.
 * @returns {{ name: string, data: Uint8Array, weight: number, style: string }[]}
 */
export function engineFonts() {
  loaded ??= fs.readdirSync(path.resolve(DIR)).filter((f) => /\.(otf|ttf)$/.test(f)).sort().map((file) => {
    const { family, weight, style } = faceOf(file); // throws "no face for <file>" for one it cannot read
    return { name: family, data: new Uint8Array(fs.readFileSync(path.resolve(DIR, file))), weight, style };
  });
  return loaded;
}
