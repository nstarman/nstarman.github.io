// Reads build-card.mjs's command line: <id> [<name | preset key>] [--theme light|dark]
// [--width N] [out.svg|.png|.pdf]. Throws on anything it cannot read, so nothing is
// drawn from a guess.

export const USAGE = 'usage: build-card.mjs <id> [<card name | preset key>] [--theme light|dark] [--width N] [out.svg|.png|.pdf]';
const FORMATS = ['svg', 'png', 'pdf'];

/** @returns {{ id: string, name: string|null, theme: 'light'|'dark', width: number|null, out: string|null, format: string }} */
export function readArgs(argv) {
  const r = { id: null, name: null, theme: 'light', width: null, out: null, format: 'png' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--theme' || a === '--width') {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${a} needs a value`);
      if (a === '--theme') {
        if (!['light', 'dark'].includes(v)) throw new Error(`--theme is light or dark, not ${v}`);
        r.theme = v;
      } else {
        if (!/^\d+$/.test(v) || +v < 120 || +v > 1600) throw new Error(`--width is a whole number of px, 120–1600, not ${v}`);
        r.width = +v;
      }
    } else if (a.startsWith('--')) {
      throw new Error(`no such option, ${a}`);
    } else if (r.id === null) {
      r.id = a;
    } else if (/\.[a-z]+$/i.test(a)) {
      // A card name never ends in .<letters> (a size there is 15.5); an output does.
      const ext = a.match(/\.([a-z]+)$/i)[1].toLowerCase();
      if (!FORMATS.includes(ext)) throw new Error(`${a}: use .svg, .png or .pdf`);
      if (r.out !== null) throw new Error(`two outputs, ${r.out} and ${a}`);
      r.out = a;
      r.format = ext;
    } else {
      if (r.name !== null) throw new Error(`two names, ${r.name} and ${a}`);
      r.name = a;
    }
  }
  if (r.id === null) throw new Error('no item id');
  return r;
}
