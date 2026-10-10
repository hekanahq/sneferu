import { describe, it, expect } from 'vitest';
import { evaluate } from './evaluate';
import type { RenderContext } from './context';

const ctx = (over: Partial<RenderContext> = {}): RenderContext => ({
  locale: 'ar', dir: 'rtl', currency: 'EGP', store: { name: 'متجر' }, settings: { accent: '#7C3AED' }, data: {},
  collections: { 'top-ups': { title: 'شحن', products: [{ title: 'A' }, { title: 'B' }] } }, products: { ps: { title: 'PS' } },
  translations: { buy: 'اشتري' }, fallbackTranslations: { buy: 'Buy', only_en: 'Only' },
  assetUrl: (p) => `https://cdn.test/${p}`, imageUrl: (r, w) => `https://img.test/${String((r as { url?: string })?.url ?? r)}?w=${w ?? 'auto'}`, ...over,
});
const p = (...path: (string | number)[]) => ({ k: 'path' as const, p: path });
const lit = (v: string | number | boolean | null) => ({ k: 'lit' as const, v });

describe('evaluate', () => {
  it('reads paths and lookups, missing data is undefined', () => {
    expect(evaluate(p('product', 'title'), { product: { title: 'كارت' } }, ctx())).toBe('كارت');
    expect(evaluate(p('product', 'title'), {}, ctx())).toBeUndefined();
    expect(evaluate({ k: 'path', p: ['products', 1, 'title'], from: { k: 'lookup', fn: 'collection', args: [lit('top-ups')] } }, {}, ctx())).toBe('B');
    expect(evaluate({ k: 'path', p: ['products'], from: { k: 'lookup', fn: 'collection', args: [lit('missing')] } }, {}, ctx())).toEqual([]);
    expect(evaluate({ k: 'lookup', fn: 'product', args: [lit('ps')] }, {}, ctx())).toEqual({ title: 'PS' });
    expect(evaluate({ k: 'lookup', fn: 'settings', args: [lit('accent')] }, {}, ctx())).toBe('#7C3AED');
  });
  it('does not expose prototype or functions', () => {
    expect(evaluate(p('x', 'constructor'), { x: {} }, ctx())).toBeUndefined();
    expect(evaluate(p('x', '__proto__'), { x: {} }, ctx())).toBeUndefined();
    expect(evaluate(p('x', 'f'), { x: { f: () => 1 } }, ctx())).toBeUndefined();
  });
  it('compares and combines', () => {
    expect(evaluate({ k: 'cmp', op: '>', a: lit(3), b: lit(2) }, {}, ctx())).toBe(true);
    expect(evaluate({ k: 'and', a: lit(true), b: { k: 'not', a: lit(false) } }, {}, ctx())).toBe(true);
    expect(evaluate({ k: 'cmp', op: '>', a: lit('a'), b: lit(2) }, {}, ctx())).toBe(false);
  });
  it('translates with fallback', () => {
    expect(evaluate({ k: 'lookup', fn: 't', args: [lit('buy')] }, {}, ctx())).toBe('اشتري');
    expect(evaluate({ k: 'lookup', fn: 't', args: [lit('only_en')] }, {}, ctx())).toBe('Only');
    expect(evaluate({ k: 'lookup', fn: 't', args: [lit('nope')] }, {}, ctx())).toBe('nope');
  });
  it('applies filters', () => {
    const f = (name: string, input: unknown, ...args: (string | number | null)[]) =>
      evaluate({ k: 'filter', name: name as never, input: lit(input as never), args: args.map(lit) }, {}, ctx());
    expect(f('money', 129000)).toBe('1,290.00 ج.م');
    expect(evaluate({ k: 'filter', name: 'money', input: lit(129000), args: [] }, {}, ctx({ locale: 'en', dir: 'ltr' }))).toBe('EGP 1,290.00');
    expect(f('upcase', 'abc')).toBe('ABC');
    expect(f('truncate', 'abcdef', 4)).toBe('abc…');
    expect(f('default', null, 'x')).toBe('x');
    expect(f('size', 'abc')).toBe(3);
    expect(f('join', null, 'a ', 'b')).toBe('a b');
    expect(evaluate({ k: 'filter', name: 'img', input: lit('u.png'), args: [lit(400)] }, {}, ctx())).toBe('https://img.test/u.png?w=400');
    expect(f('json_attr', 'x')).toBe('"x"');
  });
  it('never throws', () => {
    const bad = ctx({ imageUrl: () => { throw new Error('x'); } });
    expect(evaluate({ k: 'filter', name: 'img', input: lit('u'), args: [] }, {}, bad)).toBeUndefined();
    expect(evaluate({ k: 'bogus' } as never, {}, ctx())).toBeUndefined();
  });
});
