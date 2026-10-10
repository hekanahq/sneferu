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
