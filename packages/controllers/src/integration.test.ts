// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { compileTheme } from '@hekana/sneferu-compiler';
import { renderPage } from '@hekana/sneferu-runtime';
import { createDefaultRegistry } from '@hekana/sneferu-components';
import { DEFAULT_THEME_FILES } from '@hekana/sneferu-templates-default';
import { startControllers } from './index';
import { makeHost } from './test-host';

/** The server markup of the default store's product page, upgraded by the controllers: the tag/controller contract end to end. */
const registry = createDefaultRegistry();
const { artifact } = compileTheme(DEFAULT_THEME_FILES, registry);
const product = {
  id: 'P1', title: 'Pack', handle: 'p', url: '/products/p', available: true, price: 1000, compare_at: null, image: { url: '/a.png' },
  images: [{ url: 'https://x.test/1.png' }, { url: 'https://x.test/2.png' }],
  options: [{ name: 'Size', values: ['S', 'M'] }],
  variants: [
    { id: 'V1', title: 'S', price: 1000, compare_at: null, available: true, options: ['S'], image: { url: 'https://x.test/1.png' } },
    { id: 'V2', title: 'M', price: 2500, compare_at: 3000, available: true, options: ['M'], image: { url: 'https://x.test/2.png' } },
  ],
  selected_variant: { id: 'V1' }, min_quantity: 5, quantity_step: 5, max_quantity: 20, description: '', excerpt: '', tags: [], category: null,
};
const ctx = { locale: 'en' as const, dir: 'ltr' as const, currency: 'EGP', store: { name: 'S' }, settings: {}, data: {}, collections: {}, products: {}, translations: artifact!.locales.en!, fallbackTranslations: artifact!.locales.en!, assetUrl: (p: string) => p, imageUrl: (r: unknown) => String(r) };
const mount = () => {
  const r = renderPage(artifact as never, { template: 'product', ctx, registry, scope: { product }, request: { path: '/products/p' } });
  document.body.innerHTML = r.html;
  return r;
};
const $ = (s: string) => document.querySelector(s) as HTMLElement;
const tick = () => new Promise((ok) => setTimeout(ok, 0));

describe('server markup and controllers agree', () => {
  it('declares the controllers the page needs', () => {
    expect(mount().controllers.sort()).toEqual(['add-to-cart', 'cart-count', 'cart-drawer', 'cart-items', 'cart-summary', 'gallery', 'variant-picker']);
  });
  it('picking a variant updates price, add-to-cart variant and gallery; the quantity rules hold; add reaches the host', async () => {
    mount();
    const t = makeHost();
    const stop = startControllers(document, t.host);
    expect($('[data-hk-bind="price"] .sn-now')).toBeTruthy();
    const qty = $('input[name="quantity"]') as HTMLInputElement;
    expect(qty.value).toBe('5');
    (document.querySelector('input[value="M"]') as HTMLInputElement).click();
    expect($('[data-hk-bind="price"] .sn-now').textContent).toBe('E25');
    expect($('[data-hk-bind="price"] .sn-was')).toBeTruthy();
    expect(($('input[name="variant"]') as HTMLInputElement).value).toBe('V2');
    expect(document.querySelector('[data-hk-slide="1"]')!.hasAttribute('hidden')).toBe(false);
    $('[data-hk-qty="inc"]').click();
    expect(qty.value).toBe('10');
    $('form[data-hk-controller="add-to-cart"]').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    await tick();
    expect(t.calls.add).toEqual([{ productId: 'P1', variantId: 'V2', quantity: 10 }]);
    stop();
  });
  it('cart count, items, summary and drawer follow the host cart', () => {
    mount();
    const t = makeHost();
    const stop = startControllers(document, t.host);
    expect($('.sn-cart-count').hidden).toBe(true);
    t.set([{ key: 'k', productId: 'P1', title: 'Pack', unitPrice: 1000, quantity: 3 }]);
    expect($('.sn-cart-count').textContent).toBe('3');
    expect($('[data-hk-bind="subtotal"]').textContent).toBe('E30');
    expect(document.querySelectorAll('.sn-cart-item').length).toBe(1);
    expect($('.sn-cart-drawer [data-hk-list]').hasAttribute('hidden')).toBe(false);
    stop();
  });
});
