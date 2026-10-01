import { describe, expect, it } from 'vitest';
import { documentFor, parseActiveVotingMembers } from '../scripts/scrape-astropy-voting-members.mjs';

describe('Astropy voting-member scraper', () => {
  it('keeps only active members, decodes entities, and sorts the snapshot', () => {
    const html = `
      <h3>Active Voting Members<a href="#active-voting-members">#</a></h3>
      <ul><li>Zoë Example</li><li>Ada &amp; Byron</li><li>Zoë Example</li></ul>
      <h3>Emeritus Voting Members</h3><ul><li>Former Member</li></ul>`;

    expect(parseActiveVotingMembers(html)).toEqual(['Ada & Byron', 'Zoë Example']);
  });

  it('refuses a changed page structure instead of silently writing an empty list', () => {
    expect(() => parseActiveVotingMembers('<h2>Voting Members</h2>')).toThrow('Active Voting Members');
  });

  it('records the source and a reproducible read date', () => {
    expect(documentFor(['Ada Example'], '2026-09-01')).toMatchObject({
      source: 'https://www.astropy.org/team',
      read: '2026-09-01',
      active: ['Ada Example'],
    });
  });
});
