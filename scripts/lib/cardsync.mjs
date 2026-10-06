// A fingerprint of what draws a card in the browser, so the browser-free
// renderer (src/lib/cardlayout.js) cannot fall behind it unnoticed.
//
// It hashes the card's CSS — every rule of src/styles/global.css that names a
// card, its parts or its link buttons, and the tokens on :root — and the
// markup of Card.astro, ignoring comments and whitespace. tests/cardlayout.test.js
// compares it with the one recorded beside the browser's measurements
// (tests/fixtures/software-cards.json); when they differ the card has changed
// and scripts/record-card-layouts.mjs re-measures it, so the renderer is
// compared with the new CSS rather than the old.

import crypto from 'node:crypto';
import fs from 'node:fs';

const CARD_RULE = /\.card\b|\.c-|\.iconbtn|\.iconyear|\.btns\b|\.ico\b|^:root\s*$|^:root\[/;

const squash = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\s+/g, ' ').trim();

/** The card rules of a stylesheet, one string each, in order. */
export function cardRules(css) {
  const rules = [];
  // Flat rules and the rules inside one @media level: split on the closing
  // brace, keeping the selector and body together.
  for (const chunk of squash(css).split('}')) {
    const [sel, ...body] = chunk.split('{');
    const selector = sel.trim().replace(/^@media[^{]*$/, '');
    if (selector && CARD_RULE.test(selector)) rules.push(`${selector}{${body.join('{').trim()}}`);
  }
  return rules;
}

export function syncKey(root = '.') {
  const css = fs.readFileSync(`${root}/src/styles/global.css`, 'utf8');
  const markup = squash(fs.readFileSync(`${root}/src/components/Card.astro`, 'utf8'));
  return crypto.createHash('sha1').update(cardRules(css).join('\n')).update('\n--\n').update(markup).digest('hex').slice(0, 12);
}
