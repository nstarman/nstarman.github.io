// The Agent Skills on /tools/: nstarman/skills' index.json, mapped by scripts/skills-index.mjs.
import { describe, expect, it } from 'vitest';
import doc from '/config/skills.json';
import { skillsFromIndex } from '../scripts/skills-index.mjs';

const skill = (name, origin = 'local', extra = {}) => ({
  name, description: `${name} does things.`, origin,
  href: `https://github.com/${origin === 'local' ? 'nstarman/skills' : 'o/r'}/tree/main/${name}`,
  source: { repo: origin === 'local' ? 'nstarman/skills' : 'o/r', path: name, ref: 'main' }, ...extra,
});
const index = (skills) => ({ schema: 1, marketplace: 'nstarman-skills', skills });

describe('skillsFromIndex', () => {
  it('keeps name, description and link, and says where an external skill lives', () => {
    expect(skillsFromIndex(index([skill('a'), skill('b', 'external')]))).toEqual([
      { name: 'a', description: 'a does things.', href: 'https://github.com/nstarman/skills/tree/main/a' },
      { name: 'b', description: 'b does things.', href: 'https://github.com/o/r/tree/main/b', from: 'o/r' },
    ]);
  });
  it('refuses another schema, an empty list and malformed skills, rather than empty the section', () => {
    expect(() => skillsFromIndex({ ...index([skill('a')]), schema: 2 })).toThrow(/schema 2/);
    expect(() => skillsFromIndex(index([]))).toThrow(/no skills/);
    expect(() => skillsFromIndex(index([skill('a', 'local', { description: ' ' })]))).toThrow(/description/);
    expect(() => skillsFromIndex(index([skill('a', 'elsewhere')]))).toThrow(/origin/);
    expect(() => skillsFromIndex(index([skill('a', 'local', { href: 'http://x' })]))).toThrow(/github\.com/);
    expect(() => skillsFromIndex(index([skill('a'), skill('a')]))).toThrow(/duplicate/);
    expect(() => skillsFromIndex(index([skill('b', 'external', { source: {} })]))).toThrow(/source\.repo/);
  });
});

describe('config/skills.json', () => {
  it('is a well-formed snapshot: unique names, GitHub links, "from" only as a repo', () => {
    expect(doc.skills.length).toBeGreaterThan(0);
    expect(new Set(doc.skills.map((s) => s.name)).size).toBe(doc.skills.length);
    for (const s of doc.skills) {
      expect(Object.keys(s).every((k) => ['name', 'description', 'href', 'from'].includes(k)), s.name).toBe(true);
      expect(s.href, s.name).toMatch(/^https:\/\/github\.com\//);
      if (s.from !== undefined) expect(s.from, s.name).toMatch(/^[\w.-]+\/[\w.-]+$/);
    }
  });
});
