import { describe, it, expect } from 'vitest';
import { defaultUrl, type TagRenderContext } from '@hekana/sneferu-core';
import { createDefaultRegistry, CHECKOUT_EMBED_PATH } from './index';

const r = createDefaultRegistry();
const run = (props: Record<string, unknown>, locale: 'ar' | 'en' = 'en') => {
  const css: string[] = [];
  const c: TagRenderContext = { id: 'c1', css: (x) => css.push(x), controller: () => {}, data: {}, locale, dir: locale === 'ar' ? 'rtl' : 'ltr',
    t: (k) => k, renderChildren: () => '', url: (p) => defaultUrl(p, locale) };
  return { html: r.get('hk-inline-checkout')!.render(props, c), css: css.join('') };
};
const product = (extra: Record<string, unknown> = {}) => ({
  id: 'p1', handle: 'kika-visor', title: 'Visor',
  variants: [{ id: 'v1', options: ['Pink'], available: true }, { id: 'v2', options: ['Black'], available: true }],
  selected_variant: { id: 'v2' }, ...extra,
});

describe('hk-inline-checkout', () => {
  it('frames the platform checkout for the product and its selected variant', () => {
    const { html, css } = run({ product: product() });
    expect(CHECKOUT_EMBED_PATH).toBe('/checkout/embed');
    expect(html).toContain('data-hk-controller="inline-checkout" data-hk-product="p1"');
    expect(html).toContain('<iframe src="/en/checkout/embed?product=kika-visor&amp;variant=v2" title="Order form" loading="lazy" referrerpolicy="same-origin"></iframe>');
    expect(css).toContain('.sn-inline-checkout iframe{');
  });
  it('uses the unprefixed Arabic path and the Arabic name', () => {
    const { html } = run({ product: product() }, 'ar');
    expect(html).toContain('src="/checkout/embed?product=kika-visor&amp;variant=v2" title="نموذج الطلب"');
  });
  it('takes a theme label, trimmed and bounded', () => {
    expect(run({ product: product(), label: '  اطلبي هنا  ' }).html).toContain('title="اطلبي هنا"');
  });
  it('omits the variant for a product without variants', () => {
    expect(run({ product: product({ variants: [], selected_variant: null }) }).html).toContain('src="/en/checkout/embed?product=kika-visor"');
  });
  it('renders nothing without a usable product or handle', () => {
    expect(run({ product: null }).html).toBe('');
    expect(run({ product: product({ handle: '' }) }).html).toBe('');
    expect(run({ product: product({ handle: '../admin' }) }).html).toBe('');
    expect(run({ product: product({ id: '' }) }).html).toBe('');
  });
  it('never renders a form control or a script, only the frame', () => {
    const { html } = run({ product: product(), label: '"><input name=x><script>alert(1)</script>' });
    expect(html).not.toMatch(/<(input|select|textarea|button|form|script)\b/);
    expect(html.match(/<iframe\b/g)).toHaveLength(1);
  });
});
