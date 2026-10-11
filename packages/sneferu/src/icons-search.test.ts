import { describe, it, expect } from 'vitest';
import { compileTheme, type ThemeFile } from '@hekana/sneferu-compiler';
import { renderPage } from '@hekana/sneferu-runtime';
import { createDefaultRegistry } from '@hekana/sneferu-components';
import { sampleContext } from './sample-data';

const enc = new TextEncoder();
const f = (path: string, text: string): ThemeFile => ({ path, bytes: enc.encode(text) });
const manifest = {
  id: 'icons', name: 'Icons', version: '1.0.0', author: 'Hekana', description: 'Theme', category: 'general', engine: 'hk2', engineCompatibility: '^2.0.0',
  defaultLocale: 'ar', locales: ['ar', 'en'], settings: {},
  tokens: { colors: { primary: '#111111', secondary: '#222222', accent: '#B45309', background: '#FFFFFF', text: '#111111' } },
};
const registry = createDefaultRegistry();
const compile = (index: string) => compileTheme([
  f('theme.json', JSON.stringify(manifest)),
  f('layout/theme.sneferu', '<main><hk-slot name="content" /></main>'),
  f('templates/index.sneferu', index),
  f('locales/ar.json', '{"search":"بحث"}'),
  f('locales/en.json', '{"search":"Search"}'),
], registry);
const render = (index: string, locale: 'ar' | 'en' = 'ar') => {
  const { artifact, diagnostics } = compile(index);
  expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const r = renderPage(artifact!, { template: 'index', ctx: sampleContext(locale, artifact!.locales, 'ar'), registry });
  expect(r.diagnostics).toEqual([]);
  return r;
};

describe('icons end to end', () => {
  it('hk-icon and button icons compile and render; the RTL flip rule is written once per page', () => {
    const r = render('<hk-icon name="truck" /><hk-icon name="arrow-left" label="{{ t(\'search\') }}" /><hk-button label="Go" href="/products" icon="arrow-right" icon-position="end" />');
    expect(r.html).toContain('<svg class="sn-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20"');
    expect(r.html).toContain('role="img" aria-label="بحث"');
    expect(r.html).toMatch(/>Go<svg class="sn-icon sn-flip"[^>]*aria-hidden="true">/);
    expect(r.css.split('\n').filter((l) => l === '[dir=rtl] .sn-flip{transform:scaleX(-1)}')).toHaveLength(1);
  });
  it('a missing icon name is SN2005; an unknown one renders nothing', () => {
    expect(compile('<hk-icon />').diagnostics.filter((d) => d.severity === 'error').map((d) => d.code)).toEqual(['SN2005']);
    expect(render('<p>a</p><hk-icon name="{{ \'no\' | upcase }}" /><hk-icon name="nope" /><p>b</p>').html).toContain('<p>a</p><p>b</p>');
  });
});
