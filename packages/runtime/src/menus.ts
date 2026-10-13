import { safeUrl, toStr, type ThemeMenu, type ThemeMenuItem } from '@hekana/sneferu-core';
import type { RenderContext } from './context';

/** A menu nests at most this many levels (top-level links, their children, grandchildren). */
export const MAX_MENU_DEPTH = 3;
/** At most this many links of one menu reach a template, counted in document order. */
export const MAX_MENU_ITEMS = 250;
const MAX_TITLE = 200;
/** Entries examined per menu (skipped malformed ones included), so a huge sparse array cannot stall a render. */
const MAX_SCANNED = 1000;

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);
const ownv = (o: Rec, k: string): unknown => (Object.hasOwn(o, k) ? o[k] : undefined);

/** renderPage binds the page's request path and locale to the context it builds. */
const PAGE = new WeakMap<object, { path: string; locale: 'ar' | 'en' }>();
const CACHE = new WeakMap<object, Map<string, ThemeMenu>>();

export function bindMenuRequest(ctx: RenderContext, path: string, locale: 'ar' | 'en'): void {
  PAGE.set(ctx, { path, locale });
}

/**
 * The comparison key of a site-relative link: path only (no query, no hash), percent-decoded,
 * the page's own locale prefix (`/en`, or `/ar` where Arabic is prefixed) removed, no trailing slash.
 * Anything that is not a site-relative path has no key and is never active.
 */
export function menuPathKey(url: string, locale: 'ar' | 'en'): string | undefined {
  if (typeof url !== 'string' || !url.startsWith('/') || url.startsWith('//')) return undefined;
  let p = url.replace(/[?#][\s\S]*$/, '');
  try { p = decodeURI(p); } catch { /* keep it encoded */ }
  const pre = `/${locale}`;
  if (p === pre || p.startsWith(`${pre}/`)) p = p.slice(pre.length);
  p = p.replace(/\/+$/, '');
  return p === '' ? '/' : p;
}

/**
 * The host's menu in the template shape. Untrusted input: only own properties are read, titles
 * are strings (cut to 200 characters), every URL passes safeUrl (unsafe gives '#'), nesting stops
 * at 3 levels and the menu at 250 links. `active`: the link's path is the page's path;
 * `child_active`: some link below it is active.
 */
export function normalizeMenu(raw: unknown, handle: string, page?: { path: string; locale: 'ar' | 'en' }): ThemeMenu {
  const m = isRec(raw) ? raw : {};
  const current = page && page.path !== '' ? menuPathKey(page.path, page.locale) : undefined;
  let count = 0;
  let scanned = 0;
  const items = (list: unknown, depth: number): ThemeMenuItem[] => {
    const out: ThemeMenuItem[] = [];
    if (!Array.isArray(list) || depth > MAX_MENU_DEPTH) return out;
    for (let i = 0; i < list.length && count < MAX_MENU_ITEMS && scanned < MAX_SCANNED; i++) {
      scanned++;
      const it: unknown = Object.hasOwn(list, i) ? list[i] : undefined;
      if (!isRec(it)) continue;
      count++;
      const url = safeUrl(toStr(ownv(it, 'url')));
      const children = items(ownv(it, 'children'), depth + 1);
      const key = current === undefined ? undefined : menuPathKey(url, page!.locale);
      out.push({
        title: toStr(ownv(it, 'title')).slice(0, MAX_TITLE),
        url,
        active: key !== undefined && key === current,
        child_active: children.some((c) => c.active || c.child_active),
        children,
      });
    }
    return out;
  };
  return { handle, title: toStr(ownv(m, 'title')).slice(0, MAX_TITLE), items: items(ownv(m, 'items'), 1) };
}

/** `menu(handle)`: the host's menu for the handle, else `{ handle, title: '', items: [] }`. Never throws. */
export function lookupMenu(ctx: RenderContext, arg: unknown): ThemeMenu {
  const handle = typeof arg === 'string' ? arg : '';
  const menus: unknown = ctx.menus;
  if (handle === '' || !isRec(menus) || !Object.hasOwn(menus, handle)) return { handle, title: '', items: [] };
  const page = PAGE.get(ctx);
  // cached per rendered page only: a context the host passes to evaluate() directly may change between calls
  if (!page) return normalizeMenu(menus[handle], handle);
  let cache = CACHE.get(ctx);
  if (!cache) { cache = new Map(); CACHE.set(ctx, cache); }
  let hit = cache.get(handle);
  if (!hit) { hit = normalizeMenu(menus[handle], handle, page); cache.set(handle, hit); }
  return hit;
}
