import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileTheme, type ThemeFile } from '@hekana/sneferu-compiler';
import { renderPage, type ArtifactLike } from '@hekana/sneferu-runtime';
import { createDefaultRegistry } from '@hekana/sneferu-components';
import { resolveDevRoute } from './dev-routes';
import { sampleContext, withSampleData, pickSampleData } from './sample-data';

const root = fileURLToPath(new URL('../../..', import.meta.url));
const starter = join(root, 'packages/templates-default/theme');
const read = (p: string) => readFileSync(join(starter, p), 'utf8');
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const registry = createDefaultRegistry();
const { artifact } = compileTheme(walk(starter).map((p) => ({ path: relative(starter, p).split('\\').join('/'), bytes: readFileSync(p) }) as ThemeFile), registry);
const a = artifact as unknown as ArtifactLike & { locales: Record<string, Record<string, string>>; manifest: { defaultLocale?: string } };

function html(url: string, locale: 'ar' | 'en'): string {
  const dl = (a.manifest.defaultLocale ?? 'en') as 'ar' | 'en';
  const ctx = withSampleData(sampleContext(locale, a.locales, dl, { responsive: true, devLinks: true }), pickSampleData(undefined, locale));
  const u = new URL(url, 'http://dev');
  const route = resolveDevRoute({ path: u.pathname, query: u.searchParams, locale, defaultLocale: dl, products: ctx.products, collections: ctx.collections });
  return renderPage(a, { template: route.template, ctx, registry, scope: route.scope, request: { path: route.path } }).html;
}

describe('starter stylesheet', () => {
  const css = read('assets/theme.css');
  it('hides the skip link without parking it thousands of pixels off screen (RTL safe)', () => {
    expect(css).not.toMatch(/-9999px|-?\d{4,}px/);
    expect(css).toMatch(/\.sf-skip:not\(:focus\)\{[^}]*clip(-path)?:/);
    expect(css).toMatch(/\.sf-skip\{[^}]*inset-inline-start:0/);
  });
  it('anchors the header search panel to the phone viewport so it cannot run off screen', () => {
    expect(css).toMatch(/\.sf-header\{[^}]*position:relative/);
    expect(css).toMatch(/@media \(max-width:759px\)\{[^@]*\.sf-search-toggle\{position:static\}[^@]*\.sf-search-panel\{[^}]*inset-inline:/);
  });
});

describe('starter copy', () => {
  const keys = (l: string) => Object.keys(JSON.parse(read(`locales/${l}.json`))).sort();
  it('has the same locale keys in ar and en, and the new copy keys exist', () => {
    expect(keys('ar')).toEqual(keys('en'));
    for (const k of ['hero_title', 'hero_text', 'product_note']) expect(keys('en')).toContain(k);
  });
  it('reads as a real store, not a placeholder, in both languages', () => {
    const en = html('/', 'en') + html('/products/sample-1', 'en');
    const ar = html('/', 'ar') + html('/products/sample-1', 'ar');
    expect(en).not.toContain('Welcome to our store');
    expect(en).toContain(JSON.parse(read('locales/en.json')).hero_title);
    expect(ar).toContain(JSON.parse(read('locales/ar.json')).hero_title);
    expect(ar).toContain(JSON.parse(read('locales/ar.json')).product_note);
  });
  it('lets a merchant setting override the locale copy', () => {
    expect(read('sections/hero.snf')).toContain("default: t('hero_title')");
  });
});
