import type { ThemePaginate } from './context-types';

/** A page number from a query string: a whole number >= 1, else 1. */
export function clampPage(v: unknown, pages = Infinity): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' && /^\d{1,6}$/.test(v.trim()) ? Number(v) : NaN;
  if (!Number.isInteger(n) || n < 1) return 1;
  return Math.min(n, Math.max(1, pages));
}

/**
 * The `paginate` object a collection or search page reads. `page` is clamped into 1..pages (NaN,
 * negative and out-of-range values are safe), `parts` is a window of at most 7 pages around the
 * current one, `url(n)` builds the link for page n (the host decides the prefix and query).
 */
export function buildPaginate(input: { page: unknown; perPage: number; total: number; url: (page: number) => string }): ThemePaginate {
  const perPage = Number.isInteger(input.perPage) && input.perPage > 0 ? input.perPage : 24;
  const total = Number.isFinite(input.total) && input.total > 0 ? Math.floor(input.total) : 0;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const page = clampPage(input.page, pages);
  const size = Math.min(7, pages);
  const start = Math.max(1, Math.min(page - Math.floor(size / 2), pages - size + 1));
  const parts = Array.from({ length: size }, (_, i) => start + i).map((n) => ({ page: n, url: input.url(n), current: n === page }));
  return {
    page, pages, per_page: perPage, total,
    prev_url: page > 1 ? input.url(page - 1) : '',
    next_url: page < pages ? input.url(page + 1) : '',
    parts,
  };
}
