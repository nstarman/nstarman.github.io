// A card's SVG as a PNG, with no browser: resvg reads the faces from their files, not from the SVG's
// own @font-face (which it ignores), and draws at twice the card's size as the Card Builder's PNG does.
import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { facesOf } from './cardsvg.js';

const DIR = path.resolve('public/fonts/card');

/** @param {string} svg  from modelToSvg  @param {object} model  the card model it was written from */
export function pngFromSvg(svg, model, { scale = 2 } = {}) {
  const files = fs.readdirSync(DIR).filter((f) => /\.(otf|ttf)$/.test(f)).sort();
  const fontFiles = facesOf(model, files).map((f) => path.join(DIR, f));
  if (!fontFiles.length && model.ops.some((o) => o.k === 'text')) throw new Error(`no font file in ${DIR} for the faces this card names`);
  return new Resvg(svg, { fitTo: { mode: 'zoom', value: scale }, font: { fontFiles, loadSystemFonts: false, defaultFontFamily: 'IBM Plex Sans' } }).render().asPng();
}
