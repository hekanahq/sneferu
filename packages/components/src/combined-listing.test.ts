import { describe, it, expect } from 'vitest';
import { defaultUrl, type TagRenderContext } from '@hekana/sneferu-core';
import { createDefaultRegistry } from './index';

const r = createDefaultRegistry();
const run = (props: Record<string, unknown>, o: { locale?: 'ar' | 'en'; data?: Record<string, unknown> } = {}) => {
  const css: string[] = [];
  const locale = o.locale ?? 'en';
  const c: TagRenderContext = { id: 'c1', css: (x) => css.push(x), controller: () => {}, data: o.data ?? {}, locale, dir: locale === 'ar' ? 'rtl' : 'ltr', t: (k) => k, renderChildren: () => '', url: (p) => defaultUrl(p, locale) };
  return { html: r.get('hk-combined-listing')!.render(props, c), css: css.join('') };
};
const m = (n: number, extra: Record<string, unknown> = {}) => ({ product_id: `p${n}`, title: `Shirt ${n}`, label: `Opt ${n}`, handle: `s${n}`, url: `/products/s${n}`, image: null, swatch_color: null, swatch_image: null, available: true, current: n === 1, ...extra });
const product = (members: unknown[], extra: Record<string, unknown> = {}) => ({ id: 'p1', combined_listing: { id: 'g1', option_label: 'Colour', display: 'auto', members, ...extra } });

describe('hk-combined-listing', () => {
  it('renders nothing for null, missing, or fewer than two members', () => {
    expect(run({ product: { id: 'p1', combined_listing: null } }).html).toBe('');
    expect(run({ product: { id: 'p1' } }).html).toBe('');
    expect(run({ product: null }).html).toBe('');
    expect(run({ product: product([m(1)]) }).html).toBe('');
    expect(run({ product: product([m(1), { url: 'javascript:alert(1)' }]) }).html).toBe('');
  });
  it('renders real links, marks the current member, and picks buttons by default', () => {
    const { html } = run({ product: product([m(1), m(2)]) });
    expect(html).toContain('data-hk-controller="combined-listing"');
    expect(html).toContain('sn-cl-buttons');
    expect(html).toContain('<a class="sn-cl-item" href="/products/s1" aria-current="true"');
    expect(html).toContain('href="/products/s2"');
    expect(html.match(/aria-current/g)).toHaveLength(1);
    expect(html).toContain('Colour');
  });
  it('auto uses photo tiles when members have images, dots when only colours', () => {
    const tiles = run({ product: product([m(1, { image: 'https://cdn.x/1.png' }), m(2, { swatch_image: 'https://cdn.x/2.png' })]) });
    expect(tiles.html).toContain('sn-cl-tiles');
    expect(tiles.html).toContain('<img src="https://cdn.x/1.png"');
    expect(tiles.html).toContain('data-hk-image="https://cdn.x/1.png"');
    const dots = run({ product: product([m(1, { swatch_color: '#ff0000' }), m(2, { swatch_color: '#00f' })]) });
    expect(dots.html).toContain('sn-cl-dots');
    expect(dots.css).toContain('.sn-c1 .sn-cl-c0{background:#ff0000}');
    expect(run({ product: product([m(1, { image: 'https://cdn.x/1.png' }), m(2)]), display: 'buttons' }).html).toContain('sn-cl-buttons');
  });
  it('marks unavailable members but still links them', () => {
    const { html } = run({ product: product([m(1), m(2, { available: false })]) });
    expect(html).toContain('sn-cl-out');
    expect(html).toContain('data-hk-unavailable="true"');
    expect(html).toContain('href="/products/s2"');
  });
  it('select mode keeps a no-JS link list', () => {
    const { html } = run({ product: product([m(1), m(2)]), display: 'select' });
    expect(html).toContain('<select class="sn-cl-select"><option value="/products/s1" selected>');
    expect(html).toContain('<noscript>');
  });
  it('rejects unsafe colours, images and urls, and escapes labels', () => {
    const { html, css } = run({ product: product([m(1, { label: '<b>"x"</b>', swatch_color: 'red;}body{x:1', image: 'javascript:1' }), m(2, { url: '//evil.test' }), m(3)]) });
    expect(html).not.toContain('<b>');
    expect(html).not.toContain('evil.test');
    expect(html).not.toContain('javascript:');
    expect(css).not.toContain('body{x:1');
  });
  it('falls back to the page product when the prop is missing', () => {
    expect(run({}, { data: { product: product([m(1), m(2)]) } }).html).toContain('sn-combined-listing');
  });
});
