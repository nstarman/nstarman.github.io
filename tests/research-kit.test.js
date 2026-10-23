// @nstarkman/data-resolver's collect(): what a paper site snapshots of this site's
// data. It must read the same from disk and from GitHub, and a store built from it
// must give what the site's own store gives for that item.
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { collect } from '@nstarkman/data-resolver/collect.js';
import { fromDisk, fromGitHub } from '@nstarkman/data-resolver/readers.js';
import { createStore } from '@nstarkman/data-resolver/store.js';
import * as site from '../src/lib/data.js';

const CARD_TYPES = ['publication', 'highlight', 'software'];
const ids = site.items.filter((i) => CARD_TYPES.includes(i.type)).map((i) => i.id);

// GitHub, served from this checkout: the tree API, then raw files.
const fakeFetch = async (url) => {
  const ok = (body) => ({ ok: true, json: async () => body, text: async () => body });
  if (url.endsWith('/commits/main')) return ok({ sha: 'abc123' });
  if (url.includes('/git/trees/')) {
    const tree = [...fs.readdirSync('data').map((f) => `data/${f}`), ...fs.readdirSync('config').map((f) => `config/${f}`)];
    return ok({ tree: tree.map((path) => ({ path })) });
  }
  const path = url.replace('https://raw.githubusercontent.com/nstarman/nstarman.github.io/abc123/', '');
  return fs.existsSync(path) ? ok(fs.readFileSync(path, 'utf8')) : { ok: false, status: 404 };
};
const github = () => fromGitHub({ repo: 'nstarman/nstarman.github.io', fetch: fakeFetch });

describe('collect', () => {
  it('reads every card item the same from disk and from GitHub', async () => {
    for (const id of ids) {
      const a = await collect(id, fromDisk('.'));
      const b = await collect(id, github());
      expect({ ...a, source: null }, id).toEqual({ ...b, source: null });
    }
  });

  it('keeps the commit it read, and no internal notes', async () => {
    const s = await collect('stream-convexity-spatial', github());
    expect(s.source).toEqual({ repo: 'nstarman/nstarman.github.io', ref: 'main', sha: 'abc123' });
    expect(s.items.some((i) => 'internal' in i)).toBe(false);
    expect(s.card).toEqual({ preset: 'paperSite' });
  });

  it('gives a store that draws the item as the site does', async () => {
    for (const id of ids) {
      const snap = await collect(id, fromDisk('.'));
      const store = createStore(snap);
      const mine = site.resolve(id);
      const theirs = store.resolve(id);
      for (const f of ['authors', 'links', 'venueLine', 'year', 'authorPosition', 'primaryLink', 'splitTitle']) {
        expect(store[f](theirs), `${id} ${f}`).toEqual(site[f](mine));
      }
      expect(store.softwareUsed([theirs]).map((s) => s.id), id).toEqual(site.softwareUsed([mine]).map((s) => s.id));
      if (mine.type === 'software') expect(store.softwarePapers(theirs), id).toEqual(site.softwarePapers(mine));
    }
  });

  it('fails on a read that fails, rather than leaving a file out', async () => {
    const reader = fromDisk('.');
    const flaky = { ...reader, read: async (p) => { if (p.startsWith('cards/')) throw new Error('GET …: 403'); return reader.read(p); } };
    await expect(collect('potamides-apj', flaky)).rejects.toThrow(/403/);
    const github403 = fromGitHub({ repo: 'nstarman/nstarman.github.io', fetch: async (url) => (url.includes('/cards/') ? { ok: false, status: 403 } : fakeFetch(url)) });
    await expect(collect('potamides-apj', github403)).rejects.toThrow(/403/);
  });

  it('fails naming a missing file and what referred to it', async () => {
    const reader = fromDisk('.');
    const index = await reader.index();
    const broken = { ...reader, index: async () => new Map([...index].filter(([k]) => k !== 'potamides')) };
    await expect(collect('potamides-apj', broken)).rejects.toThrow(/potamides.*potamides-apj/);
  });
});

describe('cards/<id>.json', () => {
  it('validates and names a preset that exists', async () => {
    const { default: Ajv } = await import('ajv/dist/2020.js');
    const { PRESET } = await import('@nstarkman/card-builder/cards.js');
    const validate = new Ajv().compile(JSON.parse(fs.readFileSync('schema/card.schema.json', 'utf8')));
    const files = fs.existsSync('cards') ? fs.readdirSync('cards').filter((f) => f.endsWith('.json')) : [];
    for (const f of files) {
      const card = JSON.parse(fs.readFileSync(`cards/${f}`, 'utf8'));
      expect(validate(card), `${f}: ${JSON.stringify(validate.errors)}`).toBe(true);
      expect(PRESET, f).toHaveProperty(card.preset);
      expect(site.resolve(f.replace(/\.json$/, '')), `${f}: no such item`).toBeTruthy();
    }
    expect(PRESET).toHaveProperty('paperSite');
    // The schema itself, whether or not cards/ has files yet.
    expect(validate({ preset: 'paperSite' })).toBe(true);
    expect(validate({ preset: 'paperSite', title: 'a fact' })).toBe(false);
    expect(validate({})).toBe(false);
  });

  it('a card choice reaches the snapshot', async () => {
    const reader = fromDisk('.');
    const withCard = { ...reader, read: async (p) => (p === 'cards/potamides-apj.json' ? '{"preset":"carousel"}' : reader.read(p)) };
    expect((await collect('potamides-apj', withCard)).card).toEqual({ preset: 'carousel' });
  });
});

describe('a paper’s grants', () => {
  it('are collected from its refs, and change nothing else', async () => {
    const reader = fromDisk('.');
    const grant = site.byType('grant')[0];
    const paper = { ...site.resolve('stream-convexity-spatial'), refs: [...(site.resolve('stream-convexity-spatial').refs ?? []), grant.id] };
    const withGrant = { ...reader, read: async (p) => (p.endsWith('-stream-convexity-spatial.json') ? JSON.stringify(paper) : reader.read(p)) };
    const s = await collect('stream-convexity-spatial', withGrant);
    expect(s.items.map((i) => i.id)).toContain(grant.id);
    const store = createStore(s);
    const theirs = store.resolve('stream-convexity-spatial');
    expect(store.softwareUsed([theirs]).map((x) => x.id)).toEqual(site.softwareUsed([site.resolve('stream-convexity-spatial')]).map((x) => x.id));
    expect(store.authors(theirs)).toEqual(site.authors(site.resolve('stream-convexity-spatial')));
  });
});

describe('the kit', () => {
  const pkg = (n) => JSON.parse(fs.readFileSync(`packages/${n}/package.json`, 'utf8'));
  const KIT = ['data-resolver', 'card-builder', 'collaborator-map', 'research-kit'];
  it('is one version, its packages depending on each other at exactly it', () => {
    const v = pkg('research-kit').version;
    expect(v).toMatch(/^\d{8}\.0\.\d+$/);
    for (const n of KIT) {
      expect(pkg(n).version, n).toBe(v);
      for (const [dep, want] of Object.entries(pkg(n).dependencies ?? {})) {
        if (dep.startsWith('@nstarkman/')) expect(want, `${n} → ${dep}`).toBe(v);
      }
      expect(fs.readFileSync(`packages/${n}/CHANGELOG.md`, 'utf8'), n).toContain(`\n## ${v}\n`);
    }
  });
});
