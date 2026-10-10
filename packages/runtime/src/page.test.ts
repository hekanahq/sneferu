import { describe, it, expect } from 'vitest';
import { TagRegistry, LIMITS, type HkTag, type IRNode } from '@hekana/sneferu-core';
import { renderPage, type ArtifactLike, type PageNode } from './page';
import type { RenderContext } from './context';

const ctx: RenderContext = { locale: 'ar', dir: 'rtl', currency: 'EGP', store: { name: 'متجر' }, settings: {}, data: {}, collections: {}, products: {},
  translations: {}, fallbackTranslations: {}, assetUrl: (p) => p, imageUrl: (r) => String(r) };
const artifact: ArtifactLike = {
  manifest: { id: 'esports' },
  layout: [{ k: 'html', s: '<main>' }, { k: 'slot', name: 'content' }, { k: 'html', s: '</main>' }],
  templates: { index: [{ k: 'slot', name: 'sections' }] },
  templateSections: { index: [{ type: 'hero', settings: { title: 'أهلًا' } }] },
  sections: { hero: { ir: [{ k: 'html', s: '<h1>' }, { k: 'text', e: { k: 'path', p: ['section', 'settings', 'title'] } }, { k: 'html', s: '</h1>' }],
    schema: { name: { ar: 'ب', en: 'H' }, version: 1, settings: { title: { type: 'text', label: { ar: 'ع', en: 'T' }, default: 'Hi', maxLength: 40 } } } } },
  blocks: {}, snippets: {},
};

describe('renderPage', () => {
  it('renders template default sections inside the layout with theme scope', () => {
    const r = renderPage(artifact, { template: 'index', ctx, registry: new TagRegistry() });
    expect(r.diagnostics).toEqual([]);
    expect(r.html).toBe('<div data-hk-theme="esports" dir="rtl" lang="ar"><main><div data-hk-section="default-0"><h1>أهلًا</h1></div></main></div>');
  });
  it('renders merchant sections with coerced settings and skips hidden ones', () => {
    const r = renderPage(artifact, { template: 'index', ctx, registry: new TagRegistry(), sections: [
      { id: 's1', type: 'hero', props: { title: 'x'.repeat(60) } },
      { id: 's2', type: 'hero', hidden: true },
      { id: 's3', type: 'ghost' },
    ] });
    expect(r.html).toContain(`<h1>${'x'.repeat(40)}</h1>`);
    expect(r.html).toContain('<!-- section s3 unavailable -->');
    expect(r.html.match(/<h1>/g)).toHaveLength(1);
  });
  it('refuses to render tampered IR', () => {
    const bad = { ...artifact, layout: [{ k: 'eval', s: 'x' }] } as unknown as ArtifactLike;
    const r = renderPage(bad, { template: 'index', ctx, registry: new TagRegistry() });
    expect(r.html).toBe('');
    expect(r.diagnostics[0]!.code).toBe('SN9001');
  });
  it('renders blocks through hk-block', () => {
    const withBlocks: ArtifactLike = {
      ...artifact,
      sections: { hero: { ir: [{ k: 'loop', as: 'block', src: { k: 'path', p: ['section', 'blocks'] }, limit: 20,
        body: [{ k: 'comp', tag: 'hk-block', props: { of: { k: 'expr', e: { k: 'path', p: ['block'] } } }, children: [] }] }],
        schema: { name: { ar: 'ب', en: 'H' }, version: 1, settings: {} } } },
      blocks: { chip: { ir: [{ k: 'text', e: { k: 'path', p: ['block', 'settings', 'label'] } }],
        schema: { settings: { label: { type: 'text', label: { ar: 'ع', en: 'L' }, default: 'جديد', maxLength: 40 } } } } },
    };
    const r = renderPage(withBlocks, { template: 'index', ctx, registry: new TagRegistry(), sections: [
      { id: 's1', type: 'hero', children: [{ id: 'b1', type: 'chip' }] },
    ] });
    expect(r.diagnostics).toEqual([]);
    expect(r.html).toContain('data-hk-block="b1"');
    expect(r.html).toContain('جديد');
  });

  it('degrades only the runaway section, once, and stays balanced', () => {
    const runaway: ArtifactLike = { ...artifact, sections: { ...artifact.sections, loopy: { ir: [{ k: 'html', s: '<p>' },
      { k: 'loop', as: 'x', src: { k: 'path', p: ['xs'] }, limit: 250, body: [{ k: 'html', s: '<i></i>' }] }, { k: 'html', s: '</p>' }],
      schema: { settings: {} } } } };
    const r = renderPage(runaway, { template: 'index', ctx, registry: new TagRegistry(), scope: { xs: Array(100).fill(0) }, limits: { ...LIMITS, loopIterations: 80 }, sections: [
      { id: 's1', type: 'hero' }, { id: 's2', type: 'loopy' }, { id: 's3', type: 'hero' },
    ] });
    expect(r.html).toContain('<h1>Hi</h1>');
    expect(r.html).toContain('<!-- section s2 unavailable -->');
    expect(r.diagnostics.filter((d) => d.code === 'SN4001')).toHaveLength(1);
    expect(r.html.startsWith('<div data-hk-theme="esports" dir="rtl" lang="ar"><main>')).toBe(true);
    expect(r.html.endsWith('</main></div>')).toBe(true);
  });
  it('counts nested output once', () => {
    let nodes: IRNode[] = [{ k: 'html', s: 'x'.repeat(10) }];
    for (let i = 0; i < 6; i++) nodes = [{ k: 'el', tag: 'div', attrs: [], children: nodes }];
    const art: ArtifactLike = { ...artifact, sections: { deep: { ir: nodes, schema: { settings: {} } } } };
    const full = renderPage(art, { template: 'index', ctx, registry: new TagRegistry(), sections: [{ id: 'a', type: 'deep' }] });
    const need = full.html.length;
    const tight = renderPage(art, { template: 'index', ctx, registry: new TagRegistry(), limits: { ...LIMITS, outputChars: need }, sections: [{ id: 'a', type: 'deep' }] });
    expect(tight.diagnostics).toEqual([]);
    expect(tight.html).toBe(full.html);
  });
  it('treats prototype keys as unknown sections', () => {
    for (const type of ['constructor', '__proto__', 'toString']) {
      const r = renderPage(artifact, { template: 'index', ctx, registry: new TagRegistry(), sections: [{ id: 's', type }] });
      expect(r.html).toContain('<!-- section s unavailable -->');
    }
  });
  it('stops self-recursive blocks without throwing', () => {
    const rec: ArtifactLike = { ...artifact,
      sections: { hero: { ir: [{ k: 'loop', as: 'block', src: { k: 'path', p: ['section', 'blocks'] }, limit: 20,
        body: [{ k: 'comp', tag: 'hk-block', props: { of: { k: 'expr', e: { k: 'path', p: ['block'] } } }, children: [] }] }], schema: { settings: {} } } },
      blocks: { chip: { ir: [{ k: 'loop', as: 'block', src: { k: 'path', p: ['section', 'blocks'] }, limit: 20,
        body: [{ k: 'comp', tag: 'hk-block', props: { of: { k: 'expr', e: { k: 'path', p: ['block'] } } }, children: [] }] }], schema: { settings: {} } } } };
    const r = renderPage(rec, { template: 'index', ctx, registry: new TagRegistry(), sections: [{ id: 's1', type: 'hero', children: [{ id: 'b1', type: 'chip' }] }] });
    expect(r.diagnostics.some((d) => d.code === 'SN4002' || d.code === 'SN4003')).toBe(true);
  });
  it('charges failed sections to the page budget and reports once', () => {
    const runaway: ArtifactLike = { ...artifact, sections: { ...artifact.sections, loopy: { ir: [
      { k: 'loop', as: 'x', src: { k: 'path', p: ['xs'] }, limit: 250, body: [{ k: 'html', s: '<i></i>' }] }], schema: { settings: {} } } } };
    const r = renderPage(runaway, { template: 'index', ctx, registry: new TagRegistry(), scope: { xs: Array(100).fill(0) }, limits: { ...LIMITS, loopIterations: 120 },
      sections: [1, 2, 3, 4, 5].map((n) => ({ id: `s${n}`, type: 'loopy' })) });
    expect(r.html.match(/<i><\/i>/g)?.length ?? 0).toBeLessThanOrEqual(120);
    expect(r.html.match(/unavailable/g)).toHaveLength(4);
    expect(r.diagnostics.filter((d) => d.code === 'SN4001')).toHaveLength(1);
  });
  it('refuses raw html that hides markup the compiler never emits (C3)', () => {
    for (const s of ['<script>alert(1)</script>', '<img src=x onerror=alert(1)>', '<svg><a xlink:href="javascript:alert(1)">x</a></svg>']) {
      const bad = { ...artifact, sections: { hero: { ir: [{ k: 'html', s }], schema: { settings: {} } } } } as unknown as ArtifactLike;
      const r = renderPage(bad, { template: 'index', ctx, registry: new TagRegistry() });
      expect(r.html).toBe('');
      expect(r.diagnostics.map((d) => d.code)).toEqual(['SN9014']);
    }
  });
  it('reports SN4002 at most once per page, across sections (C2)', () => {
    const fan = { k: 'render' as const, snippet: 'a', args: {} };
    const art: ArtifactLike = { ...artifact, snippets: { a: [fan, fan, fan, fan, fan] }, sections: { s: { ir: [fan], schema: { settings: {} } } } };
    const r = renderPage(art, { template: 'index', ctx, registry: new TagRegistry(), sections: [{ id: 'x', type: 's' }, { id: 'y', type: 's' }, { id: 'z', type: 's' }] });
    expect(r.diagnostics.filter((d) => d.code === 'SN4002').length).toBeLessThanOrEqual(1);
    expect(r.diagnostics.length).toBeLessThanOrEqual(2);
  });
  it('never throws on non-string translations, and t lookups use own properties only (I4)', () => {
    const bad = { hi: { x: 1 }, n: 5, arr: ['a'] } as unknown as Record<string, string>;
    const ir: IRNode[] = [{ k: 't', key: 'hi' }, { k: 't', key: 'n' }, { k: 'text', e: { k: 'lookup', fn: 't', args: [{ k: 'lit', v: 'arr' }] } },
      { k: 'text', e: { k: 'filter', name: 't', input: { k: 'lit', v: '__proto__' }, args: [] } },
      { k: 'text', e: { k: 'filter', name: 't', input: { k: 'lit', v: 'toString' }, args: [] } },
      { k: 'text', e: { k: 'filter', name: 't', input: { k: 'lit', v: 'n' }, args: [] } }];
    const art: ArtifactLike = { ...artifact, sections: { hero: { ir, schema: { settings: {} } } } };
    const r = renderPage(art, { template: 'index', ctx: { ...ctx, translations: bad, fallbackTranslations: bad }, registry: new TagRegistry() });
    expect(r.diagnostics).toEqual([]);
    expect(r.html).toContain('<div data-hk-section="default-0">hinarr__proto__toStringn</div>');
  });
  it('returns SN9015 for malformed stored artifacts instead of throwing (I5)', () => {
    const sec = (v: unknown) => ({ ...artifact, sections: { hero: v } }) as unknown as ArtifactLike;
    const shapes: unknown[] = [
      sec({ ir: [] }), sec({ ir: [], schema: { settings: null } }), sec({ ir: [], schema: { settings: { a: null } } }), sec(null), sec({ schema: { settings: {} } }),
      { ...artifact, manifest: null }, { ...artifact, manifest: { id: 'x', settings: { a: 5 } } }, { ...artifact, sections: null }, { ...artifact, blocks: [] },
      { ...artifact, templates: { index: 'x' } }, { ...artifact, templateSections: { index: [null] } }, { ...artifact, snippets: { a: {} } }, null, 'x', [],
    ];
    for (const a of shapes) {
      let r: ReturnType<typeof renderPage> | undefined;
      expect(() => { r = renderPage(a as ArtifactLike, { template: 'index', ctx, registry: new TagRegistry() }); }).not.toThrow();
      expect(r!.html).toBe('');
      expect(r!.diagnostics.map((d) => d.code), JSON.stringify(a)?.slice(0, 80)).toContain('SN9015');
    }
  });
  it('turns unexpected exceptions into SN9015 and tolerates malformed page nodes (I5)', () => {
    const throwing = { ...ctx, get store(): Record<string, unknown> { throw new Error('boom'); } };
    const r = renderPage(artifact, { template: 'index', ctx: throwing, registry: new TagRegistry() });
    expect(r.diagnostics.map((d) => d.code)).toEqual(['SN9015']);
    const nodes = [null, 5, { id: 'a' }, { id: 'b', type: 'hero', children: 'x', props: 7 }, { id: 'c', type: 'hero', children: [null, { id: 'k' }] }] as unknown as PageNode[];
    const ok = renderPage(artifact, { template: 'index', ctx, registry: new TagRegistry(), sections: nodes });
    expect(ok.html.match(/<h1>Hi<\/h1>/g)).toHaveLength(2);
  });
  it('derives dir from a validated locale and escapes both (I8)', () => {
    const at = (c: Partial<RenderContext>, a: ArtifactLike = artifact) => renderPage(a, { template: 'index', ctx: { ...ctx, ...c } as RenderContext, registry: new TagRegistry() }).html;
    expect(at({ dir: 'rtl" onmouseover="alert(1)' as never })).toMatch(/^<div data-hk-theme="esports" dir="rtl" lang="ar">/);
    expect(at({ locale: 'en', dir: 'rtl' })).toMatch(/^<div data-hk-theme="esports" dir="ltr" lang="en">/);
    expect(at({ locale: 'fr' as never, dir: 'rtl' })).toMatch(/^<div data-hk-theme="esports" dir="ltr" lang="fr">/);
    expect(at({ locale: 'en" x="1' as never })).toMatch(/^<div data-hk-theme="esports" dir="rtl" lang="ar">/);
    expect(at({ locale: 'EN' as never }, { ...artifact, manifest: { id: 'esports', defaultLocale: 'en' } as never })).toMatch(/^<div data-hk-theme="esports" dir="ltr" lang="en">/);
  });
  it('scopes component ids to their section so one section re-renders identically (I9b)', () => {
    const box: HkTag = { name: 'hk-box', version: 1, category: 'layout', props: {}, allowedParents: '*', allowedChildren: '*', responsive: [], bindable: '*',
      editor: { label: { ar: 'ص', en: 'B' }, group: 'layout', insertable: true }, render: (_p, c) => { c.css(`.sn-${c.id}{x:1}`); return `<b class="sn-${c.id}"></b>`; } };
    const registry = new TagRegistry().register(box);
    const art: ArtifactLike = { ...artifact, layout: [{ k: 'comp', tag: 'hk-box', props: {}, children: [] }, { k: 'slot', name: 'content' }],
      sections: { s: { ir: [{ k: 'comp', tag: 'hk-box', props: {}, children: [] }, { k: 'comp', tag: 'hk-box', props: {}, children: [] }], schema: { settings: {} } } } };
    const all = renderPage(art, { template: 'index', ctx, registry, sections: [{ id: 'a', type: 's' }, { id: 'b 2"x', type: 's' }] });
    expect(all.html).toContain('<div data-hk-section="a"><b class="sn-s-a-c1"></b><b class="sn-s-a-c2"></b></div>');
    expect(all.html).toContain('<b class="sn-s-b-2-x-c1"></b><b class="sn-s-b-2-x-c2"></b>');
    expect(all.html).toContain('<b class="sn-c1"></b>');
    const one = renderPage(art, { template: 'index', ctx, registry, sections: [{ id: 'b 2"x', type: 's' }] });
    expect(one.css).toContain('.sn-s-b-2-x-c1{x:1}');
    expect(one.html).toContain('<b class="sn-s-b-2-x-c1"></b><b class="sn-s-b-2-x-c2"></b>');
  });
  it('applies theme-level settings defaults and coercion to ctx.settings (I9c)', () => {
    const art: ArtifactLike = { ...artifact,
      manifest: { id: 'esports', settings: { accent: { type: 'color', label: { ar: 'ل', en: 'A' }, default: '#7C3AED' }, cols: { type: 'range', label: { ar: 'ع', en: 'C' }, min: 1, max: 4, default: 3 } } },
      sections: { s: { ir: [{ k: 'text', e: { k: 'lookup', fn: 'settings', args: [{ k: 'lit', v: 'accent' }] } }, { k: 'html', s: '|' }, { k: 'text', e: { k: 'path', p: ['settings', 'cols'] } }], schema: { settings: {} } } } };
    const at = (settings: Record<string, unknown>) => renderPage(art, { template: 'index', ctx: { ...ctx, settings }, registry: new TagRegistry(), sections: [{ id: 'a', type: 's' }] }).html;
    expect(at({})).toContain('>#7C3AED|3<');
    expect(at({ accent: 'red;}body{x', cols: 99 })).toContain('>#7C3AED|4<');
    expect(at({ accent: '#000000', cols: '2' })).toContain('>#000000|2<');
  });
  it('charges every node kind, so text fan-out stops at the budget with SN4001 (R-C2 probe)', () => {
    const r40k: IRNode[] = Array.from({ length: 40000 }, () => ({ k: 'text' as const, e: { k: 'path' as const, p: ['x'] } }));
    const fan: IRNode[] = Array.from({ length: 15000 }, () => ({ k: 'render' as const, snippet: 'a', args: {} }));
    const art: ArtifactLike = { ...artifact, snippets: { a: r40k, b: fan }, sections: { s: { ir: [{ k: 'render', snippet: 'b', args: {} }], schema: { settings: {} } } } };
    const t0 = Date.now();
    const r = renderPage(art, { template: 'index', ctx, registry: new TagRegistry(), sections: [{ id: 'x', type: 's' }] });
    expect(Date.now() - t0).toBeLessThan(1000);
    expect(r.diagnostics.map((d) => d.code)).toEqual(['SN4001']);
  });
  it('bounds hk-block self-recursion fan-out (R-C2 probe)', () => {
    const blk: IRNode = { k: 'comp', tag: 'hk-block', props: { of: { k: 'expr', e: { k: 'path', p: ['block'] } } }, children: [] };
    const art: ArtifactLike = { ...artifact,
      sections: { s: { ir: [{ k: 'loop', as: 'block', src: { k: 'path', p: ['section', 'blocks'] }, limit: 50, body: [blk] }], schema: { settings: {} } } },
      blocks: { r: { ir: Array.from({ length: 6 }, () => blk), schema: { settings: {} } } } };
    const t0 = Date.now();
    const r = renderPage(art, { template: 'index', ctx, registry: new TagRegistry(), sections: [{ id: 'x', type: 's', children: [{ id: 'k', type: 'r' }] }] });
    expect(Date.now() - t0).toBeLessThan(1000);
    expect(r.diagnostics.length).toBeLessThanOrEqual(2);
    expect(r.diagnostics.some((d) => d.code === 'SN4001' || d.code === 'SN4002')).toBe(true);
  });
});
