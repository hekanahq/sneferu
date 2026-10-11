import { describe, it, expect } from 'vitest';
import { TagRegistry, LIMITS, type HkTag, type IRNode } from '@hekana/sneferu-core';
import { renderNodes, Budget, type Env } from './render';
import type { RenderContext } from './context';

const ctx: RenderContext = { locale: 'ar', dir: 'rtl', currency: 'EGP', store: {}, settings: {}, data: {}, collections: {}, products: {},
  translations: { buy: 'اشتري' }, fallbackTranslations: {}, assetUrl: (p) => p, imageUrl: (r) => String(r) };
const box: HkTag = { name: 'hk-box', version: 1, category: 'layout', props: { pad: { type: 'number', label: { ar: 'ح', en: 'P' }, default: 8 } },
  allowedParents: '*', allowedChildren: '*', responsive: [], bindable: '*', editor: { label: { ar: 'ص', en: 'B' }, group: 'layout', insertable: true },
  render: (props, c) => { c.css(`.sn-${c.id}{padding:${Number(props.pad)}px}`); return `<div class="sn-${c.id}">${c.renderChildren()}</div>`; } };
const carded: HkTag = { ...box, name: 'hk-carded', parts: ['badge', 'actions'], allowedChildren: ['hk-part'],
  render: (_p, c) => `<a>${c.renderChildren('badge')}|${c.renderChildren()}</a>${c.renderChildren('actions')}` };
const env = (over: Partial<Env> = {}): Env => ({ ctx, registry: new TagRegistry().register(box).register(carded), snippets: {}, slots: {}, budget: new Budget(), css: [], controllers: new Set(), diagnostics: [], ids: { n: 0 }, depth: 0, include: 0, ...over });
const path = (...p: string[]) => ({ k: 'path' as const, p });

describe('renderNodes', () => {
  it('renders named parts where the tag asks for them; renderChildren() skips parts', () => {
    const part = (name: unknown, children: IRNode[]): IRNode => ({ k: 'comp', tag: 'hk-part', props: { name: { k: 'static', v: name } }, children });
    const nodes: IRNode[] = [{ k: 'comp', tag: 'hk-carded', props: {}, children: [
      part('badge', [{ k: 'text', e: path('b') }]), { k: 'html', s: ' ' }, part('actions', [{ k: 'html', s: '<i>1</i>' }]),
      part('actions', [{ k: 'html', s: '<i>2</i>' }]), part('other', [{ k: 'html', s: 'no' }]),
      { k: 'comp', tag: 'hk-part', props: { name: { k: 'expr', e: path('dyn') } }, children: [{ k: 'html', s: 'no' }] },
    ] }];
    const e = env();
    expect(renderNodes(nodes, { b: '<New>', dyn: 'badge' }, e)).toBe('<a>&lt;New&gt;| </a><i>1</i><i>2</i>');
    expect(e.diagnostics).toEqual([]);
  });
  it('an hk-part outside a parts tag renders nothing', () => {
    const e = env();
    expect(renderNodes([{ k: 'comp', tag: 'hk-box', props: {}, children: [{ k: 'comp', tag: 'hk-part', props: { name: { k: 'static', v: 'badge' } }, children: [{ k: 'html', s: 'x' }] }] }], {}, e))
      .toBe('<div class="sn-c1"></div>');
    expect(renderNodes([{ k: 'comp', tag: 'hk-part', props: {}, children: [{ k: 'html', s: 'x' }] }], {}, e)).toBe('');
    expect(e.diagnostics).toEqual([]);
  });
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
  it('loop limit from a setting is clamped', () => {
    const loop: IRNode[] = [{ k: 'loop', as: 'x', src: path('xs'), limit: { k: 'path', p: ['section', 'settings', 'count'] }, body: [{ k: 'html', s: 'i' }] }];
    const count = (c: unknown) => renderNodes(loop, { xs: Array(300).fill(0), section: { settings: { count: c } } }, env()).length;
    expect(count(3)).toBe(3);
    expect(count('7')).toBe(7);
    expect(count(999)).toBe(LIMITS.loopMax);
    for (const fallback of ['x', '', 0, -2, 2.5, null, undefined, true, [3], { n: 3 }]) expect(count(fallback), String(fallback)).toBe(LIMITS.loopDefault);
  });
  it('collection() with an empty setting renders nothing', () => {
    const c: RenderContext = { ...ctx, collections: { '': { products: [1, 2] }, featured: { products: [1, 2, 3] } } };
    const loop: IRNode[] = [{ k: 'loop', as: 'p', src: { k: 'path', p: ['products'], from: { k: 'lookup', fn: 'collection', args: [path('section', 'settings', 'list')] } }, limit: 50, body: [{ k: 'html', s: 'i' }] }];
    const run = (list: unknown) => renderNodes(loop, { section: { settings: { list } } }, env({ ctx: c }));
    expect(run('')).toBe('');
    expect(run(undefined)).toBe('');
    expect(run('featured')).toBe('iii');
  });
  it('a CSS rule written twice on a page is kept once (shared rules such as the icon flip)', () => {
    const shared: HkTag = { ...box, name: 'hk-shared', render: (_p, c) => { c.css('[dir=rtl] .sn-flip{transform:scaleX(-1)}'); c.css(`.sn-${c.id}{x:1}`); return '<i></i>'; } };
    const e = env({ registry: new TagRegistry().register(shared), cssSeen: new Set() });
    const one: IRNode = { k: 'comp', tag: 'hk-shared', props: {}, children: [] };
    renderNodes([one, one, one], {}, e);
    expect(e.css).toEqual(['[dir=rtl] .sn-flip{transform:scaleX(-1)}', '.sn-c1{x:1}', '.sn-c2{x:1}', '.sn-c3{x:1}']);
  });
  it('tags get ctx.url and the money default', () => {
    let seen: unknown[] = [];
    const probe: HkTag = { ...box, name: 'hk-probe', render: (_p, c) => { seen = [c.url('/products'), c.url('javascript:x'), c.money]; return ''; } };
    renderNodes([{ k: 'comp', tag: 'hk-probe', props: {}, children: [] }], {}, env({ registry: new TagRegistry().register(probe), ctx: { ...ctx, locale: 'en', dir: 'ltr', money: 'whole' } }));
    expect(seen).toEqual(['/en/products', '#', 'whole']);
    renderNodes([{ k: 'comp', tag: 'hk-probe', props: {}, children: [] }], {}, env({ registry: new TagRegistry().register(probe), ctx: { ...ctx, url: (p) => `/s${p}` } }));
    expect(seen).toEqual(['/s/products', '/sjavascript:x', undefined]); // the host's result, checked by safeUrl
  });
});
