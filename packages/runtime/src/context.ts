export interface RenderContext {
  locale: 'ar' | 'en';
  dir: 'rtl' | 'ltr';
  currency: string;
  store: Record<string, unknown>;
  settings: Record<string, unknown>;
  data: Record<string, unknown>;
  collections: Record<string, { title?: string; products: unknown[] }>;
  products: Record<string, unknown>;
  translations: Record<string, string>;
  fallbackTranslations: Record<string, string>;
  assetUrl(path: string): string;
  imageUrl(ref: unknown, width?: number): string;
}
export type Scope = Record<string, unknown>;
