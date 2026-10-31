import { closest } from './validate';
import { checkReservedSettings, validateCheckout } from './checkout';
import { ENGINE_VERSION, FONTS, err, isMoneyFormat, normalizeFieldLabels, normalizeLabel, warn, type Diagnostic, type FieldSchema, type ThemeCheckout } from '@hekana/sneferu-core';

const COLOR_KEY = /^[a-z][a-z0-9-]*$/;

export interface Manifest {
  id: string; name: { ar: string; en: string }; version: string; author: string;
  description: { ar: string; en: string }; category: string; engine: 'hk2'; engineCompatibility: string;
  defaultLocale: 'ar' | 'en'; locales: ('ar' | 'en')[]; settings: FieldSchema;
  tokens: { colors: Record<string, string>; fonts?: { heading?: string; body?: string; mono?: string }; radius?: Record<string, string>; layout?: { contentWidth?: string } };
  previews?: string[];
  /** Default money format for the `money` filter, `hk-price` and `hk-product-card`. */
  money?: { format?: 'decimal' | 'whole' };
  /** Checkout branding (theme.json `checkout`): only valid, normalised values; absent when empty. */
  checkout?: ThemeCheckout;
}

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;
const FONT_ROLES = ['heading', 'body', 'mono'];
/** Case-insensitive "Did you mean" for a font family, answering with the canonical name. */
function fontSuggestion(x: string, families: string[]): string {
  const canon = new Map(families.map((f) => [f.toLowerCase(), f]));
  const best = closest(x.toLowerCase(), canon.keys());
  return best === undefined ? '' : ` Did you mean "${canon.get(best)}"?`;
}
const HEX = /^#[0-9a-fA-F]{6}$/;

/** `^2.0.0` → major 2, >= 2.0.0; `2.1.0` exact. */
export function satisfies(range: string, version: string): boolean {
  const v = SEMVER.exec(version)!.slice(1).map(Number);
  const caret = range.startsWith('^');
  const r = SEMVER.exec(caret ? range.slice(1) : range);
  if (!r) return false;
  const [M, m, p] = r.slice(1).map(Number) as [number, number, number];
  if (!caret) return v[0] === M && v[1] === m && v[2] === p;
  if (v[0] !== M) return false;
  return v[1]! > m || (v[1] === m && v[2]! >= p);
}

export function validateManifest(json: unknown): { manifest?: Manifest; diagnostics: Diagnostic[] } {
  const out: Diagnostic[] = [];
  const at = { file: 'theme.json' };
  const m = json as Partial<Manifest>;
  if (typeof m !== 'object' || m === null) return { diagnostics: [err('SN3009', 'theme.json must be an object', at)] };
  if (!/^[a-z][a-z0-9-]{2,40}$/.test(String(m.id))) out.push(err('SN3012', 'id must be 3–41 lowercase letters, digits or dashes', at));
  // name, description and setting labels may be "Text", { en } or { ar, en };
  // the manifest always carries { ar, en }, with en standing in for a missing ar
  const name = normalizeLabel(m.name);
  if (!name) out.push(err('SN3013', 'name must be a string or { en } (ar is optional)', at));
  if (!SEMVER.test(String(m.version))) out.push(err('SN3014', 'version must be semver x.y.z', at));
  if (typeof m.author !== 'string' || !m.author) out.push(err('SN3015', 'author is required', at));
  const description = normalizeLabel(m.description);
  if (!description) out.push(err('SN3016', 'description must be a string or { en } (ar is optional)', at));
  if (typeof m.category !== 'string' || !m.category) out.push(err('SN3017', 'category is required', at));
  if (m.engine !== 'hk2') out.push(err('SN3010', `engine must be "hk2" (got ${JSON.stringify(m.engine)})`, at));
  else if (typeof m.engineCompatibility !== 'string' || !satisfies(m.engineCompatibility, ENGINE_VERSION)) out.push(err('SN3011', `engineCompatibility ${JSON.stringify(m.engineCompatibility)} does not include engine ${ENGINE_VERSION}`, at));
  if (m.defaultLocale !== 'ar' && m.defaultLocale !== 'en') out.push(err('SN3018', 'defaultLocale must be ar or en', at));
  if (!Array.isArray(m.locales) || !m.locales.includes(m.defaultLocale as 'ar')) out.push(err('SN3018', 'locales must include defaultLocale', at));
  else if (m.locales.some((l) => l !== 'ar' && l !== 'en')) out.push(err('SN3018', 'locales may only contain ar and en', at));
  const c = m.tokens?.colors ?? {};
  for (const k of ['primary', 'secondary', 'accent', 'background', 'text']) if (!HEX.test(String(c[k]))) out.push(err('SN3019', `tokens.colors.${k} must be a #RRGGBB colour`, at));
  for (const k of Object.keys(c)) {
    if (!COLOR_KEY.test(k)) out.push(warn('SN3058', `tokens.colors.${k.slice(0, 40)}: colour keys are lower-case letters, digits and dashes, so this one is not emitted as a --hk-color-* variable${/[A-Z_]/.test(k) ? ` (rename it to ${JSON.stringify(k.slice(0, 40).replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/_/g, '-').toLowerCase())})` : ''}`, at));
  }
  const fonts = (m.tokens as { fonts?: unknown } | undefined)?.fonts;
  if (fonts !== undefined) {
    if (typeof fonts !== 'object' || fonts === null || Array.isArray(fonts)) out.push(err('SN3032', 'tokens.fonts must be an object with optional heading, body and mono', at));
    else {
      const families = Object.keys(FONTS);
      for (const [role, name] of Object.entries(fonts)) {
        if (!FONT_ROLES.includes(role)) out.push(err('SN3032', `tokens.fonts.${role.slice(0, 40)} is not a font role; use heading, body or mono`, at));
        else if (typeof name !== 'string' || !Object.hasOwn(FONTS, name)) {
          const shown = typeof name === 'string' ? JSON.stringify(name.slice(0, 60)) : 'a non-string';
          out.push(err('SN3032', `tokens.fonts.${role}: ${shown} is not in the font catalogue (${families.join(', ')}).${typeof name === 'string' ? fontSuggestion(name.slice(0, 60), families) : ''}`, at));
        }
      }
    }
  }
  const money = (m as { money?: unknown }).money;
  if (money !== undefined) {
    const ok = typeof money === 'object' && money !== null && !Array.isArray(money)
      && Object.keys(money).every((k) => k === 'format') && ((money as { format?: unknown }).format === undefined || isMoneyFormat((money as { format?: unknown }).format));
    if (!ok) out.push(err('SN3033', 'money must be { "format": "decimal" } or { "format": "whole" }', at));
  }
  if (typeof m.settings !== 'object' || m.settings === null) out.push(err('SN3021', 'settings must be an object', at));
  else out.push(...checkReservedSettings(m.settings));
  if (out.length) return { diagnostics: out };
  const co = validateCheckout((m as { checkout?: unknown }).checkout);
  out.push(...co.diagnostics);
  const settings = normalizeFieldLabels(m.settings);
  for (const k of settings.bad) out.push(warn('SN3031', `settings.${k}: label must be a string or { en } (ar is optional)`, at));
  const { checkout: _raw, ...rest } = m as Manifest;
  return { manifest: { ...rest, name: name!, description: description!, settings: settings.schema, ...(co.checkout ? { checkout: co.checkout } : {}) }, diagnostics: out };
}
