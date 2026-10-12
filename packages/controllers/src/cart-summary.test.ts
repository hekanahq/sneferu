// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { startControllers } from './index';
import { line, makeHost } from './test-host';

const html = `<div data-hk-controller="cart-summary"><span data-hk-bind="subtotal"></span><a class="sn-btn sn-cart-checkout" href="/checkout">Checkout</a></div>`;

describe('cart-summary', () => {
  it('formats the subtotal and hides when empty', () => {
    document.body.innerHTML = html;
    const el = document.querySelector<HTMLElement>('div')!;
    const m = makeHost([line({ unitPrice: 1000, quantity: 2 }), line({ key: 'b', unitPrice: 500, quantity: 1 })]);
    const td = startControllers(document.body, m.host);
    expect(el.querySelector('[data-hk-bind=subtotal]')!.textContent).toBe('E25');
    expect(el.hasAttribute('hidden')).toBe(false);
    m.set([]);
    expect(el.hasAttribute('hidden')).toBe(true);
    td();
    expect(m.subs.size).toBe(0);
  });
  it('sets checkout href only when safe', () => {
    for (const [url, expected] of [['/pay', '/pay'], ['https://x.test/c', 'https://x.test/c'], ['//evil.test', '/checkout'], ['javascript:alert(1)', '/checkout']]) {
      document.body.innerHTML = html;
      const m = makeHost([line()]);
      m.host.checkoutUrl = url;
      const td = startControllers(document.body, m.host);
      expect(document.querySelector('a')!.getAttribute('href')).toBe(expected);
      td();
    }
  });
});
