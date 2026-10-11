import type { RenderContext } from '@hekana/sneferu-runtime';

/** Sample catalogue for `sneferu dev`, in the language the page renders in. */
const TITLES = {
  ar: ['كارت بلايستيشن', 'شدات ببجي', 'جواهر فري فاير', 'رصيد ستيم', 'اشتراك شهر', 'كارت إكس بوكس'],
  en: ['PlayStation gift card', 'PUBG UC pack', 'Free Fire diamonds', 'Steam wallet credit', 'One-month subscription', 'Xbox gift card'],
} as const;
const STORE = { ar: 'متجر تجريبي', en: 'Sample store' } as const;
const COLLECTION = { ar: 'مختارات', en: 'Featured' } as const;

export const sampleProducts = (locale: 'ar' | 'en') => Array.from({ length: 6 }, (_, i) => ({
  title: TITLES[locale][i],
  url: `/products/sample-${i + 1}`,
  price: [52000, 47500, 24900, 31500, 44900, 51500][i],
  compare_at: i === 0 ? 60000 : null,
  image: { url: `https://placehold.co/600x600/png?text=${i + 1}` },
}));

export function sampleContext(locale: 'ar' | 'en', translations: Record<string, Record<string, string>>, defaultLocale: 'ar' | 'en'): RenderContext {
  const products = sampleProducts(locale);
  return {
    locale, dir: locale === 'ar' ? 'rtl' : 'ltr', currency: 'EGP',
    store: { name: STORE[locale] },
    settings: {}, data: {},
    collections: { featured: { title: COLLECTION[locale], products } },
    products: { 'sample-1': products[0]! },
    translations: translations[locale] ?? {}, fallbackTranslations: translations[defaultLocale] ?? {},
    assetUrl: (p) => `/__assets/${p}`,
    imageUrl: (ref, w) => { const u = typeof ref === 'string' ? ref : String((ref as { url?: string })?.url ?? ''); return w ? `${u}${u.includes('?') ? '&' : '?'}w=${w}` : u; },
  };
}

/**
 * Your own sample data for `sneferu dev`: `.sneferu-dev/data.json` in the theme
 * folder (dot-folders are never part of the theme or a push), or `--data <file>`.
 *
 *   { "store": { "name": "…" },
 *     "collections": { "courses": { "title": "…", "products": [ { "title", "url", "price", "compare_at", "image": { "url" } } ] } },
 *     "products": { "handle": { … } } }
 *
 * Any of the three keys may instead be split by locale: `{ "ar": { … }, "en": { … } }`
 * at the top level picks the block for the page's locale. Collections and
 * products are added to (and override) the built-in sample catalogue.
 */
export interface SampleData {
  store?: Record<string, unknown>;
  collections?: Record<string, { title?: string; products: unknown[] }>;
  products?: Record<string, unknown>;
}

const obj = (v: unknown): Record<string, unknown> | undefined => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined);

/** Validates the parsed JSON loosely: anything malformed is dropped, never thrown. */
export function pickSampleData(raw: unknown, locale: 'ar' | 'en'): SampleData {
  const top = obj(raw) ?? {};
  const src = obj(top[locale]) ?? (('ar' in top || 'en' in top) ? {} : top);
  const out: SampleData = {};
  const store = obj(src.store); if (store) out.store = store;
  const cols = obj(src.collections);
  if (cols) {
    out.collections = {};
    for (const [h, c] of Object.entries(cols)) {
      const co = obj(c); if (!co || !Array.isArray(co.products)) continue;
      out.collections[h] = { ...(typeof co.title === 'string' ? { title: co.title } : {}), products: co.products };
    }
  }
  const prods = obj(src.products); if (prods) out.products = prods;
  return out;
}

export function withSampleData(ctx: RenderContext, data: SampleData): RenderContext {
  return {
    ...ctx,
    store: { ...ctx.store, ...(data.store ?? {}) },
    collections: { ...ctx.collections, ...(data.collections ?? {}) },
    products: { ...ctx.products, ...(data.products ?? {}) },
  };
}
