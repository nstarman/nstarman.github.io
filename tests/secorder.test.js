import { describe, expect, it } from 'vitest';
import { move } from '../src/lib/secorder.js';

describe('move', () => {
  const o = ['a', 'b', 'c'];
  it('swaps with the neighbour', () => {
    expect(move(o, 'b', -1)).toEqual(['b', 'a', 'c']);
    expect(move(o, 'b', 1)).toEqual(['a', 'c', 'b']);
  });
  it('stays put at either end, and for a stranger', () => {
    expect(move(o, 'a', -1)).toBe(o);
    expect(move(o, 'c', 1)).toBe(o);
    expect(move(o, 'x', 1)).toBe(o);
  });
});
