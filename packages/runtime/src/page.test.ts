import { describe, it, expect } from 'vitest';
import { TagRegistry, LIMITS, type IRNode } from '@hekana/sneferu-core';
import { renderPage, type ArtifactLike } from './page';
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
});
