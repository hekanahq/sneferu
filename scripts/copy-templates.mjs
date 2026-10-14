// Copies examples/themes/<id> into packages/sneferu/templates/<id> so `sneferu init --template <id>`
// works from the published package. Screenshots (docs/), node_modules and build output stay behind;
// README image lines that point at docs/ are dropped. Run by the package's `build` script.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const src = join(root, 'examples', 'themes');
const out = join(root, 'packages', 'sneferu', 'templates');

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const id of readdirSync(src).sort()) {
  const from = join(src, id);
  if (!existsSync(join(from, 'theme.json'))) continue;
  const to = join(out, id);
  cpSync(from, to, {
    recursive: true,
    filter: (p) => !/(^|\/)(node_modules|dist|docs|\.turbo)(\/|$)/.test(p.slice(from.length)),
  });
  const readme = join(to, 'README.md');
  if (existsSync(readme)) {
    const text = readFileSync(readme, 'utf8').split('\n').filter((l) => !/!\[[^\]]*\]\(docs\//.test(l)).join('\n');
    writeFileSync(readme, text);
  }
}
console.log(`copy-templates: ${readdirSync(out).join(', ')}`);
