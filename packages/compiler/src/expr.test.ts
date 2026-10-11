import { describe, it, expect } from 'vitest';
import { parseExpr, parseFor } from './expr';

const lookup = (fn: string, v: string) => ({ k: 'lookup', fn, args: [{ k: 'lit', v }] });

describe('parseExpr', () => {
  it('paths, indexes and literals', () => {
    expect(parseExpr('product.title').expr).toEqual({ k: 'path', p: ['product', 'title'] });
    expect(parseExpr('product.images[0].url').expr).toEqual({ k: 'path', p: ['product', 'images', 0, 'url'] });
    expect(parseExpr("'سلام'").expr).toEqual({ k: 'lit', v: 'سلام' });
    expect(parseExpr('12.5').expr).toEqual({ k: 'lit', v: 12.5 });
    expect(parseExpr('true').expr).toEqual({ k: 'lit', v: true });
    expect(parseExpr('nil').expr).toEqual({ k: 'lit', v: null });
  });
  it('lookups with property access', () => {
    expect(parseExpr("collection('top-ups').products").expr).toEqual({ k: 'path', p: ['products'], from: lookup('collection', 'top-ups') });
    expect(parseExpr("t('cart.checkout')").expr).toEqual(lookup('t', 'cart.checkout'));
  });
  it('comparison, and/or/not with precedence', () => {
    expect(parseExpr('a == 1 and not b or c').expr).toEqual({
      k: 'or',
      a: { k: 'and', a: { k: 'cmp', op: '==', a: { k: 'path', p: ['a'] }, b: { k: 'lit', v: 1 } }, b: { k: 'not', a: { k: 'path', p: ['b'] } } },
      b: { k: 'path', p: ['c'] },
    });
  });
  it('filters with arguments, chained', () => {
    expect(parseExpr("p.price | money | default: '0'").expr).toEqual({
      k: 'filter', name: 'default', args: [{ k: 'lit', v: '0' }],
      input: { k: 'filter', name: 'money', args: [], input: { k: 'path', p: ['p', 'price'] } },
    });
  });
  it('rejects anything outside the grammar', () => {
    for (const bad of ['a + 1', 'a()', 'x.y()', "require('fs')", "collection(a)", 'a | exec', 'a = 1', '', 'a.', "'unterminated"])
      expect(parseExpr(bad).error, bad).toBeTruthy();
  });
});

describe('parseFor', () => {
  it('parses the loop header', () => {
    expect(parseFor("p in collection('x').products limit:12")).toEqual({ as: 'p', src: { k: 'path', p: ['products'], from: lookup('collection', 'x') }, limit: 12 });
    expect(parseFor('b in section.blocks')).toEqual({ as: 'b', src: { k: 'path', p: ['section', 'blocks'] } });
    expect('error' in parseFor('in x')).toBe(true);
    expect('error' in parseFor('p in x limit:abc')).toBe(true);
  });
});

describe('collection settings and collections()', () => {
  it('collection() takes a handle or a collection setting', () => {
    expect(parseExpr("collection(section.settings.list).products").expr).toEqual({ k: 'path', p: ['products'], from: { k: 'lookup', fn: 'collection', args: [{ k: 'path', p: ['section', 'settings', 'list'] }] } });
    expect(parseExpr("collection(block.settings.list)").expr).toEqual({ k: 'lookup', fn: 'collection', args: [{ k: 'path', p: ['block', 'settings', 'list'] }] });
    expect(parseExpr("collection(settings.home_list)").expr).toEqual({ k: 'lookup', fn: 'collection', args: [{ k: 'path', p: ['settings', 'home_list'] }] });
    for (const bad of ['collection(product.title)', 'collection(section.title)', 'collection(section.settings)', 'collection(section.settings.a.b)', 'collection(settings.a.b)', 'collection(settings)',
      'collection(section.settings[0])', 'collection(5)', 'collection()', "collection('a', 'b')", "collection(section.settings.list | upcase)", "collection(collection('x').handle)"])
      expect(parseExpr(bad).error, bad).toMatch(/handle or a collection setting/);
  });
  it('other lookups still take literal arguments', () => {
    expect(parseExpr('t(section.settings.key)').error).toMatch(/literal arguments/);
    expect(parseExpr('product(settings.p)').error).toMatch(/literal arguments/);
  });
  it('collections() takes no arguments', () => {
    expect(parseExpr("collections()").expr).toEqual({ k: 'lookup', fn: 'collections', args: [] });
    expect(parseExpr("collections()[0].title").expr).toEqual({ k: 'path', p: [0, 'title'], from: { k: 'lookup', fn: 'collections', args: [] } });
    expect(parseExpr("collections('x')").error).toMatch(/takes no arguments/);
  });
  it('for limit may be a setting', () => {
    expect(parseFor('p in xs limit: section.settings.count')).toEqual({ as: 'p', src: { k: 'path', p: ['xs'] }, limitExpr: { k: 'path', p: ['section', 'settings', 'count'] } });
    expect(parseFor('p in xs limit:settings.count')).toEqual({ as: 'p', src: { k: 'path', p: ['xs'] }, limitExpr: { k: 'path', p: ['settings', 'count'] } });
    expect(parseFor('p in xs limit: block.settings.n')).toMatchObject({ limitExpr: { k: 'path', p: ['block', 'settings', 'n'] } });
    for (const bad of ['p in xs limit: product.x', 'p in xs limit: section.settings', 'p in xs limit: settings', 'p in xs limit: -1', 'p in xs limit: 1.5', 'p in xs limit: section.settings.a.b'])
      expect('error' in parseFor(bad), bad).toBe(true);
  });
});

describe('url()', () => {
  it('takes exactly one argument, a literal or any expression', () => {
    expect(parseExpr("url('/products')").expr).toEqual({ k: 'lookup', fn: 'url', args: [{ k: 'lit', v: '/products' }] });
    expect(parseExpr('url(product.url)').expr).toEqual({ k: 'lookup', fn: 'url', args: [{ k: 'path', p: ['product', 'url'] }] });
    expect(parseExpr('url(section.settings.link | default: "/")').expr).toEqual({ k: 'lookup', fn: 'url', args: [{ k: 'filter', name: 'default', input: { k: 'path', p: ['section', 'settings', 'link'] }, args: [{ k: 'lit', v: '/' }] }] });
    for (const bad of ['url()', "url('/a', '/b')", 'url(x.y())'])
      expect(parseExpr(bad).error, bad).toBeDefined();
  });
});
