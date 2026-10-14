import { describe, it, expect } from 'vitest';
import { TagRegistry } from '@hekana/sneferu-core';
import { compileTheme, withDefaults, type ThemeFile } from './compile';

const enc = new TextEncoder();
const f = (path: string, text: string): ThemeFile => ({ path, bytes: enc.encode(text) });
const manifest = { id: 'tthm', name: 'T', version: '1.0.0', author: 'a', description: 'd', category: 'c', engine: 'hk2', engineCompatibility: '^2.0.0', defaultLocale: 'en', locales: ['en', 'ar'], settings: {}, tokens: { colors: { primary: '#111111', secondary: '#222222', accent: '#333333', background: '#ffffff', text: '#000000', muted: '#888888' }, fonts: { body: 'Inter' }, radius: { md: '12px' }, layout: { contentWidth: '1100px' } } };
const tag = (name: string, extra: object = {}) => ({ name, version: 1, category: 'layout', props: { name: { type: 'select', label: 'n', options: ['header', 'footer', 'announcement'] } }, allowedParents: '*', allowedChildren: '*', responsive: [], bindable: '*', render: () => '', editor: { label: 'x', group: 'layout', insertable: false }, ...extra }) as never;
const reg = new TagRegistry().register(tag('hk-section-group')).register(tag('hk-thing', { strings: { greet: { ar: 'اهلا', en: 'Hello' } }, props: {} }));
const sec = (extra = '') => `<div>{{ section.settings.t }}</div><hk-schema>{"name":"S","settings":{"t":{"type":"text","label":"T","default":"x"}}${extra}}</hk-schema>`;
const base = (extra: ThemeFile[] = [], layout = '<hk-section-group name="header" /><main><hk-slot name="content" /></main>'): ThemeFile[] => [
  f('theme.json', JSON.stringify(manifest)), f('layout/theme.sneferu', layout), f('templates/index.sneferu', '<hk-sections />'),
  f('sections/bar.sneferu', sec(',"templates":["header","index"]')), f('sections/body.sneferu', sec(',"templates":["product"]')), f('blocks/link.sneferu', '<a href="/">x</a><hk-schema>{"name":"L","settings":{}}</hk-schema>'),
  ...extra,
];
const c = (files: ThemeFile[]) => compileTheme(files, reg, { defaults: false });
const errs = (files: ThemeFile[]) => c(files).diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);
const without = (files: ThemeFile[], ...paths: string[]) => files.filter((x) => !paths.includes(x.path));

describe('groups', () => {
  it('reads groups/<name>.json into page trees with ids', () => {
    const { artifact, diagnostics } = c(base([f('groups/header.json', JSON.stringify({ sections: [{ id: 'h', type: 'bar', settings: { t: 'y' } }, { type: 'bar' }] }))]));
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(artifact!.groups.header).toEqual([{ id: 'h', type: 'bar', props: { t: 'y' } }, { id: 'header-2', type: 'bar', props: {} }]);
  });
  it('validates the file: json, shape, unknown sections, ids, placement, size', () => {
    expect(errs(base([f('groups/header.json', '{nope')]))).toEqual(['SN3036']);
    expect(errs(base([f('groups/header.json', '{"x":1}')]))).toEqual(['SN3036']);
    expect(errs(base([f('groups/header.json', '{"sections":[{"type":"ghost"}]}')]))).toEqual(['SN3037']);
    expect(errs(base([f('groups/header.json', '{"sections":[{"id":"a","type":"bar"},{"id":"a","type":"bar"}]}')]))).toEqual(['SN3038']);
    expect(errs(base([f('groups/header.json', '{"sections":[{"id":"A b","type":"bar"}]}')]))).toEqual(['SN3038']);
    expect(errs(base([f('groups/header.json', '{"sections":[{"type":"body"}]}')]))).toEqual(['SN3041']);
    expect(errs(base([f('groups/header.json', JSON.stringify({ sections: Array.from({ length: 13 }, (_, i) => ({ id: `s${i}`, type: 'bar' })) }))]))).toEqual(['SN3038']);
    expect(errs(base([f('groups/sidebar.json', '{}')]))).toEqual(['SN3003']);
    expect(errs(base([f('groups/header.json', JSON.stringify({ sections: [], pad: 'x'.repeat(70000) }))]))).toContain('SN3036');
  });
  it('reserves the hk- prefix for the default store (SN3043)', () => {
    expect(errs(base([f('sections/hk-hero.sneferu', sec())]))).toEqual(['SN3043']);
    expect(errs(base([f('blocks/hk-chip.sneferu', '<i></i><hk-schema>{"name":"C","settings":{}}</hk-schema>')]))).toEqual(['SN3043']);
    expect(errs(base([f('snippets/hk-price.sneferu', '<b></b>')]))).toEqual(['SN3043']);
    expect(errs(base([f('assets/hk-logo.png', '')]))).toEqual([]);
    expect(errs(base([f('sections/my-hk-hero.sneferu', sec())]))).toEqual([]);
  });
  it('warns about a group file the layout never places', () => {
    expect(c(base([f('groups/footer.json', '{"sections":[]}')])).diagnostics.map((d) => d.code)).toEqual(['SN3039']);
  });
  it('checks the group tag: static name, layout only, once', () => {
    const run = (layout: string) => errs(base([], layout));
    expect(run('<hk-section-group name="{{ x }}" />')).toContain('SN2017');
    expect(run('<hk-section-group name="side" />')).toContain('SN2017');
    expect(run('<hk-section-group name="header" /><hk-section-group name="header" />')).toContain('SN2019');
    expect(errs([...without(base(), 'sections/bar.sneferu'), f('sections/bar.sneferu', '<hk-section-group name="header" />' + sec())])).toContain('SN2018');
  });
  it('supports nested blocks and block_order', () => {
    const files = base([f('sections/nav.sneferu', sec(',"blocks":{"allowed":["link"],"max":3}'))]).map((x) => (x.path === 'blocks/link.sneferu'
      ? f(x.path, '<a href="/">x</a><hk-schema>{"name":"L","settings":{},"blocks":{"allowed":["link"],"max":2}}</hk-schema>') : x));
    const withGroup = (g: unknown) => [...files, f('groups/header.json', JSON.stringify(g))];
    const { artifact, diagnostics } = c(withGroup({ sections: [{ id: 'n', type: 'nav', blocks: [{ id: 'a', type: 'link' }, { id: 'b', type: 'link', blocks: [{ type: 'link' }] }], block_order: ['b', 'a'] }] }));
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const kids = artifact!.groups.header![0]!.children!;
    expect(kids.map((k) => k.id)).toEqual(['b', 'a']);
    expect(kids[0]!.children![0]!.id).toBe('b-b1');
    const bad = (blocks: unknown[], order?: unknown) => errs(withGroup({ sections: [{ id: 'n', type: 'nav', blocks, ...(order ? { block_order: order } : {}) }] }));
    expect(bad([{ type: 'a' }])).toEqual(['SN3028']);
    expect(bad([1, 2, 3, 4].map(() => ({ type: 'link' })))).toEqual(['SN3029']);
    expect(bad([{ id: 'x', type: 'link' }], ['y'])).toEqual(['SN3038']);
    expect(bad([{ type: 'link', blocks: [{ type: 'link', blocks: [{ type: 'link' }] }] }])).toContain('SN3029');
  });
});

describe('section templates allow-list', () => {
  it('is validated and exposed in the artifact', () => {
    const { artifact } = c(base());
    expect(artifact!.sections.bar!.schema.templates).toEqual(['header', 'index']);
    expect(artifact!.sections.body!.schema.templates).toEqual(['product']);
    for (const bad of ['"x"', '[]', '[1]', '["cart.big"]', '["checkout.big"]']) expect(errs([...without(base(), 'sections/bar.sneferu'), f('sections/bar.sneferu', sec(`,"templates":${bad}`))]), bad).toEqual(['SN3040']);
    expect(errs([...without(base(), 'sections/bar.sneferu'), f('sections/bar.sneferu', sec(',"templates":["product.codes","footer"]'))])).toEqual([]);
  });
  it('rejects a template default on a section that is not allowed there (SN3041)', () => {
    expect(errs(base([f('templates/cart.sneferu', '<hk-sections /><hk-schema>{"sections":[{"type":"bar"}]}</hk-schema>')]))).toEqual(['SN3041']);
    expect(errs(base([f('templates/product.sneferu', '<hk-sections /><hk-schema>{"sections":[{"type":"body"}]}</hk-schema>')]))).toEqual([]);
  });
  it('rejects blocks.allowed naming a missing block (SN3042)', () => {
    expect(errs([...base(), f('sections/x.sneferu', sec(',"blocks":{"allowed":["nope"],"max":1}'))])).toEqual(['SN3042']);
  });
});

describe('theme settings and locale keys', () => {
  it('adds the token settings to the manifest, theme declarations win', () => {
    const s = c(base()).artifact!.manifest.settings;
    expect(Object.keys(s)).toEqual(expect.arrayContaining(['token_color_primary', 'token_color_muted', 'token_font_heading', 'token_font_body', 'token_font_mono', 'token_radius', 'token_spacing', 'token_button_style', 'token_container_width']));
    expect(s.token_color_accent).toMatchObject({ type: 'color', default: '#333333', group: 'colors' });
    expect(s.token_radius).toMatchObject({ default: 12, min: 0, max: 32 });
    expect(s.token_container_width!.default).toBe(1100);
    expect(s.token_font_body!.default).toBe('Inter');
    expect(s.token_font_heading!.default).toBe('default');
    const own = base().map((x) => (x.path === 'theme.json' ? f(x.path, JSON.stringify({ ...manifest, settings: { token_radius: { type: 'range', label: 'R', min: 0, max: 4, default: 2 } } })) : x));
    expect(c(own).artifact!.manifest.settings.token_radius).toMatchObject({ default: 2, max: 4 });
    expect(errs(base([f('sections/y.sneferu', '{% for p in xs limit: settings.token_radius %}x{% endfor %}' + sec())]))).toEqual([]);
  });
  it('lists overridable keys and adds the words of the tags a theme uses', () => {
    const files = base([f('locales/en.json', '{"a":"A"}'), f('sections/z.sneferu', "{{ t('only_in_template') }}<hk-thing />" + sec())]);
    const { artifact } = c(files);
    expect(artifact!.localeKeys).toEqual(['a', 'greet', 'only_in_template']);
    expect(artifact!.locales.en).toEqual({ a: 'A', greet: 'Hello' });
    expect(artifact!.locales.ar).toEqual({ greet: 'اهلا' });
    const own = base([f('locales/en.json', '{"greet":"Hi"}'), f('sections/z.sneferu', '<hk-thing />' + sec())]);
    expect(c(own).artifact!.locales.en!.greet).toBe('Hi');
  });
});

describe('the default store merge', () => {
  const store = (): ThemeFile[] => [
    f('theme.json', JSON.stringify({ ...manifest, id: 'dflt' })), f('layout/theme.sneferu', '<hk-section-group name="header" /><hk-slot name="content" />'),
    f('templates/index.sneferu', '<hk-sections />'),
    f('templates/cart.sneferu', '<hk-sections /><hk-schema>{"sections":[{"type":"cart-main","blocks":[{"type":"row"}]}]}</hk-schema>'),
    f('sections/cart-main.sneferu', "{% render 'tile' %}{{ t('cart_title') }}<hk-schema>{\"name\":\"C\",\"templates\":[\"cart\"],\"blocks\":{\"allowed\":[\"row\"],\"max\":2},\"settings\":{}}</hk-schema>"),
    f('sections/top.sneferu', "{{ t('top') }}<hk-schema>{\"name\":\"Top\",\"templates\":[\"header\"],\"settings\":{}}</hk-schema>"),
    f('sections/unused.sneferu', '<i></i><hk-schema>{"name":"U","settings":{}}</hk-schema>'),
    f('blocks/row.sneferu', "{% render 'tile' %}<hk-schema>{\"name\":\"R\",\"settings\":{}}</hk-schema>"), f('snippets/tile.sneferu', '<b></b>'),
    f('groups/header.json', '{"sections":[{"id":"top","type":"top"}]}'),
    f('locales/en.json', '{"cart_title":"Cart","top":"Top","unrelated":"u"}'), f('locales/ar.json', '{"cart_title":"سلة","top":"فوق"}'),
    f('assets/theme.css', '.sf-x{}'),
  ];
  const theme = (extra: ThemeFile[] = [], layout = '<hk-section-group name="header" /><hk-section-group name="footer" /><hk-slot name="content" />'): ThemeFile[] => [
    f('theme.json', JSON.stringify(manifest)), f('layout/theme.sneferu', layout), f('templates/index.sneferu', '<hk-sections />'),
    f('sections/tile.sneferu', '<u></u><hk-schema>{"name":"Mine","settings":{}}</hk-schema>'), f('snippets/tile.sneferu', '<s>mine</s>'), f('locales/en.json', '{"cart_title":"Basket"}'), ...extra,
  ];
  it('fills in missing page types and group defaults under hk- names, theme wins on text', () => {
    const { artifact, diagnostics } = compileTheme(theme(), reg, { defaults: store() });
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const a = artifact!;
    expect(a.defaults).toMatchObject({ templates: ['cart'], groups: ['header'], css: '.sf-x{}' });
    expect([...a.defaults!.sections].sort()).toEqual(['hk-cart-main', 'hk-top']);
    expect(a.templateSections.cart).toEqual([{ type: 'hk-cart-main', settings: {}, blocks: [{ type: 'hk-row', settings: {} }] }]);
    expect(Object.keys(a.sections).sort()).toEqual(['hk-cart-main', 'hk-top', 'tile']);
    expect(Object.keys(a.blocks)).toEqual(['hk-row']);
    expect(Object.keys(a.snippets).sort()).toEqual(['hk-tile', 'tile']);
    expect(a.sections['hk-cart-main']!.ir).toContainEqual({ k: 'render', snippet: 'hk-tile', args: {} });
    expect(a.sections['hk-cart-main']!.schema.blocks!.allowed).toEqual(['hk-row']);
    expect(a.sections.tile!.schema.name.en).toBe('Mine');
    expect(a.snippets.tile).not.toEqual(a.snippets['hk-tile']);
    expect(a.groups.header).toEqual([{ id: 'top', type: 'hk-top', props: {} }]);
    expect(a.groups.footer).toBeUndefined();
    expect(a.locales.en).toMatchObject({ cart_title: 'Basket', top: 'Top' });
    expect(a.locales.en!.unrelated).toBeUndefined();
    expect(a.locales.ar).toMatchObject({ cart_title: 'سلة', top: 'فوق' });
  });
  it('leaves a complete theme alone; a theme group file wins over the default', () => {
    const full = theme([f('templates/cart.sneferu', '<hk-sections />')], '<hk-slot name="content" />');
    const a = compileTheme(full, reg, { defaults: store() }).artifact!;
    expect(a.defaults).toBeUndefined();
    expect(a.templates.cart).toBeDefined();
    const b = compileTheme(theme([f('groups/header.json', '{"sections":[]}')]), reg, { defaults: store() }).artifact!;
    expect(b.groups.header).toEqual([]);
  });
  it('is deterministic and withDefaults completes an older artifact', () => {
    const files = theme();
    const once = compileTheme(files, reg, { defaults: store() }).artifact!;
    expect(compileTheme(files, reg, { defaults: store() }).artifact!.hash).toBe(once.hash);
    const old = compileTheme(files, reg, { defaults: false }).artifact!;
    expect(old.defaults).toBeUndefined();
    const upgraded = withDefaults(old, reg, store());
    expect(upgraded.templates.cart).toBeDefined();
    expect(upgraded.hash).toBe(once.hash);
    const { groups: _g, localeKeys: _l, ...legacy } = old;
    expect(withDefaults(legacy as never, reg, store()).defaults!.groups).toEqual(['header']);
  });
  it('survives a default store that does not compile', () => {
    expect(compileTheme(theme(), reg, { defaults: [f('theme.json', '{')] }).artifact!.defaults).toBeUndefined();
  });
});
