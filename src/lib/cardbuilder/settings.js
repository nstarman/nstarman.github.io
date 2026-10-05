// The Card Builder's saved settings: the card's name, the theme and the
// format — never the item — as JSON, to keep or to load onto another item.

import { formatName, parseName } from '../cardname.js';

export const THEMES = ['auto', 'light', 'dark'];
export const FORMATS = ['iframe', 'html', 'markdown', 'png', 'pdf'];

/** The JSON text to save for the builder card s ({ slug, theme, format }). */
export const serializeSettings = (s) => `${JSON.stringify({ name: s.slug, theme: s.theme, format: s.format }, null, 2)}\n`;

/** Saved settings text → { name, theme, format }, the name checked by reading
 *  it back. The name itself, or, from before, the spec it reads as. Throws a
 *  message fit to show on a bad file. */
export function parseSettings(text) {
  const { theme = 'auto', format, name: given, ...card } = JSON.parse(text);
  if (!THEMES.includes(theme)) throw new Error(`no such theme, ${theme}`);
  if (format !== undefined && !FORMATS.includes(format)) throw new Error(`no such format, ${format}`);
  const name = typeof given === 'string' ? given : formatName(card);
  parseName(name);
  return { name, theme, format };
}
