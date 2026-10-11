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
