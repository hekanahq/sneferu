import { describe, it, expect } from 'vitest';
import { TagRegistry, validateIR } from '@hekana/sneferu-core';
import { compileTheme, type ThemeFile } from './compile';

const enc = new TextEncoder();
const f = (path: string, text: string): ThemeFile => ({ path, bytes: enc.encode(text) });
const manifest = {
  id: 'esports', name: { ar: 'إي سبورتس', en: 'Esports' }, version: '1.0.0', author: 'Hekana',
  description: { ar: 'قالب', en: 'Theme' }, category: 'gaming', engine: 'hk2', engineCompatibility: '^2.0.0',
  defaultLocale: 'ar', locales: ['ar', 'en'], settings: {},
  tokens: { colors: { primary: '#A3E635', secondary: '#2E1065', accent: '#7C3AED', background: '#120A1F', text: '#F5F3FF' } },
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
    const sec = base().map((x) => (x.path === 'sections/hero.sneferu' ? f(x.path, '<p>learn javascript: today</p><hk-schema>{"name":{"ar":"ب","en":"H"},"settings":{}}</hk-schema>') : x));
    const ds = compileTheme(sec, reg).diagnostics.filter((d) => d.severity === 'error');
    expect(ds.map((d) => d.code)).toEqual(['SN9014']);
    expect(ds[0]!.file).toBe('sections/hero.sneferu');
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
});
