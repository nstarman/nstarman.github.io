import { readFileSync } from 'node:fs';
import { test, expect } from 'vitest';

// .fmtrow is a two-column grid: each subject (.fmtsub) is followed by exactly
// one .fmtline. A stray line takes the subject column and pushes every control
// after it off the panel.
test('each settings subject has exactly one line of options', () => {
  const src = readFileSync('src/components/CvFmtRow.astro', 'utf8');
  const count = (re) => [...src.matchAll(re)].length;
  const lines = count(/<span class="fmtline">/g);
  const subs = count(/<span class="fmtsub">/g);
  expect(lines).toBeGreaterThan(0);
  expect(lines).toBe(subs);
});
