import { describe, it, expect } from 'vitest';
import { TagRegistry, type Expr, type IRNode, type Menu } from '@hekana/sneferu-core';
import { evaluate } from './evaluate';
import { renderPage, type ArtifactLike } from './page';
import { normalizeMenu, menuPathKey, MAX_MENU_ITEMS } from './menus';
import type { RenderContext } from './context';

const main: Menu = { handle: 'main', title: 'Main', items: [
  { title: 'Home', url: '/' },
  { title: 'Shop', url: '/products', children: [{ title: 'Gift cards', url: '/category/gift-cards/' }, { title: 'Bad', url: 'javascript:alert(1)' }] },
  { title: 'About', url: '/pages/about?x=1' },
  { title: 'Team', url: '/pages/about#team' },
  { title: 'FAQ', url: '/#faq' },
] };
const ctx = (over: Partial<RenderContext> = {}): RenderContext => ({ locale: 'ar', dir: 'rtl', currency: 'EGP', store: {}, settings: {}, data: {}, collections: {}, products: {},
  translations: {}, fallbackTranslations: {}, assetUrl: (p) => p, imageUrl: (r) => String(r), menus: { main }, ...over });
const menuExpr = (arg: Expr, ...p: string[]): Expr => ({ k: 'path', p, from: { k: 'lookup', fn: 'menu', args: [arg] } });
const lit = (v: string): Expr => ({ k: 'lit', v });

describe('menu()', () => {
  it('looks a menu up by a literal handle or a setting value', () => {
    const m = evaluate({ k: 'lookup', fn: 'menu', args: [lit('main')] }, {}, ctx()) as { handle: string; title: string; items: { title: string; url: string; children: unknown[] }[] };
    expect(m.handle).toBe('main');
    expect(m.title).toBe('Main');
    expect(m.items.map((i) => i.title)).toEqual(['Home', 'Shop', 'About', 'Team', 'FAQ']);
    expect(m.items[1]!.children).toHaveLength(2);
    const scope = { section: { settings: { menu: 'main' } } };
    expect(evaluate(menuExpr({ k: 'path', p: ['section', 'settings', 'menu'] }, 'title'), scope, ctx())).toBe('Main');
  });

  it('gives an empty menu for an unknown, empty or non-string handle and without host menus', () => {
    expect(evaluate({ k: 'lookup', fn: 'menu', args: [lit('nope')] }, {}, ctx())).toEqual({ handle: 'nope', title: '', items: [] });
    expect(evaluate({ k: 'lookup', fn: 'menu', args: [lit('')] }, {}, ctx())).toEqual({ handle: '', title: '', items: [] });
    expect(evaluate({ k: 'lookup', fn: 'menu', args: [{ k: 'lit', v: 3 }] }, {}, ctx())).toEqual({ handle: '', title: '', items: [] });
    expect(evaluate({ k: 'lookup', fn: 'menu', args: [lit('main')] }, {}, ctx({ menus: undefined }))).toEqual({ handle: 'main', title: '', items: [] });
    expect(evaluate({ k: 'lookup', fn: 'menu', args: [lit('main')] }, {}, ctx({ menus: 'x' as never }))).toEqual({ handle: 'main', title: '', items: [] });
  });

  it('is prototype-safe: inherited menus, items and fields are never read', () => {
    for (const h of ['__proto__', 'constructor', 'toString', 'hasOwnProperty']) {
      expect(evaluate({ k: 'lookup', fn: 'menu', args: [lit(h)] }, {}, ctx())).toEqual({ handle: h, title: '', items: [] });
    }
    const inherited = Object.create({ title: 'evil', url: '/evil', children: [{ title: 'x', url: '/' }] }) as object;
    const menus = Object.create({ main }) as Record<string, Menu>;
    expect(evaluate({ k: 'lookup', fn: 'menu', args: [lit('main')] }, {}, ctx({ menus }))).toEqual({ handle: 'main', title: '', items: [] });
    const m = normalizeMenu({ title: 'T', items: [inherited, null, 7, 'x', [], { title: { x: 1 }, url: { toString: () => '/x' } }] }, 'h');
    expect(m.items).toEqual([
      { title: '', url: '#', active: false, child_active: false, children: [] },
      { title: '', url: '#', active: false, child_active: false, children: [] },
    ]);
    // reading the result never reaches a prototype either
    expect(evaluate(menuExpr(lit('main'), 'items', 'constructor'), {}, ctx())).toBeUndefined();
  });

  it('checks every URL with safeUrl and cuts titles', () => {
    const m = normalizeMenu({ title: 'x'.repeat(500), items: [{ title: 't'.repeat(500), url: 'javascript:alert(1)' }, { title: 'a', url: '//evil.com' }, { title: 'b', url: 'https://ok.example/x' }, { title: 'c', url: 'mailto:a@b.c' }] }, 'h');
    expect(m.title).toHaveLength(200);
    expect(m.items.map((i) => i.url)).toEqual(['#', '#', 'https://ok.example/x', 'mailto:a@b.c']);
    expect(m.items[0]!.title).toHaveLength(200);
  });

  it('keeps 3 levels and at most 250 links', () => {
    const deep = { title: '1', url: '/1', children: [{ title: '2', url: '/2', children: [{ title: '3', url: '/3', children: [{ title: '4', url: '/4' }] }] }] };
    const m = normalizeMenu({ items: [deep] }, 'h');
    expect(m.items[0]!.children[0]!.children[0]!.title).toBe('3');
    expect(m.items[0]!.children[0]!.children[0]!.children).toEqual([]);
    const wide = { items: Array.from({ length: 100 }, (_, i) => ({ title: `${i}`, url: `/${i}`, children: Array.from({ length: 5 }, (_, j) => ({ title: `${i}.${j}`, url: '/' })) })) };
    const w = normalizeMenu(wide, 'h');
    const count = (xs: { children: unknown[] }[]): number => xs.reduce((n, x) => n + 1 + count(x.children as { children: unknown[] }[]), 0);
    expect(count(w.items)).toBe(MAX_MENU_ITEMS);
    // a huge sparse list does not stall
    const sparse: unknown[] = []; sparse.length = 1e9;
    expect(normalizeMenu({ items: sparse }, 'h').items).toEqual([]);
  });

  it('marks active and child_active links from the request path', () => {
    const page = (path: string, locale: 'ar' | 'en' = 'ar') => normalizeMenu(main, 'main', { path, locale });
    const home = page('/');
    expect(home.items.map((i) => i.active)).toEqual([true, false, false, false, false]);
    const cat = page('/category/gift-cards');
    expect(cat.items[1]!.active).toBe(false);
    expect(cat.items[1]!.child_active).toBe(true);
    expect(cat.items[1]!.children[0]!.active).toBe(true);
    // trailing slash, query and hash do not matter
    expect(page('/products/').items[1]!.active).toBe(true);
    expect(page('/pages/about?y=2').items[2]!.active).toBe(true);
    // a link to a part of a page is never active
    expect(page('/pages/about').items[3]!.active).toBe(false);
    expect(page('/').items[4]!.active).toBe(false);
    expect(page('').items.some((i) => i.active)).toBe(false);
  });

  it('matches across the page locale prefix', () => {
    const en: Menu = { handle: 'main', title: '', items: [{ title: 'Home', url: '/en' }, { title: 'Shop', url: '/en/products' }, { title: 'Plain', url: '/pages/a' }, { title: 'Arabic', url: '/products' }] };
    const m = normalizeMenu(en, 'main', { path: '/en/products', locale: 'en' });
    expect(m.items.map((i) => i.active)).toEqual([false, true, false, true]);
    expect(normalizeMenu(en, 'main', { path: '/en', locale: 'en' }).items[0]!.active).toBe(true);
    expect(normalizeMenu(en, 'main', { path: '/en/pages/a/', locale: 'en' }).items[2]!.active).toBe(true);
    // an English link is not the Arabic page
    expect(normalizeMenu(en, 'main', { path: '/products', locale: 'ar' }).items[1]!.active).toBe(false);
    expect(menuPathKey('/en/x/', 'en')).toBe('/x');
    expect(menuPathKey('/ar/x', 'ar')).toBe('/x');
    expect(menuPathKey('/english', 'en')).toBe('/english');
    expect(menuPathKey('/%D9%85', 'ar')).toBe('/م');
    expect(menuPathKey('https://x.example/', 'ar')).toBeUndefined();
  });

  it('renders with active links from renderPage request.path', () => {
    const loop: IRNode = { k: 'loop', as: 'i', limit: 50, src: menuExpr(lit('main'), 'items'), body: [
      { k: 'el', tag: 'a', attrs: [{ name: 'href', sink: 'url', parts: [{ k: 'path', p: ['i', 'url'] }] }, { name: 'data-active', sink: 'text', parts: [{ k: 'path', p: ['i', 'active'] }] }],
        children: [{ k: 'text', e: { k: 'path', p: ['i', 'title'] } }] },
    ] };
    const artifact: ArtifactLike = { manifest: { id: 'menus' }, layout: [loop], templates: { index: [] }, templateSections: {}, sections: {}, blocks: {}, snippets: {} };
    const r = renderPage(artifact, { template: 'index', ctx: ctx(), registry: new TagRegistry(), request: { path: '/products' } });
    expect(r.diagnostics).toEqual([]);
    expect(r.html).toContain('<a href="/" data-active="false">Home</a><a href="/products" data-active="true">Shop</a>');
    const none = renderPage(artifact, { template: 'index', ctx: ctx({ menus: {} }), registry: new TagRegistry(), request: { path: '/products' } });
    expect(none.html).not.toContain('<a');
  });

  it('refuses a stored artifact whose menu() argument was tampered with (SN9017)', () => {
    const tampered = (args: unknown): ArtifactLike => ({ manifest: { id: 'menus' }, templates: { index: [] }, templateSections: {}, sections: {}, blocks: {}, snippets: {},
      layout: [{ k: 'text', e: { k: 'path', p: ['title'], from: { k: 'lookup', fn: 'menu', args } } } as IRNode] });
    for (const args of [[{ k: 'path', p: ['product', 'title'] }], [], [{ k: 'lit', v: 'a' }, { k: 'lit', v: 'b' }], [{ k: 'lookup', fn: 't', args: [{ k: 'lit', v: 'main' }] }]]) {
      const r = renderPage(tampered(args), { template: 'index', ctx: ctx(), registry: new TagRegistry() });
      expect(r.html, JSON.stringify(args)).toBe('');
      expect(r.diagnostics.map((d) => d.code)).toContain('SN9017');
    }
    expect(renderPage(tampered([{ k: 'lit', v: 'main' }]), { template: 'index', ctx: ctx(), registry: new TagRegistry() }).html).toContain('Main');
  });
});
