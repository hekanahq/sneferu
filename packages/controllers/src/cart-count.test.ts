// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { startControllers } from './index';
import { line, makeHost } from './test-host';

describe('cart-count', () => {
  it('shows total quantity, hides at zero, follows subscription, unsubscribes on teardown', () => {
    document.body.innerHTML = '<span class="sn-cart-count" data-hk-controller="cart-count" hidden></span>';
    const el = document.querySelector('span')!;
    const m = makeHost([line({ quantity: 2 }), line({ key: 'k2', quantity: 3 })]);
    const td = startControllers(document.body, m.host);
    expect(el.textContent).toBe('5');
    expect(el.hasAttribute('hidden')).toBe(false);
    m.set([]);
    expect(el.textContent).toBe('0');
    expect(el.hasAttribute('hidden')).toBe(true);
    m.set([line({ quantity: 1 })]);
    expect(el.textContent).toBe('1');
    td();
    expect(m.subs.size).toBe(0);
  });
});
