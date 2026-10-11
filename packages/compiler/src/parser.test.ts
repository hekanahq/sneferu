import { describe, it, expect } from 'vitest';
import { parseTemplate } from './parser';

describe('parseTemplate', () => {
  it('builds nested elements, interpolated attributes, if/elsif/else and for', () => {
    const src = `<div class="card {{ p.tone }}">{% if p.available %}<b>{{ p.title }}</b>{% elsif p.soon %}soon{% else %}<hk-badge>نفدت</hk-badge>{% endif %}{% for v in p.variants limit:5 %}<span>{{ v.title }}</span>{% endfor %}<img src="{{ p.image }}"></div>`;
    const { nodes, diagnostics } = parseTemplate(src, 'f.sneferu');
    expect(diagnostics).toEqual([]);
    const div = nodes[0] as any;
    expect(div.t).toBe('el');
    expect(div.attrs[0].parts).toEqual(['card ', { k: 'path', p: ['p', 'tone'] }]);
    expect(div.children.map((c: any) => c.t)).toEqual(['if', 'for', 'el']);
    expect(div.children[0].branches).toHaveLength(2);
    expect(div.children[0].else[0].tag).toBe('hk-badge');
    expect(div.children[1]).toMatchObject({ t: 'for', as: 'v', limit: 5 });
    expect(div.children[2]).toMatchObject({ t: 'el', tag: 'img', children: [] });
  });

  it('extracts the schema and parses render directives', () => {
    const r = parseTemplate(`{% render 'price', product: p %}<hk-schema>{"name":"Hero","settings":{}}</hk-schema>`, 'f');
    expect(r.schema).toEqual({ name: 'Hero', settings: {} });
    expect(r.nodes[0]).toMatchObject({ t: 'render', snippet: 'price', args: { product: { k: 'path', p: ['p'] } } });
  });

  it('reports structural errors with locations', () => {
    const codes = (s: string) => parseTemplate(s, 'f').diagnostics.map((d) => `${d.code}@${d.line}:${d.col}`);
    expect(codes('{% if a %}x')).toEqual(['SN1101@1:1']);
    expect(codes('x{% endfor %}')).toEqual(['SN1102@1:2']);
    expect(codes('<div><span></div>')).toEqual(['SN1103@1:12']);
    expect(codes('</p>')).toEqual(['SN1104@1:1']);
    expect(codes('{{ a + 1 }}')).toEqual(['SN1105@1:1']);
    expect(codes('{% while x %}')).toEqual(['SN1106@1:1']);
    expect(codes('<hk-schema>{bad</hk-schema>')).toEqual(['SN1107@1:1']);
  });
  it('bounds nesting with SN1108 instead of building an unbounded tree (I6)', () => {
    const deep = (n: number, open: string, close: string) => open.repeat(n) + '{{ x }}' + close.repeat(n);
    for (const src of [deep(70, '<b>', '</b>'), deep(70, '{% if a %}', '{% endif %}'), deep(70, '{% for x in y %}', '{% endfor %}'), deep(20000, '<b>', '</b>')]) {
      const r = parseTemplate(src, 'f');
      expect(r.diagnostics.map((d) => d.code)).toEqual(['SN1108']);
      let depth = 0; let n: any = r.nodes[0];
      while (n) { depth++; n = (n.children ?? n.body ?? n.branches?.[0]?.body)?.[0]; }
      expect(depth).toBeLessThanOrEqual(65);
    }
    expect(parseTemplate(deep(64, '<b>', '</b>'), 'f').diagnostics).toEqual([]);
    const after = parseTemplate(deep(70, '<b>', '</b>') + '<p>tail</p><hk-schema>{"a":1}</hk-schema>', 'f');
    expect(after.nodes.at(-1)).toMatchObject({ t: 'el', tag: 'p' });
    expect(after.schema).toEqual({ a: 1 });
  });
  it('closes tags in linear time', () => {
    const t0 = Date.now();
    parseTemplate('<b>'.repeat(40000) + '</b>'.repeat(40000), 'f');
    parseTemplate('</a>'.repeat(70000), 'f');
    expect(Date.now() - t0).toBeLessThan(2000);
  });
  it('splits render arguments outside quotes and parentheses (M6)', () => {
    const r = parseTemplate(`{% render 'price', label: 'a, b', p: collection('x,y').products, n: 2 %}`, 'f');
    expect(r.diagnostics).toEqual([]);
    expect(r.nodes[0]).toMatchObject({ t: 'render', snippet: 'price', args: {
      label: { k: 'lit', v: 'a, b' }, p: { k: 'path', p: ['products'], from: { k: 'lookup', fn: 'collection', args: [{ k: 'lit', v: 'x,y' }] } }, n: { k: 'lit', v: 2 },
    } });
  });
  it('rejects a second else and elsif after else (M6)', () => {
    const codes = (s: string) => parseTemplate(s, 'f').diagnostics.map((d) => d.code);
    expect(codes('{% if a %}1{% else %}2{% else %}3{% endif %}')).toEqual(['SN1109']);
    expect(codes('{% if a %}1{% else %}2{% elsif b %}3{% endif %}')).toEqual(['SN1109']);
    expect(codes('{% if a %}1{% elsif b %}2{% else %}3{% endif %}')).toEqual([]);
    expect(codes('{% if a %}{% if b %}{% else %}{% endif %}{% else %}{% endif %}')).toEqual([]);
  });
  it('for limit from a setting', () => {
    expect(parseTemplate("{% for p in xs limit: section.settings.count %}{% endfor %}", 'f').nodes[0]).toMatchObject({ t: 'for', limitExpr: { k: 'path', p: ['section', 'settings', 'count'] } });
    expect(parseTemplate("{% for p in xs limit: product.x %}{% endfor %}", 'f').diagnostics[0]!.code).toBe('SN1105');
  });
});
