import { describe, it, expect } from 'vitest';
import { defaultUrl, type TagRenderContext } from '@hekana/sneferu-core';
import { createDefaultRegistry, APP_BLOCK_PATH } from './index';

const r = createDefaultRegistry();
const run = (props: Record<string, unknown>, locale: 'ar' | 'en' = 'en') => {
  const css: string[] = [];
  const c: TagRenderContext = { id: 'c1', css: (x) => css.push(x), controller: () => {}, data: {}, locale, dir: locale === 'ar' ? 'rtl' : 'ltr',
    t: (k) => k, renderChildren: () => '', url: (p) => defaultUrl(p, locale) };
  return { html: r.get('hk-app-block')!.render(props, c), css: css.join('') };
};
const product = (handle = 'coffee-beans') => ({ id: 'p1', handle, title: 'Coffee' });

describe('hk-app-block', () => {
  it('frames the subscribe block for a product', () => {
    const { html, css } = run({ app: 'subscriptions', block: 'subscribe', product: product() });
    expect(APP_BLOCK_PATH).toBe('/hk2/app-block');
    expect(html).toContain('data-hk-controller="app-block"');
    expect(html).toContain('<iframe src="/en/hk2/app-block/subscriptions/subscribe?product=coffee-beans"');
    expect(html).toContain('loading="lazy" referrerpolicy="same-origin"');
    expect(css).toContain('.sn-app-block iframe{');
  });
  it('uses the unprefixed Arabic path', () => {
    expect(run({ app: 'subscriptions', block: 'subscribe', product: product() }, 'ar').html).toContain('src="/hk2/app-block/subscriptions/subscribe?product=coffee-beans"');
  });
  it('frames the portal block without a product', () => {
    expect(run({ app: 'subscriptions', block: 'portal' }).html).toContain('src="/en/hk2/app-block/subscriptions/portal"');
  });
  it('takes a trimmed, bounded label for the frame title', () => {
    expect(run({ app: 'subscriptions', block: 'portal', label: `  ${'x'.repeat(200)}  ` }).html).toContain(`title="${'x'.repeat(80)}"`);
  });
  it('renders nothing for an app or block the platform does not list', () => {
    expect(run({ app: 'nope', block: 'subscribe', product: product() }).html).toBe('');
    expect(run({ app: 'subscriptions', block: 'admin', product: product() }).html).toBe('');
    expect(run({ app: '../x', block: 'portal' }).html).toBe('');
  });
  it('renders nothing for a product block without a usable product', () => {
    expect(run({ app: 'subscriptions', block: 'subscribe', product: null }).html).toBe('');
    expect(run({ app: 'subscriptions', block: 'subscribe', product: product('../admin') }).html).toBe('');
    expect(run({ app: 'subscriptions', block: 'subscribe', product: product('') }).html).toBe('');
  });
  it('never renders a form control or a script, only the frame', () => {
    const { html } = run({ app: 'subscriptions', block: 'portal', label: '"><input name=x><script>alert(1)</script>' });
    expect(html).not.toMatch(/<(input|select|textarea|button|form|script)\b/);
    expect(html.match(/<iframe\b/g)).toHaveLength(1);
  });
});
