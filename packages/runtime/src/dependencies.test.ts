import { describe, it, expect } from 'vitest';
import type { Expr, IRNode } from '@hekana/sneferu-core';
import { pageDependencies } from './dependencies';
import type { ArtifactLike } from './page';

const lbl = { ar: 'ق', en: 'L' };
const col = (arg: Expr): Expr => ({ k: 'path', p: ['products'], from: { k: 'lookup', fn: 'collection', args: [arg] } });
const lit = (v: string): Expr => ({ k: 'lit', v });
const loopOver = (arg: Expr): IRNode => ({ k: 'loop', as: 'p', src: col(arg), limit: 4, body: [] });
const setting = (scope: 'section' | 'block', name: string): Expr => ({ k: 'path', p: [scope, 'settings', name] });

const artifact = (): ArtifactLike => ({
  manifest: { id: 't', settings: { home: { type: 'collection', label: lbl }, title: { type: 'text', label: lbl, default: 'not-a-collection' } } },
  layout: [{ k: 'el', tag: 'main', attrs: [], children: [loopOver(lit('featured')), { k: 'slot', name: 'content' }] }],
  templates: { index: [{ k: 'slot', name: 'sections' }], product: [{ k: 'text', e: col(lit('product-only')) }] },
  templateSections: { index: [{ type: 'hero', settings: {} }] },
  sections: {
    hero: { ir: [loopOver(setting('section', 'list'))], schema: { settings: { list: { type: 'collection', label: lbl, default: 'new' }, count: { type: 'number', label: lbl, default: 4 } } } },
    grid: { ir: [loopOver(setting('section', 'list'))], schema: { settings: { list: { type: 'collection', label: lbl } } } },
    faq: { ir: [{ k: 'comp', tag: 'hk-block', props: {}, children: [] }], schema: { settings: {} } },
  },
  blocks: { shelf: { ir: [loopOver(setting('block', 'list'))], schema: { settings: { list: { type: 'collection', label: lbl, default: 'subscriptions' } } } } },
  snippets: {},
});

describe('pageDependencies', () => {
  it('collects literal handles and collection setting values, defaults included', () => {
    const a = artifact();
    expect(pageDependencies(a, { template: 'index' }).collections.sort()).toEqual(['featured', 'new']);
    expect(pageDependencies(a, { template: 'index', sections: [{ id: 's', type: 'grid', props: { list: 'gift-cards' } }] }).collections).toContain('gift-cards');
    expect(pageDependencies(a, { template: 'product' }).collections.sort()).toEqual(['featured', 'product-only']);
  });
  it('uses the stored value over the default, for sections, blocks and theme settings', () => {
    const a = artifact();
    const r = pageDependencies(a, { template: 'index', settings: { home: 'gift-cards' }, sections: [
      { id: 'h', type: 'hero', props: { list: 'deals' } },
      { id: 'f', type: 'faq', children: [{ id: 'b1', type: 'shelf' }, { id: 'b2', type: 'shelf', props: { list: 'ebooks' } }] },
    ] });
    expect(r.collections.sort()).toEqual(['deals', 'ebooks', 'featured', 'gift-cards', 'subscriptions']);
    expect(r.categories).toBe(false);
  });
  it('takes default blocks from the template and skips hidden sections and blocks', () => {
    const a = { ...artifact(), templateSections: { index: [{ type: 'faq', settings: {}, blocks: [{ type: 'shelf', settings: { list: 'from-template' } }] }] } };
    expect(pageDependencies(a, { template: 'index' }).collections.sort()).toEqual(['featured', 'from-template']);
    const hidden = pageDependencies(a, { template: 'index', sections: [
      { id: 'h', type: 'hero', hidden: true, props: { list: 'hidden-one' } },
      { id: 'f', type: 'faq', children: [{ id: 'b', type: 'shelf', hidden: true, props: { list: 'hidden-two' } }] },
    ] });
    expect(hidden.collections).toEqual(['featured']);
  });
  it('ignores empty or invalid handles and caps at 8', () => {
    const a = artifact();
    const r = pageDependencies(a, { template: 'index', settings: { home: 'A B' }, sections: [
      { id: '1', type: 'hero', props: { list: '' } },
      { id: '2', type: 'grid', props: { list: '-x' } },
      { id: '3', type: 'grid', props: { list: { handle: 'obj' } } },
      { id: '4', type: 'grid', props: { list: 'x'.repeat(101) } },
    ] });
    expect(r.collections).toEqual(['featured']);
    const many = pageDependencies(a, { template: 'index', sections: Array.from({ length: 20 }, (_, i) => ({ id: `s${i}`, type: 'grid', props: { list: `c-${i}` } })) });
    expect(many.collections).toHaveLength(8);
    expect(many.collections[0]).toBe('featured');
  });
  it('walks the merchant\'s sections and blocks before snippets, so the cap keeps their picks', () => {
    const snippets = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`s${i}`, [loopOver(lit(`snip-${i}`))] as IRNode[]]));
    const r = pageDependencies({ ...artifact(), snippets }, { template: 'index', settings: { home: 'theme-pick' }, sections: [
      { id: 'g', type: 'grid', props: { list: 'merchant-pick' } },
      { id: 'f', type: 'faq', children: [{ id: 'b', type: 'shelf', props: { list: 'block-pick' } }] },
    ] });
    expect(r.collections).toHaveLength(8);
    expect(r.collections).toEqual(expect.arrayContaining(['featured', 'theme-pick', 'merchant-pick', 'block-pick']));
  });
  it('reports categories when collections() is used', () => {
    const a = { ...artifact(), snippets: { nav: [{ k: 'loop', as: 'c', src: { k: 'lookup', fn: 'collections', args: [] }, limit: 50, body: [] }] as IRNode[] } };
    expect(pageDependencies(a, { template: 'index' })).toMatchObject({ categories: true });
    expect(pageDependencies(artifact(), { template: 'index' }).categories).toBe(false);
    // found even after the handle cap is reached
    const full = { ...a, snippets: { z: a.snippets.nav } };
    expect(pageDependencies(full, { template: 'index', sections: Array.from({ length: 20 }, (_, i) => ({ id: `s${i}`, type: 'grid', props: { list: `c-${i}` } })) }).categories).toBe(true);
  });
  it('never throws on a malformed artifact', () => {
    expect(pageDependencies({} as never, { template: 'index' })).toEqual({ collections: [], products: [], categories: false });
    expect(pageDependencies(null as never, { template: 'index' })).toEqual({ collections: [], products: [], categories: false });
    expect(pageDependencies(artifact(), { template: '__proto__' })).toEqual({ collections: ['featured'], products: [], categories: false });
    expect(pageDependencies(artifact(), { template: 'index', sections: 'x' as never })).toEqual({ collections: ['featured', 'new'], products: [], categories: false });
    const junk = { manifest: { settings: 'x' }, layout: 'x', templates: { index: [null, 1, { k: 'loop' }, { k: 'el', attrs: 'x', children: [{ k: 'text', e: { k: 'lookup', fn: 'collection', args: 'x' } }] }] },
      templateSections: { index: [null, { type: 'hero' }, { type: 'faq', blocks: 'x' }, { type: 'faq', blocks: [null, {}] }] },
      sections: { hero: { schema: { settings: { list: null } } }, faq: null }, blocks: 'x', snippets: { a: 'x' } };
    expect(() => pageDependencies(junk as never, { template: 'index', settings: 'x' as never })).not.toThrow();
    let deep: Expr = lit('deep');
    for (let i = 0; i < 5000; i++) deep = { k: 'not', a: deep };
    const nested = { ...artifact(), layout: [{ k: 'text', e: deep }, { k: 'text', e: col(lit('shallow')) }] as IRNode[] };
    expect(pageDependencies(nested, { template: 'index' }).collections).toEqual(['shallow', 'new']);
    const accessor = { ...artifact() } as Record<string, unknown>;
    Object.defineProperty(accessor, 'snippets', { get() { throw new Error('boom'); }, enumerable: true });
    expect(pageDependencies(accessor as never, { template: 'index' })).toEqual({ collections: [], products: [], categories: false });
  });
  it('reads own properties only', () => {
    const proto = Object.create({ list: 'inherited' }) as Record<string, unknown>;
    const r = pageDependencies(artifact(), { template: 'index', sections: [{ id: 'g', type: 'grid', props: proto }, { id: 'x', type: 'toString' }] });
    expect(r.collections).toEqual(['featured']);
  });

  it('collects product handles from product() literals and product settings, defaults included', () => {
    const prod = (arg: Expr): IRNode => ({ k: 'text', e: { k: 'path', p: ['title'], from: { k: 'lookup', fn: 'product', args: [arg] } } });
    const a: ArtifactLike = { ...artifact(),
      layout: [prod(lit('from-layout')), { k: 'slot', name: 'content' }],
      sections: { pick: { ir: [prod(setting('section', 'item'))], schema: { settings: { item: { type: 'product', label: lbl, default: 'dflt' } } } } },
      templateSections: { index: [{ type: 'pick', settings: {} }] } };
    expect(pageDependencies(a, { template: 'index' }).products.sort()).toEqual(['dflt', 'from-layout']);
    expect(pageDependencies(a, { template: 'index', sections: [{ id: 'x', type: 'pick', props: { item: 'chosen' } }] }).products.sort()).toEqual(['chosen', 'from-layout']);
    expect(pageDependencies(a, { template: 'index', sections: [{ id: 'x', type: 'pick', props: { item: 'Not A Handle!' } }] }).products).toEqual(['from-layout']);
    const many = Array.from({ length: 30 }, (_, i) => ({ id: `n${i}`, type: 'pick', props: { item: `p-${i}` } }));
    expect(pageDependencies(a, { template: 'index', sections: many }).products).toHaveLength(12);
  });
});
