import { safeUrl } from './escape';

/**
 * The link a page gets for `path` when the host has no resolver of its own.
 * Store-relative paths gain the `/en` prefix on English pages (Arabic is the
 * unprefixed default), the same rule as Hekana's storefront `buildStoreUrl`;
 * anything else (https, mailto, tel, #…, ?…) is unchanged. Always passes safeUrl.
 */
export function defaultUrl(path: string, locale: 'ar' | 'en'): string {
  const s = safeUrl(typeof path === 'string' ? path : '');
  if (locale !== 'en' || !s.startsWith('/')) return s;
  if (s === '/en' || /^\/en[/?#]/.test(s)) return s;
  return s === '/' ? '/en' : /^\/[?#]/.test(s) ? `/en${s.slice(1)}` : `/en${s}`;
}
