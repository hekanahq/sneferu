// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { EVENT_CART_ADDED, EVENT_VARIANT_CHANGE, startControllers } from './index';
import { line, makeHost } from './test-host';

describe('startControllers', () => {
  it('exports event names', () => {
    expect(EVENT_CART_ADDED).toBe('hk:cart-added');
    expect(EVENT_VARIANT_CHANGE).toBe('hk:variant-change');
  });
  it('is a no-op without controllers or with unknown ones', () => {
    document.body.innerHTML = '<div data-hk-controller="mystery"></div>';
    const td = startControllers(document.body, makeHost().host);
    expect(() => td()).not.toThrow();
  });
  it('is idempotent per root and restartable after teardown', () => {
    document.body.innerHTML = '<span data-hk-controller="cart-count"></span>';
    const m = makeHost([line()]);
    const a = startControllers(document.body, m.host);
    const b = startControllers(document.body, m.host);
    expect(b).toBe(a);
    expect(m.subs.size).toBe(1);
    a();
    expect(m.subs.size).toBe(0);
    const c = startControllers(document.body, m.host);
    expect(m.subs.size).toBe(1);
    c();
  });
  it('a throwing controller does not stop the others', () => {
    document.body.innerHTML = '<span id="a" data-hk-controller="cart-count"></span><span id="b" data-hk-controller="cart-count"></span>';
    const m = makeHost([line()]);
    const real = m.host.subscribe;
    let n = 0;
    m.host.subscribe = (fn) => { if (n++ === 0) throw new Error('x'); return real(fn); };
    const td = startControllers(document.body, m.host);
    expect(document.getElementById('b')!.textContent).toBe('2');
    td();
  });
  it('does not leak globals', () => {
    const before = Object.keys(globalThis);
    document.body.innerHTML = '<span data-hk-controller="cart-count"></span>';
    startControllers(document.body, makeHost().host)();
    expect(Object.keys(globalThis).filter((k) => !before.includes(k))).toEqual([]);
  });
});
