// Which commit the running site was built from.
//
// The CV builder writes this into a saved selection so a selection can be taken
// back to the site that produced it: the database moves, entries are added and
// re-worded, and a selection is a list of ids that only means something against
// a particular version of the data. `git checkout <commit> && npm run build`
// reproduces that site exactly.
//
// Build-time only — imported from .astro frontmatter, which runs in Node.

import { execSync } from 'node:child_process';

const git = (args) => {
  try {
    return execSync(`git ${args}`, {
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
      timeout: 5000,
    }).trim();
  } catch {
    // Not a checkout — a source tarball, or git is unavailable.
    return null;
  }
};

/**
 * `{ commit, short, dirty }`, or nulls when the commit cannot be determined.
 *
 * `dirty` matters as much as the commit: a local build with uncommitted changes
 * is not reproducible from the commit alone, and saying so is better than
 * implying the selection can be recovered when it cannot.
 */
export function buildInfo() {
  // What was actually built, in preference to what CI says it checked out.
  const commit = git('rev-parse HEAD') || process.env.GITHUB_SHA || null;
  if (!commit) return { commit: null, short: null, dirty: false };
  const status = git('status --porcelain');
  return {
    commit,
    short: commit.slice(0, 7),
    // null status means git failed; absence of evidence, so do not claim clean.
    dirty: status === null ? false : status.length > 0,
  };
}
