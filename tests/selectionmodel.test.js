// The builder page and `npm run build:cv` must draw one saved selection as one CV.
// Both call modelFromSelection (src/lib/selectionmodel.js); this holds them to it:
// the page builds no model of its own, the function reads every field a selection
// carries, and the CLI hands Typst the model the function returns.

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { decode, encode } from '../src/lib/selection.js';
import { modelFromSelection } from '../src/lib/selectionmodel.js';
import { memberIds } from '../src/lib/presets.js';

const page = fs.readFileSync(new URL('../src/pages/webdev/cv.astro', import.meta.url), 'utf8');
const shared = fs.readFileSync(new URL('../src/lib/selectionmodel.js', import.meta.url), 'utf8');
const root = path.resolve(import.meta.dirname, '..');

/** A selection with something set in every part the builder has. */
const richSelection = () => encode({
  items: memberIds('complete'),
  lines: { 'toronto-phd': [0] },
  style: 'default', page: 'letter', trailcap: true, fill: true,
  currency: 'dollar', paperIds: true, schoolBelow: true, linkOnDegree: true,
  funderOff: ['astropy-berkeley-prize'],
  spacing: { education: { value: 2, unit: 'pt' } },
  site: { commit: null, short: null, dirty: false },
  savedAt: '2026-01-01T00:00:00.000Z',
});

describe('one model from a selection', () => {
  it('is built by the page through the shared function, and by nothing else', () => {
    expect(page).not.toMatch(/\bcvModel\(/);
    expect(page).toContain('modelFromSelection(decode(JSON.stringify(');
    // Compile and Save read the controls the same way.
    expect(page.match(/currentSelection\(\)/g)).toHaveLength(2);
  });

  it('reads every field a selection carries', () => {
    // A field decode returns but modelFromSelection ignores is one the page and
    // the CLI would both drop; the one named here is handled elsewhere.
    const handled = { items: 'read', lines: 'read', savedAt: 'not drawn', site: 'not drawn' };
    const sel = decode(JSON.stringify(richSelection()));
    for (const key of Object.keys(sel).filter((k) => !(k in handled))) {
      expect(shared, `selectionmodel.js does not read sel.${key}`).toMatch(new RegExp(`\\bsel\\.${key}\\b`));
    }
  });

  it('carries the settings through', () => {
    const model = modelFromSelection(decode(JSON.stringify(richSelection())));
    expect(model).toMatchObject({ style: 'default', format: 'letter', trailcap: true, fill: true });
    expect(model.sections.length).toBeGreaterThan(5);
  });

  describe('the command line', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cv-'));
    const file = path.join(dir, 'sel.json');
    fs.writeFileSync(file, JSON.stringify(richSelection()));
    const run = (...args) => spawnSync('node', [path.join(root, 'scripts/build-cv.mjs'), file, ...args],
      { encoding: 'utf8', maxBuffer: 1 << 28, cwd: dir });

    it('hands Typst the model the function returns', () => {
      const r = run('--model');
      expect(r.status, r.stderr).toBe(0);
      const want = modelFromSelection(decode(fs.readFileSync(file, 'utf8')));
      expect(JSON.parse(r.stdout)).toEqual(JSON.parse(JSON.stringify(want)));
    }, 60_000);

    it('refuses a selection with nothing in it', () => {
      fs.writeFileSync(path.join(dir, 'empty.json'), JSON.stringify(encode({ items: [] })));
      const r = spawnSync('node', [path.join(root, 'scripts/build-cv.mjs'), path.join(dir, 'empty.json'), '--model'],
        { encoding: 'utf8', cwd: dir });
      expect(r.status).not.toBe(0);
      expect(r.stderr).toContain('Nothing selected');
    }, 60_000);

    const haveTypst = spawnSync(process.env.TYPST ?? 'typst', ['--version']).status === 0;
    it.skipIf(!haveTypst)('compiles a PDF, leaving no cv/cv.json behind', () => {
      const out = path.join(dir, 'out.pdf');
      const r = run(out);
      expect(r.status, r.stderr).toBe(0);
      expect(fs.readFileSync(out).subarray(0, 4).toString()).toBe('%PDF');
      expect(fs.existsSync(path.join(root, 'cv/cv.json'))).toBe(false);
    }, 120_000);
  });
});
