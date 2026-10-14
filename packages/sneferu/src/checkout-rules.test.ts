import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileTheme, type ThemeFile } from '@hekana/sneferu-compiler';
import { renderPage, restrictCheckoutLinks, splitCheckout, type ArtifactLike } from '@hekana/sneferu-runtime';
import { createDefaultRegistry } from '@hekana/sneferu-components';
import { sampleContext } from './sample-data';

const root = fileURLToPath(new URL('../../..', import.meta.url));
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const dir = join(root, 'packages/templates-default/theme');
const base = walk(dir).map((p) => ({ path: relative(dir, p).split('\\').join('/'), text: readFileSync(p, 'utf8') }));
const registry = createDefaultRegistry();
const enc = new TextEncoder();
const files = (over: Record<string, string | null> = {}): ThemeFile[] => [
  ...base.filter((f) => !Object.hasOwn(over, f.path)).map((f) => ({ path: f.path, bytes: enc.encode(f.text) })),
  ...Object.entries(over).filter(([, t]) => t !== null).map(([path, t]) => ({ path, bytes: enc.encode(t!) })),
];
const codes = (over: Record<string, string | null>) => compileTheme(files(over), registry, { defaults: false }).diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);
const section = (inner: string, templates = '["checkout"]', settings = '{}') => `${inner}<hk-schema>{"name":"S","templates":${templates},"settings":${settings}}</hk-schema>`;
const FULL = '<hk-checkout-layout><hk-checkout-contact /><hk-checkout-shipping /><hk-checkout-summary /><hk-checkout-payment /></hk-checkout-layout>';
const bare = { 'blocks/checkout-note.snf': null, 'templates/checkout.snf': '<hk-sections /><hk-schema>{"sections":[{"type":"checkout-main"}]}</hk-schema>' };
const only = (over: Record<string, string | null>) => codes({ ...bare, ...over });
const main = (inner: string, extra = '') => ({ 'sections/checkout-main.snf': section(inner, '["checkout"]', extra || '{}').replace('"settings":{}', '"settings":{},"blocks":{"allowed":[],"max":0}') });

describe('the checkout boundary: compiler rules', () => {
  it('accepts the default checkout and a hand-written one', () => {
    expect(codes({})).toEqual([]);
    expect(codes({ ...main(`<h1>Pay</h1>${FULL}`), 'templates/checkout.snf': '<hk-sections /><hk-schema>{"sections":[{"type":"checkout-main"}]}</hk-schema>' })).toEqual([]);
  });
  it('SN2020: a checkout tag outside the checkout page', () => {
    expect(codes({ 'templates/cart.snf': `${FULL}<hk-sections />` })).toContain('SN2020');
    expect(codes({ 'sections/cart-main.snf': section(FULL, '["cart"]') })).toContain('SN2020');
    expect(codes({ 'layout/theme.snf': `<hk-checkout-payment />${base.find((f) => f.path === 'layout/theme.snf')!.text}` })).toContain('SN2020');
    expect(codes({ 'snippets/pay.snf': '<hk-checkout-payment />' })).toContain('SN2020');
    // a section written for no particular page may not hold them either
    expect(codes({ 'sections/free.snf': section(FULL, '["checkout","cart"]').replace('"checkout","cart"', '"cart"') })).toContain('SN2020');
  });
  it('SN2021: each tag once', () => {
    expect(codes({ ...main('<hk-checkout-layout><hk-checkout-payment /><hk-checkout-payment /></hk-checkout-layout>') })).toContain('SN2021');
    // the template and a default section both place the layout
    expect(codes({ 'templates/checkout.snf': `${FULL}<hk-sections /><hk-schema>{"sections":[{"type":"checkout-main"}]}</hk-schema>` })).toContain('SN2021');
  });
  it('SN2022: the page needs a layout holding the payment part', () => {
    expect(codes({ 'templates/checkout.snf': '<h1>Pay</h1><hk-sections /><hk-schema>{"sections":[]}</hk-schema>' })).toContain('SN2022');
    expect(codes({ 'templates/checkout.snf': '<hk-checkout-layout><hk-checkout-contact /></hk-checkout-layout>' })).toContain('SN2022');
  });
  it('SN2023: parts sit directly inside the layout', () => {
    expect(codes({ ...main('<hk-checkout-payment /><hk-checkout-layout><hk-checkout-contact /></hk-checkout-layout>') })).toContain('SN2023');
    expect(codes({ ...main('<hk-checkout-layout><div><hk-checkout-payment /></div></hk-checkout-layout>') })).toContain('SN2006');
  });
  it('SN2024: only layout, typography, image and link tags', () => {
    for (const tag of ['<hk-cart-summary />', '<hk-price />', '<hk-add-to-cart />', '<hk-product-grid />', '<hk-cart-items />', '<hk-search-form />', '<hk-locale-switch />']) {
      expect(only({ ...main(`${tag}${FULL}`) }), tag).toContain('SN2024');
    }
    expect(only({ ...main(`<hk-heading text="Pay" /><hk-text text="x" /><hk-image src="https://x.test/a.png" alt="" width="10" height="10" /><hk-icon name="lock" />${FULL}`) })).toEqual([]);
  });
  it('SN2025: no cart, product, order or customer data, no prices', () => {
    for (const expr of ['{{ cart.total }}', '{{ product.title }}', '{{ order.id }}', '{{ customer.name }}', '{{ section.settings.x | money }}', "{{ collection('x').title }}", '{{ paginate.page }}']) {
      expect(only({ ...main(`<p>${expr}</p>${FULL}`) }), expr).toContain('SN2025');
    }
    expect(only({ ...main(`<p>{{ store.name }} {{ settings.x }} {{ request.path }}</p>${FULL}`) })).toEqual([]);
    // blocks and snippets the page reaches are held to the same rules
    expect(only({ ...main(`{% render 'peek' %}${FULL}`), 'snippets/peek.snf': '<p>{{ product.title }}</p>' })).toContain('SN2025');
    expect(only({ ...main(`{% render 'peek', thing: store.name %}${FULL}`), 'snippets/peek.snf': '<p>{{ thing }}</p>' })).toEqual([]);
  });
  it('SN2026: no media players; the allow-list already refuses forms, inputs and scripts', () => {
    expect(only({ ...main(`<video src="https://x.test/v.mp4"></video>${FULL}`) })).toContain('SN2026');
    for (const el of ['<form></form>', '<input>', '<script></script>', '<button>x</button>', '<iframe></iframe>']) expect(only({ ...main(`${el}${FULL}`) }), el).toContain('SN2001');
  });
  it('SN2028: a static link cannot lead off the store', () => {
    expect(only({ ...main(`<a href="https://evil.example/pay">Pay here</a>${FULL}`) })).toContain('SN2028');
    expect(only({ ...main(`<hk-button label="Go" href="https://wa.me.evil.example/x" />${FULL}`) })).toContain('SN2028');
    expect(only({ ...main(`<a href="https://wa.me/201000000000">Chat</a><a href="/cart">Cart</a><a href="mailto:a@b.co">Mail</a><a href="tel:+201000000000">Call</a><a href="#top">Top</a>${FULL}`) })).toEqual([]);
  });
  it('SN2027: no catalogue pickers in a checkout section', () => {
    expect(only({ ...main(FULL, '{"p":{"type":"product","label":"P"}}') })).toContain('SN2027');
  });
  it('a section that does not list checkout cannot be a default of the checkout template (SN3041)', () => {
    expect(codes({ 'templates/checkout.snf': '<hk-sections /><hk-schema>{"sections":[{"type":"cart-main"},{"type":"checkout-main"}]}</hk-schema>' })).toContain('SN3041');
  });
});

describe('the checkout boundary: runtime', () => {
  const { artifact } = compileTheme(files(), registry);
  const a = artifact as unknown as ArtifactLike & { locales: Record<string, Record<string, string>>; manifest: { defaultLocale?: string } };
  const ctx = sampleContext('en', a.locales, 'en', { responsive: true, devLinks: true });
  const run = (template: string, sections?: unknown) => renderPage(a, { template, ctx, registry, ...(sections ? { sections: sections as never } : {}) });
  it('splits the page into before and after the layout, with the presentation', () => {
    const s = splitCheckout(run('checkout').html)!;
    expect(s.before).toMatch(/<div class="[^"]*sn-checkout"[^>]*data-hk-checkout="layout"[^>]*>$/);
    expect(s.presentation.order).toEqual(['contact', 'shipping', 'payment']);
  });
  it('a duplicate layout (a merchant adds the section twice) is skipped, so the page still splits', () => {
    const two = [{ id: 'a', type: 'checkout-main' }, { id: 'b', type: 'checkout-main' }];
    const r = run('checkout', two);
    expect(r.diagnostics.map((d) => d.code)).toContain('SN4016');
    expect(splitCheckout(r.html)).not.toBeNull();
    expect((r.html.match(/data-hk-checkout="payment"/g) ?? []).length).toBe(1);
  });
  it('a page without the checkout section has nothing to split: the host shows its own checkout', () => {
    expect(splitCheckout(run('checkout', []).html)).toBeNull();
  });
  it('the checkout tags print nothing on any other page', () => {
    const r = run('cart', [{ id: 'x', type: 'checkout-main' }]);
    expect(r.html).not.toContain('data-hk-checkout');
    expect(r.diagnostics.map((d) => d.code)).toContain('SN4015');
  });
  it('a header or footer group never prints them either', () => {
    const r = renderPage(a, { template: 'checkout', ctx, registry, sections: [], groups: { header: [{ id: 'h', type: 'checkout-main' }] } });
    expect(r.html).not.toContain('data-hk-checkout');
  });
  it('a link that would leave the store is printed as # on the checkout page, the header and footer keep theirs', () => {
    const r = run('checkout', [{ id: 'a', type: 'checkout-main', props: { show_support: true, support_link: 'https://evil.example/pay', show_back: true } }]);
    expect(r.html).not.toContain('evil.example');
    expect(r.html).toContain('class="sf-checkout-support" href="#"');
    const ok = run('checkout', [{ id: 'a', type: 'checkout-main', props: { show_support: true, support_link: 'https://wa.me/201000000000' } }]);
    expect(ok.html).toContain('href="https://wa.me/201000000000"');
    expect(restrictCheckoutLinks('<a href="https://wa.me.evil.example/x">a</a><a href="//x.test">b</a><a href="javascript:alert(1)">c</a><a href="https://evil.example/?u=https://wa.me/x">d</a><a href="/products">e</a>')).toBe('<a href="#">a</a><a href="#">b</a><a href="#">c</a><a href="#">d</a><a href="/products">e</a>');
  });
  it('splitCheckout is fail-closed on anything it does not recognise', () => {
    const ok = run('checkout').html;
    expect(splitCheckout(ok.replace('data-hk-checkout="payment"', 'data-hk-checkout="nope"'))).toBeNull();
    expect(splitCheckout(ok.replace('data-hk-columns="two"', 'data-hk-columns="evil"'))).toBeNull();
    expect(splitCheckout(ok + ok)).toBeNull();
    expect(splitCheckout(ok.replace(/<div data-hk-checkout="contact"><\/div>/, '<div data-hk-checkout="contact"></div><div data-hk-checkout="contact"></div>'))).toBeNull();
    expect(splitCheckout('')).toBeNull();
    // a literal sentinel in text (escaped markup cannot form a tag) never counts
    expect(splitCheckout(ok.replace('Checkout</h1>', 'data-hk-checkout="layout"</h1>'))).not.toBeNull();
  });
  it('headings and the button label arrive as plain, bounded text', () => {
    const r = run('checkout', [{ id: 'a', type: 'checkout-main', props: { payment_heading: 'Pay <b>"now"</b> & go'.repeat(8), cta_label: 'Order\nnow', contact_heading: 'Who' } }]);
    const s = splitCheckout(r.html)!;
    expect(s.presentation.headings.contact).toBe('Who');
    expect(s.presentation.headings.payment!.length).toBeLessThanOrEqual(60);
    expect(s.presentation.headings.payment).toContain('<b>"now"</b> &');
    expect(s.presentation.cta).toBe('Order now');
    expect(r.html).not.toContain('<b>"now"</b>');
  });
});
