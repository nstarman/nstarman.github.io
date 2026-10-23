// Where collect() reads the website's files from: a checkout on disk, or GitHub
// at a ref. A reader is { index(): Map<id, path of data/<date>-<id>.json>, read(path): text }.

const DATA = /^data\/(\d{4}(?:-\d{2}){0,2})-([a-z0-9-]+)\.json$/;

const indexOf = (paths) => new Map(paths.flatMap((p) => {
  const m = p.match(DATA);
  return m ? [[m[2], p]] : [];
}));

/** The repository checked out at `root`. */
export function fromDisk(root) {
  return {
    source: { root },
    async index() {
      const fs = await import('node:fs');
      return indexOf(fs.readdirSync(`${root}/data`).map((f) => `data/${f}`));
    },
    async read(path) {
      const fs = await import('node:fs');
      return fs.readFileSync(`${root}/${path}`, 'utf8');
    },
  };
}

/** `repo` (owner/name) on GitHub at `ref`: one listing from the tree API, then
 *  raw files from the commit it resolved to, so every file is of one commit. */
export function fromGitHub({ repo, ref = 'main', fetch = globalThis.fetch }) {
  let sha;
  const get = async (url, as) => {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`GET ${url}: ${r.status}`);
    return as === 'json' ? r.json() : r.text();
  };
  return {
    source: { repo, ref },
    async index() {
      const commit = await get(`https://api.github.com/repos/${repo}/commits/${ref}`, 'json');
      sha = commit.sha;
      const tree = await get(`https://api.github.com/repos/${repo}/git/trees/${sha}?recursive=1`, 'json');
      this.source = { repo, ref, sha };
      return indexOf(tree.tree.map((t) => t.path));
    },
    async read(path) {
      return get(`https://raw.githubusercontent.com/${repo}/${sha ?? ref}/${path}`);
    },
  };
}
