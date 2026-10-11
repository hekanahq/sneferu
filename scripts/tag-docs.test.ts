import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createDefaultRegistry } from '@hekana/sneferu-components';
import { renderTagDocs, renderTagDocsMdx, tagRegistryData } from './tag-docs';

const read = (f: string) => readFileSync(fileURLToPath(new URL(`../docs/reference/${f}`, import.meta.url)), 'utf8');

describe('docs/reference/tags.mdx + tags.json', () => {
  it('are up to date with the tag registry (run `pnpm docs:tags` if this fails)', () => {
    const r = createDefaultRegistry();
    expect(read('tags.mdx')).toBe(renderTagDocsMdx(r));
    expect(read('tags.json')).toBe(tagRegistryData(r));
  });

  it('the page has a heading and a <TagProps> for every registered tag', () => {
    const r = createDefaultRegistry();
    const mdx = renderTagDocsMdx(r);
    for (const name of r.names()) {
      expect(mdx).toContain(`## \`<${name}>\``);
      expect(mdx).toContain(`<TagProps tag="${name}" />`);
    }
  });

  it('the data carries every tag and every prop', () => {
    const r = createDefaultRegistry();
    const data = JSON.parse(tagRegistryData(r)) as { tags: Array<{ name: string; props: Array<{ name: string; attr: string }> }> };
    expect(data.tags.map((t) => t.name).sort()).toEqual([...r.names()].sort());
    for (const t of data.tags) {
      expect(t.props.map((p) => p.name)).toEqual(Object.keys(r.get(t.name)!.props));
    }
  });

  it('the plain-markdown form still documents every prop', () => {
    const r = createDefaultRegistry();
    const md = renderTagDocs(r);
    for (const name of r.names()) {
      for (const p of Object.keys(r.get(name)!.props)) expect(md).toContain(`\`${p.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}\``);
    }
  });
});
