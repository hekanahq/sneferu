export type FieldType =
  | 'text' | 'textarea' | 'rich_text' | 'number' | 'range' | 'boolean' | 'select' | 'color'
  | 'image' | 'video' | 'link' | 'product' | 'collection' | 'spacing' | 'typography' | 'icon';

export interface Field {
  type: FieldType;
  label: { ar: string; en: string };
  default?: unknown;
  required?: boolean;
  min?: number; max?: number; step?: number;
  options?: string[];
  responsive?: boolean;
  visible_if?: { setting: string; equals: unknown };
  maxLength?: number;
}
export type FieldSchema = Record<string, Field>;
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

export function coerceSetting(f: Field, v: unknown): unknown {
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
