// Reads a card as the browser laid it out, for src/lib/card.typ to draw again
// as a PDF. Nothing here knows the card grammar: whatever the CSS made of a
// name, this measures — every box with a fill or a border, every figure and
// icon, every line of text — so a new axis needs no change here.

/** A computed colour as #rrggbbaa, or null where it is transparent. Throws on
 *  a form it cannot read, so a colour is never silently dropped. */
export function hex(c) {
  let m = c.match(/^rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)$/);
  let v = m && [m[1], m[2], m[3]].map(Number);
  if (!m && (m = c.match(/^color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)(?: \/ ([\d.]+))?\)$/))) v = [m[1], m[2], m[3]].map((x) => x * 255);
  if (!m) throw new Error(`cannot read the colour ${c}`);
  const a = m[4] === undefined ? 1 : +m[4];
  return a === 0 ? null : `#${[...v, a * 255].map((x) => Math.round(Math.min(255, Math.max(0, x))).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * @param {Element} card  the .card, in a document laid out and showing
 * @param {{ title: string, site: string }} o  the PDF's title, and the site a
 *   link to this one's own pages is written against — a preview, or this
 *   machine, is not where a reader of the PDF should land
 * @returns {{ model: object, images: [string, string][] }}  card.json, and
 *   each figure's path in it with the URL to fetch it from
 */
export function measureCard(card, { title, site }) {
  const doc = card.ownerDocument;
  const win = doc.defaultView;
  const href = (e) => {
    const u = e.closest('a[href]')?.href;
    return u ? u.replace(doc.location.origin, site) : null;
  };
  const at = card.getBoundingClientRect();
  const xy = (r) => ({ x: r.left - at.left, y: r.top - at.top, w: r.width, h: r.height });
  const radii = (s, w, h, inset = 0) => ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft']
    .map((k) => Math.max(0, Math.min(parseFloat(s[`border${k}Radius`]) - inset, w / 2, h / 2)));
  const images = [];
  // A card's background is a tint over the page; a PDF has no page behind it,
  // so the site's ground for the theme, --ground, in the card's shape, goes
  // first — or a dark card would print its light text on white. The embed
  // page is itself transparent, so it is read from the token, not the page.
  const probe = doc.createElement('i');
  probe.style.background = 'var(--ground)';
  doc.body.append(probe);
  const ground = hex(win.getComputedStyle(probe).backgroundColor);
  probe.remove();
  const ops = ground ? [{ k: 'box', x: 0, y: 0, w: at.width, h: at.height, r: radii(win.getComputedStyle(card), at.width, at.height), fill: ground, stroke: null, sw: 0, href: null }] : [];

  // What a text node's line may show: a box that clips, as a summary cut to
  // four lines does, hides the lines past it.
  const clipOf = (e) => {
    for (let a = e; a && a !== card; a = a.parentElement) {
      if (win.getComputedStyle(a).overflowY !== 'visible') return a.getBoundingClientRect();
    }
    return at;
  };

  function element(e, s) {
    const r = e.getBoundingClientRect();
    if (!r.width || !r.height || s.visibility !== 'visible') return;
    const box = xy(r);
    const fill = hex(s.backgroundColor);
    const sides = ['Top', 'Right', 'Bottom', 'Left'].map((k) => [s[`border${k}Style`], s[`border${k}Width`], s[`border${k}Color`]].join());
    // ponytail: a border is drawn only when all four sides agree, which every
    // card border does; per-side borders would need four lines.
    const sw = s.borderTopStyle !== 'none' && new Set(sides).size === 1 ? parseFloat(s.borderTopWidth) : 0;
    const stroke = sw ? hex(s.borderTopColor) : null;
    // A border is drawn inside the box in CSS, and centred on its edge in Typst.
    if (fill || stroke) ops.push({ k: 'box', ...box, ...(stroke && { x: box.x + sw / 2, y: box.y + sw / 2, w: box.w - sw, h: box.h - sw }), r: radii(s, box.w, box.h), fill, stroke, sw, href: href(e) });
    if (e.localName === 'img') {
      // The picture fills the content box: a frame is the img's own padding.
      const [t, rt, b, l] = ['Top', 'Right', 'Bottom', 'Left'].map((k) => parseFloat(s[`padding${k}`]) + parseFloat(s[`border${k}Width`]));
      const inner = { x: box.x + l, y: box.y + t, w: box.w - l - rt, h: box.h - t - b };
      const url = e.currentSrc || e.src;
      const src = `/img${images.length}.${new URL(url).pathname.split('.').pop()}`;
      images.push([src, url]);
      ops.push({ k: 'img', ...inner, r: radii(s, inner.w, inner.h, Math.max(t, l)), src, fit: s.objectFit === 'cover' ? 'cover' : s.objectFit === 'fill' ? 'stretch' : 'contain', href: href(e) });
    }
    if (e.localName === 'svg') {
      const use = e.querySelector('use');
      const body = use ? doc.querySelector(use.getAttribute('href'))?.innerHTML ?? '' : e.innerHTML;
      const view = use ? doc.querySelector(use.getAttribute('href'))?.getAttribute('viewBox') : e.getAttribute('viewBox');
      const c = (v) => (v === 'none' ? 'none' : (hex(v) ?? 'none').slice(0, 7));
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view}" fill="${c(s.fill)}" stroke="${c(s.stroke)}" stroke-width="${parseFloat(s.strokeWidth)}" stroke-linecap="${s.strokeLinecap}" stroke-linejoin="${s.strokeLinejoin}">${body.replaceAll('currentColor', c(s.color))}</svg>`;
      ops.push({ k: 'svg', ...box, svg, href: href(e) });
    }
  }

  // A text node, a line at a time: its characters grouped by the line the
  // browser set them on, each line then placed as one run.
  function text(n) {
    const e = n.parentElement;
    const s = win.getComputedStyle(e);
    if (s.visibility !== 'visible' || !n.data.trim()) return;
    const clip = clipOf(e);
    const range = doc.createRange();
    const lines = [];
    for (let i = 0; i < n.data.length; i++) {
      range.setStart(n, i);
      range.setEnd(n, i + 1);
      const r = range.getClientRects()[0];
      if (!r) continue;
      const line = lines.at(-1);
      if (line && Math.abs(r.top - line.r.top) < r.height / 2) { line.s += n.data[i]; line.right = Math.max(line.right, r.right); }
      else if (n.data[i].trim()) lines.push({ r, s: n.data[i], right: r.right });
    }
    const up = s.textTransform === 'uppercase';
    for (const { r, s: raw, right } of lines) {
      if (r.bottom > clip.bottom + 1 || r.top < clip.top - 1) continue;
      const str = raw.replace(/\s+/g, ' ').trimEnd();
      ops.push({
        k: 'text', ...xy(r), w: right - r.left, s: up ? str.toUpperCase() : str, font: s.fontFamily.split(',')[0].replace(/["']/g, '').trim(),
        weight: +s.fontWeight, size: parseFloat(s.fontSize), color: hex(s.color), ls: s.letterSpacing === 'normal' ? 0 : parseFloat(s.letterSpacing), href: href(e), clamp: clamped(e),
      });
    }
  }

  // A box cut to a number of lines ends its last line in an ellipsis, which
  // is drawn by the browser and so is in no text node.
  const clamped = (e) => {
    for (let a = e; a && a !== card; a = a.parentElement) {
      const s = win.getComputedStyle(a);
      if (s.webkitLineClamp && s.webkitLineClamp !== 'none') return a.scrollHeight > a.clientHeight + 1 ? a : null;
    }
    return null;
  };

  const walk = doc.createTreeWalker(card, win.NodeFilter.SHOW_ELEMENT | win.NodeFilter.SHOW_TEXT, {
    // An icon is drawn whole, from its svg; what is see-through is not drawn
    // at all, as the builder's own controls over the preview are until hovered.
    // ponytail: opacity is all or nothing — a half-faded part would draw at full.
    acceptNode: (n) => ((n.parentElement?.closest('svg') && n.parentElement !== card) || (n.nodeType === 1 && win.getComputedStyle(n).opacity === '0')
      ? win.NodeFilter.FILTER_REJECT : win.NodeFilter.FILTER_ACCEPT),
  });
  for (let n = card; n; n = walk.nextNode()) {
    if (n.nodeType === 3) text(n);
    else element(n, win.getComputedStyle(n));
  }

  for (const box of new Set(ops.map((o) => o.clamp).filter(Boolean))) {
    const last = ops.findLast((o) => o.clamp === box);
    last.s = `${last.s.replace(/\s*\S?$/, '')}…`;
  }
  for (const o of ops) delete o.clamp;

  return { model: { title, w: at.width, h: at.height, r: radii(win.getComputedStyle(card), at.width, at.height), ops }, images };
}
