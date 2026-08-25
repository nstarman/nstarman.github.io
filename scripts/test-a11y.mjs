// Every link must have an href, and every link and heading an accessible name.
//
// A name can come from inner text, aria-label, aria-labelledby, an <img alt>,
// or an <svg><title>. A `title` attribute alone does not count: it is not
// exposed by every assistive technology and never on touch, so it is reported
// as a weak name rather than accepted.
//
// Runs over dist/, so it checks what is actually served rather than the source.

import fs from 'node:fs';
import path from 'node:path';

const DIST = 'dist';

function html(dir = DIST, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) html(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const attr = (tag, name) => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? '';
const strip = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').trim();

/** Elements whose content is hidden from the tree cannot supply a name. */
const visibleInner = (inner) =>
  inner.replace(/<svg[^>]*aria-hidden="true"[\s\S]*?<\/svg>/g, '');

function check(file) {
  const src = fs.readFileSync(file, 'utf8');
  const problems = [];

  const scan = (re, kind) => {
    for (const m of src.matchAll(re)) {
      const [, tag, inner] = m;
      if (attr(tag, 'aria-hidden') === 'true') continue;
      if (/\shidden(\s|=|$)/.test(tag)) continue;
      // A missing href makes the element inert and drops it out of the tab
      // order entirely — worth catching before the naming question.
      if (kind === 'link' && !/\shref=/.test(tag)) {
        problems.push(`link has no href: ${tag.slice(0, 90)}`);
        continue;
      }
      const named =
        attr(tag, 'aria-label').trim() ||
        attr(tag, 'aria-labelledby').trim() ||
        strip(visibleInner(inner)) ||
        /<img[^>]+alt="[^"]+"/.test(inner) ||
        /<svg[\s\S]*?<title>[^<]+<\/title>/.test(inner);
      if (named) continue;
      const weak = attr(tag, 'title').trim();
      problems.push(
        `${kind} has ${weak ? 'only a title attribute' : 'no accessible name'}: ` +
          `${tag.slice(0, 90)}`,
      );
    }
  };

  scan(/<(a\b[^>]*)>([\s\S]*?)<\/a>/g, 'link');
  scan(/<(h[1-6]\b[^>]*)>([\s\S]*?)<\/h[1-6]>/g, 'heading');
  return problems;
}

let total = 0;
for (const file of html()) {
  const problems = check(file);
  total += problems.length;
  if (problems.length) {
    console.log(`  ${file}`);
    for (const p of problems) console.log(`      ${p}`);
  }
}

if (total === 0) {
  const n = html().length;
  console.log(`  ok       every link and heading across ${n} pages has an accessible name`);
} else {
  console.log(`\n  ${total} element(s) without an accessible name`);
}
process.exit(total ? 1 : 0);
