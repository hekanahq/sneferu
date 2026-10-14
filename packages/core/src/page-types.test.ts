import { describe, it, expect } from 'vitest';
import { parseTemplateName, pageKeyOf, templateOfPageKey, isGroupName, isPageType } from './page-types';
import { buildPaginate, clampPage } from './paginate';

describe('template names', () => {
  it('accepts page types and alternates of product, collection and page only', () => {
    for (const n of ['index', 'product', 'collection', 'search', 'cart', 'checkout', 'page', '404', 'product.codes', 'collection.sale-2', 'page.about']) expect(parseTemplateName(n), n).toBeDefined();
    for (const n of ['cart.big', 'index.x', '404.x', 'search.y', 'checkout.big', 'Product', 'product.', 'product.A', 'product.x.y', '', 'constructor', '__proto__']) expect(parseTemplateName(n), n).toBeUndefined();
    expect(parseTemplateName('product.codes')).toEqual({ type: 'product', alternate: 'codes' });
    expect(parseTemplateName(42)).toBeUndefined();
  });
  it('maps the home page to the key "/" and back', () => {
    expect(pageKeyOf('index')).toBe('/');
    expect(pageKeyOf('product.codes')).toBe('product.codes');
    expect(templateOfPageKey('/')).toBe('index');
    expect(templateOfPageKey('cart')).toBe('cart');
    expect(isGroupName('header')).toBe(true);
    expect(isGroupName('sidebar')).toBe(false);
    expect(isPageType('404')).toBe(true);
  });
});

describe('paginate', () => {
  const url = (n: number) => `?page=${n}`;
  it('clamps hostile page numbers', () => {
    for (const bad of [NaN, -1, 0, 'abc', '-3', '1e9', undefined, null, {}, 1.5, '999999999999']) expect(clampPage(bad), String(bad)).toBe(1);
    expect(clampPage('999', 5)).toBe(5);
    expect(clampPage(' 3 ')).toBe(3);
  });
  it('builds the object with prev, next and a window of at most 7 parts', () => {
    const p = buildPaginate({ page: '999', perPage: 10, total: 95, url });
    expect(p).toMatchObject({ page: 10, pages: 10, per_page: 10, total: 95, prev_url: '?page=9', next_url: '' });
    expect(p.parts.map((x) => x.page)).toEqual([4, 5, 6, 7, 8, 9, 10]);
    expect(p.parts.filter((x) => x.current).map((x) => x.page)).toEqual([10]);
    const first = buildPaginate({ page: -5, perPage: 10, total: 95, url });
    expect(first.page).toBe(1);
    expect(first.prev_url).toBe('');
    expect(first.parts.map((x) => x.page)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    const mid = buildPaginate({ page: 5, perPage: 10, total: 95, url });
    expect(mid.parts.map((x) => x.page)).toEqual([2, 3, 4, 5, 6, 7, 8]);
  });
  it('handles an empty or tiny result and a bad perPage', () => {
    expect(buildPaginate({ page: 1, perPage: 10, total: 0, url })).toMatchObject({ page: 1, pages: 1, parts: [{ page: 1, current: true }], prev_url: '', next_url: '' });
    expect(buildPaginate({ page: 1, perPage: 0, total: 50, url }).per_page).toBe(24);
    expect(buildPaginate({ page: 1, perPage: 10, total: NaN, url }).total).toBe(0);
  });
});
