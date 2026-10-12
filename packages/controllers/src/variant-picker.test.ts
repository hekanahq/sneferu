// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { startControllers } from './index';
import { makeHost } from './test-host';

const cfg = (o: unknown) => JSON.stringify(o).replace(/'/g, '&#39;');
const VARS = [
  { id: 'V1', options: ['S', 'Red'], price: 10000, compare_at: 12000, available: true, image: 'https://x.test/a.png' },
  { id: 'V2', options: ['M', 'Red'], price: 11000, available: true },
  { id: 'V3', options: ['M', 'Blue'], price: 11000, available: false },
];
const OPTS = [{ name: 'Size', values: ['S', 'M'] }, { name: 'Colour', values: ['Red', 'Blue'] }];
const page = (config: unknown) => `
<div data-hk-controller="variant-picker" data-hk-product="P1" data-hk-config='${typeof config === 'string' ? config : cfg(config)}'>
  <fieldset data-hk-option="0"><label class="a"><input type="radio" name="g0" value="S" checked><span>S</span></label>
    <label class="b"><input type="radio" name="g0" value="M"><span>M</span></label></fieldset>
  <label data-hk-option="1"><select name="g1"><option value="Red" selected>Red</option><option value="Blue">Blue</option><option value="Green">Green</option></select></label>
</div>
<form data-hk-controller="add-to-cart" data-hk-product="P1" data-hk-config='{"productId":"P1","variantId":"V1"}'>
  <input type="hidden" name="variant" value="V1"><button type="submit" data-hk-label="Add" data-hk-soldout="Gone">Add</button></form>
<form data-hk-controller="add-to-cart" data-hk-product="P2"><input type="hidden" name="variant" value="Z"><button type="submit">Add</button></form>
<span data-hk-bind="price" data-hk-product="P1"><span class="sn-now">E100</span><s class="sn-was">E120</s></span>`;

function setup(config: unknown = { productId: 'P1', options: OPTS, variants: VARS }) {
  document.body.innerHTML = page(config);
  const m = makeHost();
  const td = startControllers(document.body, m.host);
  const radio = (v: string) => document.querySelector<HTMLInputElement>(`input[value=${v}]`)!;
  const pick = (v: string) => { radio(v).checked = true; radio(v).dispatchEvent(new Event('change', { bubbles: true })); };
  const sel = (v: string) => { const s = document.querySelector('select')!; s.value = v; s.dispatchEvent(new Event('change', { bubbles: true })); };
  const atc = () => document.querySelector<HTMLFormElement>('form[data-hk-product=P1]')!;
  return { m, td, pick, sel, atc, btn: () => atc().querySelector('button')!, hidden: () => atc().querySelector<HTMLInputElement>('input[name=variant]')! };
}

describe('variant-picker', () => {
  it('matches the combination, updates variant input, price and compare-at', () => {
    const s = setup();
    s.pick('M');
    expect(s.hidden().value).toBe('V2');
    expect(document.querySelector('.sn-now')!.textContent).toBe('E110');
    expect(document.querySelector('.sn-was')).toBeNull();
    s.pick('S');
    expect(s.hidden().value).toBe('V1');
    expect(document.querySelector('.sn-was')!.textContent).toBe('E120');
    s.td();
  });
  it('does not touch another product', () => {
    const s = setup();
    s.pick('M');
    expect(document.querySelector<HTMLInputElement>('form[data-hk-product=P2] input')!.value).toBe('Z');
    s.td();
  });
  it('unavailable variant disables add-to-cart with sold-out label, available re-enables', () => {
    const s = setup();
    s.pick('M');
    s.sel('Blue');
    expect(s.btn().disabled).toBe(true);
    expect(s.btn().textContent).toBe('Gone');
    s.sel('Red');
    expect(s.btn().disabled).toBe(false);
    expect(s.btn().textContent).toBe('Add');
    s.td();
  });
  it('missing combination marks unavailable and keeps the variant input', () => {
    const s = setup();
    s.sel('Green');
    expect(s.btn().disabled).toBe(true);
    expect(s.hidden().value).toBe('V1');
    s.td();
  });
  it('fires hk:variant-change with the variant and sets data-checked', () => {
    const s = setup();
    let d: any;
    document.body.addEventListener('hk:variant-change', (e) => (d = (e as CustomEvent).detail));
    s.pick('M');
    expect(d.productId).toBe('P1');
    expect(d.variant.id).toBe('V2');
    expect(document.querySelector('label.b')!.getAttribute('data-checked')).toBe('true');
    expect(document.querySelector('label.a')!.hasAttribute('data-checked')).toBe(false);
    s.td();
  });
  it('writes ?variant= with replaceState', () => {
    (window as any).happyDOM.setURL('https://shop.test/p/x');
    const s = setup();
    s.pick('M');
    expect(location.search).toBe('?variant=V2');
    s.td();
  });
  it('flat fallback: options [] matches by variant id', () => {
    document.body.innerHTML = `
    <div data-hk-controller="variant-picker" data-hk-product="P1" data-hk-config='${cfg({ productId: 'P1', options: [], variants: VARS })}'>
      <fieldset data-hk-option="0"><label><input type="radio" name="f" value="V1" checked><span>a</span></label><label><input type="radio" name="f" value="V2"><span>b</span></label></fieldset></div>
    <form data-hk-controller="add-to-cart" data-hk-product="P1"><input type="hidden" name="variant" value="V1"><button type="submit">Add</button></form>`;
    const td = startControllers(document.body, makeHost().host);
    const r = document.querySelector<HTMLInputElement>('input[value=V2]')!;
    r.checked = true;
    r.dispatchEvent(new Event('change', { bubbles: true }));
    expect(document.querySelector<HTMLInputElement>('input[name=variant]')!.value).toBe('V2');
    td();
  });
  it('malformed config JSON or variants does not throw', () => {
    expect(() => setup('{nope').td()).not.toThrow();
    const s = setup({ productId: 'P1', options: 5, variants: 'x' });
    expect(() => s.pick('M')).not.toThrow();
    s.td();
  });
  it('teardown stops reacting', () => {
    const s = setup();
    s.td();
    s.pick('M');
    expect(s.hidden().value).toBe('V1');
  });
});
