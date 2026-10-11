import type { RenderContext } from '@hekana/sneferu-runtime';

/** Sample catalogue for `sneferu dev`, in the language the page renders in. */
const TITLES = {
  ar: ['كارت بلايستيشن', 'شدات ببجي', 'جواهر فري فاير', 'رصيد ستيم', 'اشتراك شهر', 'كارت إكس بوكس',
    'كارت نتفلكس', 'اشتراك سبوتيفاي', 'كارت جوجل بلاي', 'اشتراك يوتيوب بريميوم', 'كارت آيتونز', 'اشتراك لعبة شهري'],
  en: ['PlayStation gift card', 'PUBG UC pack', 'Free Fire diamonds', 'Steam wallet credit', 'One-month subscription', 'Xbox gift card',
    'Netflix gift card', 'Spotify subscription', 'Google Play gift card', 'YouTube Premium subscription', 'iTunes gift card', 'Monthly game pass'],
} as const;
const PRICES = [52000, 47500, 24900, 31500, 44900, 51500, 38000, 19900, 27500, 32900, 41000, 29900];
const STORE = { ar: 'متجر تجريبي', en: 'Sample store' } as const;
const COLLECTION = {
  featured: { ar: 'مختارات', en: 'Featured' },
  new: { ar: 'وصل حديثا', en: 'New arrivals' },
  'gift-cards': { ar: 'كروت الهدايا', en: 'Gift cards' },
  subscriptions: { ar: 'الاشتراكات', en: 'Subscriptions' },
} as const;
/** Which of the 12 sample products each collection holds. */
const MEMBERS: Record<keyof typeof COLLECTION, number[]> = {
  featured: [0, 1, 2, 3, 4, 5],
  new: [6, 7, 8, 9, 10, 11],
  'gift-cards': [0, 3, 5, 6, 8, 10],
  subscriptions: [4, 7, 9, 11],
};

/** One sample product. Every field a collection or product page reads lives here. */
export const sampleProduct = (locale: 'ar' | 'en', i: number) => ({
  title: TITLES[locale][i],
  url: `${locale === 'en' ? '/en' : ''}/products/sample-${i + 1}`,
  price: PRICES[i],
  compare_at: i === 0 ? 60000 : null,
  image: { url: `https://placehold.co/600x600/png?text=${i + 1}` },
});

export const sampleProducts = (locale: 'ar' | 'en') => Array.from({ length: 12 }, (_, i) => sampleProduct(locale, i));

export function sampleContext(locale: 'ar' | 'en', translations: Record<string, Record<string, string>>, defaultLocale: 'ar' | 'en'): RenderContext {
  const products = sampleProducts(locale);
  return {
    locale, dir: locale === 'ar' ? 'rtl' : 'ltr', currency: 'EGP',
    store: { name: STORE[locale] },
    settings: {}, data: {},
    collections: Object.fromEntries((Object.keys(COLLECTION) as (keyof typeof COLLECTION)[]).map((h) => [h, { title: COLLECTION[h][locale], products: MEMBERS[h].map((i) => products[i]!) }])),
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
