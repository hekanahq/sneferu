import type { Menu } from '@hekana/sneferu-core';
export interface Category { handle: string; title: string; url: string; image: { url: string } | null; count: number; parent: string | null; children: Category[] }
export interface RenderContext {
  locale: 'ar' | 'en';
  dir: 'rtl' | 'ltr';
  currency: string;
  store: Record<string, unknown>;
  settings: Record<string, unknown>;
  data: Record<string, unknown>;
  collections: Record<string, { title?: string; products: unknown[] }>;
  products: Record<string, unknown>;
  /** The store's categories, for the `collections()` lookup (at most 50 are listed). */
  categories?: Category[];
  /**
   * The store's menus by handle, for the `menu()` lookup: `{ handle, title, items: [{ title, url, children? }] }`.
   * URLs are final (locale prefix and store path already applied); the runtime checks them with safeUrl,
   * keeps 3 levels and 250 links, and sets `active` / `child_active` from the page's request path.
   * Item URLs and `request.path` must be in the same URL space: both carry the locale and store
   * path prefixes, or neither does (the page's own locale prefix is ignored when comparing).
   * Preload the handles `pageDependencies().menus` lists. Absent: every menu is empty.
   */
  menus?: Record<string, Menu>;
  translations: Record<string, string>;
  fallbackTranslations: Record<string, string>;
  assetUrl(path: string): string;
  /**
   * The URL for an image at `width` pixels (`{{ image | img: 400 }}`; the filter passes the width through
   * unchanged). Hosts pick from the variants the image object lists (`pickVariant` in
   * @hekana/sneferu-components) and never build a URL that is not listed there.
   */
  imageUrl(ref: unknown, width?: number): string;
  /**
   * The host's link resolver (store path prefix, locale prefix). Optional: without it
   * `defaultUrl(path, locale)` is used. Whatever it returns still goes through safeUrl.
   */
  url?(path: string): string;
  /**
   * Default money format. renderPage sets it from theme.json `money.format`, which wins
   * over a value given here; absent means 'decimal' (0.2 output).
   */
  money?: 'decimal' | 'whole';
}
export type Scope = Record<string, unknown>;
