import { defaultUrl, type RenderContext } from '@hekana/sneferu-runtime';
import { pickVariant, srcsetOf } from '@hekana/sneferu-components';

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

/** How each sample product is delivered: subscriptions are activated by hand, the rest are codes. */
const DIGITAL_KIND = (i: number): 'code' | 'manual' => (MEMBERS.subscriptions.includes(i) ? 'manual' : 'code');
const DELIVERY = {
  ar: { code: 'الكود بيوصلك على الإيميل بعد الدفع على طول.', manual: 'بيتفعل على حسابك خلال يوم من الدفع.' },
  en: { code: 'The code arrives by email right after you pay.', manual: 'Activated on your account within a day of payment.' },
} as const;
/** The store category a sample product belongs to; products 2 and 3 have none. */
const categoryOf = (i: number): 'gift-cards' | 'subscriptions' | null =>
  MEMBERS['gift-cards'].includes(i) ? 'gift-cards' : MEMBERS.subscriptions.includes(i) ? 'subscriptions' : null;

/** One sample product, in the theme product shape. Every field a collection or product page reads lives here. */
export const sampleProduct = (locale: 'ar' | 'en', i: number, responsive = false) => {
  const prefix = locale === 'en' ? '/en' : '';
  const title = TITLES[locale][i]!;
  const kind = DIGITAL_KIND(i);
  const cat = categoryOf(i);
  return {
    id: `sample-${i + 1}`,
    handle: `sample-${i + 1}`,
    title,
    url: `${prefix}/products/sample-${i + 1}`,
    price: PRICES[i],
    compare_at: i === 0 ? 60000 : null,
    image: responsive ? { url: `https://placehold.co/600x600/png?text=${i + 1}`, srcset: [400, 800, 1600].map((w) => `https://placehold.co/${w}x${w}/png?text=${i + 1} ${w}w`).join(', ') }
      : { url: `https://placehold.co/600x600/png?text=${i + 1}` },
    available: true,
    /** Sanitised HTML: print it with <hk-rich-text html="{{ product.description }}" />. */
    description: `<p><strong>${title}</strong> — ${DELIVERY[locale][kind]}</p>`,
    excerpt: `${title} — ${DELIVERY[locale][kind]}`,
    kind: 'digital' as const,
    digital_kind: kind,
    tags: [kind === 'manual' ? 'subscription' : 'gift-card', ...(i < 3 ? ['gaming'] : [])],
    category: cat ? { handle: cat, title: COLLECTION[cat][locale], url: `${prefix}/category/${cat}` } : null,
  };
};

/** The collections `collections()` lists as the store's categories (featured is not one). */
const CATEGORIES = ['new', 'gift-cards', 'subscriptions'] as const;

export const sampleProducts = (locale: 'ar' | 'en', responsive = false) => Array.from({ length: 12 }, (_, i) => sampleProduct(locale, i, responsive));

/** The sample srcset defaults off so the 0.2 golden fixture stays stable; `sneferu dev` turns it on. */
export function sampleContext(locale: 'ar' | 'en', translations: Record<string, Record<string, string>>, defaultLocale: 'ar' | 'en', opts: { responsive?: boolean } = {}): RenderContext {
  const products = sampleProducts(locale, opts.responsive === true);
  return {
    locale, dir: locale === 'ar' ? 'rtl' : 'ltr', currency: 'EGP',
    store: { name: STORE[locale] },
    settings: {}, data: {},
    collections: Object.fromEntries((Object.keys(COLLECTION) as (keyof typeof COLLECTION)[]).map((h) => [h, { title: COLLECTION[h][locale], products: MEMBERS[h].map((i) => products[i]!) }])),
    categories: CATEGORIES.map((h) => ({
      handle: h, title: COLLECTION[h][locale], url: `${locale === 'en' ? '/en' : ''}/category/${h}`,
      image: products[MEMBERS[h][0]!]!.image, count: MEMBERS[h].length,
    })),
    products: { 'sample-1': products[0]! },
    translations: translations[locale] ?? {}, fallbackTranslations: translations[defaultLocale] ?? {},
    assetUrl: (p) => `/__assets/${p}`,
    // what a host passes: the dev server has no store prefix, so the default rule (/en on English pages)
    url: (p) => defaultUrl(p, locale),
    imageUrl: (ref, w) => { if (srcsetOf(ref)) return pickVariant(ref, w); const u = typeof ref === 'string' ? ref : String((ref as { url?: string })?.url ?? ''); return w ? `${u}${u.includes('?') ? '&' : '?'}w=${w}` : u; },
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
