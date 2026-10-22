// packages/site-layout is the npm package @nstarkman/site-layout: this site's
// layout, which the sites hosted in repos of their own install. Whatever the
// layout imports must ship with it and resolve there, so it is held to its
// stylesheet and icons, and those to nothing further; the package to exactly
// its files; and a site built with it under a `base` still links here.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const pkgDir = new URL('../packages/site-layout/', import.meta.url);
const read = (p) => readFileSync(new URL(p, pkgDir), 'utf8');
const pkg = JSON.parse(read('package.json'));
const imports = (src) => [...src.matchAll(/^import\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]/gm)].map((m) => m[1]);

describe('@nstarkman/site-layout', () => {
  it('imports only its stylesheet and icons', () => {
    expect(imports(read('SiteLayout.astro'))).toEqual(['./site.css', './IconSprite.astro']);
  });
  it('whose own imports and urls go nowhere', () => {
    expect(imports(read('IconSprite.astro'))).toEqual([]);
    expect(read('site.css')).not.toMatch(/@import|url\(/);
  });
  it('exports files that exist', () => {
    for (const target of Object.values(pkg.exports)) expect(() => read(target)).not.toThrow();
  });
  it('packs exactly its files', () => {
    const [{ files }] = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json'], { cwd: pkgDir, encoding: 'utf8' }));
    expect(files.map((f) => f.path).sort()).toEqual(
      ['CHANGELOG.md', 'IconSprite.astro', 'LICENSE', 'README.md', 'SiteLayout.astro', 'package.json', 'site.css'],
    );
  });
  it('is versioned YYYYMMDD.0.N, by a real date, with a changelog entry', () => {
    const m = pkg.version.match(/^(\d{4})(\d{2})(\d{2})\.0\.\d+$/);
    expect(m).not.toBeNull();
    const [y, mo, d] = m.slice(1).map(Number);
    const date = new Date(Date.UTC(y, mo - 1, d));
    expect([date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()]).toEqual([y, mo, d]);
    expect(read('CHANGELOG.md')).toContain(`\n## ${pkg.version}\n`);
  });
  it('documents its props', () => {
    const readme = read('README.md');
    for (const prop of ['title', 'description', 'section', 'repo']) expect(readme).toContain(`| \`${prop}\` |`);
  });
});

describe('a site hosted at /demo/ built with it', () => {
  const out = mkdtempSync(join(tmpdir(), 'hosted-site-'));
  afterAll(() => {
    rmSync(out, { recursive: true, force: true });
    rmSync(`${out}-cache`, { recursive: true, force: true });
  });

  it('links back to this site, marks its section and its repo', () => {
    execFileSync('npx', ['astro', 'build', '--root', 'tests/fixtures/hosted-site'], {
      cwd: new URL('..', import.meta.url),
      env: { ...process.env, HOSTED_SITE_OUT: out, ASTRO_TELEMETRY_DISABLED: '1' },
      stdio: 'pipe',
    });
    const html = readFileSync(join(out, 'index.html'), 'utf8');
    const hrefs = [...html.matchAll(/<a [^>]*href="([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs).toContain('/research/');
    expect(hrefs.filter((h) => h.startsWith('/demo/'))).toEqual([]);
    expect(html).toMatch(/<a href="\/research\/"[^>]*aria-current="page"/);
    expect(hrefs).toContain('https://github.com/nstarman/demo');
  }, 120_000);
});
