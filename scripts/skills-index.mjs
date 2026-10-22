// The Agent Skills on /tools/ come from nstarman/skills' index.json (schema 1): every skill it
// registers, kept there or living in another repository. This maps that index to
// config/skills.json and refuses anything unexpected, so a bad index never empties the section.
// The index's contract: nstarman/skills AGENTS.md, "How it reaches the website".

export const SCHEMA = 1;

const nonEmpty = (v) => typeof v === 'string' && v.trim() !== '';

/** index.json (parsed) → config/skills.json's `skills`: {name, description, href, from?}. */
export function skillsFromIndex(doc) {
  if (!doc || typeof doc !== 'object') throw new Error('index.json: not a JSON object');
  if (doc.schema !== SCHEMA) throw new Error(`index.json: schema ${doc.schema}, this collector reads schema ${SCHEMA}`);
  if (!Array.isArray(doc.skills) || doc.skills.length === 0) throw new Error('index.json: no skills');
  const seen = new Set();
  return doc.skills.map((s, i) => {
    const where = `index.json skills[${i}]${nonEmpty(s?.name) ? ` (${s.name})` : ''}`;
    for (const k of ['name', 'description', 'href']) {
      if (!nonEmpty(s?.[k])) throw new Error(`${where}: "${k}" must be a non-empty string`);
    }
    if (!['local', 'external'].includes(s.origin)) throw new Error(`${where}: "origin" must be local or external`);
    if (!/^https:\/\/github\.com\//.test(s.href)) throw new Error(`${where}: "href" must be a github.com link`);
    if (seen.has(s.name)) throw new Error(`${where}: duplicate name`);
    seen.add(s.name);
    const card = { name: s.name, description: s.description, href: s.href };
    if (s.origin === 'external') {
      if (!nonEmpty(s.source?.repo)) throw new Error(`${where}: an external skill needs "source.repo"`);
      card.from = s.source.repo;
    }
    return card;
  });
}
