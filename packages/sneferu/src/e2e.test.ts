import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileTheme, type ThemeFile } from '@hekana/sneferu-compiler';
import { renderPage } from '@hekana/sneferu-runtime';
import { createDefaultRegistry } from '@hekana/sneferu-components';
import { sampleContext } from './sample-data';

const STARTER = fileURLToPath(new URL('../starter', import.meta.url));
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const files: ThemeFile[] = walk(STARTER).map((p) => ({ path: relative(STARTER, p).split('\\').join('/'), bytes: readFileSync(p) }));

describe('starter theme end to end', () => {
  const registry = createDefaultRegistry();
  const { artifact, diagnostics } = compileTheme(files, registry);

  it('compiles cleanly', () => {
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(Object.keys(artifact!.sections).sort()).toEqual(['featured', 'hero']);
  });

  it('renders the home page in Arabic with real sample products', () => {
    const r = renderPage(artifact!, { template: 'index', ctx: sampleContext('ar', artifact!.locales, 'ar'), registry });
    expect(r.diagnostics).toEqual([]);
    expect(r.html).toContain('dir="rtl"');
    expect(r.html).toContain('أهلًا بيك');
    expect(r.html).toContain('تسوق دلوقتي');
    expect(r.html.match(/sn-product-card/g)).toHaveLength(6);
    expect(r.html).toContain('520.00 ج.م');
    expect(r.css).toContain('@media (max-width:639px)');
  });

  it('renders English with fallback and merchant overrides', () => {
    const r = renderPage(artifact!, { template: 'index', ctx: sampleContext('en', artifact!.locales, 'ar'), registry, sections: [{ id: 'h', type: 'hero', props: { title: 'Top up now' } }] });
    expect(r.html).toContain('dir="ltr"');
    expect(r.html).toContain('Top up now');
    expect(r.html).toContain('Shop now');
    expect(r.html).not.toContain('sn-product-card');
  });
});
