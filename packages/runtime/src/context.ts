export interface Category { handle: string; title: string; url: string; image: { url: string } | null; count: number }
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
  translations: Record<string, string>;
  fallbackTranslations: Record<string, string>;
  assetUrl(path: string): string;
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
