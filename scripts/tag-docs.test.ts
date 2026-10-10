import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createDefaultRegistry } from '@hekana/sneferu-components';
import { renderTagDocs } from './tag-docs';

describe('docs/reference/tags.md', () => {
  it('is up to date with the tag registry (run `pnpm docs:tags` if this fails)', () => {
    const file = readFileSync(fileURLToPath(new URL('../docs/reference/tags.md', import.meta.url)), 'utf8');
    expect(file).toBe(renderTagDocs(createDefaultRegistry()));
  });

  it('documents every registered tag and every prop', () => {
    const r = createDefaultRegistry();
    const md = renderTagDocs(r);
    for (const name of r.names()) {
      expect(md).toContain(`## \`<${name}>\``);
      for (const p of Object.keys(r.get(name)!.props)) expect(md).toContain(`\`${p.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}\``);
    }
  });
});
