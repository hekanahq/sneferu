import { describe, it, expect } from 'vitest';
import { TagRegistry, type TagRenderContext } from '@hekana/sneferu-core';
import { createDefaultRegistry, CHECKOUT_TAG_LIST } from './index';

const r = createDefaultRegistry();
const ctx = (children = ''): TagRenderContext => ({ id: 'c1', css() {}, controller() {}, data: {}, locale: 'en', dir: 'ltr', t: (k) => k, url: (p) => p, renderChildren: () => children });
const html = (name: string, props: Record<string, unknown>, children = '') => r.get(name)!.render(props, ctx(children));

describe('the checkout tags', () => {
  it('are privileged placeholders in the checkout category', () => {
    for (const t of CHECKOUT_TAG_LIST) {
      expect(r.get(t.name)!.category).toBe('checkout');
      expect(r.get(t.name)!.editor).toMatchObject({ privileged: true, insertable: false });
    }
    expect(new TagRegistry().register(CHECKOUT_TAG_LIST[0]!).get('hk-checkout-layout')).toBeDefined();
  });
  it('the layout prints a wrapper with its presentation and nothing else', () => {
    const out = html('hk-checkout-layout', { columns: 'stacked', summary: 'top', sticky: false, density: 'compact', card: 'raised' }, '<i></i>');
    expect(out).toBe('<div class="sn-c1 sn-checkout" data-hk-checkout="layout" data-hk-columns="stacked" data-hk-summary="top" data-hk-sticky="false" data-hk-density="compact" data-hk-card="raised"><i></i></div>');
  });
  it('an unknown choice becomes the default, never reaches the markup', () => {
    const out = html('hk-checkout-layout', { columns: '"><script>', summary: 7, density: null, card: 'x y' });
    expect(out).toContain('data-hk-columns="two" data-hk-summary="end" data-hk-sticky="true" data-hk-density="comfortable" data-hk-card="outlined"');
    expect(out).not.toContain('script');
  });
  it('the parts print an empty mount point with a bounded plain heading', () => {
    expect(html('hk-checkout-contact', {})).toBe('<div data-hk-checkout="contact"></div>');
    expect(html('hk-checkout-summary', { heading: '  Your   order\n' })).toBe('<div data-hk-checkout="summary" data-hk-heading="Your order"></div>');
    expect(html('hk-checkout-shipping', { heading: 'x'.repeat(200) })).toBe(`<div data-hk-checkout="shipping" data-hk-heading="${'x'.repeat(60)}"></div>`);
    expect(html('hk-checkout-contact', { heading: '"><img src=x onerror=alert(1)>' })).toBe('<div data-hk-checkout="contact" data-hk-heading="&quot;&gt;&lt;img src=x onerror=alert(1)&gt;"></div>');
  });
  it('only the payment part takes a button label', () => {
    expect(html('hk-checkout-payment', { heading: 'Pay', ctaLabel: 'Confirm order' })).toBe('<div data-hk-checkout="payment" data-hk-heading="Pay" data-hk-cta="Confirm order"></div>');
    expect(html('hk-checkout-contact', { ctaLabel: 'Confirm order' })).toBe('<div data-hk-checkout="contact"></div>');
    expect(r.get('hk-checkout-payment')!.props.ctaLabel).toBeDefined();
    expect(r.get('hk-checkout-contact')!.props.ctaLabel).toBeUndefined();
  });
  it('take presentation props only: nothing that names a price, a field or a URL', () => {
    for (const t of CHECKOUT_TAG_LIST) for (const f of Object.values(t.props)) expect(['select', 'boolean', 'text']).toContain(f.type);
  });
});
