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
