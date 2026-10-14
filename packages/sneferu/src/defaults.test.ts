import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileTheme, type ThemeFile } from '@hekana/sneferu-compiler';
import { renderPage, type ArtifactLike, type RenderContext } from '@hekana/sneferu-runtime';
import { createDefaultRegistry } from '@hekana/sneferu-components';
import { formatDiagnostic } from '@hekana/sneferu-core';
import { resolveDevRoute } from './dev-routes';
import { sampleContext, withSampleData, pickSampleData } from './sample-data';

const root = fileURLToPath(new URL('../../..', import.meta.url));
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const load = (dir: string): ThemeFile[] => walk(dir).filter((p) => !/\.sneferu-dev|docs\/|README/.test(p)).map((p) => ({ path: relative(dir, p).split('\\').join('/'), bytes: readFileSync(p) }));
const registry = createDefaultRegistry();

/** Renders a dev URL the way `sneferu dev` does, groups from the theme's defaults. */
function page(artifact: ArtifactLike & { locales: Record<string, Record<string, string>>; manifest: { defaultLocale?: string } }, url: string, locale: 'ar' | 'en', sampleRaw?: unknown) {
  const u = new URL(url, 'http://dev');
  const dl = (artifact.manifest.defaultLocale ?? 'en') as 'ar' | 'en';
  const ctx = withSampleData(sampleContext(locale, artifact.locales, dl, { responsive: true, devLinks: true }), pickSampleData(sampleRaw, locale));
  const route = resolveDevRoute({ path: u.pathname, query: u.searchParams, locale, defaultLocale: dl, products: ctx.products, collections: ctx.collections });
  const r = renderPage(artifact, { template: route.template, ctx, registry, scope: route.scope, request: { path: route.path }, localization: { alternateUrl: `/${locale === 'ar' ? 'en' : 'ar'}${route.path === '/' ? '' : route.path}` } });
  return { ...route, ...r };
}

describe('the default store', () => {
  const { artifact, diagnostics } = compileTheme(load(join(root, 'packages/templates-default/theme')), registry);
  const a = artifact as unknown as ArtifactLike & { locales: Record<string, Record<string, string>>; manifest: { defaultLocale?: string } };
  it('compiles with no diagnostics at all', () => {
    expect(diagnostics.map(formatDiagnostic)).toEqual([]);
    expect(artifact!.defaults).toBeUndefined();
    expect(Object.keys(artifact!.groups).sort()).toEqual(['announcement', 'footer', 'header']);
  });
  const urls = ['/', '/products/sample-1', '/products/sample-2', '/products/sample-3', '/products', '/products?page=2', '/category/gift-cards', '/search?q=card', '/search?q=zzzz', '/search', '/cart', '/pages/about', '/nope'];
  for (const locale of ['en', 'ar'] as const) {
    for (const url of urls) {
      it(`${locale} ${url} renders through the theme with the shared header and footer and no diagnostics`, () => {
        const r = page(a, url, locale);
        expect(r.diagnostics.map(formatDiagnostic)).toEqual([]);
        expect(r.html).toContain('data-hk-theme="starter"');
        expect(r.html).toContain('<div data-hk-group="header">');
        expect(r.html).toContain('<div data-hk-group="footer">');
        expect(r.html).toContain(locale === 'ar' ? 'dir="rtl"' : 'dir="ltr"');
        expect(r.status).toBe(url === '/nope' ? 404 : 200);
      });
    }
  }
  it('product page: gallery, variants, buy box and the controllers it needs', () => {
    const r = page(a, '/products/sample-2', 'en');
    expect(r.html).toContain('data-hk-controller="gallery"');
    expect(r.html).toContain('data-hk-controller="variant-picker"');
    expect(r.html).toContain('data-hk-controller="add-to-cart"');
    expect(r.html).toContain('data-hk-bind="price"');
    expect(r.html).toContain('<h1');
    expect(r.html).toContain('PUBG UC pack');
    expect(r.controllers.sort()).toEqual(['add-to-cart', 'cart-count', 'cart-drawer', 'cart-items', 'cart-summary', 'gallery', 'variant-picker']);
  });
  it('collection page lists products and paginates; search shows results or a no-results state', () => {
    const c = page(a, '/products', 'en');
    expect((c.html.match(/class="sf-card /g) ?? []).length).toBe(8);
    expect(c.html).toContain('class="sn-c');
    expect(c.html).toContain('aria-label="Pagination"');
    expect(page(a, '/products?page=2', 'en').html).toContain('rel="prev"');
    expect(page(a, '/search?q=card', 'en').html).toContain('Results for');
    expect(page(a, '/search?q=zzzz', 'en').html).toContain('No results found');
    expect(page(a, '/search', 'en').html).toContain('Type the name of what you are looking for.');
  });
  it('cart page: the empty state, the summary and the fallback link', () => {
    const r = page(a, '/cart', 'en');
    expect(r.html).toContain('data-hk-controller="cart-items"');
    expect(r.html).toContain('Your cart is empty');
    expect(r.html).toContain('data-hk-fallback');
    expect(r.html).toContain('data-hk-controller="cart-summary"');
  });
  it('404 page says so and offers a way home', () => {
    const r = page(a, '/nope', 'en');
    expect(r.html).toContain('This page does not exist');
    expect(r.html).toContain('Back to the home page');
  });
});

describe('the example themes are complete stores of their own', () => {
  const names = ['arcade', 'bento', 'console', 'creator', 'esports', 'license'];
  const own = ['index', 'product', 'product.digital', 'collection', 'search', 'cart', 'page', '404'];
  for (const name of names) {
    const dir = join(root, 'examples/themes', name);
    const files = load(dir);
    const sampleRaw = (() => { try { return JSON.parse(readFileSync(join(dir, '.sneferu-dev/data.json'), 'utf8')); } catch { return undefined; } })();
    const { artifact, diagnostics } = compileTheme(files, registry);
    const a = artifact as unknown as ArtifactLike & { locales: Record<string, Record<string, string>>; manifest: { defaultLocale?: string; locales: ('ar' | 'en')[] } };
    it(`${name}: validates clean and ships its own template for every page type`, () => {
      expect(diagnostics.filter((d) => d.severity === 'error').map(formatDiagnostic)).toEqual([]);
      expect(a.manifest).toMatchObject({ version: '2.0.0' });
      for (const t of own) expect(readdirSync(join(dir, 'templates')), `${name} templates`).toContain(`${t}.snf`);
      // nothing is filled in from the SDK's default store: the theme overrides every page type and group
      expect(artifact!.defaults?.templates ?? []).toEqual([]);
      expect(artifact!.defaults?.groups ?? []).toEqual([]);
      expect(Object.keys(artifact!.groups).sort()).toEqual(['announcement', 'footer', 'header']);
    });
    it(`${name}: every page type renders through the theme with the shared header and footer`, () => {
      for (const locale of a.manifest.locales) {
        for (const url of ['/', '/products/sample-1', '/products', '/category/new', '/search?q=card', '/cart', '/pages/about', '/nope']) {
          const r = page(a, url, locale, sampleRaw);
          expect(r.diagnostics.map(formatDiagnostic), `${name} ${locale} ${url}`).toEqual([]);
          expect(r.html).toContain(`data-hk-theme="${a.manifest.id}"`);
          expect(r.html, `${name} ${locale} ${url} header`).toContain('<div data-hk-group="header">');
          expect(r.html, `${name} ${locale} ${url} footer`).toContain('<div data-hk-group="footer">');
          expect(r.html).toContain(locale === 'ar' ? 'dir="rtl"' : 'dir="ltr"');
          expect(r.status, `${name} ${locale} ${url}`).toBe(url === '/nope' ? 404 : 200);
        }
      }
    });
    it(`${name}: the header carries the live cart count and the product page the buy controls`, () => {
      const home = page(a, '/', 'en', sampleRaw);
      expect(home.controllers).toContain('cart-count');
      const product = page(a, '/products/sample-1', 'en', sampleRaw);
      for (const c of ['add-to-cart', 'cart-count']) expect(product.controllers, `${name} ${c}`).toContain(c);
    });
  }
});
