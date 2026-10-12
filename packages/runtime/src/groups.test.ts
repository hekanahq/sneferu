import { describe, it, expect } from 'vitest';
import { TagRegistry, tokenSettings, type IRNode } from '@hekana/sneferu-core';
import { renderPage, checkArtifactShape, themeTokenCss, themeFontCss, type ArtifactLike, type RenderContext } from './index';

const ctx: RenderContext = { locale: 'en', dir: 'ltr', currency: 'EGP', store: { name: 'S' }, settings: {}, data: {}, collections: {}, products: {},
  translations: { hello: 'Hello', other: 'Other' }, fallbackTranslations: { hello: 'Hello', other: 'Other' }, assetUrl: (p) => p, imageUrl: (r) => String(r) };
const text = (p: (string | number)[]): IRNode => ({ k: 'text', e: { k: 'path', p } });
const html = (s: string): IRNode => ({ k: 'html', s });
const reg = new TagRegistry().register({ name: 'hk-section-group', version: 1, category: 'layout', props: {}, allowedParents: '*', allowedChildren: [], responsive: [], bindable: [], render: () => 'NEVER',
  editor: { label: { ar: 'g', en: 'g' }, group: 'layout', insertable: false } } as never);
const group = (name: string): IRNode => ({ k: 'comp', tag: 'hk-section-group', props: { name: { k: 'static', v: name } }, children: [] });
const lbl = { ar: 'ع', en: 'L' };
const art = (over: Partial<ArtifactLike> = {}): ArtifactLike => ({
  manifest: { id: 'tthm', locales: ['en', 'ar'], settings: tokenSettings({ colors: { primary: '#111111', accent: '#222222', background: '#ffffff', text: '#000000' }, radius: { md: '8px' } }) },
  layout: [group('header'), html('<main>'), { k: 'slot', name: 'content' }, html('</main>'), group('footer')],
  templates: { index: [{ k: 'slot', name: 'sections' }] }, templateSections: { index: [] },
  sections: {
    bar: { ir: [html('<p>'), text(['section', 'settings', 't']), html('|'), { k: 't', key: 'hello' }, html('|'), { k: 'loop', as: 'b', src: { k: 'path', p: ['section', 'blocks'] }, limit: 9, body: [
      text(['b', 'type']), html('['), { k: 'loop', as: 'c', src: { k: 'path', p: ['b', 'blocks'] }, limit: 9, body: [text(['c', 'settings', 'u'])] }, html(']')] }, html('</p>')],
      schema: { name: lbl, version: 1, settings: { t: { type: 'text', label: lbl, default: 'dflt' }, } as never } },
    'hk-x': { ir: [html('<i>x</i>')], schema: { name: lbl, version: 1, settings: {} } },
  },
  blocks: { link: { ir: [], schema: { settings: { u: { type: 'text', label: lbl, default: 'u0' } } } } }, snippets: {},
  groups: { header: [{ id: 'h', type: 'bar', props: { t: 'from-default' } }] }, localeKeys: ['hello', 'other'], ...over,
});
const run = (a: ArtifactLike, o: object = {}) => renderPage(a, { template: 'index', ctx, registry: reg, ...o });

describe('section groups', () => {
  it('renders the theme default tree where the tag sits, wrapped, and nothing for a group with no default', () => {
    const r = run(art());
    expect(r.diagnostics).toEqual([]);
    expect(r.html).toContain('<div data-hk-group="header"><div data-hk-section="h"><p>from-default|Hello|');
    expect(r.html).not.toContain('data-hk-group="footer"');
    expect(r.html).not.toContain('NEVER');
    expect(r.html.indexOf('data-hk-group="header"')).toBeLessThan(r.html.indexOf('<main>'));
  });
  it('renders the merchant tree instead; an empty array renders nothing; a theme with no groups still works', () => {
    expect(run(art(), { groups: { header: [{ id: 'm', type: 'bar', props: { t: 'mine' } }] } }).html).toContain('<div data-hk-section="m"><p>mine|');
    expect(run(art(), { groups: { header: [] } }).html).not.toContain('data-hk-group');
    expect(run(art(), { groups: { footer: [{ id: 'f', type: 'bar' }] } }).html).toContain('data-hk-group="footer"');
    const none = art({ groups: undefined, layout: [html('<main>'), { k: 'slot', name: 'content' }, html('</main>')] });
    expect(run(none).html).toBe('<div data-hk-theme="tthm" dir="ltr" lang="en"><main></main></div>');
  });
  it('skips hidden sections, reports unknown ones, ignores junk and caps the count', () => {
    const r = run(art(), { groups: { header: [{ id: 'a', type: 'bar', hidden: true }, { id: 'b', type: 'ghost' }, 7 as never, { id: 'c', type: 'bar' }] } });
    expect(r.html).not.toContain('data-hk-section="a"');
    expect(r.html).toContain('data-hk-section="c"');
    expect(r.diagnostics.map((d) => d.code).sort()).toEqual(['SN4011', 'SN4011']);
    const many = Array.from({ length: 40 }, (_, i) => ({ id: `n${i}`, type: 'bar' }));
    expect(run(art(), { groups: { header: many } }).html.match(/data-hk-section=/g)).toHaveLength(24);
    expect(run(art(), { groups: { header: 'x', __proto__: [] } as never }).html).not.toContain('from-default');
  });
  it('gives group sections their own class prefix so ids cannot clash with page sections', () => {
    const b = art({ sections: { ...art().sections, box: { ir: [{ k: 'comp', tag: 'hk-box', props: {}, children: [] }], schema: { name: lbl, version: 1, settings: {} } } } });
    const r2 = renderPage(b, { template: 'index', ctx, registry: new TagRegistry().register({ name: 'hk-box', version: 1, category: 'layout', props: {}, allowedParents: '*', allowedChildren: '*', responsive: [], bindable: '*', render: (_p: never, c: { id: string }) => `<b class="sn-${c.id}"></b>`, editor: { label: lbl, group: 'layout', insertable: true } } as never)
      .register({ name: 'hk-section-group', version: 1, category: 'layout', props: {}, allowedParents: '*', allowedChildren: [], responsive: [], bindable: [], render: () => '', editor: { label: lbl, group: 'layout', insertable: false } } as never),
      sections: [{ id: 'x', type: 'box' }], groups: { header: [{ id: 'x', type: 'box' }] } });
    const ids = [...r2.html.matchAll(/class="sn-([^"]+)"/g)].map((m) => m[1]);
    expect(ids).toEqual(['g-header-s-x-c1', 's-x-c1']);
  });
  it('nests blocks one more level and hides hidden ones', () => {
    const tree = [{ id: 's', type: 'bar', children: [{ id: 'b1', type: 'link', children: [{ id: 'c1', type: 'link', props: { u: 'sub' } }, { id: 'c2', type: 'link', hidden: true }] }, { id: 'b2', type: 'link', hidden: true }] }];
    expect(run(art(), { groups: { header: tree } }).html).toContain('link[sub]');
    const deep = [{ id: 's', type: 'bar', children: [{ id: 'b', type: 'link', children: [{ id: 'c', type: 'link', children: [{ id: 'd', type: 'link', props: { u: 'deep' } }] }] }] }];
    expect(run(art(), { groups: { header: deep } }).html).not.toContain('deep');
  });
  it('uses the default store css only when something of it renders', () => {
    const d = art({ defaults: { templates: ['cart'], groups: ['header'], sections: ['hk-x'], css: '.sf-x{}' }, templates: { index: [{ k: 'slot', name: 'sections' }], cart: [html('c')] } });
    expect(run(d, { template: 'cart' }).css).toContain('.sf-x{}');
    expect(run(d).css).not.toContain('.sf-x');
    expect(run(d, { groups: { header: [{ id: 'h', type: 'hk-x' }] } }).css).toContain('.sf-x{}');
  });
});

describe('locale overrides', () => {
  const at = (overrides: unknown, a = art()) => run(a, { sections: [{ id: 's', type: 'bar' }], locale_overrides: overrides }).html;
  it('replaces listed keys for the page language only', () => {
    expect(at({ en: { hello: 'Hi' } })).toContain('|Hi|');
    expect(at({ ar: { hello: 'اهلا' } })).toContain('|Hello|');
    expect(at(undefined)).toContain('|Hello|');
  });
  it('ignores unlisted, unsafe, oversized and non-string overrides', () => {
    expect(at({ en: { nope: 'x', hello: 7 } })).toContain('|Hello|');
    expect(at({ en: { __proto__: 'x', constructor: 'y', 'bad key': 'z' } })).toContain('|Hello|');
    expect(at({ en: { hello: 'a\u0000b' + 'x'.repeat(600) } })).toContain('|ab' + 'x'.repeat(498) + '|');
    expect(at('x')).toContain('|Hello|');
    expect(at({ en: [] })).toContain('|Hello|');
  });
  it('without a key list, the keys of the locale files apply', () => {
    const old = art(); delete (old as { localeKeys?: unknown }).localeKeys;
    expect(at({ en: { hello: 'Hi', nope: 'x' } }, old)).toContain('|Hi|');
  });
  it('does not mutate the host translations', () => {
    at({ en: { hello: 'Hi' } });
    expect(ctx.translations.hello).toBe('Hello');
  });
});

describe('theme tokens as CSS', () => {
  const m = { id: 'tthm', tokens: { colors: { primary: '#111111', accent: '#FFD400', background: '#ffffff', text: '#000000' }, layout: { contentWidth: '1100px' } } };
  it('keeps the manifest values without settings and adds contrast colours', () => {
    const css = themeTokenCss(m);
    expect(css).toContain('--hk-color-accent:#FFD400');
    expect(css).toContain('--hk-color-on-accent:#111111');
    expect(css).toContain('--hk-color-on-primary:#FFFFFF');
    expect(css).not.toContain('--hk-radius');
  });
  it('applies resolved settings: colours, width, radius, spacing, button style; bad values fall back', () => {
    const css = themeTokenCss(m, { token_color_accent: '#112233', token_container_width: 1400, token_radius: 12, token_spacing: 'spacious', token_button_style: 'outline' });
    expect(css).toContain('--hk-color-accent:#112233');
    expect(css).toContain('--hk-content-width:1400px');
    expect(css).toContain('--hk-radius-sm:6px;--hk-radius:12px;--hk-radius-lg:18px');
    expect(css).toContain('--hk-space-3:22px');
    expect(css).toContain('--hk-btn-bg:transparent');
    const bad = themeTokenCss(m, { token_color_accent: 'red;}x{', token_container_width: 'wide', token_radius: 9999, token_spacing: 'huge', token_button_style: '"><' });
    expect(bad).toContain('--hk-color-accent:#FFD400');
    expect(bad).toContain('--hk-content-width:1200px');
    expect(bad).toContain('--hk-radius:32px');
    expect(bad).toContain('--hk-space-3:16px');
    expect(bad).toContain('--hk-btn-bg:var(--hk-color-accent)');
    expect(bad).not.toMatch(/[<>"]x|red;/);
  });
  it('font settings pick catalogue families only', () => {
    const fm = { id: 'tthm', tokens: { fonts: { body: 'Inter' } } };
    expect(themeFontCss(fm, 'en', '/f/', { token_font_body: 'Tajawal', token_font_heading: 'Cairo' })).toContain('--hk-font-body:"Tajawal"');
    expect(themeFontCss(fm, 'en', '/f/', { token_font_body: 'default' })).toContain('--hk-font-body:"Inter"');
    expect(themeFontCss(fm, 'en', '/f/', { token_font_body: 'Evil; x' })).toContain('--hk-font-body:"Inter"');
  });
  it('renderPage returns the token and font css from the resolved settings', () => {
    const a = art({ manifest: { ...art().manifest, tokens: { colors: { primary: '#111111', accent: '#222222', background: '#ffffff', text: '#000000' }, fonts: { body: 'Inter' } } } });
    const r = run(a, { ctx: { ...ctx, settings: { token_color_accent: '#abcdef', token_radius: 20 } }, fontBase: '/hk2/fonts/' });
    expect(r.tokenCss).toContain('--hk-color-accent:#abcdef');
    expect(r.tokenCss).toContain('--hk-radius:20px');
    expect(r.fontCss).toContain('--hk-font-mono');
  });
});

describe('artifact shape for the new fields', () => {
  it('accepts 0.3 artifacts and rejects malformed groups, localeKeys and defaults', () => {
    expect(checkArtifactShape(art())).toEqual([]);
    const old = art(); delete (old as { groups?: unknown }).groups; delete (old as { localeKeys?: unknown }).localeKeys;
    expect(checkArtifactShape(old)).toEqual([]);
    expect(checkArtifactShape({ ...art(), groups: [] }).length).toBeGreaterThan(0);
    expect(checkArtifactShape({ ...art(), groups: { header: [1] } }).length).toBeGreaterThan(0);
    expect(checkArtifactShape({ ...art(), localeKeys: [1] }).length).toBeGreaterThan(0);
    expect(checkArtifactShape({ ...art(), defaults: { css: 1 } }).length).toBeGreaterThan(0);
  });
});
