// How wide a line of text is in the card's own faces, from the font files
// themselves — what a browser does with them, to a hundredth of a px — so the
// card can be laid out where there is no browser. Node only: it reads
// public/fonts/card/.

import fs from 'node:fs';
import opentype from 'opentype.js';

const FILES = {
  'IBM Plex Sans': { 400: 'IBMPlexSans-Regular', 500: 'IBMPlexSans-Medium', 600: 'IBMPlexSans-SemiBold' },
  'IBM Plex Mono': { 400: 'IBMPlexMono-Regular', 500: 'IBMPlexMono-Medium' },
};
const loaded = new Map();

function face(font, weight) {
  const file = FILES[font]?.[weight];
  if (!file) throw new Error(`no face for ${font} at ${weight}`);
  if (!loaded.has(file)) {
    const b = fs.readFileSync(`public/fonts/card/${file}.otf`);
    loaded.set(file, opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)));
  }
  return loaded.get(file);
}

/** The advance width of s in px: the font's, kerned, and the letter-spacing
 *  a browser adds after every character. */
export function measure(s, { font, weight, size, ls = 0 }) {
  return face(font, weight).getAdvanceWidth(s, size, { kerning: true }) + ls * [...s].length;
}
