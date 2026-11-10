// Draws a card as the Card Builder downloads it, without opening the builder:
//
//   node scripts/build-card.mjs <id> [<card name | preset key>] [--theme light|dark] [--width N] [out.svg|.png|.pdf]
//
// Left out, the name is the item's default card, the theme light, and the output the
// builder's own file name for it, a PNG, where the command was run.
//
// The card's own markup and stylesheet are laid out by the Takumi engine (src/lib/cardoffline.js)
// and drawn as the website's cards are: no browser and no server (specs/cards/spec.md). A PDF
// needs the `typst` binary (TYPST=/path/to/typst), as build:cv does.

import fs from 'node:fs';
import path from 'node:path';
import { readArgs, USAGE } from './lib/cardargs.mjs';
import { ssr } from './lib/ssr.mjs';

let args;
try {
  args = readArgs(process.argv.slice(2));
} catch (err) {
  console.error(`${err.message}\n${USAGE}`);
  process.exit(2);
}

const cwd = process.cwd();
const root = path.resolve(import.meta.dirname, '..');
process.chdir(root);

const site = await ssr({ root });
try {
  const { items } = await site.load('/src/lib/data.js');
  const { CARD_TYPES, PRESET, defaultSlug, formatName, parseName } = await site.load('/packages/card-builder/src/cards.js');
  const { file } = await site.load('/src/lib/cardexport.js');
  const { drawCard } = await site.load('/src/lib/cardoffline.js');
  const item = items.find((i) => i.id === args.id);
  if (!item) throw new Error(`no item ${args.id}`);
  if (!CARD_TYPES.includes(item.type)) throw new Error(`${args.id} is a ${item.type}, which has no card`);
  // A preset key only where PRESET has it as its own, so `constructor` reads as a name, not Object's.
  const spec = parseName((args.name !== null && Object.hasOwn(PRESET, args.name) ? PRESET[args.name] : args.name) ?? defaultSlug(item));
  const width = spec.width === 'fill' ? args.width : spec.width;
  if (width == null) throw new Error('this card fills its width: give one with --width N');
  const slug = formatName(spec);
  const drawn = await drawCard({ item, name: slug, theme: args.theme, width, format: args.format });
  const out = path.resolve(cwd, args.out ?? file({ id: item.id, slug, format: args.format }, args.theme));
  fs.writeFileSync(out, drawn[args.format]);
  console.log(`${path.relative(cwd, out)}  ${fs.statSync(out).size} bytes`);
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await site.close();
}
