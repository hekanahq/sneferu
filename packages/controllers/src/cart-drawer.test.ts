// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { startControllers } from './index';
import { makeHost } from './test-host';

const html = (cfg = '{"openOnAdd":true}') => `
<a id="opener" href="/cart" data-hk-open="cart-drawer">Cart</a>
<dialog data-hk-controller="cart-drawer" data-hk-config='${cfg}'>
  <button type="button" data-hk-close id="close">x</button><a href="/a" id="a">a</a><button type="button" id="b">b</button></dialog>
<div id="added"></div>`;
const d = () => document.querySelector('dialog')!;
const key = (target: Element | Document, k: string, shiftKey = false) => {
  const e = new KeyboardEvent('keydown', { key: k, shiftKey, bubbles: true, cancelable: true });
  target.dispatchEvent(e);
  return e;
};

function setup(cfg?: string) {
  document.body.innerHTML = html(cfg);
  const td = startControllers(document.body, makeHost().host);
  return td;
}

describe('cart-drawer', () => {
  it('opener opens (default prevented), focuses close, Escape closes and restores focus', () => {
    const td = setup();
    const opener = document.getElementById('opener') as HTMLElement;
    opener.focus();
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
    opener.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(d().hasAttribute('open')).toBe(true);
    expect(document.activeElement).toBe(document.getElementById('close'));
    key(document.activeElement!, 'Escape');
    expect(d().hasAttribute('open')).toBe(false);
    expect(document.activeElement).toBe(opener);
    td();
  });
  it('close button and backdrop click close; clicks inside content do not', () => {
    const td = setup();
    const open = () => document.getElementById('opener')!.click();
    open();
    document.getElementById('a')!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(d().hasAttribute('open')).toBe(true);
    document.getElementById('close')!.click();
    expect(d().hasAttribute('open')).toBe(false);
    open();
    d().dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(d().hasAttribute('open')).toBe(false);
    td();
  });
  it('traps Tab and Shift+Tab inside', () => {
    const td = setup();
    document.getElementById('opener')!.click();
    (document.getElementById('b') as HTMLElement).focus();
    expect(key(document.activeElement!, 'Tab').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(document.getElementById('close'));
    key(document.activeElement!, 'Tab', true);
    expect(document.activeElement).toBe(document.getElementById('b'));
    td();
  });
  it('opens on hk:cart-added unless openOnAdd is false', () => {
    let td = setup();
    document.getElementById('added')!.dispatchEvent(new CustomEvent('hk:cart-added', { bubbles: true }));
    expect(d().hasAttribute('open')).toBe(true);
    td();
    td = setup('{"openOnAdd":false}');
    document.getElementById('added')!.dispatchEvent(new CustomEvent('hk:cart-added', { bubbles: true }));
    expect(d().hasAttribute('open')).toBe(false);
    td();
  });
  it('teardown removes root and document listeners', () => {
    const add = vi.spyOn(document, 'addEventListener');
    const rem = vi.spyOn(document, 'removeEventListener');
    const td = setup();
    document.getElementById('opener')!.click();
    expect(add.mock.calls.filter((c) => c[0] === 'keydown').length).toBe(1);
    td();
    expect(rem.mock.calls.filter((c) => c[0] === 'keydown').length).toBe(1);
    key(document, 'Escape');
    expect(d().hasAttribute('open')).toBe(true);
    document.getElementById('close')!.click();
    expect(d().hasAttribute('open')).toBe(true);
    add.mockRestore();
    rem.mockRestore();
  });
  it('bad config JSON: drawer skipped', () => {
    const td = setup('{bad');
    document.getElementById('opener')!.click();
    expect(d().hasAttribute('open')).toBe(false);
    td();
  });
});
