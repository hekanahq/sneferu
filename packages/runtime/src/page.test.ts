import { describe, it, expect } from 'vitest';
import { TagRegistry } from '@hekana/sneferu-core';
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
});
