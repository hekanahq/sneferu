import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileTheme, type ThemeFile } from '@hekana/sneferu-compiler';
import { renderPage, splitCheckout, type ArtifactLike } from '@hekana/sneferu-runtime';
import { createDefaultRegistry } from '@hekana/sneferu-components';
import { formatDiagnostic } from '@hekana/sneferu-core';
import { sampleContext, withSampleData, pickSampleData } from './sample-data';
import { devCheckoutPage } from './dev-checkout';

const root = fileURLToPath(new URL('../../..', import.meta.url));
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const load = (dir: string): ThemeFile[] => walk(dir).filter((p) => !/\.sneferu-dev|docs\/|README/.test(p)).map((p) => ({ path: relative(dir, p).split('\\').join('/'), bytes: readFileSync(p) }));
const registry = createDefaultRegistry();

const checkout = (artifact: ArtifactLike & { locales: Record<string, Record<string, string>>; manifest: { defaultLocale?: string } }, locale: 'ar' | 'en', sections?: unknown) => {
  const dl = (artifact.manifest.defaultLocale ?? 'en') as 'ar' | 'en';
  const ctx = withSampleData(sampleContext(locale, artifact.locales, dl, { responsive: true, devLinks: true }), pickSampleData(undefined, locale));
  return renderPage(artifact, { template: 'checkout', ctx, registry, request: { path: '/checkout' }, ...(sections ? { sections: sections as never } : {}) });
};

describe('the default store has a themed checkout', () => {
  const { artifact, diagnostics } = compileTheme(load(join(root, 'packages/templates-default/theme')), registry);
  const a = artifact as unknown as ArtifactLike & { locales: Record<string, Record<string, string>>; manifest: { defaultLocale?: string } };
  it('compiles clean and marks the checkout section as holding the privileged tags', () => {
    expect(diagnostics.map(formatDiagnostic)).toEqual([]);
    expect(Object.keys(artifact!.templates)).toContain('checkout');
    expect(artifact!.sections['checkout-main']!.schema.privileged).toEqual(['hk-checkout-layout', 'hk-checkout-contact', 'hk-checkout-shipping', 'hk-checkout-summary', 'hk-checkout-payment']);
    expect(artifact!.sections['checkout-main']!.schema.templates).toEqual(['checkout']);
  });
  for (const locale of ['en', 'ar'] as const) {
    it(`${locale}: renders the shared header and footer around the placeholders and splits cleanly`, () => {
      const r = checkout(a, locale);
      expect(r.diagnostics.map(formatDiagnostic)).toEqual([]);
      expect(r.html).toContain('<div data-hk-group="header">');
      expect(r.html).toContain('<div data-hk-group="footer">');
      const split = splitCheckout(r.html);
      expect(split).not.toBeNull();
      expect(split!.before).toContain('data-hk-checkout="layout"');
      expect(split!.after.startsWith('</div>')).toBe(true);
      expect(split!.presentation).toMatchObject({ columns: 'two', summary: 'end', sticky: true, density: 'comfortable', card: 'outlined', order: ['contact', 'shipping', 'payment'] });
      // between the placeholders the page holds no form of any kind (the theme's header has its search form)
      const page = r.html.slice(r.html.indexOf('<main'), r.html.indexOf('</main>'));
      expect(page).not.toMatch(/<form|<input|<script|<select|<textarea|<button/);
    });
  }
});

describe('sneferu dev stub', () => {
  const { artifact } = compileTheme(load(join(root, 'packages/templates-default/theme')), registry);
  const a = artifact as unknown as ArtifactLike & { locales: Record<string, Record<string, string>>; manifest: { defaultLocale?: string } };
  it('puts labelled boxes where the checkout goes and no form control', () => {
    const r = devCheckoutPage(checkout(a, 'en').html, 'en');
    expect(r.html).toContain('class="sn-dev-co"');
    expect(r.html).toContain('Order summary');
    expect(r.html).toContain('Preview only');
    const stub = r.html.slice(r.html.indexOf('class="sn-dev-co"'), r.html.indexOf('Preview only'));
    expect(stub).not.toMatch(/<form|<input|<button|<select|<textarea/);
  });
  it('says so when the page places no usable checkout', () => {
    const r = devCheckoutPage('<main>nothing here</main>', 'en');
    expect(r.html).toContain('default checkout page');
  });
});
