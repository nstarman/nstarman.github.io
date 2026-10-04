import { describe, it, expect } from 'vitest';
import { stepValue, convertValue } from '../src/lib/numbox.js';
import { readSavedSpacing } from '../src/lib/cvspacing.js';

describe('number boxes', () => {
  it('step as the Card Builder always has: whole, or to a tenth', () => {
    expect(stepValue(26, 5, 0, 800)).toBe(31);
    expect(stepValue(3, -5, 0, 800)).toBe(0);
    expect(stepValue(798, 5, 0, 800)).toBe(800);
    expect(stepValue(15.5, 1, 8, 40, 0.1)).toBe(16.5);
  });

  it('step by a fraction to its own precision', () => {
    expect(stepValue(1, 0.5, 0, 4, 0.01)).toBe(1.5);
    expect(stepValue(0.25, -0.5, 0, 4, 0.01)).toBe(0);
    expect(stepValue(9.9, 1, 0, 72, 0.1)).toBe(10.9);
  });

  it('carry a value across units so it keeps its size', () => {
    expect(convertValue(1.5, 6.6, 1, 0.1)).toBe(9.9);
    expect(convertValue(14, 1, 7, 0.01)).toBe(2);
  });
});

describe('CV spacing', () => {
  it('reads a saved spacing, old or new, and rejects nonsense', () => {
    expect(readSavedSpacing(1.5)).toEqual({ value: 1.5, unit: 'x' });
    expect(readSavedSpacing({ value: 12, unit: 'pt' })).toEqual({ value: 12, unit: 'pt' });
    expect(readSavedSpacing({ value: 12, unit: 'x' })).toBeNull();
    expect(readSavedSpacing({ value: '2', unit: 'x' })).toBeNull();
    expect(readSavedSpacing(null)).toBeNull();
  });
});
