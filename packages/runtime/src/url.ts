import { defaultUrl, safeUrl, toStr } from '@hekana/sneferu-core';
import type { RenderContext } from './context';

/**
 * `url(path)` for templates and tags. The input is checked first: unsafe gives '#', and
 * only store-relative paths (`/…`) reach the host resolver; https:, mailto:, tel:, #… and
 * ?… pass through untouched. The resolver's result is checked again (non-string or throw: '#').
 * Without a resolver, defaultUrl. Never throws.
 */
export function resolveUrl(ctx: RenderContext, path: unknown): string {
  const s = safeUrl(toStr(path));
  if (s === '#' || !s.startsWith('/')) return s;
  if (typeof ctx.url !== 'function') return defaultUrl(s, ctx.locale);
  try {
    const out = ctx.url(s);
    return typeof out === 'string' ? safeUrl(out) : '#';
  } catch {
    return '#';
  }
}
