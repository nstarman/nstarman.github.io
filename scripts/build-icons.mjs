// Extracts the portrait for the CV template.
//
// The website keeps it in src/lib/portrait.js as a data URI; Typst needs a
// file. Generated from that one source so the two cannot drift.
//
// The CV's icons used to be generated here too, traced out of the website's
// sprite. They are real glyphs now — Font Awesome 5 and Academicons, the fonts
// the LaTeX CV used — so there is nothing left to trace.
//
//   node scripts/build-icons.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = path.join(ROOT, 'cv/assets');
const PORTRAIT = path.join(ROOT, 'src/lib/portrait.js');

fs.mkdirSync(ASSETS, { recursive: true });
const b64 = /base64,([A-Za-z0-9+/=]+)"/.exec(fs.readFileSync(PORTRAIT, 'utf8'));
if (!b64) throw new Error('No base64 portrait in src/lib/portrait.js');
fs.writeFileSync(path.join(ASSETS, 'portrait.jpg'), Buffer.from(b64[1], 'base64'));
console.log('  portrait.jpg from src/lib/portrait.js');
