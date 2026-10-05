// The Card Builder's PNG and PDF: the card in the preview frame, drawn in the
// browser in the theme asked for — nothing is rendered at build time. The
// frame is this site's own page, so its document is ours to read.

import { domToPng } from 'modern-screenshot';
import { file, themes } from '../cardexport.js';

/** Save one file per theme the builder card `s` needs, as `file(s, theme)`
 *  names it. preview holds the iframe; fonts are the faces Typst draws the
 *  PDF with; say shows a progress message. */
export async function downloadCard({ preview, site, fonts, say }, s) {
  // The card in the preview, drawn in the theme asked for. The hitboxes are
  // lifted while it is drawn.
  async function drawn(theme, draw) {
    // A preview just replaced draws once it has loaded.
    const frame = preview.querySelector('iframe');
    if (!frame.contentDocument?.querySelector('.card') || frame.contentDocument.readyState !== 'complete') await new Promise((r) => frame.addEventListener('load', r, { once: true }));
    const doc = frame.contentDocument;
    const root = doc.documentElement;
    const was = root.dataset.theme;
    // The theme lands at once, not 0.15s later — the buttons ease their
    // colours, and a card read in between is half in each theme.
    const still = doc.head.appendChild(doc.createElement('style'));
    still.textContent = '*, *::before, *::after { transition: none !important }';
    root.dataset.theme = theme;
    root.classList.remove('eb-hits');
    try {
      await doc.fonts.ready;
      return await draw(doc.querySelector('.card'));
    } finally {
      still.remove();
      root.classList.add('eb-hits');
      if (was) root.dataset.theme = was; else delete root.dataset.theme;
    }
  }
  const png = (theme) => drawn(theme, (card) => domToPng(card, { scale: 2 }));

  // The same card as a PDF: measured where the browser laid it out, then set
  // again by Typst (src/lib/card.typ) in the same faces. The compiler, ~11 MB,
  // loads on the first one asked for.
  async function pdf(theme, s) {
    const { model, images } = await drawn(theme, async (card) => (await import('../cardpdf.js')).measureCard(card, { title: s.it.title, site }));
    const [{ compileTypst }, { default: src }] = await Promise.all([import('../typstcompile.js'), import('../card.typ?raw')]);
    const files = { '/card.json': new TextEncoder().encode(JSON.stringify(model)) };
    for (const [path, url] of images) {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`no figure at ${url}`);
      files[path] = new Uint8Array(await r.arrayBuffer());
    }
    const bytes = await compileTypst(src, files, fonts, say);
    return URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  }

  for (const t of themes(s)) {
    const a = document.createElement('a');
    a.href = s.format === 'pdf' ? await pdf(t, s) : await png(t);
    a.download = file(s, t);
    a.click();
    if (s.format === 'pdf') setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
}
