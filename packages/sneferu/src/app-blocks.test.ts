import { describe, it, expect } from 'vitest';
import { appBlockSectionType, findAppBlock, sectionAllowedOn, APP_BLOCKS, TagRegistry } from '@hekana/sneferu-core';
import { compileTheme, withDefaults, type Artifact } from '@hekana/sneferu-compiler';
import { BASE_TAGS, createDefaultRegistry } from '@hekana/sneferu-components';
import { renderPage, type RenderContext } from '@hekana/sneferu-runtime';
import { DEFAULT_THEME_FILES } from '@hekana/sneferu-templates-default';

const registry = createDefaultRegistry();
const own = (): Artifact => compileTheme(DEFAULT_THEME_FILES, registry, { defaults: false }).artifact!;
const sub = appBlockSectionType(findAppBlock('customer_subscriptions', 'subscribe')!);

describe('app block sections in every theme', () => {
  it('a stored artifact gets one editor section per registry entry, without a re-publish', () => {
    const before = own();
    expect(before.sections[sub]).toBeUndefined();
    const after = withDefaults(before, registry);
    for (const d of APP_BLOCKS) expect(after.sections[appBlockSectionType(d)]).toBeDefined();
    expect(withDefaults(after, registry).hash).toBe(after.hash);
  });
  it('the product-page section is offered on product pages and alternates only', () => {
    const s = withDefaults(own(), registry).sections[sub]!;
    expect(s.schema.name.en).toBe('Product subscription');
    expect(sectionAllowedOn(s.schema, 'product')).toBe(true);
    expect(sectionAllowedOn(s.schema, 'product.codes')).toBe(true);
    expect(sectionAllowedOn(s.schema, 'cart')).toBe(false);
    expect(sectionAllowedOn(s.schema, 'header')).toBe(false);
    expect(Object.keys(s.schema.settings)).toEqual(['heading', 'padding_y']);
  });
  it('a theme that defines a section of the same name keeps its own', () => {
    const mine = own();
    const marker = { ir: [{ k: 'html' as const, s: '<i>mine</i>' }], schema: { name: { ar: 'م', en: 'M' }, version: 1, settings: {} } };
    const out = withDefaults({ ...mine, sections: { ...mine.sections, [sub]: marker } }, registry);
    expect(out.sections[sub]).toBe(marker);
  });
  it('an older registry without the tag changes nothing', () => {
    const bare = new TagRegistry();
    for (const t of BASE_TAGS) if (t.name !== 'hk-app-block') bare.register(t);
    expect(Object.keys(withDefaults(own(), bare).sections).some((n) => n.startsWith('app-'))).toBe(false);
  });
  it('renders the frame for a product, the heading from settings, and nothing for another app', () => {
    const art = withDefaults(own(), registry);
    const ctx = { locale: 'ar', dir: 'rtl', currency: 'EGP', store: { name: 'م' }, settings: {}, data: {}, collections: {}, products: {},
      translations: {}, fallbackTranslations: {}, assetUrl: (p: string) => p, imageUrl: (r: unknown) => String(r) } as unknown as RenderContext;
    const r = renderPage(art as never, { template: 'product', ctx, registry, scope: { product: { id: 'p1', handle: 'kika', title: 'K' } } as never, sections: [{ id: 's1', type: sub, props: { heading: { ar: 'اشترك', en: 'Subscribe' } } }] });
    expect(r.diagnostics).toEqual([]);
    expect(r.html).toContain('src="/hk2/app-block/subscriptions/subscribe?product=kika"');
    expect(r.html).toContain('اشترك');
    expect(r.controllers).toContain('app-block');
  });
});
