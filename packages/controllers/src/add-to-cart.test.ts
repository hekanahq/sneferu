// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { startControllers } from './index';
import { makeHost } from './test-host';

const form = (config: unknown, qty = true, extra = '') => `
<form data-hk-controller="add-to-cart" data-hk-product="P1" action="/p" method="get" data-hk-config='${typeof config === 'string' ? config : JSON.stringify(config)}'>
  ${qty ? `<div class="sn-qty"><button type="button" data-hk-qty="dec">-</button><input type="number" name="quantity" value="1"><button type="button" data-hk-qty="inc">+</button></div>` : ''}
  <input type="hidden" name="variant" value="V1">
  <button type="submit" class="sn-atc-button" data-hk-label="Add to cart" data-hk-soldout="Sold out">Add to cart</button>
  <p class="sn-atc-message" role="status" hidden></p></form>${extra}`;
const flush = () => new Promise((r) => setTimeout(r, 0));
const submit = (f: HTMLFormElement) => f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

function setup(config: unknown, qty = true) {
  document.body.innerHTML = form(config, qty);
  const m = makeHost();
  const td = startControllers(document.body, m.host);
  const f = document.querySelector('form')!;
  return { m, td, f, qty: () => f.querySelector<HTMLInputElement>('input[name=quantity]')!, msg: () => f.querySelector<HTMLElement>('.sn-atc-message')!, btn: () => f.querySelector<HTMLButtonElement>('.sn-atc-button')! };
}

describe('add-to-cart', () => {
  it('adds with variant and quantity, shows added, fires hk:cart-added', async () => {
    const s = setup({ productId: 'P1', variantId: 'V1', min: 1, step: 1, max: 10, available: true });
    let d: any;
    document.body.addEventListener('hk:cart-added', (e) => (d = (e as CustomEvent).detail));
    s.qty().value = '3';
    const ev = new Event('submit', { bubbles: true, cancelable: true });
    s.f.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    await flush();
    expect(s.m.calls.add).toEqual([{ productId: 'P1', variantId: 'V1', quantity: 3 }]);
    expect(s.msg().textContent).toBe('Added');
    expect(s.msg().hasAttribute('hidden')).toBe(false);
    expect(d).toEqual({ productId: 'P1', variantId: 'V1', quantity: 3 });
    expect(s.btn().disabled).toBe(false);
    s.td();
  });
  it('out of stock: disabled with sold-out label and no add', async () => {
    const s = setup({ productId: 'P1', available: false });
    expect(s.btn().disabled).toBe(true);
    expect(s.btn().textContent).toBe('Sold out');
    submit(s.f);
    await flush();
    expect(s.m.calls.add.length).toBe(0);
    s.td();
  });
  it('min 500 step 50 starts at 500 and steps by 50; dec stops at min; max caps', () => {
    const s = setup({ productId: 'P1', min: 500, step: 50, max: 620 });
    expect(s.qty().value).toBe('500');
    const inc = s.f.querySelector<HTMLElement>('[data-hk-qty=inc]')!;
    const dec = s.f.querySelector<HTMLElement>('[data-hk-qty=dec]')!;
    inc.click();
    expect(s.qty().value).toBe('550');
    inc.click(); inc.click(); inc.click();
    expect(s.qty().value).toBe('600');
    dec.click(); dec.click(); dec.click(); dec.click();
    expect(s.qty().value).toBe('500');
    s.td();
  });
  it('normalises typed values on change', () => {
    const s = setup({ productId: 'P1', min: 500, step: 50 });
    s.qty().value = '523';
    s.qty().dispatchEvent(new Event('change', { bubbles: true }));
    expect(s.qty().value).toBe('500');
    s.qty().value = '740';
    s.qty().dispatchEvent(new Event('change', { bubbles: true }));
    expect(s.qty().value).toBe('750');
    s.qty().value = 'abc';
    s.qty().dispatchEvent(new Event('change', { bubbles: true }));
    expect(s.qty().value).toBe('500');
    s.td();
  });
  it('double submit while pending adds once, busy flag set then cleared', async () => {
    const s = setup({ productId: 'P1' });
    let release!: () => void;
    s.m.state.addImpl = () => new Promise((r) => (release = () => r({ ok: true })));
    submit(s.f);
    submit(s.f);
    expect(s.btn().getAttribute('aria-busy')).toBe('true');
    expect(s.btn().disabled).toBe(true);
    release();
    await flush();
    expect(s.m.calls.add.length).toBe(1);
    expect(s.btn().hasAttribute('aria-busy')).toBe(false);
    expect(s.btn().disabled).toBe(false);
    s.td();
  });
  it('host.add failure shows the message as text and fires no event', async () => {
    const s = setup({ productId: 'P1' });
    s.m.state.addResult = { ok: false, message: '<b>Only 2 left</b>' };
    let fired = false;
    document.body.addEventListener('hk:cart-added', () => (fired = true));
    submit(s.f);
    await flush();
    expect(s.msg().textContent).toBe('<b>Only 2 left</b>');
    expect(s.msg().querySelector('b')).toBeNull();
    expect(fired).toBe(false);
    s.td();
  });
  it('rejected promise is shown and re-enables', async () => {
    const s = setup({ productId: 'P1' });
    s.m.state.addImpl = () => Promise.reject(new Error('offline'));
    submit(s.f);
    await flush();
    expect(s.msg().textContent).toBe('offline');
    expect(s.btn().disabled).toBe(false);
    s.td();
  });
  it('works without quantity controls and falls back to config variant', async () => {
    document.body.innerHTML = form({ productId: 'P1', variantId: 'VX' }, false).replace('name="variant" value="V1"', 'name="variant" value=""');
    const m = makeHost();
    const td = startControllers(document.body, m.host);
    submit(document.querySelector('form')!);
    await flush();
    expect(m.calls.add).toEqual([{ productId: 'P1', variantId: 'VX', quantity: 1 }]);
    td();
  });
  it('malformed variant picker config: add-to-cart still adds the default variant', async () => {
    document.body.innerHTML = `<div data-hk-controller="variant-picker" data-hk-product="P1" data-hk-config='{broken'></div>` + form({ productId: 'P1', variantId: 'V1' });
    const m = makeHost();
    const td = startControllers(document.body, m.host);
    submit(document.querySelector('form')!);
    await flush();
    expect(m.calls.add[0].variantId).toBe('V1');
    td();
  });
  it('bad config JSON: element skipped, no throw, native form untouched', () => {
    const s = setup('{oops');
    const ev = new Event('submit', { bubbles: true, cancelable: true });
    s.f.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);
    s.td();
  });
});
