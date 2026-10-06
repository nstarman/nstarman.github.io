import { describe, expect, it } from 'vitest';
import { MAX_ZOOM, inView, viewFor, zoomAbout } from '../src/lib/mapzoom.js';

const W = 1000;
const H = 500;
const whole = { x: 0, y: 0, w: W, h: H };

describe('map zoom', () => {
  it('shows the whole map at 1x, however it is asked for', () => {
    expect(viewFor(W, H, 1, 123, 456)).toEqual(whole);
  });

  it('never leaves the map: a view centred past an edge slides back inside', () => {
    expect(viewFor(W, H, 4, 0, 0)).toEqual({ x: 0, y: 0, w: 250, h: 125 });
    expect(viewFor(W, H, 4, W, H)).toEqual({ x: 750, y: 375, w: 250, h: 125 });
  });

  it('zooms about the centre for a button, and about the cursor for a wheel', () => {
    expect(zoomAbout(W, H, whole, 2)).toEqual({ x: 250, y: 125, w: 500, h: 250 });
    // The point under the cursor stays under it: fraction .25 of the view is
    // user x = 250 before, and still is after.
    const v = zoomAbout(W, H, whole, 2, 0.25, 0.25);
    expect(v.x + 0.25 * v.w).toBeCloseTo(250);
    expect(v.y + 0.25 * v.h).toBeCloseTo(125);
  });

  it('clamps the zoom between the whole map and MAX_ZOOM', () => {
    expect(zoomAbout(W, H, whole, 0.2)).toEqual(whole);
    expect(zoomAbout(W, H, whole, 1e6).w).toBe(W / MAX_ZOOM);
  });

  it('knows which points are on screen, edges included', () => {
    const v = { x: 100, y: 50, w: 250, h: 125 };
    expect(inView(v, 100, 50)).toBe(true);
    expect(inView(v, 350, 175)).toBe(true);
    expect(inView(v, 99, 100)).toBe(false);
    expect(inView(v, 200, 176)).toBe(false);
  });
});
