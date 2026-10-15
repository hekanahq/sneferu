// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { startControllers, EVENT_VARIANT_CHANGE, MSG_CHECKOUT_HEIGHT, MSG_CHECKOUT_LINE, MSG_CHECKOUT_READY } from './index';
import { makeHost } from './test-host';

// startControllers memoises per root: tear the previous case down so each one gets its own frame.
let current: (() => void) | null = null;
afterEach(() => { current?.(); current = null; vi.restoreAllMocks(); });

function setup(config = '{"productId":"P1","variantId":"V1"}') {
  current?.();
  document.body.innerHTML = `<div data-hk-controller="inline-checkout" data-hk-product="P1" data-hk-config='${config}'><iframe src="/checkout/embed?product=x&variant=V1"></iframe></div>`;
  const td = startControllers(document.body, makeHost().host);
  current = td;
  const frame = document.querySelector('iframe')!;
  const post = vi.spyOn(frame.contentWindow!, 'postMessage');
  const fromFrame = (data: unknown, origin = location.origin, source: unknown = frame.contentWindow) =>
    window.dispatchEvent(new MessageEvent('message', { data, origin, source: source as Window }));
  const pickVariant = (productId: string, id: string) =>
    document.body.dispatchEvent(new CustomEvent(EVENT_VARIANT_CHANGE, { bubbles: true, detail: { productId, variant: { id } } }));
  return { td, frame, post, fromFrame, pickVariant };
}

describe('inline-checkout', () => {
  it('exports the message names the platform page uses', () => {
    expect([MSG_CHECKOUT_HEIGHT, MSG_CHECKOUT_LINE, MSG_CHECKOUT_READY]).toEqual(['hk:checkout-height', 'hk:checkout-line', 'hk:checkout-ready']);
  });
  it('sizes the frame to the height it reports, clamped', () => {
    const s = setup();
    s.fromFrame({ type: MSG_CHECKOUT_HEIGHT, height: 1234.4 });
    expect(s.frame.style.height).toBe('1234px');
    s.fromFrame({ type: MSG_CHECKOUT_HEIGHT, height: 10 });
    expect(s.frame.style.height).toBe('320px');
    s.fromFrame({ type: MSG_CHECKOUT_HEIGHT, height: 1e9 });
    expect(s.frame.style.height).toBe('6000px');
  });
  it('ignores messages from another origin or another window', () => {
    const s = setup();
    s.fromFrame({ type: MSG_CHECKOUT_HEIGHT, height: 900 }, 'https://evil.test');
    s.fromFrame({ type: MSG_CHECKOUT_HEIGHT, height: 900 }, location.origin, window);
    expect(s.frame.style.height).toBe('');
  });
  it('tells the frame the chosen variant without reloading it (typed fields survive)', () => {
    const s = setup();
    const src = s.frame.getAttribute('src');
    s.pickVariant('P1', 'V2');
    expect(s.post).toHaveBeenCalledWith({ type: MSG_CHECKOUT_LINE, variantId: 'V2' }, location.origin);
    expect(s.frame.getAttribute('src')).toBe(src);
  });
  it('answers ready with the current variant, and ignores another product', () => {
    const s = setup();
    s.pickVariant('P2', 'Z9');
    expect(s.post).not.toHaveBeenCalled();
    s.fromFrame({ type: MSG_CHECKOUT_READY });
    expect(s.post).toHaveBeenLastCalledWith({ type: MSG_CHECKOUT_LINE, variantId: 'V1' }, location.origin);
  });
  it('binds only its own frame, not one nested in a wrapper that claims the controller', () => {
    document.body.innerHTML = `<div data-hk-controller="inline-checkout" data-hk-product="P9" data-hk-config='{"productId":"P9","variantId":"Z1"}'>`
      + `<div><iframe src="/checkout/embed?product=x"></iframe></div></div>`;
    current = startControllers(document.body, makeHost().host);
    const frame = document.querySelector('iframe')!;
    const post = vi.spyOn(frame.contentWindow!, 'postMessage');
    document.body.dispatchEvent(new CustomEvent(EVENT_VARIANT_CHANGE, { bubbles: true, detail: { productId: 'P9', variant: { id: 'Z2' } } }));
    window.dispatchEvent(new MessageEvent('message', { data: { type: MSG_CHECKOUT_HEIGHT, height: 900 }, origin: location.origin, source: frame.contentWindow }));
    expect(post).not.toHaveBeenCalled();
    expect(frame.style.height).toBe('');
  });
  it('stops listening after teardown and skips malformed config', () => {
    const s = setup();
    s.td();
    s.fromFrame({ type: MSG_CHECKOUT_HEIGHT, height: 900 });
    expect(s.frame.style.height).toBe('');
    const bad = setup('{broken');
    bad.fromFrame({ type: MSG_CHECKOUT_HEIGHT, height: 900 });
    expect(bad.frame.style.height).toBe('');
  });
});
