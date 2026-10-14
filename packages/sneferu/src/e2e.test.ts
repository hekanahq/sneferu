import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileTheme, type ThemeFile } from '@hekana/sneferu-compiler';
import { renderPage } from '@hekana/sneferu-runtime';
import { validateIR } from '@hekana/sneferu-core';
import { createDefaultRegistry } from '@hekana/sneferu-components';
import { sampleContext } from './sample-data';

const STARTER = fileURLToPath(new URL('../../templates-default/theme', import.meta.url));
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const files: ThemeFile[] = walk(STARTER).map((p) => ({ path: relative(STARTER, p).split('\\').join('/'), bytes: readFileSync(p) }));

/** The starter with its hero section replaced, and a home page that is just that section. */
const onlyHero = (hero: string): ThemeFile[] => [
  ...files.filter((f) => f.path !== 'sections/hero.snf' && f.path !== 'templates/index.snf'),
  { path: 'sections/hero.snf', bytes: new TextEncoder().encode(hero) },
  { path: 'templates/index.snf', bytes: new TextEncoder().encode('<hk-sections /><hk-schema>{"sections":[{"type":"hero"}]}</hk-schema>') },
];

describe('starter theme end to end', () => {
  const registry = createDefaultRegistry();
  const { artifact, diagnostics } = compileTheme(files, registry);

  it('compiles cleanly', () => {
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(Object.keys(artifact!.sections)).toEqual(expect.arrayContaining(['hero', 'featured-products', 'header', 'footer', 'announcement-bar', 'product-main', 'cart-main']));
    expect(artifact!.defaults).toBeUndefined(); // the starter has every page type itself
  });

  it('produces IR that passes the load-time integrity check (C3)', () => {
    const a = artifact!;
    const known = new Set([...registry.names(), 'hk-block', 'hk-part']);
    const trees = [a.layout, ...Object.values(a.templates), ...Object.values(a.snippets), ...Object.values(a.sections).map((s) => s.ir), ...Object.values(a.blocks).map((b) => b.ir)];
    expect(trees.flatMap((t) => validateIR(t, known))).toEqual([]);
  });

  it('renders the home page in English by default with real sample products', () => {
    expect(artifact!.manifest.defaultLocale).toBe('en');
    const r = renderPage(artifact!, { template: 'index', ctx: sampleContext('en', artifact!.locales, 'en'), registry });
    expect(r.diagnostics).toEqual([]);
    expect(r.html).toContain('dir="ltr" lang="en"');
    expect(r.html).toContain('Everything you need, in one place');
    expect(r.html).toContain('Shop now');
    expect(r.html).toContain('PlayStation gift card');
    expect(r.html.match(/class="sf-card sf-card-plain"/g)).toHaveLength(6);
    expect(r.html).toContain('EGP 520.00');
  });

  it('prints the main and footer menus in the header and footer, else the group links', () => {
    const ctx = sampleContext('en', artifact!.locales, 'en');
    const r = renderPage(artifact!, { template: 'index', ctx, registry, request: { path: '/en/products' } });
    expect(r.diagnostics).toEqual([]);
    expect(r.html).toContain('<a class="sf-nav-link" href="/en/products" aria-current="true">Products</a>');
    expect(r.html).toContain('<a class="sf-subnav-link" href="/en/category/gift-cards" aria-current="false">Gift cards</a>');
    expect(r.html).toContain('<h3 class="sf-footer-title">Links</h3>');
    expect(r.html).not.toContain('data-hk-block="nav-home"');
    const bare = renderPage(artifact!, { template: 'index', ctx: { ...ctx, menus: {} }, registry, request: { path: '/en/products' } });
    expect(bare.html).toContain('data-hk-block="nav-home"');
    expect(bare.html).toContain('data-hk-block="col-shop"');
    expect(bare.html).not.toContain('aria-current="true"');
    expect(renderPage(artifact!, { template: 'index', ctx: { ...ctx, menus: undefined }, registry, request: { path: '/en/products' } }).html).toBe(bare.html);
  });

  it('a saved header or footer without a menu pick keeps its blocks, even when the store has menus', () => {
    const ctx = sampleContext('en', artifact!.locales, 'en');
    expect(ctx.menus!.main!.items.length).toBeGreaterThan(0);
    const groups = {
      header: [{ id: 'h', type: 'header', children: [{ id: 'mine', type: 'menu-link', props: { label: 'Mine', url: '/pages/mine' } }] }],
      footer: [{ id: 'f', type: 'footer', children: [{ id: 'col', type: 'footer-column', props: { title: 'Col' }, children: [{ id: 'l', type: 'footer-link', props: { label: 'Saved', url: '/pages/saved' } }] }] }],
    };
    const r = renderPage(artifact!, { template: 'index', ctx, registry, groups, request: { path: '/en' } });
    expect(r.diagnostics).toEqual([]);
    expect(r.html).toContain('data-hk-block="mine"');
    expect(r.html).toContain('>Saved</a>');
    expect(r.html).not.toContain('aria-current=');
    // once the merchant picks a menu, it shows
    const picked = { header: [{ ...groups.header[0]!, props: { menu: 'main' } }], footer: [{ ...groups.footer[0]!, props: { menu: 'footer' } }] };
    const p = renderPage(artifact!, { template: 'index', ctx, registry, groups: picked, request: { path: '/en' } });
    expect(p.html).not.toContain('data-hk-block="mine"');
    expect(p.html).toContain('aria-current="true">Home</a>');
    expect(p.html).toContain('<h3 class="sf-footer-title">Links</h3>');
  });

  it('prints all three menu levels in the default header and footer', () => {
    const third = { title: 'Level three', url: '/pages/three' };
    const menus = {
      main: { handle: 'main', title: 'M', items: [{ title: 'One', url: '/one', children: [{ title: 'Two', url: '/two', children: [third] }] }] },
      footer: { handle: 'footer', title: 'F', items: [{ title: 'Col', url: '/col', children: [{ title: 'Two', url: '/two', children: [third] }] }] },
    };
    const r = renderPage(artifact!, { template: 'index', ctx: { ...sampleContext('en', artifact!.locales, 'en'), menus }, registry, request: { path: '/pages/three' } });
    expect(r.diagnostics).toEqual([]);
    expect(r.html).toContain('<a class="sf-subnav-link sf-subnav-deep" href="/pages/three" aria-current="true">Level three</a>');
    expect(r.html).toContain('<a class="sf-footer-deep" href="/pages/three" aria-current="true">Level three</a>');
    // every link has children: the menu's first column has no links (CSS hides it)
    expect(r.html).toMatch(/<div class="sf-footer-col sf-footer-menu-col"><h3 class="sf-footer-title">F<\/h3><div class="sf-footer-links">\s*<\/div><\/div>/);
  });

  it('renders Arabic, right to left, when asked', () => {
    const r = renderPage(artifact!, { template: 'index', ctx: sampleContext('ar', artifact!.locales, 'en'), registry });
    expect(r.diagnostics).toEqual([]);
    expect(r.html).toContain('dir="rtl"');
    expect(r.html).toContain('تسوق دلوقتي');
    expect(r.html.match(/class="sf-card sf-card-plain"/g)).toHaveLength(6);
    expect(r.html).toContain('520.00 ج.م');
    expect(r.css).toContain('@media (max-width:639px)');
  });

  it('renders English with fallback and merchant overrides', () => {
    const r = renderPage(artifact!, { template: 'index', ctx: sampleContext('en', artifact!.locales, 'en'), registry, sections: [{ id: 'h', type: 'hero', props: { title: 'Top up now' } }] });
    expect(r.html).toContain('dir="ltr"');
    expect(r.html).toContain('Top up now');
    expect(r.html).toContain('Shop now');
    expect(r.html).not.toContain('sf-card');
  });

  it('keeps class/id/aria/data written on hk tags (I7)', () => {
    const extra = onlyHero('<hk-section class="hero" id="top" aria-label="x" data-x="1"><hk-text text="a" class="lead" /></hk-section><hk-schema>{"name":{"ar":"a","en":"a"},"settings":{}}</hk-schema>');
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
  const themed = onlyHero(section);
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
    expect(page({}).html).toContain('<a href="/en/category/gift-cards">Gift cards (6)</a>');
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
  const themed = onlyHero(section);
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
    const bad = onlyHero('<div><hk-part name="badge">x</hk-part></div><hk-schema>{"name":"X","settings":{}}</hk-schema>');
    expect(compileTheme(bad, registry).diagnostics.map((d) => d.code)).toContain('SN2013');
  });
});
