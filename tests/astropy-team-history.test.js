import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import {
  fold, parseCoordinators, parseRolesJson, parseRolesTxt, parseVotingRst,
} from '../scripts/scrape-astropy-team-history.mjs';
import { byType } from '../src/lib/data.js';

describe('Astropy team-history parsers', () => {
  it('reads the 2016 roles table, leads and deputies, dropping placeholders', () => {
    const txt = [
      '# comment',
      'Role   | Sub-role  |  Lead  | Deputy',
      'Coordination committee member | | Tom Aldcroft    |',
      '                              | | Kelle Cruz (chair) |',
      'Astropy.org web page maintainer | | UNFILLED | Erik Tollerud::note, Grant Tremblay',
    ].join('\n');
    expect(parseRolesTxt(txt)).toEqual([
      { name: 'Tom Aldcroft', role: 'Coordination committee member' },
      { name: 'Kelle Cruz', role: 'Coordination committee member' },
      { name: 'Erik Tollerud', role: 'Astropy.org web page maintainer' },
      { name: 'Grant Tremblay', role: 'Astropy.org web page maintainer' },
    ]);
  });

  it('reads roles.json, the 2013 coordinator list and the voting-member lists', () => {
    expect(parseRolesJson('[{"role":"APE editor","people":["Ada A","Unfilled"]}]'))
      .toEqual([{ name: 'Ada A', role: 'APE editor' }]);
    expect(parseCoordinators('<h3>Astropy Project Coordinators</h3><ul><li>Perry Greenfield\n<li>Erik Tollerud\n</ul>'))
      .toEqual([
        { name: 'Perry Greenfield', role: 'Project coordinator' },
        { name: 'Erik Tollerud', role: 'Project coordinator' },
      ]);
    const rst = 'Active Voting Members\n---------------------\n\n- A B\n\nEmeritus Voting Members\n-----------------------\n\n- C D\n\n***\n- not E\n';
    expect(parseVotingRst(rst)).toEqual([
      { name: 'A B', role: 'Voting member' },
      { name: 'C D', role: 'Voting member (emeritus)' },
    ]);
  });

  it('folds sightings to one record per person with first and last seen', () => {
    expect(fold([
      { name: 'A B', role: 'x', date: '2016-01-01' },
      { name: 'A B', role: 'y', date: '2014-01-01' },
    ])).toEqual([{ name: 'A B', roles: ['x', 'y'], first: '2014-01-01', last: '2016-01-01' }]);
  });
});

// The collaborator map's rule for the 135-author Astropy paper: the contribution-
// ordered first 23, or anyone who has ever held a role in the project. Matching
// is on surname and a first initial, as the paper's `internal` note says.
describe('astropy-v5-paper ORCIDs', () => {
  const FIRST = 23;
  const fold2 = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[’.]/g, (c) => (c === '’' ? "'" : ''));
  const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
  const names = [
    ...read('config/astropy-team-history.json').people.map((p) => p.name),
    ...read('config/astropy-voting-members.json').active,
  ].map(fold2);

  const heldARole = (a) => {
    const fam = fold2(a.family).replace(/\s/g, '');
    const initials = new Set(fold2(a.given ?? '').split(/[\s-]+/).filter(Boolean).map((w) => w[0]));
    return names.some((n) => {
      const parts = n.split(' ');
      return parts.slice(1).join('').endsWith(fam) && initials.has(parts[0][0]);
    });
  };

  it('are recorded only for the first 23 or someone who ever held a role', () => {
    const { authors } = byType('publication').find((p) => p.id === 'astropy-v5-paper');
    const stray = authors.filter((a, i) => a.orcid && i >= FIRST && !heldARole(a)).map((a) => a.family);
    expect(stray).toEqual([]);
  });
});
