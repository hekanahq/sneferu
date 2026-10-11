import { describe, it, expect } from 'vitest';
import { compileTheme, parseExpr, type ThemeFile } from '@hekana/sneferu-compiler';
import { evaluate, renderPage } from '@hekana/sneferu-runtime';
import { createDefaultRegistry } from '@hekana/sneferu-components';
import { sampleContext } from './sample-data';

const enc = new TextEncoder();
const f = (path: string, text: string): ThemeFile => ({ path, bytes: enc.encode(text) });
const manifest = {
  id: 'links', name: 'Links', version: '1.0.0', author: 'Hekana', description: 'Theme', category: 'general', engine: 'hk2', engineCompatibility: '^2.0.0',
  defaultLocale: 'ar', locales: ['ar', 'en'], settings: {},
  tokens: { colors: { primary: '#111111', secondary: '#222222', accent: '#B45309', background: '#FFFFFF', text: '#111111' } },
};
const theme = (extra: Record<string, unknown> = {}): ThemeFile[] => [
  f('theme.json', JSON.stringify({ ...manifest, ...extra })),
  f('layout/theme.sneferu', '<main><hk-slot name="content" /></main>'),
  f('templates/index.sneferu', '<a class="all" href="{{ url(\'/products\') }}">All</a><p class="m">{{ 129000 | money }}</p><hk-price amount="{{ 129000 }}" /><hk-button label="Shop" href="/products" />'),
  f('locales/ar.json', '{}'),
  f('locales/en.json', '{}'),
];
const registry = createDefaultRegistry();
const render = (locale: 'ar' | 'en', extra: Record<string, unknown> = {}) => {
  const { artifact, diagnostics } = compileTheme(theme(extra), registry);
  expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const r = renderPage(artifact!, { template: 'index', ctx: sampleContext(locale, artifact!.locales, 'ar'), registry });
  expect(r.diagnostics).toEqual([]);
  return r.html;
};
const evalExpr = (src: string, { locale }: { locale: 'ar' | 'en' }) => evaluate(parseExpr(src).expr!, {}, sampleContext(locale, {}, 'ar'));

describe('url() and money options end to end', () => {
  it('url() is locale-aware and always safe', () => {
    expect(evalExpr("url('/products')", { locale: 'en' })).toBe('/en/products');
    expect(evalExpr("url('/en/products')", { locale: 'en' })).toBe('/en/products');
    expect(evalExpr("url('javascript:x')", { locale: 'ar' })).toBe('#');
    expect(evalExpr("url('https://x.com')", { locale: 'en' })).toBe('https://x.com');
    expect(evalExpr("url('/products')", { locale: 'ar' })).toBe('/products');
  });
  it('links in templates and hk-button follow the page locale', () => {
    const en = render('en');
    expect(en).toContain('<a class="all" href="/en/products">');
    expect(en).toContain('sn-btn-solid" href="/en/products">Shop</a>');
    const ar = render('ar');
    expect(ar).toContain('<a class="all" href="/products">');
    expect(ar).toContain('sn-btn-solid" href="/products">Shop</a>');
  });
  it('without money.format, money and hk-price print two decimals and no <bdi> (0.2 markup)', () => {
    const ar = render('ar');
    expect(ar).toContain('<p class="m">1,290.00 ج.م</p>');
    expect(ar).toContain('<span class="sn-now">1,290.00 ج.م</span>');
    expect(ar).not.toContain('<bdi>');
  });
  it('theme.json money.format "whole" sets the default for the filter and hk-price', () => {
    const ar = render('ar', { money: { format: 'whole' } });
    expect(ar).toContain('<p class="m">1,290 ج.م</p>');
    expect(ar).toContain('<span class="sn-now"><bdi>1,290</bdi> ج.م</span>');
    const en = render('en', { money: { format: 'whole' } });
    expect(en).toContain('<p class="m">EGP 1,290</p>');
    expect(en).toContain('<span class="sn-now">EGP <bdi>1,290</bdi></span>');
  });
});
