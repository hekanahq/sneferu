// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { startControllers } from './index';
import { makeHost } from './test-host';

const page = `
<div data-hk-controller="gallery" data-hk-product="P1"><figure data-hk-slide="0" class="sn-active"><img src="https://cdn.x/main.png" srcset="https://cdn.x/main-400.png 400w"></figure></div>
<div data-hk-controller="combined-listing"><ul>
  <li><a href="/products/a" data-hk-image="https://cdn.x/a.png">A</a></li>
  <li><a href="/products/b">B</a></li></ul></div>`;
const img = () => document.querySelector('img')!;
const setup = (hover: boolean) => {
  vi.stubGlobal('matchMedia', () => ({ matches: hover }));
  document.body.innerHTML = page;
  return startControllers(document.body, makeHost().host);
};
afterEach(() => vi.unstubAllGlobals());

describe('combined-listing', () => {
  it('previews the hovered member image and restores on leave', () => {
    const td = setup(true);
    const a = document.querySelector('a')!;
    a.dispatchEvent(new Event('mouseenter'));
    expect(img().getAttribute('src')).toBe('https://cdn.x/a.png');
    expect(img().hasAttribute('srcset')).toBe(false);
    a.dispatchEvent(new Event('mouseleave'));
    expect(img().getAttribute('src')).toBe('https://cdn.x/main.png');
    expect(img().getAttribute('srcset')).toBe('https://cdn.x/main-400.png 400w');
    td();
  });
  it('does nothing without hover (phones): links just navigate', () => {
    const td = setup(false);
    document.querySelector('a')!.dispatchEvent(new Event('mouseenter'));
    expect(img().getAttribute('src')).toBe('https://cdn.x/main.png');
    td();
  });
  it('restores on teardown mid-preview', () => {
    const td = setup(true);
    document.querySelector('a')!.dispatchEvent(new Event('mouseenter'));
    td();
    expect(img().getAttribute('src')).toBe('https://cdn.x/main.png');
  });
});
