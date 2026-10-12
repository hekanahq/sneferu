import { toStr } from '@hekana/sneferu-core';
import { safeImageSrc } from './css';

/** What the commerce tags read from a theme product, normalised and bounded. Hosts are untrusted: nothing here throws. */
const MAX_IMAGES = 12;
const MAX_VARIANTS = 100;
const MAX_OPTIONS = 3;
const MAX_VALUES = 40;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, max = 100): string => toStr(v).slice(0, max);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export const productObject = (v: unknown): Record<string, unknown> | null => (isObj(v) ? v : null);
export const productId = (p: Record<string, unknown>): string => str(p.id);

export interface NormImage { url: string; ref: unknown; alt: string; width: number | null; height: number | null }
/** Up to 12 safe images: `images`, else the single `image`. */
export function imagesOf(p: Record<string, unknown>): NormImage[] {
  const raw = Array.isArray(p.images) && p.images.length ? p.images : p.image ? [p.image] : [];
  const out: NormImage[] = [];
  for (const ref of raw.slice(0, MAX_IMAGES)) {
    const url = typeof ref === 'string' ? ref : isObj(ref) ? toStr(ref.url) : '';
    if (!safeImageSrc(url)) continue;
    const o = isObj(ref) ? ref : {};
    const dim = (x: unknown) => { const n = num(x); return n !== null && Number.isInteger(n) && n >= 1 && n <= 4000 ? n : null; };
    out.push({ url, ref, alt: str(o.alt, 200), width: dim(o.width), height: dim(o.height) });
  }
  return out;
}

export interface NormVariant { id: string; title: string; price: number | null; compare_at: number | null; available: boolean; options: string[]; image: string | null }
export function variantsOf(p: Record<string, unknown>): NormVariant[] {
  if (!Array.isArray(p.variants)) return [];
  const out: NormVariant[] = [];
  for (const v of p.variants.slice(0, MAX_VARIANTS)) {
    if (!isObj(v) || (typeof v.id !== 'string' && typeof v.id !== 'number')) continue;
    const img = isObj(v.image) ? toStr(v.image.url) : typeof v.image === 'string' ? v.image : '';
    out.push({
      id: str(v.id), title: str(v.title, 120), price: num(v.price), compare_at: num(v.compare_at), available: v.available !== false,
      options: Array.isArray(v.options) ? v.options.map((x) => str(x, 80)) : [], image: safeImageSrc(img) ? img : null,
    });
  }
  return out;
}

export interface NormOption { name: string; values: string[] }
/**
 * The product's options when they are well formed and every variant picks one listed value per option;
 * null otherwise (malformed or missing `optionValues` on legacy data), and the picker falls back to a flat list of variants.
 */
export function optionsOf(p: Record<string, unknown>, variants: NormVariant[]): NormOption[] | null {
  if (!Array.isArray(p.options) || p.options.length === 0 || p.options.length > MAX_OPTIONS) return null;
  const options: NormOption[] = [];
  for (const o of p.options) {
    if (!isObj(o) || typeof o.name !== 'string' || o.name.trim() === '' || !Array.isArray(o.values) || o.values.length === 0 || o.values.length > MAX_VALUES) return null;
    const values = o.values.map((x) => (typeof x === 'string' || typeof x === 'number' ? str(x, 80) : ''));
    if (values.some((x) => x === '')) return null;
    options.push({ name: str(o.name, 60), values });
  }
  for (const v of variants) {
    if (v.options.length !== options.length) return null;
    if (v.options.some((x, i) => !options[i]!.values.includes(x))) return null;
  }
  return options;
}

/** The variant shown first: the host's `selected_variant`, else the first available, else the first. */
export function selectedVariant(p: Record<string, unknown>, variants: NormVariant[]): NormVariant | null {
  const sel = isObj(p.selected_variant) ? str(p.selected_variant.id) : '';
  return variants.find((v) => v.id === sel) ?? variants.find((v) => v.available) ?? variants[0] ?? null;
}

export interface QtyRules { min: number; step: number; max: number | null }
/** minOrderQuantity / quantityStep / maxQuantity as whole numbers: min >= 1, step >= 1, max null or >= min. */
export function qtyRules(p: Record<string, unknown>): QtyRules {
  const whole = (v: unknown, d: number) => { const n = num(v); return n !== null && Number.isInteger(n) && n >= 1 && n <= 100000 ? n : d; };
  const min = whole(p.min_quantity, 1);
  const step = whole(p.quantity_step, 1);
  const m = num(p.max_quantity);
  return { min, step, max: m !== null && Number.isInteger(m) && m >= min && m <= 100000 ? m : null };
}
