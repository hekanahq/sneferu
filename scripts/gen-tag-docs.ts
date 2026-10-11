// Writes docs/reference/tags.mdx and docs/reference/tags.json. Run: pnpm docs:tags
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createDefaultRegistry } from '../packages/components/src/index';
import { renderTagDocsMdx, tagRegistryData } from './tag-docs';

const registry = createDefaultRegistry();
for (const [file, body] of [
  ['tags.mdx', renderTagDocsMdx(registry)],
  ['tags.json', tagRegistryData(registry)],
] as const) {
  const out = fileURLToPath(new URL(`../docs/reference/${file}`, import.meta.url));
  writeFileSync(out, body);
  console.log(`wrote ${out}`);
}
