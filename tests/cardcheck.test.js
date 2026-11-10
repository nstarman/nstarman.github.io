// The comparison of the offline card with the browser's (scripts/check-cards.mjs, compareModels):
// controls that it can fail, and that what it is meant to let through, it does.
import { describe, expect, it } from 'vitest';
import { compareModels } from '../scripts/check-cards.mjs';

const text = (s, x, y, o = {}) => ({ k: 'text', x, y, w: 50, h: 20, s, font: 'IBM Plex Sans', weight: 400, style: 'normal', size: 16, color: '#112233ff', ls: 0, href: null, ...o });
const box = (x, y, w, h, o = {}) => ({ k: 'box', x, y, w, h, r: [8, 8, 8, 8], fill: '#f5f7faff', stroke: null, sw: 0, href: null, ...o });
const icon = (x, y, fill = '#5a6472') => ({ k: 'svg', x, y, w: 15, h: 15, href: null, svg: `<svg viewBox="0 0 24 24" fill="${fill}" stroke="none"><path fill="${fill}" d="M0 0h1v1z"/></svg>` });
const model = (ops) => ({ title: 'T', w: 400, h: 200, r: [18, 18, 18, 18], ops });
const base = () => model([box(0, 0, 400, 200), text('Hello', 20, 20), text('there', 20, 40), box(20, 100, 60, 30, { stroke: '#cfd6e0ff', sw: 1 }), icon(30, 108)]);
const clone = (m) => JSON.parse(JSON.stringify(m));
const differ = (change) => { const e = clone(base()); change(e); return compareModels(base(), e); };

describe('compareModels', () => {
  it('passes a card with itself, at no distance', () => {
    expect(compareModels(base(), clone(base()))).toMatchObject({ ok: true, worst: 0, problems: [] });
  });

  it('passes what is within half a pixel', () => {
    const r = differ((e) => { e.ops[1].x += 0.4; e.ops[1].y -= 0.4; e.h += 0.3; e.ops[3].x += 0.2; });
    expect(r.ok).toBe(true);
    expect(r.worst).toBeCloseTo(0.4, 6);
  });

  it('fails a line a pixel from where the browser has it, naming it and by how much', () => {
    const r = differ((e) => { e.ops[1].x += 1; });
    expect(r.ok).toBe(false);
    expect(r.problems).toEqual(['text "Hello" x: 20 in the browser, 21 in the engine']);
  });

  it('fails a card of another height or width', () => {
    expect(differ((e) => { e.h += 1; }).problems).toEqual(['card height: 200 in the browser, 201 in the engine']);
    expect(differ((e) => { e.w -= 2; }).problems).toEqual(['card width: 400 in the browser, 398 in the engine']);
  });

  it('fails a line that is missing, and one that is extra', () => {
    expect(differ((e) => { e.ops.splice(2, 1); }).problems).toEqual(['missing text "there" at 20.0, 40.0']);
    expect(differ((e) => { e.ops.push(text('stray', 20, 60)); }).problems).toEqual(['extra text "stray" at 20.0, 60.0']);
  });

  it('fails a line in another face, size, colour or link', () => {
    expect(differ((e) => { e.ops[1].weight = 500; }).problems).toEqual(['text "Hello" weight: 400 in the browser, 500 in the engine']);
    expect(differ((e) => { e.ops[1].size = 17; }).problems[0]).toMatch(/size: 16 in the browser, 17/);
    expect(differ((e) => { e.ops[1].color = '#112240ff'; }).problems[0]).toMatch(/colour: #112233ff in the browser, #112240ff/);
    expect(differ((e) => { e.ops[1].href = 'https://x/'; }).problems[0]).toMatch(/href: null in the browser, https:\/\/x\//);
  });

  it('lets a colour differ by a unit in a channel, which is how the two round, but not by more', () => {
    expect(differ((e) => { e.ops[1].color = '#112234ff'; }).ok).toBe(true);
    expect(differ((e) => { e.ops[1].color = '#112236ff'; }).ok).toBe(false);
  });

  it('fails a box that is missing or extra, and a fill, border or corner that differs', () => {
    expect(differ((e) => { e.ops.splice(3, 1); }).problems[0]).toMatch(/^missing box 20\.0,100\.0,60\.0,30\.0/);
    expect(differ((e) => { e.ops.push(box(5, 5, 10, 10)); }).problems[0]).toMatch(/^extra box 5\.0,5\.0,10\.0,10\.0/);
    expect(differ((e) => { e.ops[3].fill = '#000000ff'; }).problems[0]).toMatch(/fill: #f5f7faff in the browser, #000000ff/);
    expect(differ((e) => { e.ops[3].sw = 2; }).problems[0]).toMatch(/border: 1 in the browser, 2/);
    expect(differ((e) => { e.ops[3].r = [8, 8, 8, 4]; }).problems[0]).toMatch(/corner 3: 8 in the browser, 4/);
  });

  it('fails an icon that is elsewhere, or drawn in another colour or shape', () => {
    expect(differ((e) => { e.ops[4].x += 2; }).problems.map((p) => p.split(' ')[0])).toEqual(['missing', 'extra']);
    expect(differ((e) => { e.ops[4] = icon(30, 108, '#ff0000'); }).problems[0]).toMatch(/^svg 30\.0,108\.0,15\.0,15\.0 drawing differs/);
    expect(differ((e) => { e.ops[4].svg = e.ops[4].svg.replace('M0 0h1v1z', 'M0 0h2v2z'); }).ok).toBe(false);
  });

  it('takes a clamped last line as the same where the engine kept the character the browser dropped', () => {
    const browser = model([box(0, 0, 400, 200), text('package for astronomy i…', 20, 20)]);
    const engine = model([box(0, 0, 400, 200), text('package for astronomy in…', 20, 20)]);
    expect(compareModels(browser, engine).ok).toBe(true);
    // …but not a different line that happens to end in one
    const other = model([box(0, 0, 400, 200), text('somewhere else entirely…', 20, 20)]);
    expect(compareModels(browser, other).ok).toBe(false);
  });

  it('fails a byline with one name more than the browser shows, naming it', () => {
    const browser = model([box(0, 0, 400, 200), text('J. Nibauer', 20, 20), text(', et al.', 80, 20)]);
    const engine = model([box(0, 0, 400, 200), text('J. Nibauer', 20, 20), text(', N. Starkman', 80, 20), text(', et al.', 150, 20)]);
    const r = compareModels(browser, engine);
    expect(r.ok).toBe(false);
    expect(r.problems).toContain('extra text ", N. Starkman" at 80.0, 20.0');
  });

  it('is not fooled by the order of the operations', () => {
    expect(differ((e) => { e.ops.reverse(); }).ok).toBe(true);
  });
});
