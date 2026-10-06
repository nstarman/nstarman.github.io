// A measured card as an SVG. src/lib/cardpdf.js reads the card as the browser
// laid it out — every box, figure, icon and line of text, at its place in CSS
// px, with the link each sits in — and this writes the same list as SVG
// rather than Typst: vector text, and each part that is a link inside an <a>,
// so the buttons stay live where the SVG is opened or embedded inline (an
// <img> never runs a link, in a browser or on GitHub).
//
// Pure, so it is tested without a browser. The model is cardpdf.js's:
// { title, w, h, r, ops }.

const SANS = "'IBM Plex Sans', system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const MONO = "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const SERIF = "'IBM Plex Serif', Georgia, 'Times New Roman', serif";

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n = (x) => +x.toFixed(2);

/** The font stack for a face the card names. */
export const stack = (font) => (/mono/i.test(font) ? MONO : /serif/i.test(font) && !/sans/i.test(font) ? SERIF : SANS);

/** #rrggbbaa → the colour and its opacity, as attributes: an 8-digit hex is
 *  not read everywhere SVG is. */
function paint(attr, c) {
  if (!c) return `${attr}="none"`;
  const a = c.length === 9 ? parseInt(c.slice(7), 16) / 255 : 1;
  return `${attr}="${c.slice(0, 7)}"${a < 1 ? ` ${attr}-opacity="${+a.toFixed(3)}"` : ''}`;
}

/** A rectangle with each corner its own radius [tl, tr, br, bl], as a path. */
export function rrect(x, y, w, h, [tl, tr, br, bl]) {
  return `M${n(x + tl)} ${n(y)}H${n(x + w - tr)}A${n(tr)} ${n(tr)} 0 0 1 ${n(x + w)} ${n(y + tr)}V${n(y + h - br)}`
    + `A${n(br)} ${n(br)} 0 0 1 ${n(x + w - br)} ${n(y + h)}H${n(x + bl)}A${n(bl)} ${n(bl)} 0 0 1 ${n(x)} ${n(y + h - bl)}`
    + `V${n(y + tl)}A${n(tl)} ${n(tl)} 0 0 1 ${n(x + tl)} ${n(y)}Z`;
}

const FIT = { contain: 'xMidYMid meet', cover: 'xMidYMid slice', stretch: 'none' };

/**
 * @param {{ title: string, w: number, h: number, r: number[], ops: object[] }} model
 * @param {Record<string, string>} [images]  each figure's `src` in the model →
 *   the data: URI (or URL) it is drawn from
 * @returns {string} the SVG document
 */
export function modelToSvg(model, images = {}) {
  const defs = [];
  const body = [];
  const link = (o, inner) => (o.href ? `<a href="${esc(o.href)}">${inner}</a>` : inner);

  for (const o of model.ops) {
    if (o.k === 'box') {
      body.push(link(o, `<path d="${rrect(o.x, o.y, o.w, o.h, o.r)}" ${paint('fill', o.fill)}${o.stroke ? ` ${paint('stroke', o.stroke)} stroke-width="${n(o.sw)}"` : ''}/>`));
    } else if (o.k === 'img') {
      if (!(o.src in images)) throw new Error(`no image for ${o.src}`);
      const id = `c${defs.length}`;
      defs.push(`<clipPath id="${id}"><path d="${rrect(o.x, o.y, o.w, o.h, o.r)}"/></clipPath>`);
      body.push(link(o, `<image href="${esc(images[o.src])}" x="${n(o.x)}" y="${n(o.y)}" width="${n(o.w)}" height="${n(o.h)}" preserveAspectRatio="${FIT[o.fit] ?? FIT.contain}" clip-path="url(#${id})"/>`));
    } else if (o.k === 'svg') {
      // The icon is a whole <svg> of its own, which nests where it stands.
      body.push(link(o, o.svg.replace(/^<svg\b/, `<svg x="${n(o.x)}" y="${n(o.y)}" width="${n(o.w)}" height="${n(o.h)}"`)));
    } else if (o.k === 'text') {
      // The browser set each line; textLength holds it to that width where the
      // reader's fallback face is a different one, so it never runs on.
      body.push(link(o, `<text x="${n(o.x)}" y="${n(o.y)}" font-family="${esc(stack(o.font))}" font-size="${n(o.size)}" font-weight="${o.weight}" ${paint('fill', o.color)}`
        + `${o.ls ? ` letter-spacing="${n(o.ls)}"` : ''} dominant-baseline="text-before-edge" textLength="${n(o.w)}" lengthAdjust="spacing" xml:space="preserve">${esc(o.s)}</text>`));
    } else {
      throw new Error(`no such op, ${o.k}`);
    }
  }

  // The card's own shape clips what runs to its edge — a figure's corner, a
  // box that fills it.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${n(model.w)}" height="${n(model.h)}" viewBox="0 0 ${n(model.w)} ${n(model.h)}" role="img" aria-label="${esc(model.title)}">\n`
    + `<title>${esc(model.title)}</title>\n<defs>${defs.join('')}<clipPath id="card"><path d="${rrect(0, 0, model.w, model.h, model.r)}"/></clipPath></defs>\n`
    + `<g clip-path="url(#card)">\n${body.join('\n')}\n</g>\n</svg>\n`;
}

/** A face's family and weight from the name of its file: IBMPlexSans-Medium.otf →
 *  IBM Plex Sans, 500. The faces public/fonts/card/ has, the ones the card names. */
export function faceOf(file) {
  const [, family, style] = file.match(/(IBMPlex(?:Sans|Mono))-(\w+)\.otf$/) ?? [];
  if (!family) throw new Error(`no face for ${file}`);
  return { family: family.replace(/(Plex)(Sans|Mono)/, '$1 $2').replace('IBMPlex', 'IBM Plex'), weight: { Regular: 400, Medium: 500, SemiBold: 600 }[style] };
}

/** An SVG with the faces in it, as @font-face rules with the font files as data:
 *  URIs, so that it draws in the card's own faces where the page's cannot reach —
 *  as an image, which is how it is made a PNG. faces: [{ file, uri }]. */
export function withFonts(svg, faces) {
  const css = faces.map(({ file, uri }) => { const f = faceOf(file); return `@font-face{font-family:'${f.family}';font-weight:${f.weight};src:url(${uri})}`; }).join('');
  return svg.replace('</title>\n', `</title>\n<style>${css}</style>\n`);
}
