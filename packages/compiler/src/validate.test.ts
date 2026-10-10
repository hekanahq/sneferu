import { describe, it, expect } from 'vitest';
import { TagRegistry, type HkTag } from '@hekana/sneferu-core';
import { parseTemplate } from './parser';
import { validateTemplate } from './validate';

const tag = (name: string, extra: Partial<HkTag> = {}): HkTag => ({
  name: name as `hk-${string}`, version: 1, category: 'layout',
  props: { columns: { type: 'range', label: { ar: 'أ', en: 'C' }, min: 1, max: 6, responsive: true }, gap: { type: 'number', label: { ar: 'ف', en: 'G' } } },
  allowedParents: '*', allowedChildren: '*', responsive: ['columns'], bindable: '*', render: () => '',
  editor: { label: { ar: name, en: name }, group: 'layout', insertable: true }, ...extra,
});
const registry = new TagRegistry().register(tag('hk-grid')).register(tag('hk-badge', { allowedChildren: [], props: { tone: { type: 'select', label: { ar: 'ن', en: 'T' }, options: ['a'], required: true } } }));

const run = (src: string, kind: 'layout' | 'template' | 'section' = 'section') =>
  validateTemplate(parseTemplate(src, 'f').nodes, { file: 'f', registry, snippets: new Set(['price']), kind }).map((d) => d.code);

describe('validateTemplate', () => {
  it('accepts valid markup with responsive props', () => {
    expect(run('<hk-grid columns="4" tablet-columns="2" mobile-columns="1" gap="24" class="x" data-a="1"><p>x</p></hk-grid>')).toEqual([]);
  });
  it('blocks dangerous elements and attributes', () => {
    expect(run('<script>x</script>')).toEqual(['SN2001']);
    expect(run('<div onclick="x"></div>')).toEqual(['SN2002']);
    expect(run('<iframe srcdoc="x"></iframe>')).toEqual(['SN2001', 'SN2002']);
    expect(run('<div style="color: {{ c }}"></div>')).toEqual(['SN2009']);
    expect(run('<a href="javascript:alert(1)">x</a>')).toEqual(['SN2010']);
  });
  it('checks hk tags, props and children with suggestions', () => {
    const r = validateTemplate(parseTemplate('<hk-grdi></hk-grdi><hk-grid mobile-colums="1"></hk-grid>', 'f').nodes, { file: 'f', registry, snippets: new Set(), kind: 'section' });
    expect(r.map((d) => d.code)).toEqual(['SN2003', 'SN2004']);
    expect(r[0]!.message).toContain('hk-grid');
    expect(r[1]!.message).toContain('mobile-columns');
    expect(run('<hk-badge></hk-badge>')).toEqual(['SN2005']);
    expect(run('<hk-badge tone="a"><p>x</p></hk-badge>')).toEqual(['SN2006']);
  });
  it('bounds loops, resolves snippets and restricts slots', () => {
    expect(run('{% for p in x limit:300 %}{% endfor %}')).toEqual(['SN2007']);
    expect(run('{% for p in x limit:0 %}{% endfor %}')).toEqual(['SN2007']);
    expect(run("{% render 'nope' %}")).toEqual(['SN2008']);
    expect(run('<hk-slot name="content" />', 'section')).toEqual(['SN2011']);
    expect(run('<hk-slot name="content" />', 'layout')).toEqual([]);
  });
  it('uses an element allow-list and treats *:href as URLs (C1)', () => {
    expect(run('<svg><a xlink:href="javascript:alert(1)"><text>x</text></a></svg>')).toEqual(['SN2010']);
    expect(run('<svg><a><animate attributename="href" values="javascript:alert(1)"></animate></a></svg>')).toEqual(['SN2001', 'SN2002']);
    expect(run('<svg><set attributename="href" to="javascript:x"></set></svg>')).toEqual(['SN2001', 'SN2002']);
    expect(run('<svg><foreignobject><p>x</p></foreignobject></svg>')).toEqual(['SN2001']);
    expect(run('<my-widget></my-widget>')).toEqual(['SN2001']);
    expect(run('<template><p>x</p></template><noscript></noscript>')).toEqual(['SN2001', 'SN2001']);
    expect(run('<div a<b="1"></div>')).toEqual(['SN2002']);
    expect(run('<svg viewBox="0 0 8 8"><use xlink:href="#i"></use><path d="M0 0"></path></svg>')).toEqual([]);
  });
});
