import { describe, it, expect } from 'vitest';
import {
  CHECKOUT_SETTINGS, CHECKOUT_SETTING_IDS, CHECKOUT_THEME_SETTING_IDS, CHECKOUT_MERCHANT_ONLY_IDS, CHECKOUT_SETTINGS_KEY,
  checkoutDefaults, checkoutContrast, checkoutReadableOn, normalizeCheckoutColor, cleanCheckoutText,
} from './checkout';
import { FIELD_TYPES } from './fields';
import { FONTS } from './fonts';

describe('CHECKOUT_SETTINGS', () => {
  it('has the platform ids, in order, each with a field of a known type and both labels', () => {
    expect(CHECKOUT_SETTING_IDS).toEqual(['color_accent', 'color_button', 'color_button_text', 'color_background', 'color_surface', 'color_border', 'color_text', 'font', 'radius', 'button_shape', 'logo', 'logo_image', 'chrome', 'trust_note']);
    expect(Object.keys(CHECKOUT_SETTINGS)).toEqual([...CHECKOUT_SETTING_IDS]);
    for (const f of Object.values(CHECKOUT_SETTINGS)) {
      expect(FIELD_TYPES).toContain(f.type);
      expect(f.label.ar).toBeTruthy();
      expect(f.label.en).toBeTruthy();
      expect(f.group).toBeTruthy();
    }
    expect(CHECKOUT_SETTINGS_KEY).toBe('checkout');
  });
  it('keeps logo_image merchant-only', () => {
    expect(CHECKOUT_MERCHANT_ONLY_IDS).toEqual(['logo_image']);
    expect(CHECKOUT_THEME_SETTING_IDS).not.toContain('logo_image');
    expect(CHECKOUT_THEME_SETTING_IDS).toHaveLength(13);
  });
  it('limits radius, enums, fonts and the trust note', () => {
    expect(CHECKOUT_SETTINGS.radius).toMatchObject({ type: 'range', min: 0, max: 24, step: 1 });
    expect(CHECKOUT_SETTINGS.button_shape.options).toEqual(['square', 'rounded', 'pill']);
    expect(CHECKOUT_SETTINGS.logo.options).toEqual(['store', 'custom', 'none']);
    expect(CHECKOUT_SETTINGS.chrome.options).toEqual(['theme', 'minimal']);
    expect(CHECKOUT_SETTINGS.font.options).toEqual(['default', ...Object.keys(FONTS)]);
    expect(CHECKOUT_SETTINGS.trust_note).toMatchObject({ type: 'textarea', maxLength: 140, localized: true });
  });
});

describe('checkout values', () => {
  it('normalises colours to lower-case #rrggbb', () => {
    expect(normalizeCheckoutColor('#ABC')).toBe('#aabbcc');
    expect(normalizeCheckoutColor(' #A3E635 ')).toBe('#a3e635');
    for (const bad of ['red', '#abcd', '#12345g', 12, null]) expect(normalizeCheckoutColor(bad)).toBeNull();
  });
  it('cleans the trust note of control and bidi characters', () => {
    expect(cleanCheckoutText('  a‮ b\n\tc ')).toBe('a b c');
  });
  it('computes WCAG contrast and picks a readable label', () => {
    expect(checkoutContrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(checkoutReadableOn('#ffffff')).toBe('#111111');
    expect(checkoutReadableOn('#0f172a')).toBe('#ffffff');
  });
});

describe('checkoutDefaults', () => {
  it('derives the colours, font and radius from the tokens', () => {
    const d = checkoutDefaults({
      colors: { primary: '#0F766E', secondary: '#334155', accent: '#B45309', background: '#FAFAF9', text: '#1C1917' },
      fonts: { body: 'Tajawal' }, radius: { md: '12px' },
    });
    expect(d).toEqual({
      color_accent: '#b45309', color_button: '#0f766e', color_button_text: '#ffffff', color_background: '#fafaf9',
      color_surface: '#fafaf9', color_border: '#e5e7eb', color_text: '#1c1917', font: 'Tajawal', radius: 12,
      button_shape: 'rounded', logo: 'store', logo_image: '', chrome: 'theme', trust_note: { ar: '', en: '' },
    });
  });
  it('falls back without tokens, clamps the radius and squares a zero radius', () => {
    const d = checkoutDefaults(undefined);
    expect(d.color_background).toBe('#ffffff');
    expect(d.color_text).toBe('#111111');
    expect(d.color_button).toBe('#111111');
    expect(d.color_button_text).toBe('#ffffff');
    expect(d.font).toBe('default');
    expect(d.radius).toBe(8);
    expect(checkoutDefaults({ radius: { md: '40px' } }).radius).toBe(24);
    const sq = checkoutDefaults({ radius: { md: '0px' } });
    expect([sq.radius, sq.button_shape]).toEqual([0, 'square']);
    expect(checkoutDefaults({ colors: { background: '#000000' } }).color_border).toBe('#3a3a3a');
    expect(checkoutDefaults({ fonts: { body: 'NotAFont' } }).font).toBe('default');
  });
  it('lets resolved theme settings win over the tokens', () => {
    const d = checkoutDefaults({ colors: { primary: '#0f766e', background: '#ffffff' }, fonts: { body: 'Cairo' } }, { token_color_primary: '#1D4ED8', token_font_body: 'Inter', token_radius: 4 });
    expect([d.color_button, d.font, d.radius]).toEqual(['#1d4ed8', 'Inter', 4]);
    expect(checkoutDefaults({ fonts: { body: 'Cairo' } }, { token_font_body: 'default' }).font).toBe('Cairo');
  });
});
