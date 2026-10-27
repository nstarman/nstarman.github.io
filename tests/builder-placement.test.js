// Where a builder option lives. An option for the whole CV is in the global settings panel (the
// `all` block of CvFmtRow.astro); an option for one section is in that section's own row, among its
// Items controls. This holds the global block to the whole-CV options it has, so a section's option
// cannot be put there without someone saying it is for the whole CV.

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const src = fs.readFileSync(new URL('../src/components/CvFmtRow.astro', import.meta.url), 'utf8');
const start = src.indexOf('{all && (');
// The marker that opens the global block; if it moves, say so rather than slicing at -1.
if (start === -1) throw new Error('CvFmtRow.astro: the global block (`{all && (`) was not found; update this test');
const global = src.slice(start);
const section = src.slice(0, start);
const ids = (text) => [...text.matchAll(/\bid="([A-Za-z0-9_-]+)"/g)].map((m) => m[1]);

// Every control for the whole CV. A new one is added here on purpose.
const WHOLE_CV = ['style', 'format', 'names', 'currency', 'locregion', 'loccountry', 'trailwbox', 'selprefix', 'trailcap', 'fill', 'resetorder', 'groupsections'];
// Controls for one section, and the section whose row holds each.
const ONE_SECTION = { schoolbelow: "s.id === 'education'", linkondegree: "s.id === 'education'", paperids: "s.id === 'mentoring'" };

describe('where a builder option lives', () => {
  it('has only options for the whole CV in the global panel', () => {
    expect(ids(global).sort()).toEqual([...WHOLE_CV].sort());
  });

  it("puts a section's option in that section's own row, behind its section", () => {
    for (const [id, guard] of Object.entries(ONE_SECTION)) {
      if (!src.includes(`id="${id}"`)) continue; // an option not in this build yet
      expect(ids(section)).toContain(id);
      expect(ids(global)).not.toContain(id);
      expect(src).toContain(guard);
    }
  });

  it("offers a talks section's place as one choice, in that section's row only", () => {
    expect(section).toContain('data-place-at-of');
    expect(global).not.toContain('data-place-at-of');
    // For talks only; the other dated sections keep their Places box.
    expect(section).toContain("s.items.every((i) => i.type === 'presentation')");
    expect(section).toContain('&& !talks');
  });

  it("shows each talk's place in the preview where the section puts it", () => {
    const page = fs.readFileSync(new URL('../src/pages/webdev/cv.astro', import.meta.url), 'utf8');
    const item = fs.readFileSync(new URL('../src/components/CvTimelineItem.astro', import.meta.url), 'utf8');
    const css = fs.readFileSync(new URL('../src/styles/cv/builder.css', import.meta.url), 'utf8');
    // Only the builder's rows carry the three renderings; the section's attribute shows one.
    expect(item).toContain("const talkPlace = pick && item.type === 'presentation'");
    for (const v of ['right', 'below', 'title']) expect(item).toContain(`plc plc--${v}`);
    expect(css).toContain('.cvsec[data-place-at="below"] .plc--below{display:block}');
    expect(css).toContain('.cvsec[data-place-at="title"] .plc--title{display:inline}');
    // A change, a loaded selection and a preset's start all update it.
    expect(page).toMatch(/startsWith\('placeat:'\)\) \{ showPlaceAt\(\)/);
    expect(page).toMatch(/const setLocationAt = [\s\S]*?showPlaceAt\(\);/);
  });

  it("sets how a place prints in the global panel, and in the preview", () => {
    const page = fs.readFileSync(new URL('../src/pages/webdev/cv.astro', import.meta.url), 'utf8');
    const item = fs.readFileSync(new URL('../src/components/CvTimelineItem.astro', import.meta.url), 'utf8');
    expect(ids(global)).toEqual(expect.arrayContaining(['locregion', 'loccountry']));
    expect(ids(section)).not.toContain('locregion');
    // The preview's place spans carry the raw place, which the page writes as the options say.
    expect(item).toContain('data-loc={talkPlace}');
    expect(page).toContain('formatPlace(p.dataset.loc, form)');
    expect(item.match(/plc plc--title" data-loc=\{talkPlace\}/g)).toHaveLength(2);
    expect(page).toMatch(/\$\('loccountry'\)\.addEventListener\('change', \(\) => \{ showLocationDetail\(\)/);
    expect(page).toMatch(/\$\('loccountry'\)\.value = sel\.locationDetail\.country === 'code'/);
  });

  it("ticks an award's recipient in the preview and saves the unticked ones", () => {
    const page = fs.readFileSync(new URL('../src/pages/webdev/cv.astro', import.meta.url), 'utf8');
    const item = fs.readFileSync(new URL('../src/components/CvTimelineItem.astro', import.meta.url), 'utf8');
    const css = fs.readFileSync(new URL('../src/styles/cv/builder.css', import.meta.url), 'utf8');
    expect(item).toContain('data-recipient-of={item.id}');
    expect(css).toContain('.recipientbox:not(:checked) + .recipient__text');
    // Read into the saved selection, restored on load, ticked again by a preset's start.
    expect(page).toContain('recipientOff: currentRecipientOff()');
    expect(page).toContain('setRecipientOff(sel.recipientOff)');
    expect(page).toContain('setRecipientOff([])');
  });
});
