// A card drawn with no browser: its markup (cardmarkup.js), the card's own stylesheet and faces
// (cardcss.js, cardfonts.js), laid out by the Takumi engine (cardengine.js), and the model written
// from the paint tree (cardtree.js), which src/lib/cardsvg.js and src/lib/card.typ draw as they
// draw one measured in a browser (specs/001-takumi-card-renderer, data-model.md, *Offline card*).
import fs from 'node:fs';
import sharp from 'sharp';
import path from 'node:path';
import { SITE_PRESETS, atWidth, parseName } from '@nstarkman/card-builder/cards.js';
import { renderMarkup, sprite } from './cardmarkup.js';
import { engineCss } from './cardcss.js';
import { engineFonts } from './cardfonts.js';
import { withLayout } from './cardengine.js';
import { modelFromTree, cardCorners } from './cardtree.js';
import { modelToSvg } from './cardsvg.js';
import { pngFromSvg } from './cardraster.js';
import { pdfFromModel } from './cardtypst.js';

/** Where a link to a page of this site is written against: not a preview, nor this machine. */
export const SITE = 'https://nstarkman.space';

/**
 * The presets drawn offline, those `npm run check:cards` finds within half a pixel of the browser for every
 * item type and both themes it tries (research E17). `home` is left out: its title sits 2.4 px higher than the
 * browser has it, and the cause is not found yet.
 */
export const OFFLINE_PRESETS = SITE_PRESETS.map((p) => p.key).filter((k) => k !== 'home');
const NOT_OFFLINE = { home: 'its title is 2.4 px higher than in the browser' };

/** A name as the pipeline reads it: a card name, or the key of a preset in SITE_PRESETS. */
export function resolveName(name) {
  return SITE_PRESETS.find((p) => p.key === name)?.slug ?? name;
}

/**
 * The name at the width it will be drawn at: a card of set width keeps its own, and one that fills
 * its width needs one given.
 */
function nameAt(name, width) {
  let spec;
  try {
    spec = parseName(resolveName(name));
  } catch (err) {
    throw new Error(`cannot read the card name "${name}": ${err.message}`);
  }
  if (spec.authorsFit) throw new Error(`cannot draw the card "${name}": authors:…:fit shows as many names as fit, which is not laid out offline yet`);
  if (spec.width !== 'fill') return resolveName(name);
  if (width == null) throw new Error(`the card "${name}" fills its width: give one`);
  return atWidth(resolveName(name), width);
}

/** The card as tall as `px` at least, its foot at the bottom as in the site's grid, where a row has taller ones. */
function withMinHeight(html, px) {
  return html.replace(/<article\b[^>]*\bclass="card[^"]*"[^>]*>/, (tag) => (/\sstyle="/.test(tag)
    ? tag.replace(/\sstyle="/, ` style="min-height:${px}px;`)
    : tag.replace(/>$/, ` style="min-height:${px}px">`)));
}

/**
 * @param {{ item: object, name: string, theme?: 'light' | 'dark', width?: number, minHeight?: number }} card
 *   `name`: a card name or a SITE_PRESETS key; `width`: for a name that fills its width;
 *   `minHeight`: the height of the tallest card in the row this one is in, in CSS px
 * @returns {Promise<{ model: object, images: [string, string][] }>}  the card model, and each figure's path in it with where it is read from
 */
export async function modelFor({ item, name, theme = 'light', width, minHeight = 0 }) {
  const slug = nameAt(name, width);
  const { html, links, icons } = await renderMarkup(item, slug, { theme });
  const input = { html: minHeight > 0 ? withMinHeight(html, minHeight) : html, css: engineCss(theme), fonts: engineFonts() };
  const symbols = await sprite();
  const read = (radii) => (tree) => modelFromTree(tree, { title: item.title, site: SITE, links, icons, symbols, radii });
  const done = ({ model, images }) => ({ model, images });
  const drawn = await withLayout(input, read());
  if (!drawn.bare) return done(drawn);
  // A card with no background (a row of a list) has corners in its CSS and none in the tree: they are read from the
  // same card laid out with a background, which moves nothing.
  const radii = await withLayout({ ...input, html: input.html.replace(/<article\b[^>]*>/, (tag) => (/\sstyle="/.test(tag) ? tag.replace(/\sstyle="/, ' style="background:#000;') : tag.replace(/>$/, ' style="background:#000">'))) }, cardCorners);
  return done(await withLayout(input, read(radii)));
}

const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', svg: 'image/svg+xml', gif: 'image/gif', avif: 'image/avif' };

/** Each figure's bytes, read from public/ by the path the item gives (`/highlights/x.webp`). */
function figures(images) {
  return Object.fromEntries(images.map(([src, from]) => {
    const file = path.resolve('public', decodeURI(new URL(from, SITE).pathname).replace(/^\//, ''));
    if (!fs.existsSync(file)) throw new Error(`no figure at ${file}`);
    return [src, fs.readFileSync(file)];
  }));
}

/**
 * The card as a file, as the Card Builder downloads it, with no browser.
 * @param {{ item: object, name: string, theme?: 'light' | 'dark', width?: number, minHeight?: number, format: 'svg' | 'png' | 'pdf' }} card
 * @returns {Promise<{ model: object, svg?: string, png?: Buffer, pdf?: Buffer }>}
 */
export async function drawCard({ format, ...card }) {
  const key = SITE_PRESETS.find((p) => p.key === card.name)?.key;
  if (key && !OFFLINE_PRESETS.includes(key)) throw new Error(`preset "${key}" is not drawn offline yet: ${NOT_OFFLINE[key]}`);
  const { model, images } = await modelFor(card);
  const bytes = figures(images);
  if (format === 'pdf') return { model, pdf: pdfFromModel(model, bytes) };
  const uri = (src, b, type) => `data:${type ?? MIME[src.split('.').pop()] ?? 'application/octet-stream'};base64,${b.toString('base64')}`;
  const svg = modelToSvg(model, Object.fromEntries(Object.entries(bytes).map(([src, b]) => [src, uri(src, b)])));
  if (format !== 'png') return { model, svg };
  // resvg decodes PNG, JPEG, GIF and SVG, not WebP or AVIF, which a figure may be: a PNG is drawn from an SVG that has them as PNG.
  const readable = Object.fromEntries(await Promise.all(Object.entries(bytes).map(async ([src, b]) => [src, /\.(webp|avif)$/i.test(src) ? uri(src, await sharp(b).png().toBuffer(), 'image/png') : uri(src, b)])));
  return { model, svg, png: pngFromSvg(modelToSvg(model, readable), model) };
}
