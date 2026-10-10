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
});
