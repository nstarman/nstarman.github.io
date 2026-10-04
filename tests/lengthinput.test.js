import { describe, it, expect } from 'vitest';
import { clampLength, stepLength, convertLength, readSavedLength, isDefault } from '../src/lib/lengthinput.js';

describe('length fields', () => {
  it('steps by 0.5 in multiples and by 1 in points, within limits', () => {
    expect(stepLength(1, 'x', 1)).toBe(1.5);
    expect(stepLength(0, 'x', -1)).toBe(0);
    expect(stepLength(4, 'x', 1)).toBe(4);
    expect(stepLength(9.9, 'pt', 1)).toBe(10.9);
    expect(stepLength(72, 'pt', 1)).toBe(72);
  });

  it('takes a typed value, held to limits, and refuses what is not a number', () => {
    expect(clampLength(' 1.25 ', 'x')).toBe(1.25);
    expect(clampLength('9', 'x')).toBe(4);
    expect(clampLength('-3', 'pt')).toBe(0);
    expect(clampLength('abc', 'pt')).toBeNull();
    expect(clampLength('', 'x')).toBeNull();
  });

  it('keeps the length when the unit changes', () => {
    expect(convertLength(1.5, 'x', 'pt', 6.6)).toBe(9.9);
    expect(convertLength(14, 'pt', 'x', 7)).toBe(2);
    expect(convertLength(3, 'x', 'x', 7)).toBe(3);
  });

  it('reads a saved gap, old or new, and rejects nonsense', () => {
    expect(readSavedLength(1.5)).toEqual({ value: 1.5, unit: 'x' });
    expect(readSavedLength({ value: 12, unit: 'pt' })).toEqual({ value: 12, unit: 'pt' });
    expect(readSavedLength({ value: 12, unit: 'x' })).toBeNull();
    expect(readSavedLength({ value: '2', unit: 'x' })).toBeNull();
    expect(readSavedLength(null)).toBeNull();
    expect(isDefault({ value: 1, unit: 'x' })).toBe(true);
    expect(isDefault({ value: 1, unit: 'pt' })).toBe(false);
  });
});
