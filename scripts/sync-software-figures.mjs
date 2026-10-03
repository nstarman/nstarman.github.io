// Software figures mirrored from each package's own repository.
//
// A highlight with a `source` takes its image from that file on the package
// repo's default branch. `source.sha` is the git blob last mirrored, so a
// figure is only re-made when the upstream file changes — never because the
// encoder here did. A highlight without `source` has a custom image and is
// left alone.
//
// Run by .github/workflows/refresh-software-figures.yml every six months, or
// whenever it is triggered from the Actions tab; it opens a pull request when
// anything moved. To run it locally:
//
//   node scripts/sync-software-figures.mjs           # rewrites images and source.sha
//   node scripts/sync-software-figures.mjs --check   # exits 1 if any would change
//
// Everything done to an upstream image happens here, so it is reviewed with the
// pull request that applies it. Today: SVG is copied as is; PNG becomes WebP
// at quality 85, which is how the figures already here were made. Needs `cwebp`
// (brew install webp, apt-get install webp).

import fs from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { readItems } from './lib/items.mjs';

const check = process.argv.includes('--check');
const token = process.env.GITHUB_TOKEN
  || execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim();

/** The upstream file's blob SHA and bytes, from its repo's default branch. */
async function fetchFile({ repo, path }) {
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`${repo}/${path}: HTTP ${res.status}`);
  const { sha, content } = await res.json();
  return { sha, bytes: Buffer.from(content, 'base64') };
}

/** Write `bytes`, the file at upstream `path`, to `out` in out's format. */
function convert(bytes, path, out) {
  if (path.endsWith('.svg') && out.endsWith('.svg')) return fs.writeFileSync(out, bytes);
  if (!(path.endsWith('.png') && out.endsWith('.webp'))) {
    throw new Error(`${path} -> ${out}: no conversion for that pair; add one here`);
  }
  const tmp = join(fs.mkdtempSync(join(os.tmpdir(), 'figure-')), 'in.png');
  fs.writeFileSync(tmp, bytes);
  execFileSync('cwebp', ['-quiet', '-q', '85', tmp, '-o', out]);
}

let stale = 0;
for (const { path, item } of readItems()) {
  const source = item.highlight?.source;
  if (!source) continue;
  const out = `public/${item.highlight.image}`;
  const upstream = await fetchFile(source);
  if (upstream.sha === source.sha && fs.existsSync(out)) continue;

  stale += 1;
  console.log(`${item.id}: ${source.repo}/${source.path} ${source.sha?.slice(0, 7) ?? 'new'} -> ${upstream.sha.slice(0, 7)}`);
  if (check) continue;
  convert(upstream.bytes, source.path, out);
  source.sha = upstream.sha;
  fs.writeFileSync(path, JSON.stringify(item, null, 2) + '\n');
}
if (check && stale) process.exit(1);
