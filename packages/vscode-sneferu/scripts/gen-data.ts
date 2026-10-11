// Builds src/generated/data.json: everything the language server knows about the
// language, read from the SDK's own docs so a rebuild picks up new tags, filters,
// lookups and diagnostics. Run: pnpm --filter sneferu gen (part of `pnpm build`).
//
//   docs/reference/tags.json             tags and props (pnpm docs:tags)
//   packages/core/src/version.ts         FILTERS and LOOKUPS (the source of truth)
//   docs/guide/04-data-and-expressions   scope, lookups, product fields, filters
//   docs/language.mdx                    filters, lookups, field types
//   docs/diagnostics.mdx                 every SN code with its meaning and fix
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildData } from '../src/server/gen';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..');
const data = buildData((p) => readFileSync(join(repo, p), 'utf8'));
const out = join(here, '..', 'src', 'generated', 'data.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(data, null, 1) + '\n');
console.log(`wrote ${out}: ${data.tags.length} tags, ${data.filters.length} filters, ${data.lookups.length} lookups, ${data.diagnostics.length} diagnostics`);
