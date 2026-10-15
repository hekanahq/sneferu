import type { Field } from './fields';
import { FONTS } from './fonts';

/**
 * Checkout branding. The checkout and payment pages are Hekana's own code on every store; a theme
 * (theme.json `checkout`) and a merchant (the builder's Checkout page) may only brand them with this
 * fixed set of settings, which the platform turns into CSS custom properties. No markup, no template,
 * no tag of a theme reaches the checkout.
 *
 * The ids, limits and the defaults below match the platform's own list (Hekana
 * `packages/shared/src/hk2-checkout-brand.ts`); keep the two in step.
 */

/** The theme settings key that holds the merchant's checkout overrides; a theme setting may not use it. */
export const CHECKOUT_SETTINGS_KEY = 'checkout';

export const CHECKOUT_COLOR_IDS = ['color_accent', 'color_button', 'color_button_text', 'color_background', 'color_surface', 'color_border', 'color_text'] as const;
export type CheckoutColorId = (typeof CHECKOUT_COLOR_IDS)[number];
export const CHECKOUT_BUTTON_SHAPES = ['square', 'rounded', 'pill'] as const;
export type CheckoutButtonShape = (typeof CHECKOUT_BUTTON_SHAPES)[number];
export const CHECKOUT_LOGO_MODES = ['store', 'custom', 'none'] as const;
export type CheckoutLogoMode = (typeof CHECKOUT_LOGO_MODES)[number];
export const CHECKOUT_CHROME_MODES = ['theme', 'minimal'] as const;
export type CheckoutChromeMode = (typeof CHECKOUT_CHROME_MODES)[number];

/** `font: "default"` is the theme's own body font. */
export const CHECKOUT_FONT_DEFAULT = 'default';
export const CHECKOUT_RADIUS_MIN = 0;
export const CHECKOUT_RADIUS_MAX = 24;
export const CHECKOUT_TRUST_NOTE_MAX = 140;

export interface CheckoutSettings {
  color_accent: string;
  color_button: string;
  color_button_text: string;
  color_background: string;
  color_surface: string;
  color_border: string;
  color_text: string;
  font: string;
  radius: number;
  button_shape: CheckoutButtonShape;
  logo: CheckoutLogoMode;
  /** Merchant-only: an uploaded logo for `logo: "custom"`. A theme cannot set it. */
  logo_image: string;
  chrome: CheckoutChromeMode;
  trust_note: { ar: string; en: string };
}
export type CheckoutSettingId = keyof CheckoutSettings;
/** What a theme may set in theme.json `checkout` (every setting but `logo_image`), as the compiler writes it. */
export type ThemeCheckout = Partial<Omit<CheckoutSettings, 'logo_image'>>;

/** Every checkout setting, in editor order (the platform's list). */
export const CHECKOUT_SETTING_IDS: readonly CheckoutSettingId[] = Object.freeze([
  ...CHECKOUT_COLOR_IDS, 'font', 'radius', 'button_shape', 'logo', 'logo_image', 'chrome', 'trust_note',
] as CheckoutSettingId[]);
/** Settings only the merchant sets (in the builder); theme.json `checkout` may not. */
export const CHECKOUT_MERCHANT_ONLY_IDS: readonly CheckoutSettingId[] = Object.freeze(['logo_image'] as CheckoutSettingId[]);
/** The keys theme.json `checkout` accepts. */
export const CHECKOUT_THEME_SETTING_IDS: readonly CheckoutSettingId[] = Object.freeze(CHECKOUT_SETTING_IDS.filter((id) => !CHECKOUT_MERCHANT_ONLY_IDS.includes(id)));

const color = (ar: string, en: string): Field => ({ type: 'color', label: { ar, en }, group: 'colors' });

/**
 * The editor schema of the checkout settings, keyed by id in display order. Colours have no fixed
 * default: they come from the theme's tokens (see `checkoutDefaults`).
 */
export const CHECKOUT_SETTINGS: Readonly<Record<CheckoutSettingId, Field>> = Object.freeze({
  color_accent: color('لون التمييز', 'Accent colour'),
  color_button: color('لون الزر', 'Button colour'),
  color_button_text: color('لون نص الزر', 'Button text colour'),
  color_background: color('الخلفية', 'Background'),
  color_surface: color('لون البطاقات', 'Surface colour'),
  color_border: color('لون الحدود', 'Border colour'),
  color_text: color('لون النص', 'Text colour'),
  font: { type: 'select', label: { ar: 'الخط', en: 'Font' }, options: [CHECKOUT_FONT_DEFAULT, ...Object.keys(FONTS)], default: CHECKOUT_FONT_DEFAULT, group: 'typography' },
  radius: { type: 'range', label: { ar: 'استدارة الزوايا', en: 'Corner radius' }, min: CHECKOUT_RADIUS_MIN, max: CHECKOUT_RADIUS_MAX, step: 1, default: 8, group: 'shape' },
  button_shape: { type: 'select', label: { ar: 'شكل الزر', en: 'Button shape' }, options: [...CHECKOUT_BUTTON_SHAPES], default: 'rounded', group: 'shape' },
  logo: { type: 'select', label: { ar: 'الشعار', en: 'Logo' }, options: [...CHECKOUT_LOGO_MODES], default: 'store', group: 'logo' },
  logo_image: { type: 'image', label: { ar: 'صورة الشعار', en: 'Logo image' }, default: '', group: 'logo', visible_if: { setting: 'logo', equals: 'custom' } },
  chrome: { type: 'select', label: { ar: 'رأس وتذييل الصفحة', en: 'Header and footer' }, options: [...CHECKOUT_CHROME_MODES], default: 'theme', group: 'layout' },
  trust_note: { type: 'textarea', label: { ar: 'رسالة الثقة', en: 'Trust note' }, maxLength: CHECKOUT_TRUST_NOTE_MAX, localized: true, default: { ar: '', en: '' }, group: 'trust' },
});

// ── values ──────────────────────────────────────────────────────────────────

const HEX6 = /^#[0-9a-f]{6}$/i;
const HEX3 = /^#[0-9a-f]{3}$/i;
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f-\u009f‎‏‪-‮⁦-⁩]/g;
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** `#abc` / `#AABBCC` → `#aabbcc`; anything else null. */
export function normalizeCheckoutColor(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (HEX6.test(s)) return s.toLowerCase();
  if (HEX3.test(s)) return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`.toLowerCase();
  return null;
}

/** Plain text for the trust note: control and bidi-override characters out, whitespace collapsed. Not capped. */
export function cleanCheckoutText(v: unknown): string {
  if (typeof v !== 'string') return '';
  return v.replace(CONTROL, ' ').replace(/\s+/g, ' ').trim();
}

// ── colour maths (WCAG 2.x) ─────────────────────────────────────────────────

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}
/** WCAG contrast ratio of two `#rrggbb` colours (1..21). */
export function checkoutContrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
const INK = '#111111';
const PAPER = '#ffffff';
/** Text on `bg`: near-black or white, whichever reads better. */
export function checkoutReadableOn(bg: string): string {
  return checkoutContrast(bg, INK) >= checkoutContrast(bg, PAPER) ? INK : PAPER;
}
const isDark = (hex: string) => luminance(hex) < 0.18;

// ── defaults ────────────────────────────────────────────────────────────────

function tokenColor(colors: Record<string, unknown>, settings: Record<string, unknown>, ...names: string[]): string | null {
  for (const name of names) {
    const fromSetting = normalizeCheckoutColor(settings[`token_color_${name}`]);
    if (fromSetting) return fromSetting;
    const fromToken = normalizeCheckoutColor(colors[name]);
    if (fromToken) return fromToken;
  }
  return null;
}
function px(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const m = /^\s*(\d+(?:\.\d+)?)\s*(px)?\s*$/.exec(v);
    if (m) return Number(m[1]);
  }
  return null;
}

/**
 * The checkout defaults a theme's tokens imply (the platform's first layer, before the theme's
 * `checkout` block and the merchant's overrides). `themeSettings` are resolved theme settings
 * (`token_color_*`, `token_font_body`, `token_radius`), which win over the tokens.
 *
 * - background: `background`, else white; text: `text` / `foreground` / `ink`, else readable on the background
 * - surface: `surface`, else the background; border: `border` / `line`, else a grey for the background
 * - button: `primary` / `accent`, else the text colour; accent: `accent` / `primary`, else the button
 * - button text: black or white, whichever reads better on the button
 * - font: the body font (`"default"` when it is not in the catalogue); radius: `radius.md` (8 px), clamped 0–24
 * - button shape: `square` when the radius is 0, else `rounded`; logo `store`; chrome `theme`; no trust note
 */
export function checkoutDefaults(tokens: unknown, themeSettings: Record<string, unknown> = {}): CheckoutSettings {
  const t = isObj(tokens) ? tokens : {};
  const colors = isObj(t.colors) ? t.colors : {};
  const fontTokens = isObj(t.fonts) ? t.fonts : {};
  const s = themeSettings;
  const background = tokenColor(colors, s, 'background') ?? PAPER;
  const text = tokenColor(colors, s, 'text', 'foreground', 'ink') ?? checkoutReadableOn(background);
  const surface = tokenColor(colors, s, 'surface') ?? background;
  const border = tokenColor(colors, s, 'border', 'line') ?? (isDark(background) ? '#3a3a3a' : '#e5e7eb');
  const button = tokenColor(colors, s, 'primary', 'accent') ?? text;
  const accent = tokenColor(colors, s, 'accent', 'primary') ?? button;
  const bodyFont = typeof s.token_font_body === 'string' && s.token_font_body !== CHECKOUT_FONT_DEFAULT ? s.token_font_body : fontTokens.body;
  const font = typeof bodyFont === 'string' && Object.hasOwn(FONTS, bodyFont) ? bodyFont : CHECKOUT_FONT_DEFAULT;
  const radiusTokens = isObj(t.radius) ? t.radius : {};
  const radiusRaw = px(s.token_radius) ?? px(radiusTokens.md) ?? px(t.radius) ?? 8;
  const radius = Math.round(Math.min(CHECKOUT_RADIUS_MAX, Math.max(CHECKOUT_RADIUS_MIN, radiusRaw)));
  return {
    color_accent: accent,
    color_button: button,
    color_button_text: checkoutReadableOn(button),
    color_background: background,
    color_surface: surface,
    color_border: border,
    color_text: text,
    font,
    radius,
    button_shape: radius === 0 ? 'square' : 'rounded',
    logo: 'store',
    logo_image: '',
    chrome: 'theme',
    trust_note: { ar: '', en: '' },
  };
}
