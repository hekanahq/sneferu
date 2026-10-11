export const MONEY_FORMATS = ['decimal', 'whole'] as const;
export type MoneyFormat = (typeof MONEY_FORMATS)[number];
export const isMoneyFormat = (v: unknown): v is MoneyFormat => v === 'decimal' || v === 'whole';

/**
 * The number part of an amount in minor units (piastres): `1,290.00`.
 * `whole` drops the decimals when the amount is a whole unit (`1,290`) and keeps
 * two otherwise (`1,290.50`). '' when the amount is not a finite number.
 */
export function formatAmount(minor: number, format: MoneyFormat = 'decimal'): string {
  if (!Number.isFinite(minor)) return '';
  const digits = format === 'whole' && minor % 100 === 0 ? 0 : 2;
  return (minor / 100).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** `1,290.00 ج.م` / `EGP 1,290.00`; `wrap` decorates the number (e.g. `<bdi>`), applied after escaping by the caller. */
export function moneyText(amount: string, locale: 'ar' | 'en', currency: string, wrap: (n: string) => string = (n) => n): string {
  const n = wrap(amount);
  if (currency === 'EGP') return locale === 'ar' ? `${n} ج.م` : `EGP ${n}`;
  return locale === 'ar' ? `${n} ${currency}` : `${currency} ${n}`;
}
