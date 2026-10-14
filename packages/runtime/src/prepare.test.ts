import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as core from '@hekana/sneferu-core';

vi.mock('@hekana/sneferu-core', async (orig) => {
  const real = await orig<typeof import('@hekana/sneferu-core')>();
  return { ...real, validateIR: vi.fn(real.validateIR) };
});

const { prepareArtifact, renderPage, themeTokenCss } = await import('./index');
const { TagRegistry } = core;

const ctx = { locale: 'ar' as const, dir: 'rtl' as const, currency: 'EGP', store: {}, settings: {}, data: {}, collections: {}, products: {},
  translations: {}, fallbackTranslations: {}, assetUrl: (p: string) => p, imageUrl: (r: unknown) => String(r) };
const raw = () => ({
  manifest: { id: 'xyz' }, layout: [{ k: 'slot', name: 'content' }], templates: { index: [{ k: 'slot', name: 'sections' }] },
  templateSections: { index: [{ type: 's', settings: {} }] }, sections: { s: { ir: [{ k: 'html', s: '<p>hi</p>' }], schema: { settings: {} } } },
  blocks: {}, snippets: {},
});

describe('prepareArtifact (I9d)', () => {
  it('validates nested default blocks as deep as the renderer reads them (two levels under a section)', () => {
    const withBlocks = (blocks: unknown) => ({ ...raw(), templateSections: { index: [{ type: 's', settings: {}, blocks }] } });
    const r = prepareArtifact(withBlocks([{ type: 'x', blocks: [null] }]), new TagRegistry());
    expect(r).toMatchObject({ ok: false, diagnostics: [{ code: 'SN9015' }] });
    expect(JSON.stringify(r)).toContain('templateSections.index[0].blocks[0].blocks');
    expect(prepareArtifact(withBlocks([{ type: 'x', blocks: [{ type: 5 }] }]), new TagRegistry())).toMatchObject({ ok: false });
    // a third block level is never read, so it is not validated either
    expect(prepareArtifact(withBlocks([{ type: 'x', blocks: [{ type: 'y', blocks: [null] }] }]), new TagRegistry())).toMatchObject({ ok: true });
  });
  it('renderPage refuses a malformed nested default block with a shape error, never a TypeError', () => {
    const a = { ...raw(), templateSections: { index: [{ type: 's', settings: {}, blocks: [null, { type: 'x', blocks: [null, 7, { type: 'y' }] }] }] } };
    const r = renderPage(a as never, { template: 'index', ctx, registry: new TagRegistry() });
    expect(r.html).toBe('');
    const msg = r.diagnostics.map((d) => d.message).join('|');
    expect(msg).toContain('templateSections.index[0].blocks');
    expect(msg).not.toContain('Cannot read properties');
  });
  beforeEach(() => vi.mocked(core.validateIR).mockClear());

  it('validates once; renderPage trusts the prepared copy for the same registry', () => {
    const registry = new TagRegistry();
    const p = prepareArtifact(raw(), registry);
    expect(p.ok).toBe(true);
    expect(Object.isFrozen(p.artifact!.sections)).toBe(true);
    const calls = vi.mocked(core.validateIR).mock.calls.length;
    expect(calls).toBeGreaterThan(0);
    const r = renderPage(p.artifact!, { template: 'index', ctx, registry });
    expect(r.html).toContain('<p>hi</p>');
    expect(vi.mocked(core.validateIR).mock.calls.length).toBe(calls);
    renderPage(p.artifact!, { template: 'index', ctx, registry: new TagRegistry() });
    expect(vi.mocked(core.validateIR).mock.calls.length).toBeGreaterThan(calls);
  });
  it('still validates raw artifacts and reports bad ones', () => {
    renderPage(raw() as never, { template: 'index', ctx, registry: new TagRegistry() });
    expect(vi.mocked(core.validateIR)).toHaveBeenCalled();
    const bad = raw(); bad.sections.s.ir = [{ k: 'html', s: '<script>x</script>' }];
    expect(prepareArtifact(bad, new TagRegistry())).toMatchObject({ ok: false, diagnostics: [{ code: 'SN9014' }] });
    for (const id of ['a\\', 'a\n}x{', 'ab', 'Abc', '<b>', 7]) {
      const a = raw(); (a.manifest as Record<string, unknown>).id = id;
      expect(prepareArtifact(a, new TagRegistry()), String(id)).toMatchObject({ ok: false, diagnostics: [{ code: 'SN9015' }] });
    }
    expect(prepareArtifact(null, new TagRegistry())).toMatchObject({ ok: false, diagnostics: [{ code: 'SN9015' }] });
    const cyclic: Record<string, unknown> = raw(); (cyclic.manifest as Record<string, unknown>).self = cyclic;
    expect(prepareArtifact(cyclic, new TagRegistry())).toMatchObject({ ok: false, diagnostics: [{ code: 'SN9015' }] });
  });
});

describe('themeTokenCss (I9a)', () => {
  it('emits scoped variables and skips unsafe or malformed tokens', () => {
    const css = themeTokenCss({ id: 'a"b', tokens: { colors: { primary: '#111111', Bad: '#000', accent: 'red;}x{', text: 5 }, layout: { contentWidth: '1200px' } } });
    expect(css.startsWith('[data-hk-theme="a&quot;b"]{--hk-color-primary:#111111;--hk-content-width:1200px;')).toBe(true);
    expect(css).not.toContain('Bad'); expect(css).not.toContain('red;');
    expect(() => themeTokenCss({ id: 'x', tokens: null })).not.toThrow();
    expect(themeTokenCss({ id: 'x' })).toContain('--color-primary:var(--hk-color-primary)');
  });
});
