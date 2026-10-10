import { describe, it, expect } from 'vitest';
import { TagRegistry } from '@hekana/sneferu-core';
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
});
