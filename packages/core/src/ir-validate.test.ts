import { describe, it, expect } from 'vitest';
import { validateIR } from './ir-validate';

const tags = new Set(['hk-grid']);

describe('validateIR', () => {
  it('accepts a well-formed tree', () => {
    const ir = [
      { k: 'html', s: '<h1>' },
      { k: 'text', e: { k: 'path', p: ['product', 'title'] } },
      { k: 'html', s: '</h1>' },
      { k: 'loop', as: 'p', src: { k: 'lookup', fn: 'collection', args: [{ k: 'lit', v: 'x' }] }, limit: 12, body: [] },
      { k: 'comp', tag: 'hk-grid', props: { columns: { k: 'static', v: 4 } }, children: [] },
    ];
    expect(validateIR(ir, tags)).toEqual([]);
  });

  it('rejects unknown node kinds, unknown tags, unknown filters and oversized loops', () => {
    const bad = [
      { k: 'eval', s: 'x' },
      { k: 'comp', tag: 'hk-nope', props: {}, children: [] },
      { k: 'text', e: { k: 'filter', name: 'exec', input: { k: 'lit', v: 1 }, args: [] } },
      { k: 'loop', as: 'p', src: { k: 'lit', v: [] }, limit: 999, body: [] },
    ];
    const codes = validateIR(bad, tags).map((d) => d.code);
    expect(codes).toEqual(['SN9001', 'SN9002', 'SN9003', 'SN9004']);
  });
});

describe('validateIR hardening', () => {
  const codes = (ir: unknown) => validateIR(ir, tags).map((d) => d.code);
  const nest = (n: number) => { let e: unknown = { k: 'lit', v: 1 }; for (let i = 0; i < n; i++) e = { k: 'not', a: e }; return e; };

  it('returns diagnostics instead of throwing on malformed shapes', () => {
    const shapes: unknown[] = [
      [{ k: 'el', tag: 'p', children: [] }],
      [{ k: 'el', tag: 'p', attrs: [{ name: 'a' }], children: [] }],
      [{ k: 'el', tag: 'p', attrs: [null], children: [] }],
      [{ k: 'if' }],
      [{ k: 'if', branches: [null] }],
      [{ k: 'comp', tag: 'hk-grid', children: [] }],
      [{ k: 'render', snippet: 's' }],
      [{ k: 'html' }],
      null, 5, 'x', [null, 1],
    ];
    for (const s of shapes) {
      expect(() => validateIR(s, tags)).not.toThrow();
      expect(validateIR(s, tags).length).toBeGreaterThan(0);
    }
  });

  it('rejects NaN and fractional loop limits', () => {
    for (const limit of [NaN, 1.5, 0, Infinity]) {
      expect(codes([{ k: 'loop', as: 'p', src: { k: 'lit', v: [] }, limit, body: [] }])).toEqual(['SN9004']);
    }
  });

  it('caps nesting depth', () => {
    expect(codes([{ k: 'text', e: nest(100) }])).toEqual(['SN9009']);
    expect(codes([{ k: 'text', e: nest(10) }])).toEqual([]);
    let n: unknown = { k: 'html', s: 'x' };
    for (let i = 0; i < 100; i++) n = { k: 'if', branches: [{ test: { k: 'lit', v: true }, body: [n] }] };
    expect(codes([n])).toEqual(['SN9009']);
  });

  it('re-checks el and html', () => {
    const el = (tag: string, attrs: unknown[] = []) => [{ k: 'el', tag, attrs, children: [] }];
    const a = (name: string, sink: string, parts: unknown[] = ['x']) => ({ name, sink, parts });
    expect(codes(el('div', [a('class', 'token'), a('href', 'url')]))).toEqual([]);
    expect(codes(el('script'))).toEqual(['SN9011']);
    expect(codes(el('Div'))).toEqual(['SN9011']);
    expect(codes(el('div', [a('onclick', 'text')]))).toEqual(['SN9012']);
    expect(codes(el('div', [a('srcdoc', 'text')]))).toEqual(['SN9012']);
    expect(codes(el('div', [a('bad name', 'text')]))).toEqual(['SN9012']);
    expect(codes(el('div', [a('class', 'html')]))).toEqual(['SN9013']);
    expect(codes(el('a', [a('href', 'text')]))).toEqual(['SN9013']);
    expect(codes(el('div', [a('style', 'text', [{ k: 'lit', v: 'x' }])]))).toEqual(['SN9012']);
    expect(codes([{ k: 'html', s: 5 }])).toEqual(['SN9010']);
  });
});
