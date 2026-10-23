// A paper's site with only @nstarkman/research-kit and a snapshot draws a paper's
// entry exactly as /publications/ does (SC-003). Builds a fixture site offline, and
// reads the site's own build: `npm run test:kit` runs after `npm run build`.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { collect } from '@nstarkman/data-resolver/collect.js';
import { fromDisk } from '@nstarkman/data-resolver/readers.js';
import { createStore } from '@nstarkman/data-resolver/store.js';

const ID = 'stream-convexity-rate'; // submitted, with a highlight: on /publications/
const out = fs.mkdtempSync(join(tmpdir(), 'paper-site-'));
afterAll(() => fs.rmSync(out, { recursive: true, force: true }) || fs.rmSync(`${out}-cache`, { recursive: true, force: true }));

const article = (html, id) => {
  const at = html.indexOf(`id="pub-${id}"`);
  const start = html.lastIndexOf('<article', at);
  return html.slice(start, html.indexOf('</article>', at) + '</article>'.length).replace(/^<article[^>]*>/, '<article>');
};

function build(card) {
  const snapshot = join(out, 'card.json');
  return collect(ID, fromDisk('.')).then((s) => {
    fs.writeFileSync(snapshot, JSON.stringify(s));
    const dist = join(out, `dist-${card}`);
    execFileSync('npx', ['astro', 'build', '--root', 'tests/fixtures/paper-site'], {
      env: { ...process.env, PAPER_SITE_OUT: dist, PAPER_SITE_SNAPSHOT: snapshot, PAPER_SITE_ITEM: ID, PAPER_SITE_CARD: card, ASTRO_TELEMETRY_DISABLED: '1' },
      stdio: 'pipe',
    });
    return fs.readFileSync(join(dist, 'index.html'), 'utf8');
  });
}

describe('a paper site built from a snapshot', () => {
  it('draws the entry as /publications/ does', async () => {
    const site = fs.readFileSync('dist/publications/index.html', 'utf8'); // the site's build (npm test builds first)
    const mine = article(await build('paperHighlight'), ID);
    expect(mine).toContain(`id="pub-${ID}"`);
    expect(mine.replace(/[A-Za-z0-9_-]{8}\.(css|js|webp|png|svg)/g, 'H')).toBe(article(site, ID).replace(/[A-Za-z0-9_-]{8}\.(css|js|webp|png|svg)/g, 'H'));
  }, 180_000);

  // A card draws every part and its name chooses which show: the stylesheet shows
  // the context link only on a card with data-context.
  it('draws paperSite without the context link', async () => {
    const cardTag = (html) => html.match(/<article class="card"[^>]*>/)[0];
    expect(cardTag(article(await build('paperHighlight'), ID))).toMatch(/\sdata-context\b/);
    expect(cardTag(article(await build('paperSite'), ID))).not.toMatch(/\sdata-context\b/);
  }, 180_000);

  it('exports every name the store has', () => {
    const names = Object.keys(createStore({ items: [], config: { collaborators: { people: [] }, acknowledgements: { papers: [] }, journals: {}, stars: { stars: {} } } }));
    const src = fs.readFileSync('tests/fixtures/paper-site/src/store.js', 'utf8');
    for (const n of names) expect(src, n).toMatch(new RegExp(`\\b${n}\\b`));
  });
});
