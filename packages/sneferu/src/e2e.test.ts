import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileTheme, type ThemeFile } from '@hekana/sneferu-compiler';
import { renderPage } from '@hekana/sneferu-runtime';
import { validateIR } from '@hekana/sneferu-core';
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

  it('produces IR that passes the load-time integrity check (C3)', () => {
    const a = artifact!;
    const known = new Set([...registry.names(), 'hk-block']);
    const trees = [a.layout, ...Object.values(a.templates), ...Object.values(a.snippets), ...Object.values(a.sections).map((s) => s.ir), ...Object.values(a.blocks).map((b) => b.ir)];
    expect(trees.flatMap((t) => validateIR(t, known))).toEqual([]);
  });

  it('renders the home page in English by default with real sample products', () => {
    expect(artifact!.manifest.defaultLocale).toBe('en');
    const r = renderPage(artifact!, { template: 'index', ctx: sampleContext('en', artifact!.locales, 'en'), registry });
    expect(r.diagnostics).toEqual([]);
    expect(r.html).toContain('dir="ltr" lang="en"');
    expect(r.html).toContain('Welcome');
    expect(r.html).toContain('Shop now');
    expect(r.html).toContain('PlayStation gift card');
    expect(r.html.match(/sn-product-card/g)).toHaveLength(6);
    expect(r.html).toContain('EGP 520.00');
  });

  it('renders Arabic, right to left, when asked', () => {
    const r = renderPage(artifact!, { template: 'index', ctx: sampleContext('ar', artifact!.locales, 'en'), registry });
    expect(r.diagnostics).toEqual([]);
    expect(r.html).toContain('dir="rtl"');
    expect(r.html).toContain('تسوق دلوقتي');
    expect(r.html.match(/sn-product-card/g)).toHaveLength(6);
    expect(r.html).toContain('520.00 ج.م');
    expect(r.css).toContain('@media (max-width:639px)');
  });

  it('renders English with fallback and merchant overrides', () => {
    const r = renderPage(artifact!, { template: 'index', ctx: sampleContext('en', artifact!.locales, 'en'), registry, sections: [{ id: 'h', type: 'hero', props: { title: 'Top up now' } }] });
    expect(r.html).toContain('dir="ltr"');
    expect(r.html).toContain('Top up now');
    expect(r.html).toContain('Shop now');
    expect(r.html).not.toContain('sn-product-card');
  });

  it('keeps class/id/aria/data written on hk tags (I7)', () => {
    const extra: ThemeFile[] = files.map((x) => (x.path === 'sections/hero.sneferu'
      ? { path: x.path, bytes: new TextEncoder().encode('<hk-section class="hero" id="top" aria-label="x" data-x="1"><hk-text text="a" class="lead" /></hk-section><hk-schema>{"name":{"ar":"a","en":"a"},"settings":{}}</hk-schema>') } : x));
    const c = compileTheme(extra, registry);
    const r = renderPage(c.artifact!, { template: 'index', ctx: sampleContext('ar', c.artifact!.locales, 'ar'), registry });
    expect(r.html).toMatch(/<section class="sn-[^"]* hero" id="top" aria-label="x" data-x="1">/);
    expect(r.html).toMatch(/<p class="sn-[^"]* lead">a<\/p>/);
  });
});
