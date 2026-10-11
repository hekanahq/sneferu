import type { Field, FieldSchema } from './fields';

/** The label shape the IR, runtime, builder and API read: always both languages. */
export interface Label { ar: string; en: string }
/** What a theme author may write: "Title", { en: "Title" } or { ar: "…", en: "Title" }. */
export type LabelInput = string | { en: string; ar?: string };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Normalize an authored label into { ar, en }. Arabic is optional: when it is
 * missing, merchants see the English label. Returns undefined when the input
 * is not a non-empty string, { en } or { ar, en }.
 */
export function normalizeLabel(v: unknown): Label | undefined {
  if (typeof v === 'string') return v.trim() ? { ar: v, en: v } : undefined;
  if (!isObj(v) || typeof v.en !== 'string' || !v.en.trim()) return undefined;
  if (v.ar !== undefined && typeof v.ar !== 'string') return undefined;
  const ar = typeof v.ar === 'string' && v.ar.trim() ? v.ar : v.en;
  return { ar, en: v.en };
}

/**
 * Return a copy of a field schema with every label in { ar, en } form, plus the
 * keys whose label could not be read. Fields with no label keep none.
 */
export function normalizeFieldLabels(schema: unknown): { schema: FieldSchema; bad: string[] } {
  if (!isObj(schema)) return { schema: {} as FieldSchema, bad: [] };
  const out: Record<string, Field> = {};
  const bad: string[] = [];
  for (const [k, f] of Object.entries(schema)) {
    if (!isObj(f) || f.label === undefined) { out[k] = f as unknown as Field; continue; }
    const label = normalizeLabel(f.label);
    if (!label) bad.push(k);
    out[k] = { ...(f as unknown as Field), ...(label ? { label } : {}) };
  }
  return { schema: out, bad };
}
