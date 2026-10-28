import { describe, it, expect } from 'vitest';
import { defaultUrl, type TagRenderContext } from '@hekana/sneferu-core';
import { createDefaultRegistry, createPreviewRegistry } from './index';

const r = createDefaultRegistry();
const run = (props: Record<string, unknown>, locale: 'ar' | 'en' = 'en') => {
  const css: string[] = [];
  const c: TagRenderContext = { id: 'c1', css: (x) => css.push(x), controller: () => {}, data: {}, locale, dir: locale === 'ar' ? 'rtl' : 'ltr',
    t: (k) => k, renderChildren: () => '', url: (p) => defaultUrl(p, locale) };
  return { html: r.get('hk-app-block')!.render(props, c), css: css.join('') };
};
const product = { id: 'p1', handle: 'kika-visor', title: 'Visor' };

describe('hk-app-block', () => {
  it('is registered and not directly insertable (the editor offers its section)', () => {
    const t = r.get('hk-app-block')!;
    expect(t.controller).toBe('app-block');
    expect(t.editor.insertable).toBe(false);
    expect(t.props.app!.options).toContain('customer_subscriptions');
  });
  it('frames the registered page for a product, in the shopper language', () => {
    const { html, css } = run({ app: 'customer_subscriptions', block: 'subscribe', product });
    expect(html).toContain('data-hk-controller="app-block" data-hk-app="customer_subscriptions" data-hk-block="subscribe"');
    expect(html).toContain('<iframe src="/en/hk2/app-block/subscriptions/subscribe?product=kika-visor" title="Product subscription" referrerpolicy="same-origin"></iframe>');
    expect(css).toContain('.sn-app-block iframe{');
    expect(css).toContain('[data-hk-app-section]:has(.sn-app-block:not([data-hk-ready]))');
    expect(run({ app: 'customer_subscriptions', block: 'subscribe', product }, 'ar').html).toContain('src="/hk2/app-block/subscriptions/subscribe?product=kika-visor"');
  });
  it('prints nothing for an unknown app, block or mismatched pair', () => {
    for (const [app, block] of [['evil', 'subscribe'], ['customer_subscriptions', 'x'], ['customer_subscriptions', 'icon'], ['', ''], [undefined, undefined]]) {
      expect(run({ app, block, product }).html).toBe('');
    }
  });
  it('prints nothing without a usable product when the block needs one', () => {
    expect(run({ app: 'customer_subscriptions', block: 'subscribe' }).html).toBe('');
    expect(run({ app: 'customer_subscriptions', block: 'subscribe', product: { id: 'p', handle: '../x?y' } }).html).toBe('');
  });
  it('needs no product for a block that does not take one, and never lets a prop choose the address', () => {
    const { html } = run({ app: 'customer_subscriptions', block: 'portal', src: 'https://evil.example', path: '/x', settings: { path: 'https://evil.example' } });
    expect(html).toContain('src="/en/hk2/app-block/subscriptions/portal"');
    expect(html).not.toContain('evil');
  });
  it('escapes the label and caps its length', () => {
    const { html } = run({ app: 'customer_subscriptions', block: 'subscribe', product, label: `"><b>${'x'.repeat(200)}` });
    expect(html).not.toContain('<b>');
    expect(html.match(/title="([^"]*)"/)![1]!.length).toBeLessThan(120);
  });
  it('the editor preview prints a still box with the block name, no frame and no controller', () => {
    const tag = createPreviewRegistry().get('hk-app-block')!;
    expect(tag.controller).toBeUndefined();
    const c: TagRenderContext = { id: 'c1', css: () => {}, controller: () => {}, data: {}, locale: 'ar', dir: 'rtl', t: (k) => k, renderChildren: () => '', url: (p) => defaultUrl(p, 'ar') };
    const html = tag.render({ app: 'customer_subscriptions', block: 'subscribe', product }, c);
    expect(html).toContain('sn-app-block-preview');
    expect(html).toContain('اشتراك في المنتج');
    expect(html).not.toContain('<iframe');
    expect(tag.render({ app: 'evil', block: 'x' }, c)).toBe('');
  });
});
