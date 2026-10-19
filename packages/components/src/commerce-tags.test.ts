import { describe, it, expect } from 'vitest';
import { defaultUrl, type TagRenderContext } from '@hekana/sneferu-core';
import { createDefaultRegistry } from './index';

const r = createDefaultRegistry();
const run = (tag: string, props: Record<string, unknown>, o: { locale?: 'ar' | 'en'; kids?: Record<string, string>; data?: Record<string, unknown>; t?: Record<string, string> } = {}) => {
  const css: string[] = []; const controllers: string[] = [];
  const locale = o.locale ?? 'en';
  const kids = o.kids ?? {};
  const c: TagRenderContext = { id: 'c1', css: (x) => css.push(x), controller: (n) => controllers.push(n), data: o.data ?? {}, locale, dir: locale === 'ar' ? 'rtl' : 'ltr',
    t: (k) => o.t?.[k] ?? k, renderChildren: (part?: string) => kids[part ?? ''] ?? '', url: (p) => defaultUrl(p, locale) };
  return { html: r.get(tag)!.render(props, c), css: css.join(''), controllers };
};
const img = (n: number) => ({ url: `https://cdn.x/${n}.png`, srcset: `https://cdn.x/${n}-400.png 400w, https://cdn.x/${n}-800.png 800w`, alt: `Alt ${n}` });
const product = (extra: Record<string, unknown> = {}) => ({
  id: 'p1', title: 'Card "Pro"', url: '/products/card', available: true, price: 1000, images: [img(1), img(2), img(3)],
  options: [{ name: 'Size', values: ['S', 'M'] }, { name: 'Colour', values: ['Red', 'Blue'] }],
  variants: [
    { id: 'v1', title: 'S / Red', price: 1000, compare_at: 1200, available: true, options: ['S', 'Red'], image: img(1) },
    { id: 'v2', title: 'S / Blue', price: 1100, compare_at: null, available: false, options: ['S', 'Blue'], image: null },
    { id: 'v3', title: 'M / Red', price: 1300, compare_at: null, available: true, options: ['M', 'Red'], image: img(3) },
  ],
  selected_variant: { id: 'v1' }, min_quantity: 1, quantity_step: 1, max_quantity: 10, ...extra,
});
const config = (html: string): Record<string, unknown> => {
  const m = /data-hk-config="([^"]*)"/.exec(html)!;
  return JSON.parse(m[1]!.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
};

describe('hk-product-gallery', () => {
  it('renders the first image eager and high priority, thumbnails as anchors, and the controller hook', () => {
    const { html, controllers } = run('hk-product-gallery', { product: product() });
    expect(controllers).toEqual([]); // the runtime adds tag.controller itself
    expect(r.get('hk-product-gallery')!.controller).toBe('gallery');
    expect(html).toContain('data-hk-controller="gallery" data-hk-product="p1"');
    expect(html).toContain('<figure class="sn-gallery-slide sn-active" id="hk-g-c1-0" data-hk-slide="0" data-hk-src="https://cdn.x/1.png">');
    expect(html.match(/fetchpriority="high"/g)).toHaveLength(1);
    expect(html.match(/loading="lazy"/g)!.length).toBeGreaterThanOrEqual(2);
    expect(html).toContain('srcset="https://cdn.x/1-400.png 400w, https://cdn.x/1-800.png 800w"');
    expect(html).toContain('<a href="#hk-g-c1-1" data-hk-thumb="1" aria-label="Image 2">');
    expect(html).toContain('aria-current="true"');
    expect(html).toContain('alt="Alt 1"');
  });
  it('has no thumbnails for one image or when turned off, and nothing without images', () => {
    expect(run('hk-product-gallery', { product: product({ images: [img(1)] }) }).html).not.toContain('sn-gallery-thumbs"');
    expect(run('hk-product-gallery', { product: product(), thumbnails: false }).html).not.toContain('<ul class="sn-gallery-thumbs">');
    expect(run('hk-product-gallery', { product: product({ images: [], image: null }) }).html).toBe('');
    expect(run('hk-product-gallery', { product: null }).html).toBe('');
    expect(run('hk-product-gallery', { product: product({ images: [{ url: 'javascript:alert(1)' }, { url: '//evil.test/x.png' }] }) }).html).toBe('');
  });
  it('falls back to the single image, escapes the title as alt and never trusts unsafe sizes', () => {
    const { html } = run('hk-product-gallery', { product: product({ images: undefined, image: { url: '/a.png' } }), sizes: '" onerror="x' });
    expect(html).toContain('src="/a.png"');
    expect(html).toContain('alt="Card &quot;Pro&quot;"');
    expect(html).not.toContain('onerror');
  });
  it('caps the number of images and keeps the layout class to the known ones', () => {
    const many = Array.from({ length: 30 }, (_, i) => img(i));
    expect(run('hk-product-gallery', { product: product({ images: many }) }).html.match(/data-hk-slide=/g)).toHaveLength(12);
    expect(run('hk-product-gallery', { product: product(), layout: 'x" onclick="y' }).html).toContain('sn-gallery-thumbs-below');
    expect(run('hk-product-gallery', { product: product(), layout: 'stacked' }).html).toContain('sn-gallery-stacked');
  });
});

describe('hk-pagination', () => {
  const parts = (cur: number, n: number) => Array.from({ length: n }, (_, i) => ({ page: i + 1, url: `/c?page=${i + 1}`, current: i + 1 === cur }));
  it('renders prev, numbers and next with the current page marked', () => {
    const { html } = run('hk-pagination', { paginate: { pages: 5, prev_url: '/c?page=1', next_url: '/c?page=3', parts: parts(2, 5) } });
    expect(html).toContain('<nav class="sn-c1 sn-pagination" aria-label="Pagination">');
    expect(html).toContain('<a href="/c?page=2" aria-current="page" aria-label="Page 2">2</a>');
    expect(html).toContain('rel="prev"');
    expect(html).toContain('rel="next"');
    expect(html.match(/<li>/g)).toHaveLength(5);
  });
  it('mirrors the arrows on RTL pages and omits an arrow with no link', () => {
    const ar = run('hk-pagination', { paginate: { pages: 3, prev_url: '', next_url: '/c?page=2', parts: parts(1, 3) } }, { locale: 'ar' }).html;
    expect(ar).not.toContain('sn-page-prev');
    expect(ar).toContain('sn-flip');
    expect(ar).toContain('aria-label="التنقل بين الصفحات"');
  });
  it('prints nothing for one page, bad data or unsafe links', () => {
    expect(run('hk-pagination', { paginate: { pages: 1, parts: parts(1, 1) } }).html).toBe('');
    expect(run('hk-pagination', { paginate: null }).html).toBe('');
    expect(run('hk-pagination', { paginate: { pages: 2, parts: [{ page: 1, url: 'javascript:alert(1)', current: true }] } }).html).toBe('');
    expect(run('hk-pagination', { paginate: { pages: 2, prev_url: 'javascript:x', next_url: '/c?page=2', parts: parts(1, 2) } }).html).not.toContain('javascript');
  });
  it('uses the theme words when it has them', () => {
    expect(run('hk-pagination', { paginate: { pages: 2, parts: parts(1, 2) } }, { t: { pagination: 'Pages', page: 'P' } }).html).toContain('aria-label="Pages"');
  });
});

describe('hk-locale-switch', () => {
  it('links to the other language with hreflang, lang and the name in that language', () => {
    expect(run('hk-locale-switch', {}, { locale: 'ar', data: { localization: { alternate_locale: 'en', alternate_url: '/en/products/x' } } }).html)
      .toBe('<a class="sn-c1 sn-locale-switch" href="/en/products/x" hreflang="en" lang="en" rel="alternate">English</a>');
    expect(run('hk-locale-switch', {}, { locale: 'en', data: { localization: { alternate_locale: 'ar', alternate_url: '/products/x' } } }).html).toContain('>العربية</a>');
    expect(run('hk-locale-switch', { display: 'code' }, { data: { localization: { alternate_locale: 'ar', alternate_url: '/x' } } }).html).toContain('>AR</a>');
  });
  it('prints nothing without a usable alternate', () => {
    expect(run('hk-locale-switch', {}).html).toBe('');
    expect(run('hk-locale-switch', {}, { data: { localization: { alternate_locale: null, alternate_url: '' } } }).html).toBe('');
    expect(run('hk-locale-switch', {}, { data: { localization: { alternate_locale: 'en', alternate_url: 'javascript:x' } } }).html).toBe('');
    expect(run('hk-locale-switch', {}, { data: { localization: { alternate_locale: 'fr', alternate_url: '/fr' } } }).html).toBe('');
  });
});

describe('hk-variant-picker', () => {
  it('renders a fieldset per option with radios, the selected one checked, and a JSON config', () => {
    const { html } = run('hk-variant-picker', { product: product() });
    expect(html).toContain('data-hk-controller="variant-picker" data-hk-product="p1"');
    expect(html.match(/<fieldset/g)).toHaveLength(2);
    expect(html).toContain('<legend>Size</legend>');
    expect(html).toContain('<input type="radio" name="hk-c1-0" value="S" checked>');
    expect(html).toContain('<input type="radio" name="hk-c1-1" value="Red" checked>');
    const cfg = config(html) as { variants: { id: string; image: string | null }[]; options: unknown[]; selected: string };
    expect(cfg.selected).toBe('v1');
    expect(cfg.options).toHaveLength(2);
    expect(cfg.variants.map((v) => v.id)).toEqual(['v1', 'v2', 'v3']);
    expect(cfg.variants[1]!.image).toBeNull();
  });
  it('renders selects when asked', () => {
    const { html } = run('hk-variant-picker', { product: product(), display: 'select' });
    expect(html).toContain('<select name="hk-c1-0"><option value="S" selected>S</option><option value="M">M</option></select>');
    expect(html).not.toContain('type="radio"');
  });
  it('falls back to a flat list of variants when the options are malformed or missing', () => {
    for (const bad of [{ options: undefined }, { options: [] }, { options: 'x' }, { options: [{ name: 'Size' }] }, { options: [{ name: 'Size', values: ['S'] }] }, { options: [{ name: '', values: ['S'] }] }]) {
      const { html } = run('hk-variant-picker', { product: product(bad) });
      expect(html.match(/<fieldset/g), JSON.stringify(bad)).toHaveLength(1);
      expect(html, JSON.stringify(bad)).toContain('<input type="radio" name="hk-c1-0" value="v1" checked><span>S / Red</span>');
      expect((config(html) as { options: unknown[] }).options).toEqual([]);
    }
  });
  it('names an untitled variant "Option N" in the flat list, never by its id', () => {
    const untitled = { options: undefined, variants: [{ id: 'gid://v/91', options: [] }, { id: 'v2', title: '  ', options: [] }, { id: 'v3', title: 'Big', options: [] }] };
    const { html } = run('hk-variant-picker', { product: product(untitled) });
    expect(html).toContain('value="gid://v/91" checked><span>Option 1</span>');
    expect(html).toContain('value="v2"><span>Option 2</span>');
    expect(html).toContain('<span>Big</span>');
    expect(html).not.toContain('<span>gid://v/91</span>');
    expect(run('hk-variant-picker', { product: product(untitled), display: 'select' }, { locale: 'ar' }).html).toContain('>خيار 1</option>');
    expect(run('hk-variant-picker', { product: product(untitled) }, { t: { option: 'Choice' } }).html).toContain('<span>Choice 2</span>');
  });
  it('prints nothing for a product with a single variant, and survives garbage', () => {
    expect(run('hk-variant-picker', { product: product({ variants: [{ id: 'v1', title: 'Default', options: [] }], options: [] }) }).html).toBe('');
    expect(run('hk-variant-picker', { product: product({ variants: 'x' }) }).html).toBe('');
    expect(run('hk-variant-picker', { product: null }).html).toBe('');
    expect(run('hk-variant-picker', { product: product({ variants: [null, 7, { id: {} }, { id: 'a', options: 'x' }, { id: 'b' }] }) }).html).toContain('data-hk-product="p1"');
  });
  it('escapes hostile values in markup and keeps the config attribute safe', () => {
    const evil = '"></div><script>alert(1)</script>';
    const { html } = run('hk-variant-picker', { product: product({ id: evil, options: [{ name: evil, values: [evil, 'ok'] }], variants: [
      { id: evil, title: evil, price: 1, options: [evil], available: true }, { id: 'x2', title: 'x', price: 2, options: ['ok'], available: true }] }) });
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('</div><script');
    const attr = /data-hk-config="([^"]*)"/.exec(html)![1]!;
    expect(attr).not.toMatch(/[<>"]/);
    expect(config(html).productId).toBe(evil);
  });
  it('rejects variant images that are not safe', () => {
    const { html } = run('hk-variant-picker', { product: product({ variants: [{ id: 'a', options: ['S', 'Red'], image: { url: 'javascript:x' } }, { id: 'b', options: ['M', 'Red'], image: { url: '//x.test/a.png' } }] }) });
    expect((config(html) as { variants: { image: string | null }[] }).variants.map((v) => v.image)).toEqual([null, null]);
  });
});

describe('hk-add-to-cart', () => {
  it('renders a GET form to the product with a quantity stepper, the variant and the config', () => {
    const { html } = run('hk-add-to-cart', { product: product() });
    expect(html).toContain('<form class="sn-c1 sn-add-to-cart" action="/en/products/card" method="get" data-hk-controller="add-to-cart" data-hk-product="p1"');
    expect(html).toContain('<input type="hidden" name="variant" value="v1">');
    expect(html).toContain('name="quantity" value="1" min="1" step="1" max="10" inputmode="numeric" aria-label="Quantity"');
    expect(html).toContain('data-hk-qty="dec" aria-label="Decrease quantity"');
    expect(html).toContain('data-hk-label="Add to cart" data-hk-soldout="Sold out">Add to cart</button>');
    expect(html).toContain('<p class="sn-atc-message" role="status" aria-live="polite" hidden></p>');
    expect(config(html)).toEqual({ productId: 'p1', variantId: 'v1', min: 1, step: 1, max: 10, available: true });
  });
  it('starts at the minimum and steps by the step (500 / 50) and drops a cap that is below the minimum', () => {
    const { html } = run('hk-add-to-cart', { product: product({ min_quantity: 500, quantity_step: 50, max_quantity: 2000 }) });
    expect(html).toContain('value="500" min="500" step="50" max="2000"');
    expect(config(run('hk-add-to-cart', { product: product({ min_quantity: 500, max_quantity: 10 }) }).html)).toMatchObject({ min: 500, max: null });
    expect(config(run('hk-add-to-cart', { product: product({ min_quantity: 'x', quantity_step: -3, max_quantity: 1.5 }) }).html)).toMatchObject({ min: 1, step: 1, max: null });
  });
  it('disables the button and shows the sold out label when nothing can be bought', () => {
    const out = run('hk-add-to-cart', { product: product({ available: false }) }).html;
    expect(out).toContain(' disabled>Sold out</button>');
    expect(config(out).available).toBe(false);
    const variantOut = run('hk-add-to-cart', { product: product({ selected_variant: { id: 'v2' } }) }).html;
    expect(variantOut).toContain(' disabled>Sold out</button>');
    expect(run('hk-add-to-cart', { product: product({ available: false }), soldOutLabel: 'Gone' }).html).toContain('>Gone</button>');
  });
  it('uses the merchant label, the theme words and a hidden quantity when the picker is off', () => {
    const { html } = run('hk-add-to-cart', { product: product(), label: 'Buy now', quantity: false }, { locale: 'ar' });
    expect(html).toContain('>Buy now</button>');
    expect(html).toContain('<input type="hidden" name="quantity" value="1">');
    expect(html).not.toContain('sn-qty-btn');
    expect(run('hk-add-to-cart', { product: product() }, { locale: 'ar' }).html).toContain('>أضف للسلة</button>');
    expect(run('hk-add-to-cart', { product: product() }, { t: { add_to_cart: 'Grab it' } }).html).toContain('>Grab it</button>');
  });
  it('adds the default variant for a product with no variants and still renders', () => {
    const { html } = run('hk-add-to-cart', { product: product({ variants: undefined }) });
    expect(config(html)).toMatchObject({ variantId: null, available: true });
    expect(html).toContain('<input type="hidden" name="variant" value="">');
  });
  it('without a safe product url renders a link to the cart page styled as the button, never a form to the current page', () => {
    for (const url of [undefined, '', 'javascript:alert(1)', '//evil.test/x', 7]) {
      const { html } = run('hk-add-to-cart', { product: product({ url }) });
      expect(html, String(url)).not.toContain('<form');
      expect(html, String(url)).toContain('<a class="sn-btn sn-btn-solid sn-atc-button" href="/en/cart">View cart</a>');
      expect(html, String(url)).not.toContain('evil');
    }
    expect(run('hk-add-to-cart', { product: product({ url: undefined }), variant: 'outline' }, { locale: 'ar' }).html).toContain('<a class="sn-btn sn-btn-outline sn-atc-button" href="/cart">عرض السلة</a>');
  });
  it('a list card for a product with variants and no selected variant links to the product page instead of a form', () => {
    const card = { has_variants: true, selected_variant: undefined };
    const en = run('hk-add-to-cart', { product: product(card) }).html;
    expect(en).not.toContain('<form');
    expect(en).toContain('<a class="sn-btn sn-btn-solid sn-atc-button" href="/en/products/card" aria-label="Choose options: Card &quot;Pro&quot;">Choose options</a>');
    expect(run('hk-add-to-cart', { product: product(card) }, { locale: 'ar' }).html).toContain('>اختر الخيارات</a>');
    expect(run('hk-add-to-cart', { product: product(card), chooseLabel: 'Pick', variant: 'outline' }).html).toContain('<a class="sn-btn sn-btn-outline sn-atc-button" href="/en/products/card" aria-label="Pick: Card &quot;Pro&quot;">Pick</a>');
    expect(run('hk-add-to-cart', { product: product({ ...card, available: false }) }).html).toContain(' disabled>Sold out</button>');
  });
  it('real list-card shape: empty variants, null selected_variant, has_variants true', () => {
    const html = run('hk-add-to-cart', { product: product({ variants: [], selected_variant: null, has_variants: true }) }).html;
    expect(html).not.toContain('<form');
    expect(html).toContain('>Choose options</a>');
  });
  it('on the product\'s own page never links to itself: a stale has_variants with no variants still gets the add button', () => {
    // a product flagged has_variants whose variants were never created (or all deleted) is sold as a plain product
    const stale = product({ variants: [], options: [], selected_variant: null, has_variants: true });
    const own = { request: { path: '/products/card', page_type: 'product', locale: 'en' }, product: stale };
    const html = run('hk-add-to-cart', { product: stale }, { data: own }).html;
    expect(html).not.toContain('Choose options');
    expect(html).not.toContain('href="/en/products/card"');
    expect(html).toContain('data-hk-controller="add-to-cart"');
    expect(config(html)).toMatchObject({ productId: 'p1', variantId: null, available: true });
    expect(run('hk-add-to-cart', { product: stale }, { data: own, locale: 'ar' }).html).toContain('>أضف للسلة</button>');
    // sold out still shows as sold out
    expect(run('hk-add-to-cart', { product: { ...stale, available: false } }, { data: own }).html).toContain(' disabled>Sold out</button>');
    // a card for ANOTHER product on a product page (related products) still links to that product
    const other = product({ id: 'p2', url: '/products/other', variants: [], selected_variant: null, has_variants: true });
    expect(run('hk-add-to-cart', { product: other }, { data: own }).html).toContain('href="/en/products/other"');
    // the real path may carry the locale/store prefix, a query or a trailing slash
    for (const path of ['/en/products/card', '/store/x/products/card/', '/products/card?variant=1']) {
      expect(run('hk-add-to-cart', { product: stale }, { data: { request: { path, page_type: 'product' } } }).html, path).toContain('data-hk-controller="add-to-cart"');
    }
    // a related card whose loop variable shadows `product` on another product's page still links
    expect(run('hk-add-to-cart', { product: stale }, { data: { request: { path: '/products/other', page_type: 'product' }, product: stale } }).html).toContain('>Choose options</a>');
    expect(run('hk-add-to-cart', { product: stale }, { data: { request: { path: '/products/xcard', page_type: 'product' } } }).html).toContain('>Choose options</a>');
    // and a list page keeps the choose-options link
    expect(run('hk-add-to-cart', { product: stale }, { data: { request: { path: '/products', page_type: 'collection' } } }).html).toContain('>Choose options</a>');
  });
  it('keeps the add button for single-variant products and when a variant is selected', () => {
    expect(run('hk-add-to-cart', { product: product({ has_variants: false, selected_variant: undefined, variants: undefined }) }).html).toContain('<form');
    expect(run('hk-add-to-cart', { product: product({ has_variants: true }) }).html).toContain('<form');
  });
  it('escapes everything and bounds labels', () => {
    const { html } = run('hk-add-to-cart', { product: product({ id: '"><b>', url: '/p?a="x"' }), label: '<i>x</i>'.repeat(40) });
    expect(html).not.toContain('<b>');
    expect(html).not.toContain('<i>');
    expect(html.length).toBeLessThan(4000);
  });
});

describe('cart tags', () => {
  it('hk-cart-count is an empty live region until the controller fills it', () => {
    const { html } = run('hk-cart-count', {});
    expect(html).toBe('<span class="sn-c1 sn-cart-count" data-hk-controller="cart-count" aria-live="polite" hidden></span>');
  });
  it('hk-cart-items has a hidden list, the theme empty state and a fallback link to the cart page', () => {
    const { html } = run('hk-cart-items', {}, { kids: { empty: '<p>Nothing here</p>' } });
    expect(html).toContain('<ul class="sn-cart-list" data-hk-list hidden></ul>');
    expect(html).toContain('<div class="sn-cart-empty" data-hk-empty><p>Nothing here</p></div>');
    expect(html).toContain('<a class="sn-cart-fallback" data-hk-fallback href="/en/cart">View cart</a>');
    expect(run('hk-cart-items', {}).html).toContain('<p>Your cart is empty</p>');
    expect(run('hk-cart-items', { checkoutLabel: 'Pay' }, { locale: 'ar' }).html).toContain('href="/cart">Pay</a>');
    expect(run('hk-cart-items', {}, { locale: 'ar' }).html).toContain('href="/cart">عرض السلة</a>');
  });
  it('hk-cart-summary has the subtotal binding and a checkout link', () => {
    const { html } = run('hk-cart-summary', { subtotalLabel: 'Total' });
    expect(html).toContain('<span class="sn-cart-subtotal-label">Total</span><span class="sn-cart-subtotal-value" data-hk-bind="subtotal"></span>');
    expect(html).toContain('<a class="sn-btn sn-btn-solid sn-cart-checkout" href="/en/checkout">Checkout</a>');
  });
  it('hk-cart-drawer is a labelled dialog with a close button and its children', () => {
    const { html, css } = run('hk-cart-drawer', { openOnAdd: false }, { kids: { '': '<i>kid</i>' } });
    expect(html).toContain('<dialog class="sn-c1 sn-cart-drawer" data-hk-controller="cart-drawer" aria-label="Cart"');
    expect(config(html)).toEqual({ openOnAdd: false });
    expect(html).toContain('data-hk-close aria-label="Close"');
    expect(html).toContain('<div class="sn-drawer-body"><i>kid</i></div>');
    expect(css).toContain('prefers-reduced-motion');
    expect(css).toContain('[dir=rtl] .sn-cart-drawer');
  });
  it('declares the controllers and the built-in words', () => {
    for (const [tag, ctl] of [['hk-variant-picker', 'variant-picker'], ['hk-add-to-cart', 'add-to-cart'], ['hk-cart-count', 'cart-count'], ['hk-cart-items', 'cart-items'], ['hk-cart-summary', 'cart-summary'], ['hk-cart-drawer', 'cart-drawer'], ['hk-product-gallery', 'gallery']] as const)
      expect(r.get(tag)!.controller, tag).toBe(ctl);
    expect(r.get('hk-add-to-cart')!.strings!.add_to_cart).toEqual({ ar: 'أضف للسلة', en: 'Add to cart' });
  });
});

describe('hk-price with a product', () => {
  it('binds to the product when it has variants, so the picker can update it', () => {
    const bound = run('hk-price', { amount: 1000, product: product() }).html;
    expect(bound).toContain(' data-hk-bind="price" data-hk-product="p1"');
    expect(run('hk-price', { amount: 1000, product: product({ variants: [] }) }).html).not.toContain('data-hk-bind');
    expect(run('hk-price', { amount: 1000 }).html).not.toContain('data-hk-bind');
  });
});

describe('hk-variant-picker swatches', () => {
  const swatchProduct = (extra: Record<string, unknown> = {}) => product({
    options: [
      { name: 'Size', values: ['S', 'M'], presentation: 'buttons' },
      { name: 'Colour', values: ['Red', 'Blue'], presentation: 'image', swatches: [
        { value: 'Red', color: '#cc0000', image: { url: 'https://cdn.x/red-swatch.png' } },
        { value: 'Blue', color: '#0000CC', image: null },
      ] },
    ],
    ...extra,
  });

  it('display="swatches": swatch photo, else a variant photo of that value, else the colour, else text', () => {
    const { html, css } = run('hk-variant-picker', { product: swatchProduct(), display: 'swatches' });
    expect(html).toContain('<input type="radio" name="hk-c1-1" value="Red" checked><span class="sn-vp-tile"><img src="https://cdn.x/red-swatch.png" alt="" width="64" height="64" loading="lazy" decoding="async"><span class="sn-vp-tile-name">Red</span></span>');
    // Blue: no swatch photo and no variant photo (v2 has image null) -> its colour, lower-cased
    expect(html).toContain('value="Blue"><span class="sn-vp-dot-wrap"><span class="sn-vp-dot" style="background:#0000cc" aria-hidden="true"></span>Blue</span>');
    // Size S: no swatch, variant v1 (S / Red) has photo 1
    expect(html).toContain('value="S" checked><span class="sn-vp-tile"><img src="https://cdn.x/1.png"');
    expect(css).toContain('.sn-vp-tile img{');
  });

  it('display="auto" follows each option: Size stays buttons, Colour becomes photo tiles', () => {
    const { html } = run('hk-variant-picker', { product: swatchProduct(), display: 'auto' });
    expect(html).toContain('value="S" checked><span>S</span>');
    expect(html).toContain('<span class="sn-vp-tile-name">Red</span>');
  });

  it('display="auto" turns a dropdown option into a select and a colour option into dots', () => {
    const p = swatchProduct({ options: [
      { name: 'Size', values: ['S', 'M'], presentation: 'dropdown' },
      { name: 'Colour', values: ['Red', 'Blue'], presentation: 'color', swatches: [{ value: 'Red', color: '#cc0000' }, { value: 'Blue', color: '#0000cc' }] },
    ] });
    const { html } = run('hk-variant-picker', { product: p, display: 'auto' });
    expect(html).toContain('<select name="hk-c1-0"><option value="S" selected>S</option>');
    expect(html).toContain('<span class="sn-vp-dot" style="background:#cc0000" aria-hidden="true"></span>Red');
    expect(html).not.toContain('sn-vp-tile');
  });

  it('defaults to auto: no display prop behaves like display="auto"', () => {
    const a = run('hk-variant-picker', { product: swatchProduct() }).html;
    expect(a).toBe(run('hk-variant-picker', { product: swatchProduct(), display: 'auto' }).html);
    expect(a).toContain('sn-vp-tile-name');
  });

  it('display="buttons" keeps plain buttons even when the option has photos', () => {
    const { html } = run('hk-variant-picker', { product: swatchProduct(), display: 'buttons' });
    expect(html).not.toContain('sn-vp-tile');
    expect(html).toContain('value="Red" checked><span>Red</span>');
  });

  it('auto reads the data: photos make tiles, colours make dots, neither stays buttons', () => {
    const p = (colour: Record<string, unknown>) => swatchProduct({ options: [{ name: 'Size', values: ['S', 'M'], presentation: 'buttons' }, { name: 'Colour', values: ['Red', 'Blue'], ...colour }] });
    const noPresentation = { swatches: [{ value: 'Red', color: null, image: { url: 'https://cdn.x/r.png' } }, { value: 'Blue', color: null, image: null }] };
    expect(run('hk-variant-picker', { product: p(noPresentation) }).html).toContain('sn-vp-tile');
    const colourWithPhotos = { presentation: 'color', ...noPresentation };
    expect(run('hk-variant-picker', { product: p(colourWithPhotos) }).html).toContain('<span class="sn-vp-tile-name">Red</span>');
    const dotsOnly = { swatches: [{ value: 'Red', color: '#cc0000', image: null }, { value: 'Blue', color: '#0000cc', image: null }] };
    const dots = run('hk-variant-picker', { product: p(dotsOnly) }).html;
    expect(dots).toContain('sn-vp-dot');
    expect(dots).not.toContain('sn-vp-tile');
    expect(run('hk-variant-picker', { product: p({ presentation: 'dropdown', ...noPresentation }) }).html).toContain('<select name="hk-c1-1">');
    expect(run('hk-variant-picker', { product: p({}) }).html).not.toContain('sn-vp-dot');
  });

  it('drops unsafe swatch images and malformed colours, and falls back to text', () => {
    const p = product({
      options: [
        { name: 'Size', values: ['S', 'M'] },
        { name: 'Colour', values: ['Red', 'Blue'], presentation: 'color', swatches: [
          { value: 'Red', color: 'red;background:url(x)', image: { url: 'javascript:alert(1)' } },
          { value: 'Blue', color: '#00f', image: '//evil.test/a.png' },
        ] },
      ],
      variants: [{ id: 'v1', options: ['S', 'Red'] }, { id: 'v2', options: ['M', 'Blue'] }],
      selected_variant: { id: 'v1' },
    });
    const { html } = run('hk-variant-picker', { product: p, display: 'swatches' });
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('url(x)');
    expect(html).not.toContain('evil.test');
    expect(html).toContain('value="Red" checked><span>Red</span>');
    expect(html).toContain('value="Blue"><span>Blue</span>');
  });

  it('keeps the config shape the controller reads, with the display used', () => {
    const { html } = run('hk-variant-picker', { product: swatchProduct(), display: 'swatches' });
    const cfg = config(html) as { style: string; options: { presentation: string; swatches: unknown[] }[] };
    expect(cfg.style).toBe('swatches');
    expect(cfg.options[1]!.presentation).toBe('image');
    expect(cfg.options[1]!.swatches).toHaveLength(2);
  });
});
