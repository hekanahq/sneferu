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
const registry = new TagRegistry().register(tag('hk-grid')).register(tag('hk-badge', { allowedChildren: [], props: { tone: { type: 'select', label: { ar: 'ن', en: 'T' }, options: ['a'], required: true } } }))
  .register(tag('hk-product-card', { props: {}, parts: ['badge', 'actions'], allowedChildren: ['hk-part'] }))
  .register(tag('hk-card', { props: {}, parts: ['badge', 'actions'], allowedChildren: ['hk-part'] }));

const run = (src: string, kind: 'layout' | 'template' | 'section' = 'section') =>
  validateTemplate(parseTemplate(src, 'f').nodes, { file: 'f', registry, snippets: new Set(['price']), kind }).map((d) => d.code);

describe('validateTemplate', () => {
  describe('interactive content in the card badge (SN2014)', () => {
    it.each(['a', 'button', 'details', 'label', 'hk-product-card', 'hk-product-grid'])('refuses <%s>', (t) => {
      expect(run(`<hk-product-card><hk-part name="badge"><span><${t}>x</${t}></span></hk-part></hk-product-card>`)).toContain('SN2014');
    });
    it('refuses it under {% if %} too, but allows plain markup and the actions part', () => {
      expect(run('<hk-product-card><hk-part name="badge">{% if x %}<a href="/x">y</a>{% endif %}</hk-part></hk-product-card>')).toContain('SN2014');
      expect(run('<hk-product-card><hk-part name="badge"><span class="new">New</span></hk-part><hk-part name="actions"><a href="/x">Buy</a></hk-part></hk-product-card>')).toEqual([]);
    });
  });

  describe('hk-part (SN2013)', () => {
    it('is accepted as a direct child of a tag that declares parts', () => {
      expect(run('<hk-card>\n  <hk-part name="badge"><span class="new">New</span></hk-part>\n  <hk-part name="actions"><a href="/x">Buy</a></hk-part>\n</hk-card>')).toEqual([]);
    });
    it('is SN2013 anywhere else', () => {
      expect(run('<hk-part name="badge">x</hk-part>')).toEqual(['SN2013']);
      expect(run('<hk-grid><hk-part name="badge">x</hk-part></hk-grid>')).toEqual(['SN2013']);
      expect(run('<hk-card><hk-part name="badge"><hk-part name="badge">x</hk-part></hk-part></hk-card>')).toEqual(['SN2013']);
      expect(run('<div><hk-card></hk-card><hk-part name="badge">x</hk-part></div>')).toEqual(['SN2013']);
    });
    it('needs a static name the parent declares (SN2013), and takes no other attribute (SN2004)', () => {
      expect(run('<hk-card><hk-part name="footer">x</hk-part></hk-card>')).toEqual(['SN2013']);
      expect(run('<hk-card><hk-part>x</hk-part></hk-card>')).toEqual(['SN2013']);
      expect(run('<hk-card><hk-part name="{{ p }}">x</hk-part></hk-card>')).toEqual(['SN2013']);
      expect(run('<hk-card><hk-part name="badge" class="x">x</hk-part></hk-card>')).toEqual(['SN2004']);
    });
    it('a parts tag takes only hk-part children (SN2006)', () => {
      expect(run('<hk-card><p>x</p></hk-card>')).toEqual(['SN2006']);
      expect(run('<hk-card>{% if x %}<hk-part name="badge">x</hk-part>{% endif %}</hk-card>')).toEqual(['SN2006', 'SN2013']);
    });
  });
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
  it('form controls exist only through hk-search-form: <form>, <input>, <button>, <select>, <textarea> are rejected', () => {
    for (const html of ['<form action="/x"></form>', '<input name="q">', '<button>x</button>', '<select></select>', '<textarea></textarea>'])
      expect(run(html), html).toContain('SN2001');
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
  describe('collection settings (SN2012)', () => {
    const schema = { list: { type: 'text' }, pick: { type: 'collection' }, count: { type: 'range' }, title: { type: 'text' } };
    const theme = { home: { type: 'collection' }, n: { type: 'number' }, tagline: { type: 'text' } };
    const v = (src: string, kind: 'section' | 'block' | 'template' = 'section') =>
      validateTemplate(parseTemplate(src, 'f').nodes, { file: 'f', registry, snippets: new Set(), kind, settingsSchema: schema, themeSettings: theme });
    it('accepts collection settings and number limits', () => {
      expect(v("{% for p in collection(section.settings.pick).products limit: section.settings.count %}{{ p.title }}{% endfor %}")).toEqual([]);
      expect(v("<p title=\"{{ collection(settings.home).title }}\">{% for p in collection(settings.home).products limit: settings.n %}x{% endfor %}</p>")).toEqual([]);
      expect(v("{% if collection(block.settings.anything).products %}x{% endif %}")).toEqual([]);
      expect(v("{% for p in collection(block.settings.pick).products limit: block.settings.count %}x{% endfor %}", 'block')).toEqual([]);
    });
    it('reports wrong types and unknown settings', () => {
      const a = v("{% for p in collection(section.settings.list).products %}{% endfor %}");
      expect(a.map((d) => d.code)).toEqual(['SN2012']);
      expect(a[0]!.message).toMatch(/setting 'list' must be of type collection/);
      const b = v("{{ collection(section.settings.missing).title }}");
      expect(b.map((d) => d.code)).toEqual(['SN2012']);
      expect(b[0]!.message).toMatch(/unknown setting 'missing'/);
      expect(v("{% render 'x', l: collection(settings.tagline) %}").map((d) => d.code)).toContain('SN2012');
      expect(v("{% for p in xs limit: section.settings.title %}{% endfor %}").map((d) => d.code)).toEqual(['SN2012']);
      expect(v("{% for p in xs limit: settings.nope %}{% endfor %}").map((d) => d.code)).toEqual(['SN2012']);
      expect(v("{% for p in xs limit: section.settings.constructor %}{% endfor %}").map((d) => d.code)).toEqual(['SN2012']);
    });
    it('checks block files against their own schema and leaves section.* unchecked there', () => {
      expect(v("{{ collection(block.settings.list).title }}", 'block').map((d) => d.code)).toEqual(['SN2012']);
      expect(v("{{ collection(section.settings.whatever).title }}", 'block')).toEqual([]);
    });
  });
});
