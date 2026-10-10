// Writes docs/reference/tags.md. Run: pnpm docs:tags
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createDefaultRegistry } from '../packages/components/src/index';
import { renderTagDocs } from './tag-docs';

const out = fileURLToPath(new URL('../docs/reference/tags.md', import.meta.url));
writeFileSync(out, renderTagDocs(createDefaultRegistry()));
console.log(`wrote ${out}`);
