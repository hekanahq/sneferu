// The short names `sneferu` and `create-sneferu` (wrappers/) are thin wrappers that pin
// @hekana/sneferu exactly and carry the same version. They live outside the pnpm workspace
// (the VS Code extension's private package is also called `sneferu`), so changesets does not
// bump them; this script does.
//   node scripts/sync-short-names.mjs            write @hekana/sneferu's version into both
//   node scripts/sync-short-names.mjs --check    exit 1 when one differs
//   node scripts/sync-short-names.mjs --publish  check, then npm publish each version not yet on npm
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const read = (p) => JSON.parse(readFileSync(root(p), 'utf8'));
const WRAPPERS = ['wrappers/sneferu', 'wrappers/create-sneferu'];

const version = read('packages/sneferu/package.json').version;
const mode = process.argv.includes('--publish') ? 'publish' : process.argv.includes('--check') ? 'check' : 'write';
let stale = 0;
for (const dir of WRAPPERS) {
  const file = `${dir}/package.json`;
  const p = read(file);
  if (p.version === version && p.dependencies['@hekana/sneferu'] === version) continue;
  if (mode !== 'write') { console.error(`✖ ${p.name} is ${p.version} (needs @hekana/sneferu ${p.dependencies['@hekana/sneferu']}); @hekana/sneferu is ${version} — run pnpm version-packages`); stale++; continue; }
  p.version = version;
  p.dependencies['@hekana/sneferu'] = version;
  writeFileSync(root(file), JSON.stringify(p, null, 2) + '\n');
  console.log(`✔ ${p.name} → ${version}`);
}
if (stale) process.exit(1);

if (mode === 'publish') {
  for (const dir of WRAPPERS) {
    const { name } = read(`${dir}/package.json`);
    let live = '';
    try { live = execFileSync('npm', ['view', `${name}@${version}`, 'version'], { encoding: 'utf8' }).trim(); } catch { /* not published */ }
    if (live === version) { console.log(`• ${name}@${version} is already on npm`); continue; }
    execFileSync('npm', ['publish', root(dir)], { stdio: 'inherit' });
  }
}
