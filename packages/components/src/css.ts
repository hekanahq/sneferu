export const BP_MEDIA = { tablet: '@media (max-width:1023px)', mobile: '@media (max-width:639px)' } as const;

export function px(v: unknown, max = 400): string | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) ? `${Math.max(0, Math.min(max, n))}px` : null;
}
export function colorVar(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  if (/^theme:[a-z][a-z0-9-]*$/.test(v)) return `var(--hk-color-${v.slice(6)})`;
  if (/^#[0-9a-fA-F]{3,8}$/.test(v)) return v;
  return null;
}
export const oneOf = <T extends string>(options: readonly T[]) => (v: unknown): T | null => (typeof v === 'string' && (options as readonly string[]).includes(v) ? (v as T) : null);

/** Base rule + tablet/mobile media rules for one declaration. */
export function responsiveCss(selector: string, prop: string, value: unknown, toCss: (v: unknown) => string | null): string[] {
  const out: string[] = [];
  const r = typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : { base: value };
  const base = r.base !== undefined ? toCss(r.base) : null;
  if (base !== null) out.push(`${selector}{${prop}:${base}}`);
  for (const bp of ['tablet', 'mobile'] as const) {
    const v = r[bp] !== undefined ? toCss(r[bp]) : null;
    if (v !== null) out.push(`${BP_MEDIA[bp]}{${selector}{${prop}:${v}}}`);
  }
  return out;
}
