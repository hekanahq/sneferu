import { describe, it, expect } from 'vitest';
import { sectionAllowedOn, TagRegistry } from '@hekana/sneferu-core';
import { compileTheme, withDefaults, type Artifact } from '@hekana/sneferu-compiler';
import { BASE_TAGS, createDefaultRegistry } from '@hekana/sneferu-components';
import { renderPage, type RenderContext } from '@hekana/sneferu-runtime';
import { DEFAULT_THEME_FILES } from '@hekana/sneferu-templates-default';

const registry = createDefaultRegistry();
const own = (): Artifact => compileTheme(DEFAULT_THEME_FILES, registry, { defaults: false }).artifact!;

describe('custom html section in every theme', () => {
  it('a stored artifact gets the section without a re-publish, stable under a second pass', () => {
    const before = own();
    expect(before.sections['custom-html']).toBeUndefined();
    const after = withDefaults(before, registry);
    expect(after.sections['custom-html']).toBeDefined();
    expect(withDefaults(after, registry).hash).toBe(after.hash);
  });
  it('is bilingual, and offered on every page type except cart (and never in groups)', () => {
    const s = withDefaults(own(), registry).sections['custom-html']!;
    expect(s.schema.name).toEqual({ ar: 'كود مخصص', en: 'Custom HTML' });
    expect(Object.keys(s.schema.settings)).toEqual(['html', 'css', 'padding_y']);
    for (const ok of ['index', 'product', 'collection', 'search', 'page', '404', 'product.codes']) expect(sectionAllowedOn(s.schema, ok), ok).toBe(true);
    for (const no of ['cart', 'checkout', 'account', 'login', 'header', 'footer', 'announcement']) expect(sectionAllowedOn(s.schema, no), no).toBe(false);
  });
  it('a theme that defines its own custom-html section keeps it', () => {
    const mine = own();
    const marker = { ir: [{ k: 'html' as const, s: '<i>mine</i>' }], schema: { name: { ar: 'م', en: 'M' }, version: 1, settings: {} } };
    expect(withDefaults({ ...mine, sections: { ...mine.sections, 'custom-html': marker } }, registry).sections['custom-html']).toBe(marker);
  });
  it('an older registry without the tag changes nothing', () => {
    const bare = new TagRegistry();
    for (const t of BASE_TAGS) if (t.name !== 'hk-custom-html') bare.register(t);
    expect(withDefaults(own(), bare).sections['custom-html']).toBeUndefined();
  });
  it('renders sanitised html and scoped css from section settings, end to end', () => {
    const art = withDefaults(own(), registry);
    const ctx = { locale: 'ar', dir: 'rtl', currency: 'EGP', store: { name: 'م' }, settings: {}, data: {}, collections: {}, products: {},
      translations: {}, fallbackTranslations: {}, assetUrl: (p: string) => p, imageUrl: (r: unknown) => String(r) } as unknown as RenderContext;
    const props = {
      html: '<h2 class="t" onclick="x()">مرحبا</h2><script>alert(1)</script><a href="javascript:1">x</a>',
      css: '.t{color:#c00;position:fixed}@import url(//evil.example/x.css);body{background:red}',
    };
    const r = renderPage(art as never, { template: 'index', ctx, registry, scope: {} as never, sections: [{ id: 's1', type: 'custom-html', props }] });
    expect(r.diagnostics).toEqual([]);
    expect(r.html).toMatch(/<div class="sn-[^"]+ sn-custom-html"><h2 class="t">مرحبا<\/h2><a rel="nofollow noopener">x<\/a><\/div>/);
    expect(r.html).not.toMatch(/<script|onclick|javascript:/);
    const cls = /class="(sn-[^" ]+) sn-custom-html"/.exec(r.html)![1]!;
    expect(r.css).toContain(`.${cls} .t{color:#c00}`);
    expect(r.css).toContain(`.${cls}{background:red}`);
    expect(r.css).toContain(`.${cls}{position:relative!important;isolation:isolate!important;contain:layout paint!important}`);
    expect(r.css).not.toMatch(/@import|evil\.example/);
    expect(r.css).not.toContain(`.${cls} .t{color:#c00;position`);
  });
});
