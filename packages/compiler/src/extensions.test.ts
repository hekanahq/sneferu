import { describe, it, expect } from 'vitest';
import { TagRegistry, isTemplateFile, stripTemplateExtension, TEMPLATE_EXTENSION, TEMPLATE_EXTENSIONS } from '@hekana/sneferu-core';
import { compileTheme as compileWithDefaults, type ThemeFile } from './compile';
import { checkFiles } from './files';

const compileTheme = (files: ThemeFile[]) => compileWithDefaults(files, new TagRegistry(), { defaults: false });
const enc = new TextEncoder();
const f = (path: string, text: string): ThemeFile => ({ path, bytes: enc.encode(text) });
const manifest = {
  id: 'mixed', name: { ar: 'م', en: 'Mixed' }, version: '1.0.0', author: 'Hekana',
  description: { ar: 'قالب', en: 'Theme' }, category: 'gaming', engine: 'hk2', engineCompatibility: '^2.0.0',
  defaultLocale: 'ar', locales: ['ar', 'en'], settings: {},
  tokens: { colors: { primary: '#A3E635', secondary: '#2E1065', accent: '#B45309', background: '#120A1F', text: '#F5F3FF' } },
};
const HERO = '<section><h1>{{ section.settings.title }}</h1>{% render \'badge\' %}</section><hk-schema>{"name":{"ar":"بطل","en":"Hero"},"version":1,"settings":{"title":{"type":"text","label":{"ar":"ع","en":"T"},"default":"Hi"}}}</hk-schema>';
/** One theme, every template file in `ext`. */
const theme = (ext: string, over: Record<string, string> = {}): ThemeFile[] => {
  const ex = (dir: string, name: string) => over[`${dir}/${name}`] ?? ext;
  return [
    f('theme.json', JSON.stringify(manifest)),
    f(`layout/theme${ex('layout', 'theme')}`, '<main><hk-slot name="content" /></main>'),
    f(`templates/index${ex('templates', 'index')}`, '<hk-sections /><hk-schema>{"sections":[{"type":"hero","settings":{"title":"أهلًا"}}]}</hk-schema>'),
    f(`sections/hero${ex('sections', 'hero')}`, HERO),
    f(`snippets/badge${ex('snippets', 'badge')}`, '<b>new</b>'),
    f('locales/ar.json', '{"buy":"اشتري"}'),
    f('locales/en.json', '{"buy":"Buy"}'),
  ];
};
const errors = (files: ThemeFile[]) => compileTheme(files).diagnostics.filter((d) => d.severity === 'error');

describe('template file extensions: .snf, and .sneferu still works', () => {
  it('core helpers', () => {
    expect(TEMPLATE_EXTENSION).toBe('.snf');
    expect([...TEMPLATE_EXTENSIONS]).toEqual(['.snf', '.sneferu']);
    expect(isTemplateFile('sections/hero.snf')).toBe(true);
    expect(isTemplateFile('sections/hero.sneferu')).toBe(true);
    expect(isTemplateFile('sections/hero.snfx')).toBe(false);
    expect(isTemplateFile('dist/x.sneferu.json')).toBe(false);
    expect(stripTemplateExtension('sections/hero.snf')).toBe('sections/hero');
    expect(stripTemplateExtension('sections/hero.sneferu')).toBe('sections/hero');
  });

  it('a theme in .snf, in .sneferu, or mixed compiles to the same artifact', () => {
    const snf = compileTheme(theme('.snf'));
    const old = compileTheme(theme('.sneferu'));
    const mixed = compileTheme(theme('.snf', { 'sections/hero': '.sneferu', 'snippets/badge': '.sneferu', 'layout/theme': '.sneferu' }));
    for (const r of [snf, old, mixed]) expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(snf.artifact!.hash).toBe(old.artifact!.hash);
    expect(mixed.artifact!.hash).toBe(snf.artifact!.hash);
    expect(Object.keys(snf.artifact!.sections)).toEqual(['hero']);
    expect(Object.keys(snf.artifact!.snippets)).toEqual(['badge']);
  });

  it("render 'name' resolves a snippet in either form", () => {
    for (const [hero, badge] of [['.snf', '.sneferu'], ['.sneferu', '.snf']]) {
      const r = compileTheme(theme('.snf', { 'sections/hero': hero!, 'snippets/badge': badge! }));
      expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      expect(JSON.stringify(r.artifact!.sections.hero!.ir)).toContain('badge');
    }
    // a snippet that does not exist in either form is still reported
    const missing = errors(theme('.snf').filter((x) => !x.path.startsWith('snippets/')));
    expect(missing.length).toBeGreaterThan(0);
    expect(missing[0]!.file).toBe('sections/hero.snf');
  });

  it('SN3044: one name in both forms in the same folder', () => {
    const files = [...theme('.snf'), f('sections/hero.sneferu', HERO)];
    const d = checkFiles(files).filter((x) => x.code === 'SN3044');
    expect(d).toHaveLength(1);
    expect(d[0]!.file).toBe('sections/hero.sneferu');
    expect(d[0]!.message).toBe("'sections/hero.snf' and 'sections/hero.sneferu' are the same file in two forms (.snf and .sneferu): keep one");
    expect(compileTheme(files).artifact).toBeUndefined();
    // the same name in different folders is fine
    expect(checkFiles([...theme('.snf'), f('snippets/hero.sneferu', '<i></i>')]).some((x) => x.code === 'SN3044')).toBe(false);
  });

  it('messages name the real file', () => {
    const noLayout = errors(theme('.snf').filter((x) => !x.path.startsWith('layout/')));
    expect(noLayout.find((d) => d.code === 'SN3023')!.message).toBe('layout/theme.snf is missing');
    const noIndex = errors(theme('.sneferu').filter((x) => !x.path.startsWith('templates/')));
    expect(noIndex.find((d) => d.code === 'SN3024')!.message).toBe('templates/index.snf is missing');
    const badTemplate = errors([...theme('.snf'), f('templates/home.sneferu', '<hk-sections />')]);
    const sn3035 = badTemplate.find((d) => d.code === 'SN3035')!;
    expect(sn3035.file).toBe('templates/home.sneferu');
    expect(sn3035.message).toMatch(/^'templates\/home\.sneferu' is not a page type/);
    const oldHero = HERO.replace('"settings":{"title"', '"blocks":{"allowed":["nope"]},"settings":{"title"');
    const sn3042 = errors(theme('.snf', { 'sections/hero': '.sneferu' }).map((x) => (x.path === 'sections/hero.sneferu' ? f(x.path, oldHero) : x))).find((d) => d.code === 'SN3042')!;
    expect(sn3042.file).toBe('sections/hero.sneferu');
  });

  it('other extensions are still refused', () => {
    expect(checkFiles([f('sections/hero.html', '<p></p>')]).map((d) => d.code)).toContain('SN3003');
    expect(checkFiles([f('sections/hero.sn', '<p></p>')]).map((d) => d.code)).toContain('SN3003');
  });
});
