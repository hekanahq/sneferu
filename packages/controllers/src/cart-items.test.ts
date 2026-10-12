// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { startControllers } from './index';
import { line, makeHost } from './test-host';

const html = `<div data-hk-controller="cart-items"><ul data-hk-list hidden></ul><div data-hk-empty>Nothing</div><a data-hk-fallback href="/checkout">Go</a></div>`;
const q = (s: string) => document.querySelector<HTMLElement>(s)!;

describe('cart-items', () => {
  it('without JS the fallback stays visible and list hidden', () => {
    document.body.innerHTML = html;
    expect(q('[data-hk-fallback]').hasAttribute('hidden')).toBe(false);
    expect(q('[data-hk-list]').hasAttribute('hidden')).toBe(true);
  });
  it('renders lines and hides empty + fallback', () => {
    document.body.innerHTML = html;
    const m = makeHost([line({ image: 'https://x.test/i.png', url: '/p/tee', variantTitle: 'M / Red' })]);
    const td = startControllers(document.body, m.host);
    expect(q('[data-hk-list]').hasAttribute('hidden')).toBe(false);
    expect(q('[data-hk-empty]').hasAttribute('hidden')).toBe(true);
    expect(q('[data-hk-fallback]').hasAttribute('hidden')).toBe(true);
    const li = q('li.sn-cart-item');
    expect(li.getAttribute('data-key')).toBe('k1');
    expect(li.querySelector('a.sn-cart-item-title')!.getAttribute('href')).toBe('/p/tee');
    expect(li.querySelector('a.sn-cart-item-image img')!.getAttribute('src')).toBe('https://x.test/i.png');
    expect(li.querySelector('.sn-cart-item-variant')!.textContent).toBe('M / Red');
    expect(li.querySelector('.sn-cart-item-price')!.textContent).toBe('E20');
    expect(li.querySelector('.sn-cart-item-qty-value')!.textContent).toBe('2');
    expect(li.querySelector('.sn-cart-item-remove')!.getAttribute('aria-label')).toBe('Remove');
    m.set([]);
    expect(q('[data-hk-list]').hasAttribute('hidden')).toBe(true);
    expect(q('[data-hk-empty]').hasAttribute('hidden')).toBe(false);
    expect(q('[data-hk-fallback]').hasAttribute('hidden')).toBe(true);
    td();
    expect(m.subs.size).toBe(0);
  });
  it('titles are text only, unsafe image/url are not applied', () => {
    document.body.innerHTML = html;
    const evil = '<img src=x onerror=alert(1)>';
    const m = makeHost([line({ title: evil, image: 'javascript:alert(1)', url: 'javascript:alert(1)' }), line({ key: 'b', image: '//evil.test/a.png', url: '//evil.test' })]);
    const td = startControllers(document.body, m.host);
    const list = q('[data-hk-list]');
    expect(list.querySelectorAll('img').length).toBe(0);
    expect(list.querySelector('[href]')).toBeNull();
    expect(list.querySelector('.sn-cart-item-title')!.textContent).toBe(evil);
    expect(list.querySelector('.sn-cart-item-title')!.tagName).toBe('SPAN');
    td();
  });
  it('stepper and remove call the host; dec at 1 removes; inc capped by maxQuantity', () => {
    document.body.innerHTML = html;
    const m = makeHost([line({ quantity: 2, maxQuantity: 2 })]);
    const td = startControllers(document.body, m.host);
    q('[data-hk-act=inc]').click();
    expect(m.calls.update).toEqual([]);
    q('[data-hk-act=dec]').click();
    expect(m.calls.update).toEqual([['k1', 1]]);
    m.set([line({ quantity: 1 })]);
    q('[data-hk-act=dec]').click();
    expect(m.calls.remove).toEqual(['k1']);
    q('[data-hk-act=inc]').click();
    expect(m.calls.update[1]).toEqual(['k1', 2]);
    q('[data-hk-act=remove]').click();
    expect(m.calls.remove).toEqual(['k1', 'k1']);
    td();
  });
  it('keeps focus on the same key and control after a rebuild', () => {
    document.body.innerHTML = html;
    const m = makeHost([line({ quantity: 2 }), line({ key: 'k2', quantity: 2 })]);
    const td = startControllers(document.body, m.host);
    const inc = document.querySelector<HTMLElement>('li[data-key=k2] [data-hk-act=inc]')!;
    inc.focus();
    m.set([line({ quantity: 2 }), line({ key: 'k2', quantity: 3 })]);
    const now = document.activeElement as HTMLElement;
    expect(now).not.toBe(inc);
    expect(now.getAttribute('data-hk-act')).toBe('inc');
    expect(now.closest('li')!.getAttribute('data-key')).toBe('k2');
    td();
  });
  it('a throwing host leaves the fallback visible and does not break other controllers', () => {
    document.body.innerHTML = html + '<span data-hk-controller="cart-count"></span>';
    const m = makeHost([line()]);
    const real = m.host.get;
    let n = 0;
    m.host.get = () => { if (n++ === 1) throw new Error('boom'); return real(); };
    const td = startControllers(document.body, m.host);
    expect(q('[data-hk-fallback]').hasAttribute('hidden')).toBe(false);
    expect(q('[data-hk-controller=cart-count]').textContent).toBe('2');
    td();
  });
});
