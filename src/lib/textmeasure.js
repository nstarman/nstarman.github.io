// How wide a line of text is in the card's own faces, from the font files
// themselves, shaped by HarfBuzz — the shaper Chrome uses, so kerning and
// ligatures are the browser's — so the card can be laid out where there is no
// browser. Node only: it reads public/fonts/card/.

import fs from 'node:fs';
import * as hb from 'harfbuzzjs';

const FILES = {
  'IBM Plex Sans': { 400: 'IBMPlexSans-Regular', 500: 'IBMPlexSans-Medium', 600: 'IBMPlexSans-SemiBold' },
  'IBM Plex Mono': { 400: 'IBMPlexMono-Regular', 500: 'IBMPlexMono-Medium' },
};
const loaded = new Map();
const buf = new hb.Buffer(); // one, cleared for each line: a buffer is freed with the page, not by hand

function face(font, weight) {
  const file = FILES[font]?.[weight];
  if (!file) throw new Error(`no face for ${font} at ${weight}`);
  if (!loaded.has(file)) {
    const b = fs.readFileSync(`public/fonts/card/${file}.otf`);
    const f = new hb.Face(new hb.Blob(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)));
    loaded.set(file, { font: new hb.Font(f), upem: f.upem });
  }
  return loaded.get(file);
}

/** The advance width of s in px: shaped with the font's own kerning and
 *  ligatures, and the letter-spacing a browser adds after every character. */
export function measure(s, { font, weight, size, ls = 0 }) {
  const f = face(font, weight);
  buf.reset();
  buf.addText(s);
  buf.guessSegmentProperties();
  hb.shape(f.font, buf);
  const units = buf.getGlyphPositions().reduce((n, p) => n + p.xAdvance, 0);
  return (units * size) / f.upem + ls * [...s].length;
}
