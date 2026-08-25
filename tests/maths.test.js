// Maths in abstracts. Two things worth pinning: that TeX becomes MathML, and
// that TeX which was never delimited does not slip through as literal braces —
// abstracts are pasted from ADS, which is where the undelimited kind comes from.

import { describe, expect, it } from 'vitest';
import { mathParts } from '../src/lib/maths.js';
import { byType } from '../src/lib/data.js';

const text = (parts) => parts.map((p) => (p.maths ? '⟨maths⟩' : p.text)).join('');

describe('mathParts', () => {
  it('turns inline TeX into MathML', () => {
    const [, maths] = mathParts('mass $M_\\star$');
    expect(maths.maths).toBe(true);
    expect(maths.html).toContain('<math>');
    expect(maths.html).toContain('<msub>');
  });

  it('leaves the prose around it alone', () => {
    expect(text(mathParts('a $x$ b $y$ c'))).toBe('a ⟨maths⟩ b ⟨maths⟩ c');
  });

  it('returns one plain part when there is no maths', () => {
    expect(mathParts('no maths here')).toEqual([{ maths: false, text: 'no maths here' }]);
  });

  it('handles an empty or missing abstract', () => {
    expect(mathParts(undefined)).toEqual([{ maths: false, text: '' }]);
    expect(mathParts('')).toEqual([{ maths: false, text: '' }]);
  });

  it('falls back to the source rather than failing a build on bad TeX', () => {
    const [part] = mathParts('$\\thisIsNotACommand{$');
    expect(part.maths).toBe(true);
    expect(part.html).toContain('class="tex"');
    // and it is escaped, since it is no longer MathML
    expect(part.html).not.toContain('<script');
  });

  it('escapes the fallback, so an abstract cannot inject markup', () => {
    const [part] = mathParts('$\\bad <img src=x onerror=alert(1)>$');
    expect(part.html).not.toContain('<img');
    expect(part.html).toContain('&lt;img');
  });
});

describe('the abstracts themselves', () => {
  const abstracts = byType('publication').map((p) => p.abstract).filter(Boolean);

  it('has some maths to render, or this feature is dead code', () => {
    expect(abstracts.some((a) => a.includes('$'))).toBe(true);
  });

  it('never leaves TeX outside $…$, which would print as literal braces', () => {
    // ADS abstracts arrive with things like q = 0.95^{+0.05}_{-0.10} and no
    // delimiters. Nothing renders those, so they have to be caught here.
    const stray = [];
    for (const a of abstracts) {
      const prose = a.replace(/\$[^$]+\$/g, '');
      const hits = prose.match(/\^\{[^}]*\}|_\{[^}]*\}|\\[a-zA-Z]{2,}/g);
      if (hits) stray.push(`${hits.join(', ')} in: …${prose.slice(0, 60)}…`);
    }
    expect(stray).toEqual([]);
  });
});
