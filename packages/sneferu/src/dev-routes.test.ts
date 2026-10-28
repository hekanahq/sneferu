import { describe, it, expect } from 'vitest';
import { resolveDevRoute, splitLocale, devUrl, plainNotFound, relatedProducts } from './dev-routes';
import { sampleContext } from './sample-data';
import { appBlockPlaceholder, checkoutEmbedPlaceholder } from './dev-page';

const ctx = sampleContext('en', {}, 'en');
const route = (path: string, q = '', locale: 'ar' | 'en' = 'en', defaultLocale: 'ar' | 'en' = 'en') =>
  resolveDevRoute({ path, query: new URLSearchParams(q), locale, defaultLocale, products: ctx.products, collections: ctx.collections });

describe('dev routes', () => {
  it('maps the storefront URLs to templates', () => {
    expect(route('/').template).toBe('index');
    expect(route('/products/sample-2')).toMatchObject({ template: 'product', status: 200, scope: { product: { handle: 'sample-2' } } });
    expect(route('/products')).toMatchObject({ template: 'collection', scope: { collection: { handle: 'all', products_count: 12 }, paginate: { pages: 2 } } });
    expect(route('/category/gift-cards')).toMatchObject({ template: 'collection', scope: { collection: { handle: 'gift-cards', products_count: 6 } } });
    expect(route('/cart').template).toBe('cart');
    expect(route('/pages/about')).toMatchObject({ template: 'page', scope: { page: { handle: 'about', title: 'About us' } } });
  });
  it('answers unknown paths and handles with the 404 template and status', () => {
    for (const p of ['/nope', '/products/missing', '/category/ghost', '/pages/ghost', '/products/__proto__', '/products/constructor', '/products/%E0%A4%A', '/category/x/y']) {
      expect(route(p), p).toMatchObject({ template: '404', status: 404 });
    }
  });
  it('answers a plain 404 only when the theme has no 404 template', () => {
    expect(plainNotFound(route('/nope'), { index: [] })).toBe(true);
    expect(plainNotFound(route('/nope'), { index: [], '404': [] })).toBe(false);
    expect(plainNotFound(route('/cart'), { index: [] })).toBe(false);
    expect(plainNotFound(route('/nope'), Object.create({ '404': [] }))).toBe(true);
  });
  it('clamps page numbers and builds links that keep the query', () => {
    expect(route('/products', 'page=999').scope.paginate).toMatchObject({ page: 2, next_url: '' });
    for (const bad of ['page=-1', 'page=abc', 'page=0', 'page=1e9']) expect(route('/products', bad).scope.paginate, bad).toMatchObject({ page: 1, prev_url: '', next_url: '/en/products?page=2' });
    const hits = route('/search', 'q=card&page=1');
    expect(hits).toMatchObject({ template: 'search', scope: { search: { terms: 'card', results_count: 5 } } });
    expect((hits.scope.paginate as { parts: unknown[] }).parts).toHaveLength(1);
    expect(route('/search').scope.search).toMatchObject({ terms: '', results_count: 0 });
    expect(route('/search', 'q=' + 'x'.repeat(500)).scope.search).toMatchObject({ terms: 'x'.repeat(100) });
  });
  it('previews an alternate template with ?template=, and only a valid alternate of that page type', () => {
    expect(route('/products/sample-1', 'template=product.codes').template).toBe('product.codes');
    expect(route('/products/sample-1', 'template=cart').template).toBe('product');
    expect(route('/products/sample-1', 'template=product.<script>').template).toBe('product');
  });
  it('splits and builds locale prefixes', () => {
    expect(splitLocale('/en/cart')).toEqual({ locale: 'en', path: '/cart' });
    expect(splitLocale('/ar')).toEqual({ locale: 'ar', path: '/' });
    expect(splitLocale('/english')).toEqual({ path: '/english' });
    expect(devUrl('/cart', 'en', 'ar')).toBe('/en/cart');
    expect(devUrl('/cart', 'ar', 'ar')).toBe('/cart');
    expect(devUrl('/cart', 'ar', 'en')).toBe('/ar/cart');
    expect(devUrl('/', 'en', 'en')).toBe('/en');
  });
});

describe('related products', () => {
  const ctx = sampleContext('en', { en: {} }, 'en');
  it("are the product's category minus the product itself", () => {
    const first = Object.values(ctx.products).find((p) => (p as { category: unknown }).category) as { handle: string; category: { handle: string } };
    const rel = relatedProducts(first, ctx.products) as { handle: string; category: { handle: string } }[];
    expect(rel.length).toBeGreaterThan(0);
    expect(rel.length).toBeLessThanOrEqual(8);
    expect(rel.every((p) => p.category.handle === first.category.handle && p.handle !== first.handle)).toBe(true);
  });
  it('are empty for a product with no category', () => {
    const none = Object.values(ctx.products).find((p) => !(p as { category: unknown }).category);
    expect(none).toBeDefined();
    expect(relatedProducts(none, ctx.products)).toEqual([]);
  });
});

describe('sneferu dev: inline checkout placeholder', () => {
  it('serves a still placeholder for the platform checkout, with no form controls', () => {
    const ar = checkoutEmbedPlaceholder('ar');
    const en = checkoutEmbedPlaceholder('en');
    expect(ar).toContain('dir="rtl"');
    expect(ar).toContain('نموذج الطلب من هكانة');
    expect(en).toContain('Hekana order form');
    expect(ar + en).not.toMatch(/<(input|select|textarea|button|form)\b/);
    expect(en).toContain("parent.postMessage({type:'hk:checkout-height',height:document.documentElement.scrollHeight},location.origin)");
  });
});

describe('sneferu dev: app block placeholder', () => {
  it('serves a still box that reports its height, with no form controls and the name escaped', () => {
    const html = appBlockPlaceholder('ar', { ar: 'اشتراك <b>', en: 'Subscription' });
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('&lt;b&gt;');
    expect(html).toContain("parent.postMessage({type:'hk:app-block-height',height:document.documentElement.scrollHeight},location.origin)");
    expect(html).not.toMatch(/<(input|select|textarea|button|form)\b/);
  });
});
