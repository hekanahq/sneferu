import { describe, it, expect } from 'vitest';
import { TagRegistry } from '@hekana/sneferu-core';
import { compileTheme, type ThemeFile } from './compile';
import { validateCheckout } from './checkout';

const enc = new TextEncoder();
const f = (path: string, text: string): ThemeFile => ({ path, bytes: enc.encode(text) });
const manifest = {
  id: 'shop', name: 'Shop', version: '1.0.0', author: 'Hekana', description: 'Theme', category: 'general',
  engine: 'hk2', engineCompatibility: '^2.0.0', defaultLocale: 'ar', locales: ['ar', 'en'], settings: {},
  tokens: { colors: { primary: '#0f766e', secondary: '#334155', accent: '#b45309', background: '#ffffff', text: '#111827' } },
};
const theme = (extra: Record<string, unknown>): ThemeFile[] => [
  f('theme.json', JSON.stringify({ ...manifest, ...extra })),
  f('layout/theme.snf', '<main><hk-slot name="content" /></main>'),
  f('templates/index.snf', '<p>Hi</p>'),
  f('locales/ar.json', '{}'),
  f('locales/en.json', '{}'),
];
const compile = (extra: Record<string, unknown>) => compileTheme(theme(extra), new TagRegistry(), { defaults: false });
const codes = (ds: { code: string }[]) => ds.map((d) => d.code);

describe('theme.json checkout', () => {
  it('compiles a valid block into manifest.checkout, normalised', () => {
    const { artifact, diagnostics } = compile({ checkout: {
      color_accent: '#B45309', color_button: '#0F766E', color_button_text: '#FFF', color_background: '#ffffff',
      color_surface: '#f5f5f4', color_border: '#e7e5e4', color_text: '#111827', font: 'Tajawal', radius: 12,
      button_shape: 'pill', logo: 'none', chrome: 'minimal', trust_note: { ar: 'الدفع عند الاستلام', en: 'Cash on delivery' },
    } });
    expect(diagnostics).toEqual([]);
    expect(artifact!.manifest.checkout).toEqual({
      color_accent: '#b45309', color_button: '#0f766e', color_button_text: '#ffffff', color_background: '#ffffff',
      color_surface: '#f5f5f4', color_border: '#e7e5e4', color_text: '#111827', font: 'Tajawal', radius: 12,
      button_shape: 'pill', logo: 'none', chrome: 'minimal', trust_note: { ar: 'الدفع عند الاستلام', en: 'Cash on delivery' },
    });
  });
  it('omits the block when it is absent or nothing in it is valid', () => {
    expect(compile({}).artifact!.manifest).not.toHaveProperty('checkout');
    const r = compile({ checkout: { color_button: 'blue', layout: 'wide' } });
    expect(r.artifact!.manifest).not.toHaveProperty('checkout');
    expect(codes(r.diagnostics)).toEqual(['SN3052', 'SN3050']);
    expect(r.diagnostics.every((d) => d.severity === 'warning' && d.file === 'theme.json')).toBe(true);
  });
  it('ignores a block that is not an object (SN3049)', () => {
    for (const bad of ['dark', [], null, 3]) {
      const r = compile({ checkout: bad });
      expect(codes(r.diagnostics), JSON.stringify(bad)).toEqual(['SN3049']);
      expect(r.artifact!.manifest).not.toHaveProperty('checkout');
    }
  });
  it('drops logo_image: merchant-only (SN3051)', () => {
    const r = validateCheckout({ logo: 'custom', logo_image: 'https://cdn.example.com/logo.png' });
    expect(r.checkout).toEqual({ logo: 'custom' });
    expect(codes(r.diagnostics)).toEqual(['SN3051']);
  });
  it('drops unknown keys (SN3050), bad colours (SN3052), unknown fonts (SN3053) and wrong enums (SN3055)', () => {
    const r = validateCheckout({ payment_order: ['cod'], color_text: '#12345', font: 'Comic Sans', button_shape: 'round', logo: 'big', chrome: 'full', radius: 6 });
    expect(r.checkout).toEqual({ radius: 6 });
    expect(codes(r.diagnostics)).toEqual(['SN3050', 'SN3052', 'SN3053', 'SN3055', 'SN3055', 'SN3055']);
    expect(validateCheckout({ font: 'default' })).toEqual({ checkout: { font: 'default' }, diagnostics: [] });
  });
  it('clamps and rounds the radius (SN3054), drops a non-number', () => {
    expect(validateCheckout({ radius: 40 }).checkout).toEqual({ radius: 24 });
    expect(validateCheckout({ radius: -3 }).checkout).toEqual({ radius: 0 });
    expect(validateCheckout({ radius: 6.6 }).checkout).toEqual({ radius: 7 });
    expect(codes(validateCheckout({ radius: 40 }).diagnostics)).toEqual(['SN3054']);
    const s = validateCheckout({ radius: '12px' });
    expect(s.checkout).toBeUndefined();
    expect(codes(s.diagnostics)).toEqual(['SN3054']);
  });
  it('checks the trust note shape (SN3056) and cuts it at 140 characters (SN3057)', () => {
    expect(codes(validateCheckout({ trust_note: 'hi' }).diagnostics)).toEqual(['SN3056']);
    const shape = validateCheckout({ trust_note: { en: 'Safe', fr: 'Sûr', ar: 5 } });
    expect(shape.checkout).toEqual({ trust_note: { ar: '', en: 'Safe' } });
    expect(codes(shape.diagnostics)).toEqual(['SN3056', 'SN3056']);
    const long = validateCheckout({ trust_note: { ar: 'ب'.repeat(200), en: 'ok' } });
    expect(long.checkout!.trust_note!.ar).toHaveLength(140);
    expect(codes(long.diagnostics)).toEqual(['SN3057']);
    expect(validateCheckout({ trust_note: { ar: 'a‮b', en: '' } }).checkout).toEqual({ trust_note: { ar: 'a b', en: '' } });
  });
  it('reserves the theme setting id checkout (SN3048)', () => {
    const r = compile({ settings: { checkout: { type: 'text', label: 'Checkout', default: '' } } });
    expect(r.artifact).toBeUndefined();
    expect(r.diagnostics.filter((d) => d.severity === 'error').map((d) => d.code)).toEqual(['SN3048']);
  });
});
