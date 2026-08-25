// Every internal link in the built site must resolve.
//
// Run against dist/, so it checks what is actually published rather than what
// the source implies. This catches the class of mistake that CI cannot see any
// other way: a route renamed in one place and referenced from another, a
// cross-reference to an item that a preset does not render, a PDF a page links
// to but the build never produced.
//
//   node scripts/test-links.mjs

import fs from 'node:fs';
import path from 'node:path';

const DIST = 'dist';
if (!fs.existsSync(DIST)) {
  console.error('no dist/ — run npm run build first');
  process.exit(1);
}

/** Every file under dist/, as site-absolute paths. */
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else out.push('/' + path.relative(DIST, full).split(path.sep).join('/'));
  }
  return out;
}

const files = new Set(walk(DIST));
const pages = [...files].filter((f) => f.endsWith('.html'));

/** Does a site-absolute href exist in the build? */
function exists(href) {
  if (files.has(href)) return true;
  // Astro's directory format: /cv/ is served from /cv/index.html
  const asDir = href.endsWith('/') ? `${href}index.html` : `${href}/index.html`;
  return files.has(asDir);
}

let broken = 0;
let checked = 0;
let anchors = 0;

// The CV pages link to PDFs that a separate step compiles. If none were built
// the links cannot be checked — say so rather than reporting them missing, and
// rather than passing in silence.
const pdfsBuilt = [...files].some((f) => f.endsWith('.pdf'));
let unbuilt = 0;

for (const page of pages) {
  const html = fs.readFileSync(path.join(DIST, page.slice(1)), 'utf8');
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));

  for (const [, href] of html.matchAll(/\bhref="([^"]+)"/g)) {
    // External, mail and in-page-only links are not this script's business.
    if (/^(https?:|mailto:|#|data:)/.test(href)) {
      if (href.startsWith('#')) {
        anchors += 1;
        if (!ids.has(href.slice(1))) {
          console.log(`  BROKEN ANCHOR  ${page} -> ${href}`);
          broken += 1;
        }
      }
      continue;
    }
    if (!href.startsWith('/')) continue; // relative links: none are emitted today

    const [target, hash] = href.split('#');
    checked += 1;
    if (!exists(target)) {
      if (target.endsWith('.pdf') && !pdfsBuilt) {
        unbuilt += 1;
        continue;
      }
      console.log(`  MISSING        ${page} -> ${href}`);
      broken += 1;
      continue;
    }
    if (!hash) continue;

    // A cross-page anchor: the target page must actually carry that id.
    const file = files.has(target) ? target : `${target.replace(/\/$/, '')}/index.html`;
    if (!file.endsWith('.html')) continue;
    anchors += 1;
    const targetHtml = fs.readFileSync(path.join(DIST, file.slice(1)), 'utf8');
    if (!new RegExp(`\\bid="${hash.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`).test(targetHtml)) {
      console.log(`  BROKEN ANCHOR  ${page} -> ${href}`);
      broken += 1;
    }
  }
}

// The published records declare a $schema relative to themselves; if that does
// not resolve, every editor that reads it is silently unvalidated.
const records = [...files].filter((f) => f.startsWith('/records/') && f.endsWith('.json'));
for (const rec of records.slice(0, 5)) {
  const declared = JSON.parse(fs.readFileSync(path.join(DIST, rec.slice(1)), 'utf8')).$schema;
  if (!declared) continue;
  const resolved = new URL(declared, `https://example.test${rec}`).pathname;
  checked += 1;
  if (!exists(resolved)) {
    console.log(`  MISSING SCHEMA ${rec} -> ${declared} (${resolved})`);
    broken += 1;
  }
}

if (unbuilt > 0) {
  console.log(`  skipped  ${unbuilt} PDF link(s) — run npm run build:pdf to check them`);
}
console.log(
  broken === 0
    ? `  ok       ${checked - unbuilt} internal link(s) and ${anchors} anchor(s) across ${pages.length} pages`
    : `  ${broken} broken link(s)`,
);
process.exit(broken ? 1 : 0);
