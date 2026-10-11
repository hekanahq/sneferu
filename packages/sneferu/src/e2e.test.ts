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

describe('merchant-chosen collections end to end', () => {
  const registry = createDefaultRegistry();
  const section = `<ul>{% for p in collection(section.settings.list).products limit: section.settings.count %}<li>{{ p.title }}</li>{% endfor %}</ul>`
    + `<nav>{% for c in collections() %}<a href="{{ c.url }}">{{ c.title }} ({{ c.count }})</a>{% endfor %}</nav>`
    + `<hk-schema>{"name":"Shelf","settings":{"list":{"type":"collection","label":"Collection","default":"featured"},"count":{"type":"range","label":"Count","min":1,"max":12,"default":2}}}</hk-schema>`;
  const themed = [...files.filter((f) => f.path !== 'sections/hero.sneferu'), { path: 'sections/hero.sneferu', bytes: new TextEncoder().encode(section) }];
  const { artifact, diagnostics } = compileTheme(themed, registry);

  it('compiles, renders the chosen collection at the chosen count, and an unpicked one as empty', () => {
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const ctx = sampleContext('en', artifact!.locales, 'en');
    const page = (props: Record<string, unknown>) => renderPage(artifact!, { template: 'index', ctx, registry, sections: [{ id: 's', type: 'hero', props }] });
    const items = (html: string) => (html.match(/<li>/g) ?? []).length;
    expect(items(page({}).html)).toBe(2);
    expect(page({ list: 'subscriptions', count: 3 }).html).toContain('<li>One-month subscription</li>');
    expect(items(page({ list: 'subscriptions', count: 3 }).html)).toBe(3);
    expect(items(page({ list: '' }).html)).toBe(0);
    expect(page({}).html).toContain('<a href="/en/collections/gift-cards">Gift cards (6)</a>');
  });
});

describe('product data end to end', () => {
  const registry = createDefaultRegistry();
  const section = `{% for p in collection('featured').products limit: 2 %}`
    + `<hk-product-card product="{{ p }}">\n  <hk-part name="badge">{% if p.compare_at %}<span class="sale">Sale</span>{% endif %}</hk-part>\n  <hk-part name="actions"><a class="buy" href="{{ p.url }}">{{ p.title }}</a></hk-part>\n</hk-product-card>{% endfor %}`
    + `<hk-product-card product="{{ product('sample-1') }}" class="plain" />`
    + `<hk-rich-text html="{{ product('sample-1').description }}" class="desc" />`
    + `<p class="raw">{{ product('sample-1').description }}</p>`
    + `<hk-schema>{"name":"Details","settings":{}}</hk-schema>`;
  const themed = [...files.filter((f) => f.path !== 'sections/hero.sneferu'), { path: 'sections/hero.sneferu', bytes: new TextEncoder().encode(section) }];
  const { artifact, diagnostics } = compileTheme(themed, registry);

  it('compiles card parts and rich text, and renders them with the sample products', () => {
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const r = renderPage(artifact!, { template: 'index', ctx: sampleContext('en', artifact!.locales, 'en'), registry, sections: [{ id: 's', type: 'hero' }] });
    expect(r.diagnostics).toEqual([]);
    expect(r.html.match(/<div class="sn-product-card-wrap">/g)).toHaveLength(2);
    expect(r.html).toContain('<div class="sn-product-card-wrap"><a class="sn-product-card" href="/en/products/sample-1"><span class="sale">Sale</span><img');
    expect(r.html).toContain('</a><a class="buy" href="/en/products/sample-1">PlayStation gift card</a></div>');
    expect(r.html).toContain('<a class="sn-product-card plain" href="/en/products/sample-1"><img');
    expect(r.html).toMatch(/<div class="sn-[^"]* sn-rich-text desc"><p><strong>PlayStation gift card<\/strong> — The code arrives by email right after you pay\.<\/p><\/div>/);
    // printed with {{ }} the same HTML stays escaped
    expect(r.html).toContain('<p class="raw">&lt;p&gt;&lt;strong&gt;PlayStation gift card');
  });

  it('rejects an hk-part outside a card (SN2013)', () => {
    const bad = [...files.filter((f) => f.path !== 'sections/hero.sneferu'), { path: 'sections/hero.sneferu', bytes: new TextEncoder().encode('<div><hk-part name="badge">x</hk-part></div><hk-schema>{"name":"X","settings":{}}</hk-schema>') }];
    expect(compileTheme(bad, registry).diagnostics.map((d) => d.code)).toContain('SN2013');
  });
});
