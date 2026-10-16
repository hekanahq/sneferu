import { describe, it, expect } from 'vitest';
import { TagRegistry, type IRNode } from '@hekana/sneferu-core';
import { renderPage, type ArtifactLike, type RenderContext } from './index';

const ctx: RenderContext = { locale: 'en', dir: 'ltr', currency: 'EGP', store: { name: 'S' }, settings: {}, data: {}, collections: {}, products: {},
  translations: {}, fallbackTranslations: {}, assetUrl: (p) => p, imageUrl: (r) => String(r) };
const html = (s: string): IRNode => ({ k: 'html', s });
const comp = (tag: string, children: IRNode[] = []): IRNode => ({ k: 'comp', tag, props: {}, children });
const tag = (name: string, controller: string | undefined, render: (c: { renderChildren(): string }) => string) => ({
  name, version: 1, category: 'commerce', props: {}, allowedParents: '*', allowedChildren: '*', responsive: [], bindable: [],
  ...(controller ? { controller } : {}), render: (_p: unknown, c: { renderChildren(): string }) => render(c),
  editor: { label: { ar: 'x', en: 'x' }, group: 'commerce', insertable: false },
}) as never;
const reg = () => new TagRegistry()
  .register(tag('hk-section-group', undefined, () => 'NEVER'))
  .register(tag('hk-cart-drawer', 'cart-drawer', (c) => `<dialog data-hk-controller="cart-drawer">${c.renderChildren()}</dialog>`))
  .register(tag('hk-cart-items', 'cart-items', () => '<div data-hk-controller="cart-items"></div>'))
  .register(tag('hk-cart-summary', 'cart-summary', () => '<div data-hk-controller="cart-summary"></div>'))
  .register(tag('hk-cart-count', 'cart-count', () => '<span data-hk-controller="cart-count"></span>'))
  .register(tag('hk-icon', undefined, () => '<svg></svg>'));
const lbl = { ar: 'ع', en: 'L' };
const group = (name: string): IRNode => ({ k: 'comp', tag: 'hk-section-group', props: { name: { k: 'static', v: name } }, children: [] });
const art = (): ArtifactLike => ({
  manifest: { id: 'tthm', locales: ['en', 'ar'] },
  layout: [group('header'), html('<main>'), { k: 'slot', name: 'content' }, html('</main>')],
  templates: { index: [{ k: 'slot', name: 'sections' }] }, templateSections: { index: [] },
  sections: {
    header: { ir: [html('<header><a href="/cart" data-hk-open="cart-drawer">cart</a>'), comp('hk-cart-count'), comp('hk-cart-drawer', [comp('hk-cart-items'), comp('hk-cart-summary')]), html('</header>')], schema: { name: lbl, version: 1, settings: {} } },
    plain: { ir: [html('<header>logo</header>')], schema: { name: lbl, version: 1, settings: {} } },
  },
  blocks: {}, snippets: {},
  groups: { header: [{ id: 'h', type: 'header' }] },
});
const run = (o: object = {}) => renderPage(art(), { template: 'index', ctx, registry: reg(), ...o });
const count = (s: string, needle: string) => s.split(needle).length - 1;

describe('cart fallback', () => {
  it('adds nothing when the header carries the cart', () => {
    const r = run({ cartFallback: true });
    expect(count(r.html, 'data-hk-controller="cart-drawer"')).toBe(1);
    expect(r.html).not.toContain('data-hk-cart-fallback');
  });
  it('adds nothing when the option is off, even with no header', () => {
    const r = run({ groups: { header: [] } });
    expect(r.html).not.toContain('cart-drawer');
    expect(r.controllers).toEqual([]);
  });
  it('appends the drawer and a cart link when the header was removed', () => {
    const r = run({ groups: { header: [] }, cartFallback: { label: 'Cart' } });
    expect(r.html).toContain('data-hk-cart-fallback');
    expect(count(r.html, 'data-hk-controller="cart-drawer"')).toBe(1);
    expect(r.html).toContain('data-hk-controller="cart-items"');
    expect(r.html).toContain('data-hk-controller="cart-summary"');
    expect(r.html).toMatch(/<a class="sn-cart-fab" href="\/en\/cart" data-hk-open="cart-drawer" aria-label="Cart">/);
    expect(r.controllers).toEqual(expect.arrayContaining(['cart-drawer', 'cart-items', 'cart-summary', 'cart-count']));
    expect(r.css).toContain('.sn-cart-fab');
    expect(r.html.indexOf('data-hk-cart-fallback')).toBeLessThan(r.html.lastIndexOf('</div>'));
  });
  it('appends the drawer for a header without one, and keeps the header’s own cart link', () => {
    const a = art();
    a.sections.plain = { ir: [html('<header><a href="/cart" data-hk-open="cart-drawer">cart</a></header>')], schema: { name: lbl, version: 1, settings: {} } };
    const r = renderPage(a, { template: 'index', ctx, registry: reg(), groups: { header: [{ id: 'p', type: 'plain' }] }, cartFallback: true });
    expect(count(r.html, 'data-hk-controller="cart-drawer"')).toBe(1);
    expect(r.html).not.toContain('sn-cart-fab');
  });
  it('appends both for a hidden header, and does nothing when the registry has no drawer', () => {
    expect(run({ groups: { header: [{ id: 'h', type: 'header', hidden: true }] }, cartFallback: true }).html).toContain('sn-cart-fab');
    const bare = new TagRegistry().register(tag('hk-section-group', undefined, () => 'NEVER'));
    const r = renderPage(art(), { template: 'index', ctx, registry: bare, groups: { header: [] }, cartFallback: true });
    expect(r.html).not.toContain('data-hk-cart-fallback');
  });
});
