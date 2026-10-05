// A schema that accepts everything passes `npm run validate` and is worthless,
// so this asserts both directions: every real item validates, and every fixture
// in schema/invalid/ is rejected. Each fixture breaks exactly one rule and is
// named for it — add one whenever you add a constraint.

import fs from 'node:fs';
import Ajv from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';

const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const compile = (schema) => new Ajv({ allErrors: true, strict: false }).compile(read(schema));
const files = (glob) => fs.globSync(glob).sort();

const item = compile('schema/item.schema.json');
const list = compile('schema/list.schema.json');

describe('schema/item.schema.json', () => {
  it.each(files('data/*.json'))('accepts %s', (f) => {
    expect(item(read(f)) ? [] : item.errors).toEqual([]);
  });

  it.each(files('schema/invalid/*.json'))('rejects %s', (f) => {
    expect(item(read(f))).toBe(false);
  });
});

describe('schema/list.schema.json', () => {
  it.each(files('data/lists/*.json'))('accepts %s', (f) => {
    expect(list(read(f)) ? [] : list.errors).toEqual([]);
  });
});
