import { describe, expect, it } from 'vitest';
import { move, gather, moveGrouped, GROUP } from '../src/lib/secorder.js';

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

describe('a grouped CV', () => {
  const M = ['org', 'att', 'pr'];
  it('gathers the members where the first stands, in their order', () => {
    expect(gather(['a', 'att', 'b', 'org', 'c', 'pr'], M)).toEqual(['a', 'att', 'org', 'pr', 'b', 'c']);
    expect(gather(['a', 'b'], M)).toEqual(['a', 'b']);
  });

  it('moves a member only among the members', () => {
    const order = ['a', 'org', 'att', 'pr', 'b'];
    expect(moveGrouped(order, 'att', -1, M)).toEqual(['a', 'att', 'org', 'pr', 'b']);
    expect(moveGrouped(order, 'org', -1, M)).toEqual(order);
    expect(moveGrouped(order, 'pr', 1, M)).toEqual(order);
  });

  it('moves the group, and the sections around it, past the whole group', () => {
    const order = ['a', 'org', 'att', 'pr', 'b'];
    expect(moveGrouped(order, GROUP, -1, M)).toEqual(['org', 'att', 'pr', 'a', 'b']);
    expect(moveGrouped(order, 'b', -1, M)).toEqual(['a', 'b', 'org', 'att', 'pr']);
    expect(moveGrouped(order, 'a', 1, M)).toEqual(['org', 'att', 'pr', 'a', 'b']);
  });
});
