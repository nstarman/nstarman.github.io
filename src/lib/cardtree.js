// A card as the layout engine laid it out, written as the model src/lib/cardpdf.js writes from the
// browser: every box with a fill or a border, every figure and icon, every line of text, each at
// its place in CSS px from the card's top left, with the link it sits in. src/lib/cardsvg.js and
// src/lib/card.typ read the model and know nothing of where it came from, so a card measured here
// is drawn as one measured in a browser (specs/001-takumi-card-renderer, contracts/card-model.md).
//
// Nothing here knows the card grammar: whatever the CSS made of a name, the tree holds. What it
// cannot hold is read from the markup instead (src/lib/cardmarkup.js tags it): a link's address,
// an icon's colour (research E12). What it holds in a form that needs reading is read as the
// research found it: a border's width from its ring (E10), a clamped line's ellipsis from the
// empty run after it (E11). Anything else it cannot write is an error, never a part left out.

/** A paint's colour as #rrggbbaa, or null where it is see-through. Throws on what is not a colour. */
function hex(paint, what) {
  if (paint?.type !== 'color') throw new Error(`cannot draw a ${paint?.type ?? 'missing'} paint for ${what}`);
  const [r, g, b, a] = paint.color;
  return a === 0 ? null : `#${[r, g, b, a].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}

const classesOf = (node) => (node.element?.className ?? '').split(/\s+/).filter(Boolean);
const describe = (node) => `<${node.element?.tagName ?? '?'}${node.element?.className ? `.${node.element.className.split(/\s+/).join('.')}` : ''}>`;
const named = (node, name) => classesOf(node).includes(name);
const marked = (node, prefix) => classesOf(node).map((c) => c.match(new RegExp(`^${prefix}-(\\d+)$`))).find(Boolean);

/** The corners of the card's background, for a tree laid out with one (cardoffline.js draws a card that has none that way). */
export function cardCorners(tree) {
  const card = tree.nodes.find((n) => n.type === 'box' && n.element?.tagName === 'article' && named(n, 'card'));
  const shape = card?.raw.drawables.find((d) => d.role === 'background')?.shape;
  if (!shape) throw new Error('no background on the card to read its corners from');
  return radiiOf(shape, card.bounds.width, card.bounds.height);
}

/** Corner radii [tl, tr, br, bl] of a background's shape, each no more than half the box. */
function radiiOf(shape, w, h) {
  if (shape.type === 'rect') return [0, 0, 0, 0];
  if (shape.type !== 'rounded-rect') throw new Error(`cannot draw a ${shape.type} shape`);
  const { topLeft, topRight, bottomRight, bottomLeft } = shape.radii;
  return [topLeft, topRight, bottomRight, bottomLeft].map((r) => Math.max(0, Math.min(r.x, w / 2, h / 2)));
}

/**
 * The tree's border is a fill of the ring between two rounded rectangles, `M… Z m<dx> <dy> …`; the
 * second begins `dy` below the first, which is the border's width. A border that differs by side is
 * a rectangle for each side, and gets no stroke, as the browser's measurement draws none.
 */
function ringOf(borders) {
  if (borders.length !== 1 || borders[0].shape.type !== 'path') return null;
  const { d } = borders[0].shape;
  const width = d.match(/Z\s*m\s*-?[\d.]+[ ,]\s*(-?[\d.]+)/i)?.[1];
  // The outer corner's radius: how far the first curve goes across, from a start at the box's top edge or, for a circle, not.
  const curve = /^M[^cC]*[cC]([^a-zA-Z]*)/.exec(d)?.[1].match(/-?\d*\.?\d+/g);
  return width === undefined ? null : { sw: +width, outer: curve?.[4] };
}

/**
 * Whether the card's byline, and the venue after it, is one line: the embed page's rule for authors:…:fit,
 * a `.c-by` under one and a half lines tall (src/pages/embed/[id].astro).
 * @param {import('takumi-paint').PaintTree} tree
 */
export function bylineFits(tree) {
  const by = tree.nodes.find((n) => n.type === 'box' && named(n, 'c-by'));
  if (!by) throw new Error('no byline in the card: the markup has no <p class="c-by">');
  const byId = new Map(tree.nodes.map((n) => [n.raw.id, n]));
  const within = (n) => { for (let p = n; p; p = byId.get(p.raw.parent)) if (p === by) return true; return false; };
  const line = tree.nodes.find((n) => n.runs?.length && within(n))?.runs[0].lineHeight;
  if (!line) throw new Error('no text in the card\'s byline to take its line height from');
  return by.bounds.height < line * 1.5;
}

/**
 * @param {import('takumi-paint').PaintTree} tree  the layout of the markup src/lib/cardmarkup.js made
 * @param {{ title: string, site: string, links: string[], icons: { symbol: string | null }[],
 *           symbols: Map<string, { viewBox: string, body: string }> }} o
 *   `site`: where a link to a page of this site is written against, as `measureCard` has it;
 *   `links`, `icons`: what `renderMarkup` returned; `symbols`: `sprite()`
 * @returns {{ model: object, images: [string, string][] }}  the model, and each figure's path in it with where it is read from
 */
export function modelFromTree(tree, { title, site, links, icons, symbols, radii }) {
  const nodes = tree.nodes;
  const byId = new Map(nodes.map((n) => [n.raw.id, n]));
  const card = nodes.find((n) => n.type === 'box' && n.element?.tagName === 'article' && named(n, 'card'));
  if (!card) throw new Error('no card in the document: the markup has no <article class="card">');
  const origin = card.bounds;
  const at = (b) => ({ x: b.x - origin.x, y: b.y - origin.y, w: b.width, h: b.height });

  const probe = (name) => {
    const node = nodes.find((n) => named(n, name));
    const fill = node?.raw.drawables.find((d) => d.type === 'fill' && d.role === 'background');
    if (!fill) throw new Error(`no ${name} probe in the document, which the markup is meant to carry`);
    return hex(fill.paint, `the ${name} probe`);
  };

  const hrefOf = (node, element = node.element) => {
    // A run of text reports the element it came from, which may be one inside a link (cardmarkup.js marks them all).
    const m = (element?.className ?? '').split(/\s+/).map((c) => c.match(/^x-link-(\d+)$/)).find(Boolean);
    if (m) return new URL(links[+m[1]], site).href;
    for (let n = byId.get(node.raw.parent); n; n = byId.get(n.raw.parent)) {
      const up = marked(n, 'x-link');
      if (up) return new URL(links[+up[1]], site).href;
    }
    return null;
  };

  const ops = [];
  const images = [];
  const ground = probe('x-ground');
  const shape = card.raw.drawables.find((d) => d.role === 'background')?.shape;
  // A card with no background has no shape in the tree: its corners are given, or square.
  const cardRadii = radii ?? radiiOf(shape ?? { type: 'rect' }, origin.width, origin.height);
  if (ground) ops.push({ k: 'box', x: 0, y: 0, w: origin.width, h: origin.height, r: cardRadii, fill: ground, stroke: null, sw: 0, href: null });

  for (const node of nodes) {
    if (node.type === 'box') {
      if (named(node, 'x-ground') || marked(node, 'x-ink')) continue;
      const box = at(node.bounds);
      if (!box.w || !box.h) continue;
      const fills = node.raw.drawables.filter((d) => d.type === 'fill');
      for (const d of fills) if (d.role !== 'background' && d.role !== 'border') throw new Error(`cannot draw a ${d.role} on ${describe(node)}`);
      const bg = fills.find((d) => d.role === 'background');
      const ring = ringOf(fills.filter((d) => d.role === 'border'));
      const fill = bg ? hex(bg.paint, `the background of ${describe(node)}`) : null;
      const stroke = ring ? hex(fills.find((d) => d.role === 'border').paint, `the border of ${describe(node)}`) : null;
      if (!fill && !stroke) continue;
      const sw = stroke ? ring.sw : 0;
      const r = bg ? radiiOf(bg.shape, box.w, box.h) : Array(4).fill(Math.min(+(ring?.outer ?? 0), box.w / 2, box.h / 2));
      // A border is drawn inside the box in CSS, and centred on its edge in the drawings.
      ops.push({ k: 'box', ...box, ...(stroke && { x: box.x + sw / 2, y: box.y + sw / 2, w: box.w - sw, h: box.h - sw }), r, fill, stroke, sw, href: hrefOf(node) });
    } else if (node.type === 'image') {
      const tag = node.element?.tagName;
      const box = at(node.bounds);
      if (tag === 'svg' && named(node, 'ico')) {
        const n = +/\bx-ico-(\d+)\b/.exec(node.element.className ?? '')?.[1];
        const { symbol } = icons[n] ?? {};
        const body = symbols.get(symbol);
        if (!body) throw new Error(`no symbol ${symbol} in the icon sprite, for the icon ${n} of the card`);
        const colour = (probe(`x-ink-${n}`) ?? 'none').slice(0, 7);
        ops.push({
          k: 'svg', ...box, href: hrefOf(node),
          svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${body.viewBox}" fill="${colour}" stroke="none" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter">${body.body.replaceAll('currentColor', colour)}</svg>`,
        });
      } else if (tag === 'img') {
        const parent = byId.get(node.raw.parent);
        const outer = parent && at(parent.bounds);
        const inset = outer ? Math.max(box.x - outer.x, box.y - outer.y) : 0;
        const bg = parent?.raw.drawables.find((d) => d.role === 'background');
        const { src, width: iw, height: ih } = node.raw.drawables[0].image;
        const dest = node.raw.drawables[0].rect;
        // object-fit is not in the tree; the rectangle the picture is drawn in says it: inside the box, contain; past it, cover.
        const fit = dest.width > box.w + 0.01 || dest.height > box.h + 0.01 ? 'cover'
          : Math.abs(dest.width / dest.height - iw / ih) > 0.01 ? 'stretch' : 'contain';
        const path = `/img${images.length}.${new URL(src, 'http://x/').pathname.split('.').pop()}`;
        images.push([path, src]);
        // A figure with border-radius of its own and no box behind it has them in its clip; the engine leaves a padded one's
        // a plain rectangle, so there they come from the box around it, less the padding and border between.
        const { clip } = node.raw.drawables[0];
        const r = clip?.type === 'rounded-rect' ? radiiOf(clip, box.w, box.h)
          : (bg ? radiiOf(bg.shape, outer.w, outer.h) : Array(4).fill(Math.min(+(ringOf(parent?.raw.drawables.filter((d) => d.role === 'border') ?? [])?.outer ?? 0), outer.w / 2, outer.h / 2))).map((v) => Math.max(0, v - inset));
        ops.push({ k: 'img', ...box, r, src: path, fit, href: hrefOf(node) });
      } else {
        throw new Error(`cannot draw an image that is ${tag === 'svg' ? 'an <svg> that is not an icon' : `a ${tag}`}: ${describe(node)}`);
      }
    } else if (node.type === 'text') {
      // An inline element's background and border are fills of the text node that holds it. Their box is a hair off the browser's
      // (the engine takes the font's unrounded ascent and descent), so a card lays such an element out as an inline-block (cardcss.js).
      if (node.raw.drawables.some((d) => d.role === 'inline-background')) throw new Error(`cannot draw the background of an inline element in ${describe(node)}: lay it out as an inline-block`);
      const lines = [];
      node.runs.forEach((run, i) => {
        // The engine draws the ellipsis of a clamped last line as a run of its own, with no text.
        if (run.text === '') {
          const prior = lines.findLast((l) => l.line === run.line);
          if (!prior) throw new Error(`a clamp's ellipsis with no line before it, in ${describe(node)}`);
          prior.op.s += '…';
          return;
        }
        if (run.text.trim() === '') return;
        const lead = run.text.length - run.text.trimStart().length;
        // A run starts at its origin, and a browser's line at its first visible glyph.
        const first = lead ? (run.glyphs.find((g) => g.cluster >= lead)?.x ?? 0) : 0;
        // Text with no colour draws nothing, and the engine leaves it no glyphs; the browser's measurement keeps its line.
        const glyphs = node.raw.drawables.find((d) => d.type === 'glyphs' && d.run === i);
        // A line's width ends at its last visible glyph, as the browser's does: a space before the next run is no part of it.
        const end = run.text.trimEnd().length;
        const tail = end < run.text.length ? run.glyphs.find((g) => g.cluster >= end)?.x : undefined;
        const asc = Math.round(run.ascent);
        const baseline = node.transform[5] + run.y;
        lines.push({
          line: run.line,
          op: {
            k: 'text', x: node.transform[4] - origin.x + run.x + first, y: baseline - asc - origin.y, w: (tail ?? run.width) - first, h: asc + Math.round(run.descent),
            s: run.text.trim().replace(/\s+/g, ' '), font: run.font.family, weight: run.font.weight, style: run.font.style === 'normal' ? 'normal' : 'italic',
            size: run.fontSize, color: glyphs ? hex(glyphs.paint, `the text of ${describe(node)}`) : null, ls: run.letterSpacing || 0, href: hrefOf(node, run.element ?? node.element),
          },
        });
      });
      ops.push(...lines.map((l) => l.op));
    }
  }

  return { model: { title, w: origin.width, h: origin.height, r: cardRadii, ops }, images, bare: !shape };
}
