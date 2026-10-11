import { defaultUrl, safeUrl, toStr } from '@hekana/sneferu-core';
import type { RenderContext } from './context';

/** `url(path)` for templates and tags: the host resolver or defaultUrl, and safeUrl on the result either way. Never throws. */
export function resolveUrl(ctx: RenderContext, path: unknown): string {
  const p = toStr(path);
  if (typeof ctx.url !== 'function') return defaultUrl(p, ctx.locale);
  try {
    const out = ctx.url(p);
    return typeof out === 'string' ? safeUrl(out) : '#';
  } catch {
    return '#';
  }
}
