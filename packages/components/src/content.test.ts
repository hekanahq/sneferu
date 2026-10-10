import { describe, it, expect } from 'vitest';
import type { TagRenderContext } from '@hekana/sneferu-core';
import { createDefaultRegistry } from './index';

const mk = (children = '') => { const css: string[] = []; const c: TagRenderContext = { id: 'c1', css: (r) => css.push(r), controller: () => {}, data: {}, locale: 'ar', dir: 'rtl', t: (k) => (k === 'add_to_cart' ? 'أضف للسلة' : k), renderChildren: () => children }; return { c, css }; };
const r = createDefaultRegistry();
const render = (tag: string, props: Record<string, unknown>, children = '') => { const { c, css } = mk(children); return { html: r.get(tag)!.render(props, c), css }; };

describe('content and commerce tags', () => {
  it('registers the base set', () => {
    expect([...r.names()].sort()).toEqual(['hk-badge', 'hk-button', 'hk-card', 'hk-container', 'hk-grid', 'hk-heading', 'hk-image', 'hk-price', 'hk-product-card', 'hk-product-grid', 'hk-section', 'hk-stack', 'hk-text']);
  });
  it('heading/text escape and choose level', () => {
    expect(render('hk-heading', { text: '<b>كروت</b>', level: 'h1' }).html).toBe('<h1 class="sn-c1">&lt;b&gt;كروت&lt;/b&gt;</h1>');
    expect(render('hk-heading', { text: 'x', level: 'h9' }).html).toBe('<h2 class="sn-c1">x</h2>');
  });
  it('image accepts only https or site paths', () => {
    expect(render('hk-image', { src: 'https://cdn.x/a.webp', alt: 'كارت', aspectRatio: '1/1' }).html).toBe('<img class="sn-c1" src="https://cdn.x/a.webp" alt="كارت" loading="lazy" decoding="async">');
    expect(render('hk-image', { src: 'javascript:x' }).html).toBe('');
  });
  it('button sanitises links', () => {
    expect(render('hk-button', { label: 'اشحن', href: 'javascript:x' }).html).toBe('<a class="sn-c1 sn-btn sn-btn-solid" href="#">اشحن</a>');
  });
  it('price formats minor units with compare-at', () => {
    expect(render('hk-price', { amount: 129000, compareAt: 150000 }).html).toBe('<span class="sn-c1 sn-price"><span class="sn-now">1,290.00 ج.م</span> <s class="sn-was">1,500.00 ج.م</s></span>');
  });
  it('product grid renders cards for products, bounded by limit', () => {
    const products = [1, 2, 3].map((i) => ({ title: `P${i}`, url: `/products/p${i}`, price: 1000 * i, image: { url: `https://cdn.x/${i}.webp` } }));
    const { html } = render('hk-product-grid', { products, limit: 2, columns: 2 });
    expect(html.match(/sn-product-card/g)).toHaveLength(2);
    expect(html).toContain('href="/products/p1"');
    expect(html).toContain('10.00 ج.م');
  });
});
