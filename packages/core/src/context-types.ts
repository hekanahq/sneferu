/**
 * The shapes a host passes to the runtime for each page type (RenderOptions.scope) and the
 * payloads it stores (section groups, locale overrides). Types only: nothing here runs.
 * Money is in minor units (piastres).
 */
import type { GroupName } from './page-types';

export interface ThemeImage { url: string; srcset?: string; alt?: string; width?: number; height?: number }

export interface ThemeVariant {
  id: string; title: string; price: number; compare_at: number | null; available: boolean;
  /** One value per product option, in option order. */
  options: string[];
  image: ThemeImage | null;
}

export interface ThemeProduct {
  id: string; title: string; handle: string; url: string;
  price: number; compare_at: number | null; price_min: number; price_max: number; available: boolean;
  image: ThemeImage | null; images: ThemeImage[];
  /** Sanitised HTML; print it with <hk-rich-text>. */
  description: string; excerpt: string;
  kind: 'physical' | 'digital'; digital_kind: 'code' | 'file' | 'manual' | null;
  tags: string[]; category: { handle: string; title: string; url: string } | null;
  options: { name: string; values: string[] }[];
  variants: ThemeVariant[];
  selected_variant: ThemeVariant | null; has_variants: boolean;
  min_quantity: number; quantity_step: number; max_quantity: number | null;
}

export interface ThemePaginatePart { page: number; url: string; current: boolean }
export interface ThemePaginate {
  page: number; pages: number; per_page: number; total: number;
  prev_url: string; next_url: string; parts: ThemePaginatePart[];
}

/** Optional host data a collection page may offer; the default templates show them when present. */
export interface ThemeSortOption { value: string; label: string; url: string; active: boolean }
export interface ThemeFilter { name: string; values: { label: string; url: string; active: boolean; count?: number }[] }

export interface ThemeCollectionPage {
  handle: string; title: string; description: string; url: string; image: ThemeImage | null;
  /** The products of the current page. */
  products: ThemeProduct[]; products_count: number;
  sort_options?: ThemeSortOption[]; filters?: ThemeFilter[];
}
export interface ThemeSearch { terms: string; results: ThemeProduct[]; results_count: number }
export interface ThemeContentPage { title: string; body_html: string; handle: string; url: string }

/** Built by the runtime on every page. */
export interface ThemeRequest { path: string; page_type: string; locale: 'ar' | 'en' }
export interface ThemeLocalization { locale: 'ar' | 'en'; alternate_locale: 'ar' | 'en' | null; alternate_url: string }

/** One node of a stored page or group tree: a theme section with its blocks as children. */
export interface PageNode { id: string; type: string; props?: Record<string, unknown>; children?: PageNode[]; hidden?: boolean }
/**
 * The shared section groups of an installation: one tree per group, rendered on every page.
 * A group that is absent falls back to the theme's defaults (artifact.groups); an empty array
 * renders nothing.
 */
export type SectionGroups = Partial<Record<GroupName, PageNode[]>>;
/** Merchant text overrides per language: locale key -> text. Only keys the artifact lists (localeKeys) apply. */
export type LocaleOverrides = Partial<Record<'ar' | 'en', Record<string, string>>>;
