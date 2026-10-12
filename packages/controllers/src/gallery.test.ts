// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { startControllers } from './index';
import { makeHost } from './test-host';

const html = (dir = '') => `<div ${dir} id="wrap"><div data-hk-controller="gallery" data-hk-product="P1">
 <div class="sn-gallery-main">
  <figure id="s0" data-hk-slide="0" data-hk-src="https://x.test/a.png"></figure>
  <figure id="s1" data-hk-slide="1" data-hk-src="https://x.test/b.png"></figure>
  <figure id="s2" data-hk-slide="2" data-hk-src="https://x.test/c.png"></figure></div>
 <ul><li><a href="#s0" data-hk-thumb="0" aria-current="true">1</a></li><li><a href="#s1" data-hk-thumb="1">2</a></li><li><a href="#s2" data-hk-thumb="2">3</a></li></ul></div></div>`;
const slide = (i: number) => document.getElementById('s' + i)!;
const thumb = (i: number) => document.querySelector<HTMLElement>(`[data-hk-thumb="${i}"]`)!;
const arrow = (i: number, k: string) => thumb(i).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
const active = () => [0, 1, 2].filter((i) => slide(i).classList.contains('sn-active'));

describe('gallery', () => {
  it('starts on slide 0 with others hidden', () => {
    document.body.innerHTML = html();
    const td = startControllers(document.body, makeHost().host);
    expect(active()).toEqual([0]);
    expect(slide(0).hasAttribute('hidden')).toBe(false);
    expect(slide(1).hasAttribute('hidden')).toBe(true);
    td();
  });
  it('thumb click shows slide and moves aria-current, preventing navigation', () => {
    document.body.innerHTML = html();
    const td = startControllers(document.body, makeHost().host);
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
    thumb(2).dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(active()).toEqual([2]);
    expect(thumb(2).getAttribute('aria-current')).toBe('true');
    expect(thumb(0).hasAttribute('aria-current')).toBe(false);
    td();
  });
  it('arrow keys move by DOM order in ltr and reverse in rtl, clamped', () => {
    document.body.innerHTML = html();
    let td = startControllers(document.body, makeHost().host);
    arrow(0, 'ArrowRight');
    expect(active()).toEqual([1]);
    expect(document.activeElement).toBe(thumb(1));
    arrow(1, 'ArrowLeft');
    arrow(0, 'ArrowLeft');
    expect(active()).toEqual([0]);
    td();
    document.body.innerHTML = html('dir="rtl"');
    td = startControllers(document.body, makeHost().host);
    arrow(0, 'ArrowLeft');
    expect(active()).toEqual([1]);
    arrow(1, 'ArrowRight');
    expect(active()).toEqual([0]);
    td();
  });
  it('hk:variant-change with a matching image shows that slide; others ignored', () => {
    document.body.innerHTML = html();
    const td = startControllers(document.body, makeHost().host);
    const fire = (detail: unknown) => thumb(0).dispatchEvent(new CustomEvent('hk:variant-change', { bubbles: true, detail }));
    fire({ productId: 'P1', variant: { image: 'https://x.test/c.png' } });
    expect(active()).toEqual([2]);
    fire({ productId: 'P1', variant: { image: 'https://x.test/none.png' } });
    expect(active()).toEqual([2]);
    fire({ productId: 'P9', variant: { image: 'https://x.test/b.png' } });
    expect(active()).toEqual([2]);
    td();
  });
});
