import type { RenderContext } from '@hekana/sneferu-runtime';

const PRODUCTS = Array.from({ length: 6 }, (_, i) => ({
  title: ['كارت بلايستيشن', 'شدات ببجي', 'جواهر فري فاير', 'رصيد ستيم', 'اشتراك شهر', 'كارت إكس بوكس'][i],
  url: `/products/sample-${i + 1}`,
  price: [52000, 47500, 24900, 31500, 44900, 51500][i],
  compare_at: i === 0 ? 60000 : null,
  image: { url: `https://placehold.co/600x600/png?text=${i + 1}` },
}));

export function sampleContext(locale: 'ar' | 'en', translations: Record<string, Record<string, string>>, defaultLocale: 'ar' | 'en'): RenderContext {
  return {
    locale, dir: locale === 'ar' ? 'rtl' : 'ltr', currency: 'EGP',
    store: { name: locale === 'ar' ? 'متجر تجريبي' : 'Sample store' },
    settings: {}, data: {},
    collections: { featured: { title: 'Featured', products: PRODUCTS } },
    products: { 'sample-1': PRODUCTS[0]! },
    translations: translations[locale] ?? {}, fallbackTranslations: translations[defaultLocale] ?? {},
    assetUrl: (p) => `/__assets/${p}`,
    imageUrl: (ref, w) => { const u = typeof ref === 'string' ? ref : String((ref as { url?: string })?.url ?? ''); return w ? `${u}${u.includes('?') ? '&' : '?'}w=${w}` : u; },
  };
}
