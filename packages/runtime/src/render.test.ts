import { describe, it, expect } from 'vitest';
import { TagRegistry, LIMITS, type HkTag, type IRNode } from '@hekana/sneferu-core';
import { renderNodes, Budget, type Env } from './render';
import type { RenderContext } from './context';

const ctx: RenderContext = { locale: 'ar', dir: 'rtl', currency: 'EGP', store: {}, settings: {}, data: {}, collections: {}, products: {},
  translations: { buy: 'اشتري' }, fallbackTranslations: {}, assetUrl: (p) => p, imageUrl: (r) => String(r) };
const box: HkTag = { name: 'hk-box', version: 1, category: 'layout', props: { pad: { type: 'number', label: { ar: 'ح', en: 'P' }, default: 8 } },
  allowedParents: '*', allowedChildren: '*', responsive: [], bindable: '*', editor: { label: { ar: 'ص', en: 'B' }, group: 'layout', insertable: true },
  render: (props, c) => { c.css(`.sn-${c.id}{padding:${Number(props.pad)}px}`); return `<div class="sn-${c.id}">${c.renderChildren()}</div>`; } };
const env = (over: Partial<Env> = {}): Env => ({ ctx, registry: new TagRegistry().register(box), snippets: {}, slots: {}, budget: new Budget(), css: [], controllers: new Set(), diagnostics: [], ids: { n: 0 }, depth: 0, include: 0, ...over });
const path = (...p: string[]) => ({ k: 'path' as const, p });

describe('renderNodes', () => {
  it('escapes text, attributes and URLs by sink', () => {
    const nodes: IRNode[] = [{ k: 'el', tag: 'a', attrs: [
      { name: 'href', sink: 'url', parts: [path('u')] }, { name: 'title', sink: 'text', parts: [path('t')] }, { name: 'class', sink: 'token', parts: ['c ', path('cls')] },
    ], children: [{ k: 'text', e: path('t') }] }];
    expect(renderNodes(nodes, { u: 'javascript:alert(1)', t: '"<x>"', cls: 'a"b' }, env()))
      .toBe('<a href="#" title="&quot;&lt;x&gt;&quot;" class="c a b">"&lt;x&gt;"</a>');
  });
  it('emits SVG camelCase names for dynamic elements', () => {
    const nodes: IRNode[] = [{ k: 'el', tag: 'svg', attrs: [{ name: 'viewbox', sink: 'text', parts: ['0 0 ', path('n'), ' 24'] }], children: [{ k: 'el', tag: 'lineargradient', attrs: [], children: [] }] }];
    expect(renderNodes(nodes, { n: 24 }, env())).toBe('<svg viewBox="0 0 24 24"><linearGradient></linearGradient></svg>');
  });
  it('renders if/loop/translations/components and collects scoped css', () => {
    const e = env();
    const html = renderNodes([
      { k: 'loop', as: 'p', src: path('items'), limit: 2, body: [{ k: 'comp', tag: 'hk-box', props: { pad: { k: 'expr', e: path('p') } }, children: [{ k: 't', key: 'buy' }] }] },
      { k: 'if', branches: [{ test: path('missing'), body: [{ k: 'html', s: 'no' }] }], else: [{ k: 'html', s: 'yes' }] },
    ], { items: [4, 6, 8] }, e);
    expect(html).toBe('<div class="sn-c1">اشتري</div><div class="sn-c2">اشتري</div>yes');
    expect(e.css).toEqual(['.sn-c1{padding:4px}', '.sn-c2{padding:6px}']);
  });
  it('stops runaway loops at the budget but returns valid html', () => {
    const e = env({ budget: new Budget({ ...LIMITS, loopIterations: 3 }) });
    const html = renderNodes([{ k: 'loop', as: 'x', src: path('xs'), limit: 250, body: [{ k: 'html', s: '<i></i>' }] }], { xs: Array(100).fill(0) }, e);
    expect(html).toBe('<i></i><i></i><i></i>');
    expect(e.diagnostics.map((d) => d.code)).toEqual(['SN4001']);
  });
  it('refuses recursive includes', () => {
    const e = env({ snippets: { a: [{ k: 'render', snippet: 'a', args: {} }] } });
    renderNodes([{ k: 'render', snippet: 'a', args: {} }], {}, e);
    expect(e.diagnostics.map((d) => d.code)).toContain('SN4002');
  });
  it('charges snippet fan-out against the node budget and reports SN4002 once (C2)', () => {
    for (const k of [3, 5, 8]) {
      const e = env({ snippets: { a: Array.from({ length: k }, () => ({ k: 'render' as const, snippet: 'a', args: {} })) } });
      const t0 = Date.now();
      renderNodes([{ k: 'render', snippet: 'a', args: {} }], {}, e);
      expect(Date.now() - t0).toBeLessThan(1000);
      expect(e.budget.nodes).toBeLessThanOrEqual(LIMITS.renderNodes + 1);
      expect(e.diagnostics.filter((d) => d.code === 'SN4002').length).toBeLessThanOrEqual(1);
      expect(e.diagnostics.length).toBeLessThanOrEqual(2);
    }
  });
  it('charges if, loop and slot nodes too', () => {
    const e = env({ budget: new Budget({ ...LIMITS, renderNodes: 5 }), slots: { s: () => 'x' } });
    const html = renderNodes(Array.from({ length: 10 }, () => ({ k: 'slot' as const, name: 's' })), {}, e);
    expect(html).toBe('xxxxx');
    expect(e.diagnostics.map((d) => d.code)).toEqual(['SN4001']);
    const e2 = env({ budget: new Budget({ ...LIMITS, renderNodes: 3 }) });
    renderNodes(Array.from({ length: 10 }, () => ({ k: 'if' as const, branches: [{ test: { k: 'lit' as const, v: true }, body: [{ k: 'html' as const, s: 'y' }] }] })), {}, e2);
    expect(e2.budget.exceeded).toBe('render nodes');
  });
  it('treats empty arrays and empty strings as false in if/and/or/not (M1)', () => {
    const t = (test: unknown) => renderNodes([{ k: 'if', branches: [{ test: test as never, body: [{ k: 'html', s: 'y' }] }], else: [{ k: 'html', s: 'n' }] }], { e: [], s: '', a: [1], z: 0, w: 'x' }, env());
    expect([path('e'), path('s'), path('z'), path('missing'), path('a'), path('w')].map(t).join('')).toBe('nnnnyy');
    expect(t({ k: 'not', a: path('e') })).toBe('y');
    expect(t({ k: 'and', a: path('a'), b: path('e') })).toBe('n');
    expect(t({ k: 'or', a: path('e'), b: path('s') })).toBe('n');
  });
  it('reports an unknown block type as SN4012 (M1)', () => {
    const e = env({ blocks: { chip: { ir: [{ k: 'html', s: 'c' }] } } });
    const node: IRNode = { k: 'comp', tag: 'hk-block', props: { of: { k: 'expr', e: path('b') } }, children: [] };
    expect(renderNodes([node], { b: { id: '1', type: 'ghost' } }, e)).toBe('');
    expect(e.diagnostics.map((d) => d.code)).toEqual(['SN4012']);
    expect(renderNodes([node], { b: { id: '2', type: 'chip' } }, e)).toBe('<div data-hk-block="2">c</div>');
    expect(renderNodes([node], {}, e)).toBe('');
    expect(e.diagnostics).toHaveLength(1);
  });
});
