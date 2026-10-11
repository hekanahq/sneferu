import { describe, it, expect } from 'vitest';
import type { TagRenderContext } from '@hekana/sneferu-core';
import { createDefaultRegistry } from './index';

type Kids = string | Record<string, string>;
/** children: a string for renderChildren(), or { '': default, <part>: html } */
const mk = (children: Kids = '') => {
  const css: string[] = [];
  const kids = typeof children === 'string' ? { '': children } : children;
  const c: TagRenderContext = { id: 'c1', css: (r) => css.push(r), controller: () => {}, data: {}, locale: 'ar', dir: 'rtl', t: (k) => (k === 'add_to_cart' ? 'أضف للسلة' : k), renderChildren: (part?: string) => kids[part ?? ''] ?? '' };
  return { c, css };
};
const r = createDefaultRegistry();
const render = (tag: string, props: Record<string, unknown>, children: Kids = '') => { const { c, css } = mk(children); return { html: r.get(tag)!.render(props, c), css }; };
/** hk-product-card's markup in 0.2, before parts existed. */
const CARD_02 = '<a class="sn-product-card" href="/p"><img src="https://cdn.x/1.webp" alt="P &quot;1&quot;" loading="lazy" decoding="async"><span class="sn-title">P "1"</span><span class="sn-c1-p sn-price"><span class="sn-now">10.00 ج.م</span> <s class="sn-was">12.00 ج.م</s></span></a>';
const PROD = { title: 'P "1"', url: '/p', price: 1000, compare_at: 1200, image: { url: 'https://cdn.x/1.webp' } };

describe('content and commerce tags', () => {
  it('registers the base set', () => {
    expect([...r.names()].sort()).toEqual(['hk-badge', 'hk-button', 'hk-card', 'hk-container', 'hk-grid', 'hk-heading', 'hk-image', 'hk-price', 'hk-product-card', 'hk-product-grid', 'hk-rich-text', 'hk-section', 'hk-stack', 'hk-text']);
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
  it('every base tag carries pass-through attributes on its root (I7)', () => {
    const extra = { class: 'lead "x" <y>', id: 'top one', role: 'region', title: '"><script>', 'aria-label': 'عن "المتجر"', 'data-x': '1', 'data-hk-section': 'spoof', 'data-a<b': 'z', onclick: 'alert(1)' };
    const need: Record<string, Record<string, unknown>> = { 'hk-image': { src: '/a.png' }, 'hk-product-card': { product: { title: 'P', url: '/p' } }, 'hk-rich-text': { html: '<p>x</p>' } };
    for (const name of r.names()) {
      const { html } = render(name, { ...need[name], ...extra }, '<i></i>');
      const root = /^<[a-z0-9]+([^>]*)>/.exec(html)![1]!;
      expect(root, name).toMatch(/class="[^"]*\blead x y"/);
      expect(root, name).toContain(' id="top-one"');
      expect(root, name).toContain(' role="region"');
      expect(root, name).toContain(' title="&quot;&gt;&lt;script&gt;"');
      expect(root, name).toContain(' aria-label="عن &quot;المتجر&quot;"');
      expect(root, name).toContain(' data-x="1"');
      expect(html, name).not.toContain('data-hk-section');
      expect(html, name).not.toContain('data-a<b');
      expect(html, name).not.toContain('onclick');
    }
  });
  it('product card without parts is byte-identical to 0.2', () => {
    expect(render('hk-product-card', { product: PROD }).html).toBe(CARD_02);
    expect(render('hk-product-card', { product: PROD }, { '': '<i>ignored</i>', badge: '  \n ', actions: '' }).html).toBe(CARD_02);
    expect(r.get('hk-product-card')!.parts).toEqual(['badge', 'actions']);
    expect(r.get('hk-product-card')!.allowedChildren).toEqual(['hk-part']);
  });
  it('product card renders a badge part inside and actions after the link', () => {
    const { html } = render('hk-product-card', { product: PROD }, { badge: '<span class="new">New</span>', actions: '<a class="buy" href="/x">Buy</a>' });
    expect(html).toBe('<div class="sn-product-card-wrap"><a class="sn-product-card" href="/p"><span class="new">New</span><img src="https://cdn.x/1.webp" alt="P &quot;1&quot;" loading="lazy" decoding="async"><span class="sn-title">P "1"</span><span class="sn-c1-p sn-price"><span class="sn-now">10.00 ج.م</span> <s class="sn-was">12.00 ج.م</s></span></a><a class="buy" href="/x">Buy</a></div>');
    expect(render('hk-product-card', { product: PROD }, { badge: '<b>B</b>' }).html).toBe(CARD_02.replace('href="/p">', 'href="/p"><b>B</b>'));
    // pass-through attributes go on the root: the wrapper when there are actions
    expect(render('hk-product-card', { product: PROD, class: 'x' }, { actions: '<i></i>' }).html).toMatch(/^<div class="sn-product-card-wrap x"><a class="sn-product-card" href/);
  });
  it('hk-rich-text renders sanitized html and nothing when empty', () => {
    expect(render('hk-rich-text', { html: '<p>Hi <img src=x onerror=alert(1)><a href="javascript:1">x</a></p><script>alert(1)</script>' }).html)
      .toBe('<div class="sn-c1 sn-rich-text"><p>Hi <a rel="nofollow noopener ugc">x</a></p></div>');
    expect(render('hk-rich-text', { html: '<p>x</p>', class: 'lead', id: 'd' }).html).toBe('<div class="sn-c1 sn-rich-text lead" id="d"><p>x</p></div>');
    for (const html of ['', '   ', '<img src=x>', '<script>x</script>', null, undefined, 3, { ar: '<p>x</p>' }]) expect(render('hk-rich-text', { html }).html).toBe('');
    expect(r.get('hk-rich-text')!.props.html!.type).toBe('rich_text');
  });
  it('product grid keeps display:grid and gap when only breakpoint columns are valid (M2)', () => {
    const { css } = render('hk-product-grid', { products: [], columns: { base: 'x', tablet: 2 } });
    expect(css[0]).toBe('.sn-c1{display:grid;gap:16px}');
    expect(css).toContain('@media (max-width:1023px){.sn-c1{grid-template-columns:repeat(2,minmax(0,1fr))}}');
  });
  it('card falls back to a 12px radius instead of printing null (M3)', () => {
    for (const radius of ['abc', null, {}, NaN]) expect(render('hk-card', { radius }).css.join('')).toContain('border-radius:12px;');
    expect(render('hk-card', { radius: 4 }).css.join('')).toContain('border-radius:4px;');
    expect(render('hk-card', { radius: 'abc' }).css.join('')).not.toContain('null');
  });
  it('image and product-card images reject protocol-relative and backslash sources (M4)', () => {
    for (const src of ['//evil.com/a.png', '/\\evil.com/a.png', 'http://x/a.png', 'javascript:x'])
      expect(render('hk-image', { src }).html, src).toBe('');
    for (const url of ['//evil.com/a.png', '/\\evil.com/a.png']) {
      const { html } = render('hk-product-card', { product: { title: 'P', url: '/p', image: { url } } });
      expect(html, url).not.toContain('<img');
    }
    expect(render('hk-product-card', { product: { title: 'P', url: '/p', image: '/a.png' } }).html).toContain('<img src="/a.png"');
  });
});
