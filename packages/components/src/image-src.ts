import { toStr } from '@hekana/sneferu-core';
import { safeImageSrc } from './css';

/**
 * A theme image as the host gives it: a bare URL or { url, srcset?, alt?, width?, height? }.
 * `srcset` is only present when the upload pipeline made those variants (`<url> 400w, <url> 800w, …`).
 */
export type ImageRef = string | { url?: unknown; srcset?: unknown; alt?: unknown; width?: unknown; height?: unknown };

export interface ImageCandidate { url: string; w: number }

const isObj = (r: unknown): r is Exclude<ImageRef, string> => typeof r === 'object' && r !== null;
const MAX_W = 4000;
const MAX_CANDIDATES = 12;

/** Candidates of the image's own srcset, safe ones only, smallest first. A URL is never made up. */
export function candidatesOf(ref: unknown): ImageCandidate[] {
  const raw = isObj(ref) && typeof ref.srcset === 'string' ? ref.srcset : '';
  if (raw === '') return [];
  const out: ImageCandidate[] = [];
  for (const part of raw.split(/,\s+/)) {
    const m = /^(\S+)\s+(\d{1,4})w$/.exec(part.trim());
    if (!m) continue;
    const w = Number(m[2]);
    if (w < 1 || w > MAX_W || !safeImageSrc(m[1]!)) continue;
    out.push({ url: m[1]!, w });
    if (out.length >= MAX_CANDIDATES) break;
  }
  return out.sort((a, b) => a.w - b.w);
}

/** The image's own srcset with every unsafe or malformed candidate dropped; '' when none is left. */
export const srcsetOf = (ref: unknown): string => candidatesOf(ref).map((c) => `${c.url} ${c.w}w`).join(', ');

/**
 * The URL to load at `width` CSS-independent pixels: the smallest listed variant that is at least
 * that wide, else the widest one, else the image's own url. Only URLs listed in the image object
 * are ever returned (variants exist only when the API listed them; a guessed URL would be a 404).
 */
export function pickVariant(ref: unknown, width?: number): string {
  const own = typeof ref === 'string' ? ref : isObj(ref) ? toStr(ref.url) : '';
  const list = candidatesOf(ref);
  if (list.length === 0 || typeof width !== 'number' || !Number.isFinite(width)) return own;
  return (list.find((c) => c.w >= width) ?? list[list.length - 1]!).url;
}

/** A width/height attribute value: a whole number 1..4000, else ''. */
export function dimAttr(v: unknown): string {
  const n = typeof v === 'number' ? v : typeof v === 'string' && /^\d{1,4}$/.test(v.trim()) ? Number(v) : NaN;
  return Number.isInteger(n) && n >= 1 && n <= MAX_W ? String(n) : '';
}

/** `sizes` is a media-condition list; anything with other characters falls back to the default. */
export const sizesAttr = (v: unknown, def = '100vw'): string => (typeof v === 'string' && v.length <= 200 && /^[\w\s,()%.:+-]+$/.test(v) && v.trim() !== '' ? v.trim() : def);
