import { describe, it, expect } from 'vitest';
import { TagRegistry, validateIR } from '@hekana/sneferu-core';
import { compileTheme, type ThemeFile } from './compile';
import { IMAGE_ASSET } from './files';

const enc = new TextEncoder();
const f = (path: string, text: string): ThemeFile => ({ path, bytes: enc.encode(text) });
const manifest = {
  id: 'esports', name: { ar: 'إي سبورتس', en: 'Esports' }, version: '1.0.0', author: 'Hekana',
  description: { ar: 'قالب', en: 'Theme' }, category: 'gaming', engine: 'hk2', engineCompatibility: '^2.0.0',
  defaultLocale: 'ar', locales: ['ar', 'en'], settings: {},
  tokens: { colors: { primary: '#A3E635', secondary: '#2E1065', accent: '#B45309', background: '#120A1F', text: '#F5F3FF' } },
};
const base = (): ThemeFile[] => [
  f('theme.json', JSON.stringify(manifest)),
  f('layout/theme.sneferu', '<main><hk-slot name="content" /></main>'),
  f('templates/index.sneferu', '<hk-sections /><hk-schema>{"sections":[{"type":"hero","settings":{"title":"أهلًا"}}]}</hk-schema>'),
  f('sections/hero.sneferu', '<section><h1>{{ section.settings.title }}</h1></section><hk-schema>{"name":{"ar":"بطل","en":"Hero"},"version":1,"settings":{"title":{"type":"text","label":{"ar":"ع","en":"T"},"default":"Hi"}}}</hk-schema>'),
  f('locales/ar.json', '{"buy":"اشتري"}'),
  f('locales/en.json', '{"buy":"Buy"}'),
];
const reg = new TagRegistry();

describe('compileTheme', () => {
  it('compiles a minimal theme into an artifact', () => {
    const { artifact, diagnostics } = compileTheme(base(), reg);
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(artifact!.manifest.id).toBe('esports');
    expect(Object.keys(artifact!.sections)).toEqual(['hero']);
    expect(artifact!.sections.hero!.schema.settings.title!.default).toBe('Hi');
    expect(artifact!.templateSections.index).toEqual([{ type: 'hero', settings: { title: 'أهلًا' } }]);
    expect(artifact!.locales.ar!.buy).toBe('اشتري');
    expect(artifact!.hash).toMatch(/^[0-9a-f]{16}$/);
  });
  it('rejects an unknown font with a suggestion (SN3032)', () => {
    const withFonts = (fonts: unknown) => base().map((x) => (x.path === 'theme.json' ? f(x.path, JSON.stringify({ ...manifest, tokens: { ...manifest.tokens, fonts } })) : x));
    const r = compileTheme(withFonts({ body: 'Cario' }), reg).diagnostics.filter((d) => d.severity === 'error');
    expect(r.map((d) => d.code)).toEqual(['SN3032']);
    expect(r[0]!.message).toContain('Did you mean "Cairo"?');
    expect(compileTheme(withFonts({ heading: 'Cairo', body: 'Inter', mono: 'Martian Mono' }), reg).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    for (const bad of ['Cairo', { size: 'Cairo' }, { body: 7 }, { body: '__proto__' }, { mono: 'toString' }]) {
      expect(compileTheme(withFonts(bad), reg).diagnostics.filter((d) => d.severity === 'error').map((d) => d.code)).toEqual(['SN3032']);
    }
  });
  it('accepts money.format decimal or whole and rejects anything else (SN3033)', () => {
    const withMoney = (money: unknown) => base().map((x) => (x.path === 'theme.json' ? f(x.path, JSON.stringify({ ...manifest, money })) : x));
    for (const ok of [{ format: 'whole' }, { format: 'decimal' }, {}]) {
      const r = compileTheme(withMoney(ok), reg);
      expect(r.diagnostics.filter((d) => d.severity === 'error'), JSON.stringify(ok)).toEqual([]);
      expect(r.artifact!.manifest.money).toEqual(ok);
    }
    for (const bad of ['whole', { format: 'Whole' }, { format: 2 }, { format: 'whole', unit: 'major' }, null, []])
      expect(compileTheme(withMoney(bad), reg).diagnostics.filter((d) => d.severity === 'error').map((d) => d.code), JSON.stringify(bad)).toEqual(['SN3033']);
  });
  it('is deterministic: same input, same hash', () => {
    expect(compileTheme(base(), reg).artifact!.hash).toBe(compileTheme(base(), reg).artifact!.hash);
  });
  it('rejects bad packages with precise diagnostics', () => {
    const codes = (files: ThemeFile[]) => compileTheme(files, reg).diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);
    expect(codes(base().filter((x) => x.path !== 'theme.json'))).toEqual(['SN3001']);
    expect(codes([...base(), f('../evil.sneferu', 'x')])).toEqual(['SN3002']);
    expect(codes([...base(), f('assets/x.exe', 'x')])).toEqual(['SN3003']);
    expect(codes(base().map((x) => (x.path === 'theme.json' ? f('theme.json', JSON.stringify({ ...manifest, engine: 'hk3' })) : x)))).toEqual(['SN3010']);
    expect(codes(base().map((x) => (x.path === 'theme.json' ? f('theme.json', JSON.stringify({ ...manifest, engineCompatibility: '^3.0.0' })) : x)))).toEqual(['SN3011']);
    expect(codes([...base(), f('templates/index.sneferu', 'dup')])).toEqual(['SN3004']);
    expect(codes(base().map((x) => (x.path === 'templates/index.sneferu' ? f(x.path, '<hk-sections /><hk-schema>{"sections":[{"type":"ghost"}]}</hk-schema>') : x)))).toEqual(['SN3020']);
  });
  it('hash does not depend on file order', () => {
    const files = [...base(), f('assets/a.css', 'a{}'), f('assets/b.css', 'b{}')];
    expect(compileTheme([...files].reverse(), reg).artifact!.hash).toBe(compileTheme(files, reg).artifact!.hash);
  });
  it('reports malformed template schemas without throwing', () => {
    for (const schema of ['{"sections":{}}', '{"sections":[null]}', '{"sections":[{"type":5}]}', '{"sections":[{"type":"hero","settings":[]}]}']) {
      const files = base().map((x) => (x.path === 'templates/index.sneferu' ? f(x.path, `<hk-sections /><hk-schema>${schema}</hk-schema>`) : x));
      const codes = compileTheme(files, reg).diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);
      expect(codes).toEqual(['SN3026']);
    }
  });
  it('rejects a section schema with bad settings', () => {
    const files = base().map((x) => (x.path === 'sections/hero.sneferu' ? f(x.path, '<section />' + '<hk-schema>{"name":{"ar":"ب","en":"H"},"settings":[]}</hk-schema>') : x));
    expect(compileTheme(files, reg).diagnostics.map((d) => d.code)).toContain('SN3030');
  });
  it('refuses SVG URL smuggling at compile time (C1)', () => {
    const sec = (body: string) => base().map((x) => (x.path === 'sections/hero.sneferu' ? f(x.path, body + '<hk-schema>{"name":{"ar":"ب","en":"H"},"settings":{}}</hk-schema>') : x));
    const codes = (body: string) => compileTheme(sec(body), reg).diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);
    expect(codes('<svg><a xlink:href="javascript:alert(1)"><text>x</text></a></svg>')).toContain('SN2010');
    expect(codes('<svg><a><animate attributename="href" values="javascript:alert(1)"></animate></a></svg>')).toContain('SN2001');
    expect(compileTheme(sec('<svg><use xlink:href="{{ section.settings.icon }}"></use></svg>'), reg).artifact!.sections.hero!.ir).toEqual([
      { k: 'el', tag: 'svg', attrs: [], children: [{ k: 'el', tag: 'use', attrs: [{ name: 'xlink:href', sink: 'url', parts: [{ k: 'path', p: ['section', 'settings', 'icon'] }] }], children: [] }] },
    ]);
  });
  it('re-checks its own IR so the runtime never refuses a compiled theme (C3)', () => {
    const sec = (body: string) => base().map((x) => (x.path === 'sections/hero.sneferu' ? f(x.path, body + '<hk-schema>{"name":{"ar":"ب","en":"H"},"settings":{}}</hk-schema>') : x));
    const ds = compileTheme(sec('<div style="background:url(javascript:alert(1))">x</div>'), reg).diagnostics.filter((d) => d.severity === 'error');
    expect(ds.map((d) => d.code)).toEqual(['SN9014']);
    expect(ds[0]!.file).toBe('sections/hero.sneferu');
  });
  it('compiles prose that merely looks like code (R-C3 false positives)', () => {
    const sec = (body: string) => base().map((x) => (x.path === 'sections/hero.sneferu' ? f(x.path, body + '<hk-schema>{"name":{"ar":"ب","en":"H"},"settings":{}}</hk-schema>') : x));
    for (const body of ['<p>Buy one = get one free</p>', '<p>add-ons = extras</p>', '<img alt="price on = 5" src="/a.png">', '<p>Use data:text/html carefully</p>',
      '<p>attributeName</p>', '<p>learn javascript: today</p>', '<p title="a`b">x</p>', '<p>a &gt; b &amp; c</p>', '<svg viewBox="0 0 8 8"><path d="M0 0"/></svg>'])
      expect(compileTheme(sec(body), reg).diagnostics.filter((d) => d.severity === 'error'), body).toEqual([]);
  });
  it('rejects snippet include cycles (C2)', () => {
    const codes = (extra: ThemeFile[]) => compileTheme([...base(), ...extra], reg).diagnostics.filter((d) => d.severity === 'error');
    const two = codes([f('snippets/a.sneferu', "{% render 'b' %}"), f('snippets/b.sneferu', "{% render 'a' %}")]);
    expect(two.map((d) => d.code)).toEqual(['SN3027']);
    expect(two[0]!.message).toBe('snippet include cycle: a → b → a');
    expect(codes([f('snippets/a.sneferu', "{% if x %}<p>{% render 'a' %}</p>{% endif %}")]).map((d) => d.message)).toEqual(['snippet include cycle: a → a']);
    expect(codes([f('snippets/a.sneferu', "{% render 'b' %}{% render 'b' %}"), f('snippets/b.sneferu', 'x')])).toEqual([]);
  });
  it('requires locale files to be flat string maps (I4)', () => {
    for (const body of ['{"hi":{"x":1}}', '{"n":5}', '[]', '"x"', 'null']) {
      const files = base().map((x) => (x.path === 'locales/ar.json' ? f(x.path, body) : x));
      expect(compileTheme(files, reg).diagnostics.filter((d) => d.severity === 'error').map((d) => d.code), body).toEqual(['SN3025']);
    }
  });
  it('never throws on deep nesting and never emits IR the runtime refuses (I6)', () => {
    for (const depth of [60, 64, 100, 20000]) {
      const files = base().map((x) => (x.path === 'templates/index.sneferu' ? f(x.path, '<b>'.repeat(depth) + '{{ x }}' + '</b>'.repeat(depth) + '<hk-sections />') : x));
      let r: ReturnType<typeof compileTheme> | undefined;
      expect(() => { r = compileTheme(files, reg); }).not.toThrow();
      if (r!.artifact) {
        const t = r!.artifact.templates.index!;
        expect(validateIR(t, new Set(['hk-block']))).toEqual([]);
      } else expect(r!.diagnostics.map((d) => d.code).some((c) => c === 'SN1108' || c === 'SN9009')).toBe(true);
    }
  });

  describe('English-only themes', () => {
    const enManifest = { ...manifest, name: 'Esports', description: { en: 'A gaming theme' }, defaultLocale: 'en', locales: ['en'],
      settings: { accent: { type: 'color', label: 'Accent', default: '#B45309' }, tagline: { type: 'text', label: { en: 'Tagline' } } } };
    const enFiles = (): ThemeFile[] => [
      f('theme.json', JSON.stringify(enManifest)),
      f('layout/theme.sneferu', '<main><hk-slot name="content" /></main>'),
      f('templates/index.sneferu', '<hk-sections /><hk-schema>{"sections":[{"type":"hero","settings":{"title":"Hello"}}]}</hk-schema>'),
      f('sections/hero.sneferu', '<section><h1>{{ section.settings.title }}</h1></section><hk-schema>{"name":"Hero","settings":{"title":{"type":"text","label":"Title","default":"Hi"},"size":{"type":"range","label":{"en":"Size"},"min":1,"max":4}}}</hk-schema>'),
      f('blocks/chip.sneferu', '<span>{{ block.settings.text }}</span><hk-schema>{"name":{"en":"Chip"},"settings":{"text":{"type":"text","label":"Text"}}}</hk-schema>'),
      f('sections/quotes.sneferu', '<section /><hk-schema>{"name":"Quotes","blocks":{"allowed":["chip"],"max":3},"presets":[{"name":"Two chips","blocks":[{"type":"chip"},{"type":"chip"}]},{"name":{"ar":"لا شيء","en":"None"}}]}</hk-schema>'),
      f('locales/en.json', '{"buy":"Buy"}'),
    ];
    it('compiles string and { en } labels into { ar, en } with en standing in for ar', () => {
      const { artifact, diagnostics } = compileTheme(enFiles(), reg);
      expect(diagnostics).toEqual([]);
      const a = artifact!;
      expect(a.manifest.name).toEqual({ ar: 'Esports', en: 'Esports' });
      expect(a.manifest.description).toEqual({ ar: 'A gaming theme', en: 'A gaming theme' });
      expect(a.manifest.settings.accent!.label).toEqual({ ar: 'Accent', en: 'Accent' });
      expect(a.manifest.settings.tagline!.label).toEqual({ ar: 'Tagline', en: 'Tagline' });
      expect(a.manifest.defaultLocale).toBe('en');
      expect(a.manifest.locales).toEqual(['en']);
      expect(a.sections.hero!.schema.name).toEqual({ ar: 'Hero', en: 'Hero' });
      expect(a.sections.hero!.schema.settings.title).toEqual({ type: 'text', label: { ar: 'Title', en: 'Title' }, default: 'Hi' });
      expect(a.sections.hero!.schema.settings.size!.label).toEqual({ ar: 'Size', en: 'Size' });
      expect(a.blocks.chip!.schema.name).toEqual({ ar: 'Chip', en: 'Chip' });
      expect(a.blocks.chip!.schema.settings.text!.label).toEqual({ ar: 'Text', en: 'Text' });
      expect(a.locales).toEqual({ en: { buy: 'Buy' } });
      expect(a.sections.quotes!.schema.presets).toEqual([
        { name: { ar: 'Two chips', en: 'Two chips' }, blocks: [{ type: 'chip' }, { type: 'chip' }] },
        { name: { ar: 'لا شيء', en: 'None' } },
      ]);
    });
    it('leaves bilingual labels exactly as written', () => {
      const a = compileTheme(base(), reg).artifact!;
      expect(a.manifest.name).toEqual({ ar: 'إي سبورتس', en: 'Esports' });
      expect(a.sections.hero!.schema.name).toEqual({ ar: 'بطل', en: 'Hero' });
      expect(a.sections.hero!.schema.settings.title!.label).toEqual({ ar: 'ع', en: 'T' });
    });
    it('still needs an English name and description', () => {
      const codes = (m: object) => compileTheme(enFiles().map((x) => (x.path === 'theme.json' ? f('theme.json', JSON.stringify({ ...enManifest, ...m })) : x)), reg).diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);
      expect(codes({ name: { ar: 'إي سبورتس' } })).toEqual(['SN3013']);
      expect(codes({ name: '' })).toEqual(['SN3013']);
      expect(codes({ description: 5 })).toEqual(['SN3016']);
      expect(codes({ locales: ['en', 'fr'] })).toEqual(['SN3018']);
      expect(codes({ defaultLocale: 'ar' })).toEqual(['SN3018']);
      const sec = enFiles().map((x) => (x.path === 'sections/hero.sneferu' ? f(x.path, '<section /><hk-schema>{"name":{"ar":"بطل"}}</hk-schema>') : x));
      expect(compileTheme(sec, reg).diagnostics.map((d) => d.code)).toContain('SN3030');
    });
    it('warns about an unreadable setting label', () => {
      const sec = enFiles().map((x) => (x.path === 'sections/hero.sneferu' ? f(x.path, '<section /><hk-schema>{"name":"Hero","settings":{"t":{"type":"text","label":{"ar":"ع"}}}}</hk-schema>') : x));
      const r = compileTheme(sec, reg);
      expect(r.artifact).toBeDefined();
      expect(r.diagnostics.map((d) => [d.code, d.severity])).toEqual([['SN3031', 'warning']]);
    });
  });
  describe('default section blocks', () => {
    const withTpl = (sections: string): ThemeFile[] => [
      ...base().filter((x) => x.path !== 'templates/index.sneferu'),
      f('templates/index.sneferu', `<hk-sections /><hk-schema>{"sections":[${sections}]}</hk-schema>`),
      f('blocks/q.sneferu', '<span>{{ block.settings.text }}</span><hk-schema>{"name":"Q","settings":{"text":{"type":"text","label":"T"}}}</hk-schema>'),
      f('blocks/other.sneferu', '<i /><hk-schema>{"name":"O","settings":{}}</hk-schema>'),
      f('sections/faq.sneferu', '<section /><hk-schema>{"name":"Faq","blocks":{"allowed":["q"],"max":2},"settings":{}}</hk-schema>'),
    ];
    const codes = (s: string) => compileTheme(withTpl(s), reg).diagnostics.map((d) => d.code);
    it('keeps valid default blocks on the artifact', () => {
      const r = compileTheme(withTpl('{"type":"faq","blocks":[{"type":"q","settings":{"text":"A"}},{"type":"q"}]}'), reg);
      expect(r.diagnostics).toEqual([]);
      expect(r.artifact!.templateSections.index![0]!.blocks).toEqual([{ type: 'q', settings: { text: 'A' } }, { type: 'q', settings: {} }]);
    });
    it('rejects unknown block types and disallowed blocks in template defaults', () => {
      expect(codes('{"type":"faq","blocks":[{"type":"nope"}]}')).toContain('SN3028');
      expect(codes('{"type":"faq","blocks":[{"type":"other"}]}')).toContain('SN3029');
      expect(codes('{"type":"faq","blocks":[{"type":"q"},{"type":"q"},{"type":"q"}]}')).toContain('SN3029');
      expect(codes('{"type":"faq","blocks":[{"type":"q"},{"type":"q"}]}')).toEqual([]);
    });
    it('rejects malformed blocks lists with SN3026', () => {
      expect(codes('{"type":"faq","blocks":"x"}')).toContain('SN3026');
      expect(codes('{"type":"faq","blocks":[{"settings":{}}]}')).toContain('SN3026');
    });
  });
  it('compiles collection settings and setting loop limits, checking them against the schemas (SN2012)', () => {
    const files = (sec: string, theme: Record<string, unknown> = {}) => [...base().filter((x) => x.path !== 'sections/hero.sneferu' && x.path !== 'theme.json'),
      f('theme.json', JSON.stringify({ ...manifest, settings: theme })),
      f('sections/hero.sneferu', `${sec}<hk-schema>{"name":"Hero","settings":{"title":{"type":"text","label":"T"},"list":{"type":"collection","label":"Collection","default":"featured"},"count":{"type":"range","label":"N","min":1,"max":24,"default":4}}}</hk-schema>`)];
    const ok = compileTheme(files("<ul>{% for p in collection(section.settings.list).products limit: section.settings.count %}<li>{{ p.title }}</li>{% endfor %}</ul>"), reg);
    expect(ok.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect((ok.artifact!.sections.hero!.ir[0] as { children: unknown[] }).children).toContainEqual(expect.objectContaining({ k: 'loop', limit: { k: 'path', p: ['section', 'settings', 'count'] } }));
    const codes = (sec: string, theme?: Record<string, unknown>) => compileTheme(files(sec, theme), reg).diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);
    expect(codes('{{ collection(section.settings.title).title }}')).toEqual(['SN2012']);
    expect(codes('{{ collection(settings.home).title }}')).toEqual(['SN2012']);
    expect(codes('{{ collection(settings.home).title }}', { home: { type: 'collection', label: 'Home' } })).toEqual([]);
  });
  it('checks collection(settings.x) when theme.json has no settings key (SN2012)', () => {
    const { settings: _drop, ...noSettings } = manifest;
    const files = [...base().filter((x) => x.path !== 'sections/hero.sneferu' && x.path !== 'theme.json'),
      f('theme.json', JSON.stringify(noSettings)),
      f('sections/hero.sneferu', '<p>{{ collection(settings.home).title }}</p><hk-schema>{"name":"Hero","settings":{}}</hk-schema>')];
    expect(compileTheme(files, reg).diagnostics.filter((d) => d.severity === 'error').map((d) => d.code).sort()).toEqual(['SN2012', 'SN3021']);
  });
  it('warns (SN3034) for assets the store does not serve, never for images', () => {
    const bin = (path: string): ThemeFile => ({ path, bytes: new Uint8Array([1, 2, 3]) });
    const files = [...base(), bin('assets/app.js'), bin('assets/f.woff2'), bin('assets/f.ttf'), bin('assets/favicon.ico'), bin('assets/a.png'), bin('assets/b.svg'), f('assets/a.css', 'a{}')];
    const { artifact, diagnostics } = compileTheme(files, reg);
    expect(artifact).toBeDefined();
    const w = diagnostics.filter((d) => d.code === 'SN3034');
    expect(w.map((d) => d.file)).toEqual(['assets/app.js', 'assets/f.ttf', 'assets/f.woff2', 'assets/favicon.ico']);
    expect(w.every((d) => d.severity === 'warning')).toBe(true);
    expect(w[0]!.message).toBe("asset 'assets/app.js' is not served on the store (only images are)");
  });
  it('exports IMAGE_ASSET for the image types the store serves', () => {
    for (const ok of ['a.png', 'a.jpeg', 'a.webp', 'a.avif', 'a.gif', 'a.svg']) expect(IMAGE_ASSET.test(ok), ok).toBe(true);
    for (const no of ['a.js', 'a.css', 'a.woff2', 'a.ico', 'a.png.js']) expect(IMAGE_ASSET.test(no), no).toBe(false);
  });
});
