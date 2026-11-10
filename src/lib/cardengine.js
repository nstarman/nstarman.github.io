// Lays a card out with the Takumi engine and hands the paint tree to `use` (research D1, D3).
import { paint } from 'takumi-paint';

// 1280 px is where the site's root font size is exactly 16px, as the Card Builder is used and as the
// browser measurements this is compared with were taken. A card's own width comes from its name
// (`size:400`), and `max-width: 100%` caps it at this, so the canvas must be wider than any card.
const CANVAS = 1280;

/**
 * @param {{ html: string, css: string, fonts: object[] }} input  from cardmarkup.js, cardcss.js, cardfonts.js
 * @param {(tree: import('takumi-paint').PaintTree) => any} use  reads the tree; it is freed when this returns
 */
export async function withLayout({ html, css, fonts }, use) {
  const tree = await paint(html, { width: CANVAS, fonts, css });
  try {
    return await use(tree);
  } finally {
    tree.free();
  }
}
