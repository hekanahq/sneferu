import {
  CHECKOUT_BUTTON_SHAPES, CHECKOUT_CHROME_MODES, CHECKOUT_COLOR_IDS, CHECKOUT_FONT_DEFAULT, CHECKOUT_LOGO_MODES,
  CHECKOUT_MERCHANT_ONLY_IDS, CHECKOUT_RADIUS_MAX, CHECKOUT_RADIUS_MIN, CHECKOUT_SETTINGS_KEY, CHECKOUT_THEME_SETTING_IDS,
  CHECKOUT_TRUST_NOTE_MAX, FONTS, cleanCheckoutText, err, normalizeCheckoutColor, warn,
  type Diagnostic, type ThemeCheckout,
} from '@hekana/sneferu-core';

const at = { file: 'theme.json' };
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const shown = (v: unknown) => (typeof v === 'string' ? JSON.stringify(v.slice(0, 60)) : typeof v === 'number' || typeof v === 'boolean' || v === null ? String(v) : `a ${Array.isArray(v) ? 'list' : typeof v}`);
const key = (k: string) => k.slice(0, 40);

/** SN3048: `settings.checkout` is reserved (the platform keeps the merchant's checkout overrides there). */
export function checkReservedSettings(settings: unknown): Diagnostic[] {
  return isObj(settings) && Object.hasOwn(settings, CHECKOUT_SETTINGS_KEY)
    ? [err('SN3048', `settings.${CHECKOUT_SETTINGS_KEY} is reserved: the store keeps the merchant's checkout branding under that key. Rename the setting; brand the checkout with the top-level "checkout" block`, at)]
    : [];
}

/**
 * Validates theme.json `checkout`. What can be fixed is fixed (colour case and `#rgb`, radius clamped
 * and rounded, trust note trimmed); what cannot is dropped. Every change is a warning, so the theme
 * still compiles; the result holds only valid, normalised values, or is undefined when nothing is left.
 */
export function validateCheckout(raw: unknown): { checkout?: ThemeCheckout; diagnostics: Diagnostic[] } {
  const out: Diagnostic[] = [];
  if (raw === undefined) return { diagnostics: out };
  if (!isObj(raw)) return { diagnostics: [warn('SN3049', `checkout must be an object of branding settings (got ${shown(raw)}); it is ignored`, at)] };
  const c: ThemeCheckout = {};
  for (const [k, v] of Object.entries(raw)) {
    const where = `checkout.${key(k)}`;
    if ((CHECKOUT_MERCHANT_ONLY_IDS as readonly string[]).includes(k)) {
      out.push(warn('SN3051', `${where} is set by the merchant in the builder, not by a theme; it is dropped`, at));
      continue;
    }
    if (!(CHECKOUT_THEME_SETTING_IDS as readonly string[]).includes(k)) {
      out.push(warn('SN3050', `${where} is not a checkout setting; it is dropped. Use ${CHECKOUT_THEME_SETTING_IDS.join(', ')}`, at));
      continue;
    }
    if ((CHECKOUT_COLOR_IDS as readonly string[]).includes(k)) {
      const hex = normalizeCheckoutColor(v);
      if (hex) c[k as (typeof CHECKOUT_COLOR_IDS)[number]] = hex;
      else out.push(warn('SN3052', `${where}: ${shown(v)} is not a #rgb or #rrggbb colour; it is dropped`, at));
    } else if (k === 'font') {
      if (v === CHECKOUT_FONT_DEFAULT || (typeof v === 'string' && Object.hasOwn(FONTS, v))) c.font = v as string;
      else out.push(warn('SN3053', `${where}: ${shown(v)} is not "default" or a font in the catalogue; it is dropped`, at));
    } else if (k === 'radius') {
      if (typeof v !== 'number' || !Number.isFinite(v)) {
        out.push(warn('SN3054', `${where}: ${shown(v)} is not a number of pixels (${CHECKOUT_RADIUS_MIN}–${CHECKOUT_RADIUS_MAX}); it is dropped`, at));
        continue;
      }
      const r = Math.round(Math.min(CHECKOUT_RADIUS_MAX, Math.max(CHECKOUT_RADIUS_MIN, v)));
      if (r !== v) out.push(warn('SN3054', `${where}: ${v} must be a whole number from ${CHECKOUT_RADIUS_MIN} to ${CHECKOUT_RADIUS_MAX}; it is set to ${r}`, at));
      c.radius = r;
    } else if (k === 'button_shape' || k === 'logo' || k === 'chrome') {
      const list: readonly string[] = k === 'button_shape' ? CHECKOUT_BUTTON_SHAPES : k === 'logo' ? CHECKOUT_LOGO_MODES : CHECKOUT_CHROME_MODES;
      if (typeof v === 'string' && list.includes(v)) (c as Record<string, unknown>)[k] = v;
      else out.push(warn('SN3055', `${where}: ${shown(v)} must be one of ${list.join(', ')}; it is dropped`, at));
    } else if (k === 'trust_note') {
      const note = trustNote(v, where, out);
      if (note) c.trust_note = note;
    }
  }
  return { ...(Object.keys(c).length ? { checkout: c } : {}), diagnostics: out };
}

function trustNote(v: unknown, where: string, out: Diagnostic[]): { ar: string; en: string } | undefined {
  if (!isObj(v)) {
    out.push(warn('SN3056', `${where} must be { "ar": text, "en": text } (got ${shown(v)}); it is dropped`, at));
    return undefined;
  }
  const note = { ar: '', en: '' };
  for (const [lang, text] of Object.entries(v)) {
    if (lang !== 'ar' && lang !== 'en') { out.push(warn('SN3056', `${where}.${lang.slice(0, 10)}: only ar and en; it is dropped`, at)); continue; }
    if (typeof text !== 'string') { out.push(warn('SN3056', `${where}.${lang} must be text (got ${shown(text)}); it is dropped`, at)); continue; }
    const clean = cleanCheckoutText(text);
    if (clean.length > CHECKOUT_TRUST_NOTE_MAX) out.push(warn('SN3057', `${where}.${lang} is ${clean.length} characters; it is cut to ${CHECKOUT_TRUST_NOTE_MAX}`, at));
    note[lang] = clean.slice(0, CHECKOUT_TRUST_NOTE_MAX).trim();
  }
  return note.ar || note.en ? note : undefined;
}
