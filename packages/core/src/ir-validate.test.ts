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

describe('element allow-list and raw html (C1, C3)', () => {
  const codes = (ir: unknown) => validateIR(ir, tags).map((d) => d.code);
  const el = (tag: string, attrs: unknown[] = []) => [{ k: 'el', tag, attrs, children: [] }];
  const a = (name: string, sink: string, parts: unknown[] = [{ k: 'path', p: ['x'] }]) => ({ name, sink, parts });

  it('rejects elements outside the allow-list, including SVG animation and foreignObject', () => {
    for (const tag of ['animate', 'set', 'animatemotion', 'animatetransform', 'foreignobject', 'template', 'noscript', 'my-widget', 'math', 'input'])
      expect(codes(el(tag)), tag).toEqual(['SN9011']);
    for (const tag of ['svg', 'g', 'path', 'use', 'lineargradient', 'image', 'section', 'table', 'video'])
      expect(codes(el(tag)), tag).toEqual([]);
  });
  it('treats every *:href as a URL attribute and refuses attributename', () => {
    expect(codes(el('use', [a('xlink:href', 'text')]))).toEqual(['SN9013']);
    expect(codes(el('use', [a('xlink:href', 'url')]))).toEqual([]);
    expect(codes(el('a', [a('foo:href', 'token')]))).toEqual(['SN9013']);
    expect(codes(el('a', [a('attributename', 'text', ['href'])]))).toEqual(['SN9012']);
  });
  it('rejects raw html that smuggles markup the compiler never emits', () => {
    const bad = [
      '<script>alert(1)</script>', '< script>x', '</ script>', '<SCRIPT>', '<svg><animate attributename="href" values="x"></animate></svg>',
      '<img src="/a.png" onerror="alert(1)">', '<svg/onload=alert(1)>', '<img src="x"onerror=alert(1)>',
      '<a href="javascript:alert(1)">x</a>', '<a href="java\nscript:alert(1)">x</a>', '<a href="&#106;avascript:alert(1)">x</a>',
      '<a href="javascript&colon;alert(1)">x</a>', '<a xlink:href="/ok" href="vbscript:x">x</a>', '<svg><a xlink:href="http://evil">x</a></svg>',
      '<a href="data:text/html,x">x</a>', '<iframe>', '<img src="x', '<img src=x ', 'text <', '<math><mi>',
      '<div title="x" attributename="y">', '<a srcdoc="x">', '<use xml:base="https://e/">',
    ];
    for (const s of bad) expect(codes([{ k: 'html', s }]), s).toEqual(['SN9014']);
  });
  it('accepts what the compiler emits', () => {
    const good = [
      '<section class="hero"><h1>كروت &amp; ألعاب</h1><br></section>', '<a href="/products?a=1&amp;b=2">x</a>',
      '<a href="javascript&amp;colon;alert(1)">x</a>', '<a href="#">x</a>', '<a href="https://x.com/a">x</a>',
      '<svg viewBox="0 0 10 10"><use xlink:href="#icon"></use><lineargradient id="g"><stop offset="0"></stop></lineargradient></svg>',
      '<img src="/a.png" alt="&quot;x&quot;" loading="lazy">', 'a &lt; b and c &gt; d', '<p data-online="1">x</p>', '<a href>x</a>',
    ];
    for (const s of good) expect(codes([{ k: 'html', s }]), s).toEqual([]);
  });
  it('rejects html that desynchronises a tokenizer from the browser (R-C3 probes)', () => {
    const payload = '<a href=javascript&colon;alert(1)>x</a>';
    const bad = [
      '<!<a title=">' + payload + '">', '<!-- <a title=" -->' + payload + '">', '<?<a title=">' + payload + '">',
      '</ <a title=">' + payload + '">', '<svg><![CDATA[<a title="]]><a href=javascript&colon;alert(1)><text>x</text></a>"]]></svg>',
      '<!-- <a title=" --><img src=x onerror=alert(1)>">', '<!-- <a title=" --><img src=x>">',
      '<title><a title="</title><a href=javascript&colon;alert(1)>x</a>">', '<a href="&#106avascript&#58alert(1)">x</a>',
      '<a href="java&#9;script:alert(1)">x</a>', '<a href="&#x80;">x</a>', '<img srcset="javascript:alert(1)">', '<img srcset="/a.png 1x, http://e/b.png 2x">',
      '<a href="/x" title="a>b">x</a>', "<a title='x'>x</a>", '<a href=/x>x</a>', '<br/>', '<p>a > b</p>', '<!---->', '<title><b>x</b></title>',
      '<div style="background:url(javascript:alert(1))">x</div>', '<div data-x="&#106;avascript:alert(1)">x</div>',
    ];
    for (const s of bad) expect(codes([{ k: 'html', s }]), s).toEqual(['SN9014']);
  });
  it('does not pattern-match prose (R-C3 false positives)', () => {
    for (const s of ['<p>Buy one = get one free</p>', '<p>add-ons = extras</p>', '<img alt="price on = 5" src="/a.png">', '<p>Use data:text/html carefully</p>',
      '<p>attributeName</p>', '<p>learn javascript: today</p>', '<p>onclick=alert(1)</p>', '<title>Shop &amp; more</title>', '<p title="a`b">x</p>',
      '<img srcset="/a.png 1x, https://cdn.x/b.png 2x" src="/a.png">'])
      expect(codes([{ k: 'html', s }]), s).toEqual([]);
  });
  it('accepts a loop limit read from a setting path, and nothing else that is not a number', () => {
    const loop = (limit: unknown) => [{ k: 'loop', as: 'p', src: { k: 'path', p: ['xs'] }, limit, body: [] }];
    for (const ok of [{ k: 'path', p: ['section', 'settings', 'count'] }, { k: 'path', p: ['block', 'settings', 'n'] }, { k: 'path', p: ['settings', 'n'] }])
      expect(validateIR(loop(ok), tags), JSON.stringify(ok)).toEqual([]);
    for (const bad of [{ k: 'path', p: ['product', 'count'] }, { k: 'path', p: [] }, { k: 'path', p: 'section' }, { k: 'path', p: ['section', { x: 1 }] },
      { k: 'path', p: ['settings', 'n'], from: { k: 'lookup', fn: 'collections', args: [] } }, { k: 'lit', v: 3 }, { k: 'lookup', fn: 'settings', args: [] }, '12', null, 0, 251, 2.5])
      expect(validateIR(loop(bad), tags).map((d) => d.code), JSON.stringify(bad)).toContain('SN9004');
  });
  it('knows the collections lookup', () => {
    expect(validateIR([{ k: 'text', e: { k: 'path', p: ['size'], from: { k: 'lookup', fn: 'collections', args: [] } } }], tags)).toEqual([]);
  });
  it('rejects collection/product/menu lookups whose argument is not one handle or setting path (SN9017)', () => {
    const look = (fn: string, args: unknown) => validateIR([{ k: 'text', e: { k: 'lookup', fn, args } }], tags).map((d) => d.code);
    for (const fn of ['collection', 'product', 'menu']) {
      expect(look(fn, [{ k: 'lit', v: 'main' }]), fn).toEqual([]);
      expect(look(fn, [{ k: 'path', p: ['section', 'settings', 'menu'] }]), fn).toEqual([]);
      expect(look(fn, [{ k: 'path', p: ['settings', 'x'] }]), fn).toEqual([]);
      expect(look(fn, [{ k: 'path', p: ['block', 'settings', 'x'] }]), fn).toEqual([]);
      for (const bad of [[], [{ k: 'lit', v: 'a' }, { k: 'lit', v: 'b' }], [{ k: 'lit', v: 3 }], [{ k: 'path', p: ['product', 'title'] }],
        [{ k: 'path', p: ['section', 'settings', 'a', 'b'] }], [{ k: 'path', p: ['x'], from: { k: 'lit', v: 'a' } }],
        [{ k: 'lookup', fn: 't', args: [{ k: 'lit', v: 'k' }] }], [{ k: 'filter', name: 'upcase', input: { k: 'lit', v: 'a' }, args: [] }], 'x'])
        expect(look(fn, bad), `${fn} ${JSON.stringify(bad)}`).toContain('SN9017');
    }
    expect(look('t', [{ k: 'lit', v: 'a' }, { k: 'lit', v: 'b' }])).toEqual([]);
  });
});
