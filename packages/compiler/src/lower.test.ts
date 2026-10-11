import { describe, it, expect } from 'vitest';
import { TagRegistry, validateIR, checkRawHtml, type HkTag } from '@hekana/sneferu-core';
import { parseTemplate } from './parser';
import { lower } from './lower';

const grid: HkTag = { name: 'hk-grid', version: 1, category: 'layout',
  props: { columns: { type: 'range', label: { ar: 'أ', en: 'C' }, min: 1, max: 6, responsive: true } },
  allowedParents: '*', allowedChildren: '*', responsive: ['columns'], bindable: '*', render: () => '',
  editor: { label: { ar: 'ش', en: 'G' }, group: 'layout', insertable: true } };
const registry = new TagRegistry().register(grid);
const ir = (src: string) => lower(parseTemplate(src, 'f').nodes, registry);

describe('lower', () => {
  it('merges static markup into one html chunk and escapes text', () => {
    expect(ir('<section class="hero"><h1>كروت &amp; ألعاب</h1><br></section>')).toEqual([
      { k: 'html', s: '<section class="hero"><h1>كروت &amp; ألعاب</h1><br></section>' },
    ]);
  });
  it('keeps dynamic parts as nodes', () => {
    expect(ir('<a href="{{ p.url }}" class="c {{ p.tone }}">{{ p.title }}</a>')).toEqual([
      { k: 'el', tag: 'a', attrs: [
        { name: 'href', sink: 'url', parts: [{ k: 'path', p: ['p', 'url'] }] },
        { name: 'class', sink: 'token', parts: ['c ', { k: 'path', p: ['p', 'tone'] }] },
      ], children: [{ k: 'text', e: { k: 'path', p: ['p', 'title'] } }] },
    ]);
  });
  it('lowers components with responsive props, loops, translations and slots', () => {
    expect(ir('<hk-grid columns="4" mobile-columns="1">{% for p in x %}{{ t(\'buy\') }}{% endfor %}</hk-grid><hk-slot name="content"/>')).toEqual([
      { k: 'comp', tag: 'hk-grid', props: { columns: { k: 'responsive', base: { k: 'static', v: 4 }, mobile: { k: 'static', v: 1 } } }, children: [
        { k: 'loop', as: 'p', src: { k: 'path', p: ['x'] }, limit: 50, body: [{ k: 't', key: 'buy' }] },
      ] },
      { k: 'slot', name: 'content' },
    ]);
  });
  it('lowers <hk-block of="{{ block }}" /> to a comp with an expr prop', () => {
    expect(ir('<hk-block of="{{ block }}" />')).toEqual([
      { k: 'comp', tag: 'hk-block', props: { of: { k: 'expr', e: { k: 'path', p: ['block'] } } }, children: [] },
    ]);
  });
  it('routes data-bound xlink:href through the url sink (C1)', () => {
    expect(ir('<svg><use xlink:href="{{ p.icon }}"></use></svg>')).toEqual([
      { k: 'el', tag: 'svg', attrs: [], children: [{ k: 'el', tag: 'use', attrs: [{ name: 'xlink:href', sink: 'url', parts: [{ k: 'path', p: ['p', 'icon'] }] }], children: [] }] },
    ]);
  });
  it('keeps SVG camelCase names in static output and still passes the lower-case checks', () => {
    const nodes = ir('<svg viewBox="0 0 24 24"><defs><linearGradient id="g" gradientUnits="userSpaceOnUse"></linearGradient></defs></svg>');
    const html = (nodes[0] as { s: string }).s;
    expect(html).toContain('viewBox="0 0 24 24"');
    expect(html).toContain('<linearGradient id="g" gradientUnits="userSpaceOnUse">');
    expect(html).toContain('</linearGradient>');
    expect(checkRawHtml(html)).toBeUndefined();
    expect(validateIR(nodes, new Set())).toEqual([]);
  });
});
