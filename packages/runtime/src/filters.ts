import { formatAmount, isMoneyFormat, moneyText, toStr, type FilterName } from '@hekana/sneferu-core';
import type { RenderContext } from './context';
import { translate } from './translate';

const num = (v: unknown) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN);
/** `money: format?, unit?`: format 'whole' | 'decimal' (default: the theme's), unit 'minor' (piastres, default) | 'major' (pounds). */
const money = (input: unknown, args: unknown[], ctx: RenderContext) => {
  const n = num(input);
  if (!Number.isFinite(n)) return '';
  const minor = args[1] === 'major' ? Math.round(n * 100) : n;
  if (!Number.isFinite(minor)) return ''; // 1e308 pounds overflows to Infinity piastres
  const format = isMoneyFormat(args[0]) ? args[0] : isMoneyFormat(ctx.money) ? ctx.money : 'decimal';
  return moneyText(formatAmount(minor, format), ctx.locale, ctx.currency);
};

export const FILTER_IMPLS: Record<FilterName, (input: unknown, args: unknown[], ctx: RenderContext) => unknown> = {
  money: (i, a, c) => money(i, a, c),
  img: (i, a, c) => c.imageUrl(i, typeof a[0] === 'number' ? a[0] : undefined),
  date: (i, _a, c) => { const d = new Date(toStr(i)); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(c.locale === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' }); },
  t: (i, _a, c) => translate(c, toStr(i)),
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
