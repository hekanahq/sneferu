import { toStr, type FilterName } from '@hekana/sneferu-core';
import type { RenderContext } from './context';

const num = (v: unknown) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN);
const money = (minor: unknown, ctx: RenderContext) => {
  const n = num(minor);
  if (!Number.isFinite(n)) return '';
  const s = (n / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (ctx.currency === 'EGP') return ctx.locale === 'ar' ? `${s} ج.م` : `EGP ${s}`;
  return ctx.locale === 'ar' ? `${s} ${ctx.currency}` : `${ctx.currency} ${s}`;
};

export const FILTER_IMPLS: Record<FilterName, (input: unknown, args: unknown[], ctx: RenderContext) => unknown> = {
  money: (i, _a, c) => money(i, c),
  img: (i, a, c) => c.imageUrl(i, typeof a[0] === 'number' ? a[0] : undefined),
  date: (i, _a, c) => { const d = new Date(toStr(i)); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(c.locale === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' }); },
  t: (i, _a, c) => c.translations[toStr(i)] ?? c.fallbackTranslations[toStr(i)] ?? toStr(i),
  escape: (i) => toStr(i),
  upcase: (i) => toStr(i).toUpperCase(),
  downcase: (i) => toStr(i).toLowerCase(),
  truncate: (i, a) => { const s = toStr(i); const n = Math.max(1, num(a[0]) || 50); return s.length > n ? `${s.slice(0, n - 1)}…` : s; },
  default: (i, a) => (i === undefined || i === null || i === '' ? a[0] : i),
  size: (i) => (Array.isArray(i) ? i.length : typeof i === 'string' ? i.length : 0),
  first: (i) => (Array.isArray(i) ? i[0] : undefined),
  last: (i) => (Array.isArray(i) ? i[i.length - 1] : undefined),
  join: (i, a) => (i === null || i === undefined ? a.map(toStr).join('') : Array.isArray(i) ? i.map(toStr).join(toStr(a[0] ?? ', ')) : toStr(i)),
  json_attr: (i) => JSON.stringify(i ?? null),
};
