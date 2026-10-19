// Spec Kit's plan and spec templates are overridden for this repo
// (.specify/templates/overrides/). The plan's Constitution Check is a row per
// article, by its heading, so the gate cannot skip one — and an article added
// or renamed in the constitution fails here until the gate follows it.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const constitution = read('.specify/memory/constitution.md');
const plan = read('.specify/templates/overrides/plan-template.md');
const spec = read('.specify/templates/overrides/spec-template.md');

const articles = [...constitution.matchAll(/^### (.+)$/gm)].map((m) => m[1].trim());
const check = plan.split(/^## Constitution Check$/m)[1]?.split(/^## /m)[0] ?? '';
const rows = [...check.matchAll(/^\|\s*([IVX]+\.[^|]*?)\s*\|/gm)].map((m) => m[1]);

describe('Spec Kit template overrides', () => {
  it('the constitution has its ten articles', () => expect(articles).toHaveLength(10));
  it("the plan's Constitution Check has a row per article, in order, by its heading", () =>
    expect(rows).toEqual(articles));
  it('a feature spec names the area spec it folds into', () =>
    expect(spec).toContain('**Folds into**: specs/'));
  it('a feature spec ends by saying how it lands', () =>
    expect(spec).toMatch(/^## On landing$/m));
});
