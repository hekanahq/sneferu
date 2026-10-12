export type FieldType =
  | 'text' | 'textarea' | 'rich_text' | 'number' | 'range' | 'boolean' | 'select' | 'color'
  | 'image' | 'video' | 'link' | 'product' | 'collection' | 'spacing' | 'typography' | 'icon'
  /** A value bound from the page (a product, `paginate`, `localization`), not something a merchant edits. */
  | 'data';

export const FIELD_TYPES = ['text', 'textarea', 'rich_text', 'number', 'range', 'boolean', 'select', 'color', 'image', 'video', 'link', 'product', 'collection', 'spacing', 'typography', 'icon', 'data'] as const;

/**
 * What the builder's inspector needs to know per field type: the control to draw, the shape of the stored
 * value, whether a merchant edits it at all, and whether `localized` / `responsive` apply.
 */
export const FIELD_INSPECTORS: Readonly<Record<FieldType, { control: string; value: 'string' | 'number' | 'boolean' | 'object'; editable: boolean; localizable: boolean; responsive: boolean }>> = Object.freeze({
  text: { control: 'input', value: 'string', editable: true, localizable: true, responsive: false },
  textarea: { control: 'textarea', value: 'string', editable: true, localizable: true, responsive: false },
  rich_text: { control: 'rich-text', value: 'string', editable: true, localizable: true, responsive: false },
  number: { control: 'number', value: 'number', editable: true, localizable: false, responsive: true },
  range: { control: 'slider', value: 'number', editable: true, localizable: false, responsive: true },
  boolean: { control: 'toggle', value: 'boolean', editable: true, localizable: false, responsive: false },
  select: { control: 'select', value: 'string', editable: true, localizable: false, responsive: true },
  color: { control: 'color', value: 'string', editable: true, localizable: false, responsive: false },
  image: { control: 'image-picker', value: 'string', editable: true, localizable: false, responsive: false },
  video: { control: 'video-picker', value: 'string', editable: true, localizable: false, responsive: false },
  link: { control: 'link', value: 'string', editable: true, localizable: false, responsive: false },
  product: { control: 'product-picker', value: 'string', editable: true, localizable: false, responsive: false },
  collection: { control: 'collection-picker', value: 'string', editable: true, localizable: false, responsive: false },
  spacing: { control: 'spacing', value: 'object', editable: true, localizable: false, responsive: true },
  typography: { control: 'typography', value: 'object', editable: true, localizable: false, responsive: true },
  icon: { control: 'icon-picker', value: 'string', editable: true, localizable: false, responsive: false },
  data: { control: 'none', value: 'object', editable: false, localizable: false, responsive: false },
});

export interface Field {
  type: FieldType;
  /** Always { ar, en } once compiled; authors may write a string or { en } (see LabelInput). */
  label: { ar: string; en: string };
  default?: unknown;
  required?: boolean;
  min?: number; max?: number; step?: number;
  options?: string[];
  responsive?: boolean;
  visible_if?: { setting: string; equals: unknown };
  maxLength?: number;
  /** text, textarea, rich_text: the value may be { ar?, en? } and resolves by the page locale. */
  localized?: boolean;
  /** Where the builder lists the field: theme settings use colors, typography, shape, layout, buttons. */
  group?: string;
}
export type FieldSchema = Record<string, Field>;
/** A field as an author writes it: the label may be "Text", { en } or { ar, en }. */
export type FieldInput = Omit<Field, 'label'> & { label: string | { en: string; ar?: string } };
export type FieldSchemaInput = Record<string, FieldInput>;
export type Breakpoint = 'base' | 'tablet' | 'mobile';
export type Responsive<T> = T | { base?: T; tablet?: T; mobile?: T };

const HEX = /^#[0-9a-fA-F]{3,8}$/;
const TOKEN = /^theme:[a-z][a-z0-9-]*$/;
const isBp = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && Object.keys(v).every((k) => k === 'base' || k === 'tablet' || k === 'mobile');

function coerceScalar(f: Field, v: unknown): unknown {
  switch (f.type) {
    case 'number': case 'range': {
      const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
      if (!Number.isFinite(n)) return f.default;
      return Math.min(f.max ?? Infinity, Math.max(f.min ?? -Infinity, n));
    }
    case 'boolean': return v === true || v === 'true' || v === 'yes' || v === 1 ? true : v === false || v === 'false' || v === 'no' || v === 0 ? false : f.default;
    case 'select': return typeof v === 'string' && (f.options ?? []).includes(v) ? v : f.default;
    case 'color': return typeof v === 'string' && (HEX.test(v) || TOKEN.test(v)) ? v : f.default;
    default: {
      if (typeof v !== 'string') return f.default;
      return f.maxLength ? v.slice(0, f.maxLength) : v;
    }
  }
}

type Locale = 'ar' | 'en';
const TEXTY = new Set<string>(['text', 'textarea', 'rich_text']);
const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const cut = (f: Field, s: string) => (f.maxLength ? s.slice(0, f.maxLength) : s);
/** A string, or the string a { ar, en } object holds for the locale (else the other locale). */
function pick(v: unknown, locale: Locale): string | undefined {
  if (typeof v === 'string') return v;
  if (!isRec(v)) return undefined;
  const other: Locale = locale === 'ar' ? 'en' : 'ar';
  const own = (k: Locale) => (Object.hasOwn(v, k) && typeof v[k] === 'string' ? (v[k] as string) : undefined);
  return own(locale) ?? own(other);
}

/**
 * Coerce a stored value to what the schema allows. For a `localized` text field and a
 * given locale, { ar, en } resolves to one string; with no locale the raw value is
 * returned so the builder can edit both languages.
 */
export function coerceSetting(f: Field, v: unknown, locale?: Locale): unknown {
  if (f.localized && TEXTY.has(f.type)) {
    if (locale === undefined) return v === undefined ? f.default : v;
    const s = pick(v, locale) ?? pick(f.default, locale) ?? '';
    return cut(f, s);
  }
  if (v === undefined) return f.default;
  if (f.responsive && isBp(v)) {
    const out: Record<string, unknown> = {};
    for (const bp of ['base', 'tablet', 'mobile'] as const) if (v[bp] !== undefined) out[bp] = coerceScalar(f, v[bp]);
    return out;
  }
  return coerceScalar(f, v);
}

export const defaultsOf = (schema: FieldSchema): Record<string, unknown> =>
  Object.fromEntries(Object.entries(schema).filter(([, f]) => f.default !== undefined).map(([k, f]) => [k, f.default]));
