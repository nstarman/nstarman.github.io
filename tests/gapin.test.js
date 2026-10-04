import { describe, it, expect } from 'vitest';
import { clampGap, stepGap, convertGap, readSavedGap, isDefault } from '../src/lib/gapin.js';

describe('gap fields', () => {
  it('steps by 0.5 in multiples and by 1 in points, within limits', () => {
    expect(stepGap(1, 'x', 1)).toBe(1.5);
    expect(stepGap(0, 'x', -1)).toBe(0);
    expect(stepGap(4, 'x', 1)).toBe(4);
    expect(stepGap(9.9, 'pt', 1)).toBe(10.9);
    expect(stepGap(72, 'pt', 1)).toBe(72);
  });

  it('takes a typed value, held to limits, and refuses what is not a number', () => {
    expect(clampGap(' 1.25 ', 'x')).toBe(1.25);
    expect(clampGap('9', 'x')).toBe(4);
    expect(clampGap('-3', 'pt')).toBe(0);
    expect(clampGap('abc', 'pt')).toBeNull();
    expect(clampGap('', 'x')).toBeNull();
  });

  it('keeps the length when the unit changes', () => {
    expect(convertGap(1.5, 'x', 'pt', 6.6)).toBe(9.9);
    expect(convertGap(14, 'pt', 'x', 7)).toBe(2);
    expect(convertGap(3, 'x', 'x', 7)).toBe(3);
  });

  it('reads a saved gap, old or new, and rejects nonsense', () => {
    expect(readSavedGap(1.5)).toEqual({ value: 1.5, unit: 'x' });
    expect(readSavedGap({ value: 12, unit: 'pt' })).toEqual({ value: 12, unit: 'pt' });
    expect(readSavedGap({ value: 12, unit: 'x' })).toBeNull();
    expect(readSavedGap({ value: '2', unit: 'x' })).toBeNull();
    expect(readSavedGap(null)).toBeNull();
    expect(isDefault({ value: 1, unit: 'x' })).toBe(true);
    expect(isDefault({ value: 1, unit: 'pt' })).toBe(false);
  });
});
