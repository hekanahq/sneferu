import { defaultUrl, type RenderContext } from '@hekana/sneferu-runtime';
import { pickVariant, srcsetOf } from '@hekana/sneferu-components';
import { devUrl } from './dev-routes';

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

const img = (i: number, k: number, responsive: boolean) => (responsive
  ? { url: `https://placehold.co/600x600/png?text=${i + 1}${k === 1 ? "" : `.${k}`}`, srcset: [400, 800, 1600].map((w) => `https://placehold.co/${w}x${w}/png?text=${i + 1}${k === 1 ? "" : `.${k}`} ${w}w`).join(', ') }
  : { url: `https://placehold.co/600x600/png?text=${i + 1}${k === 1 ? "" : `.${k}`}` });

/** Options and variants of the sample products that have them: the gift card (amount) and the PUBG pack (pack and region). */
const OPTION_NAMES = { ar: { amount: 'القيمة', pack: 'الباقة', region: 'المنطقة' }, en: { amount: 'Amount', pack: 'Pack', region: 'Region' } } as const;
const VARIANTS: Record<number, { options: { key: 'amount' | 'pack' | 'region'; values: string[] }[]; price: (combo: number[]) => number; available: (combo: number[]) => boolean }> = {
  0: { options: [{ key: 'amount', values: ['10', '25', '50'] }], price: ([a]) => [52000, 125000, 245000][a!]!, available: ([a]) => a !== 2 },
  1: { options: [{ key: 'pack', values: ['60 UC', '325 UC', '660 UC'] }, { key: 'region', values: ['Global', 'KSA'] }],
    price: ([p, r]) => [47500, 129000, 249000][p!]! + (r === 1 ? 1000 : 0), available: ([p, r]) => !(p === 2 && r === 1) },
};
/** Purchase rules of a few sample products: the diamonds are sold in multiples of 5. */
const RULES: Record<number, { min: number; step: number; max: number | null }> = { 2: { min: 5, step: 5, max: 50 } };

/** One sample product, in the theme product shape. Every field a collection or product page reads lives here. */
export const sampleProduct = (locale: 'ar' | 'en', i: number, responsive = false) => {
  const prefix = locale === 'en' ? '/en' : '';
  const title = TITLES[locale][i]!;
  const kind = DIGITAL_KIND(i);
  const cat = categoryOf(i);
  const images = [1, 2, 3].map((k) => img(i, k, responsive));
  const spec = VARIANTS[i];
  const options = spec ? spec.options.map((o) => ({ name: OPTION_NAMES[locale][o.key], values: o.values })) : [];
  const combos: number[][] = spec ? spec.options.reduce<number[][]>((acc, o) => acc.flatMap((c) => o.values.map((_, k) => [...c, k])), [[]]) : [];
  const variants = spec
    ? combos.map((combo, n) => ({
      id: `sample-${i + 1}-v${n + 1}`, title: combo.map((k, j) => spec.options[j]!.values[k]).join(' / '),
      price: spec.price(combo), compare_at: null as number | null, available: spec.available(combo),
      options: combo.map((k, j) => spec.options[j]!.values[k]!), image: images[n % images.length]!,
    }))
    : [{ id: `sample-${i + 1}-v1`, title: locale === 'ar' ? 'الافتراضي' : 'Default', price: PRICES[i]!, compare_at: i === 0 ? 60000 : null, available: true, options: [] as string[], image: images[0]! }];
  const selected = variants.find((v) => v.available) ?? variants[0]!;
  const prices = variants.map((v) => v.price);
  const rule = RULES[i] ?? { min: 1, step: 1, max: 10 };
  return {
    id: `sample-${i + 1}`,
    handle: `sample-${i + 1}`,
    title,
    url: `${prefix}/products/sample-${i + 1}`,
    price: selected.price,
    compare_at: i === 0 ? 60000 : null,
    price_min: Math.min(...prices),
    price_max: Math.max(...prices),
    image: images[0]!,
    images,
    available: variants.some((v) => v.available),
    /** Sanitised HTML: print it with <hk-rich-text html="{{ product.description }}" />. */
    description: `<p><strong>${title}</strong> — ${DELIVERY[locale][kind]}</p>`,
    excerpt: `${title} — ${DELIVERY[locale][kind]}`,
    kind: 'digital' as const,
    digital_kind: kind,
    tags: [kind === 'manual' ? 'subscription' : 'gift-card', ...(i < 3 ? ['gaming'] : [])],
    category: cat ? { handle: cat, title: COLLECTION[cat][locale], url: `${prefix}/category/${cat}` } : null,
    options,
    variants,
    selected_variant: selected,
    has_variants: spec !== undefined,
    min_quantity: rule.min,
    quantity_step: rule.step,
    max_quantity: rule.max,
  };
};

/** The sample menus (`menu('main')`, `menu('footer')`): store-relative paths, made into this page's links by the context's `url`. */
const MENU_TEXT = {
  ar: { main: 'القائمة الرئيسية', footer: 'روابط', home: 'الرئيسية', products: 'المنتجات', all: 'كل المنتجات', about: 'من نحن', search: 'بحث', delivery: 'التسليم' },
  en: { main: 'Main menu', footer: 'Links', home: 'Home', products: 'Products', all: 'All products', about: 'About us', search: 'Search', delivery: 'Delivery' },
} as const;
export function sampleMenus(locale: 'ar' | 'en', link: (path: string) => string): NonNullable<RenderContext['menus']> {
  const t = MENU_TEXT[locale];
  const item = (title: string, path: string, children?: { title: string; url: string }[]) => ({ title, url: link(path), ...(children ? { children } : {}) });
  return {
    main: { handle: 'main', title: t.main, items: [
      item(t.home, '/'),
      item(t.products, '/products', (['new', 'gift-cards', 'subscriptions'] as const).map((h) => item(COLLECTION[h][locale], `/category/${h}`))),
      item(t.about, '/pages/about'),
    ] },
    footer: { handle: 'footer', title: t.footer, items: [
      item(t.all, '/products'), item(t.search, '/search'), item(t.about, '/pages/about'), item(t.delivery, '/pages/shipping'),
    ] },
  };
}

/** The collections `collections()` lists as the store's categories (featured is not one). */
const CATEGORIES = ['new', 'gift-cards', 'subscriptions'] as const;

export const sampleProducts = (locale: 'ar' | 'en', responsive = false) => Array.from({ length: 12 }, (_, i) => sampleProduct(locale, i, responsive));

/** The sample srcset defaults off so the 0.2 golden fixture stays stable; `sneferu dev` turns it on. */
export function sampleContext(locale: 'ar' | 'en', translations: Record<string, Record<string, string>>, defaultLocale: 'ar' | 'en', opts: { responsive?: boolean; devLinks?: boolean } = {}): RenderContext {
  const products = sampleProducts(locale, opts.responsive === true);
  // what a host passes: the dev server has no store prefix, so the default rule (/en on English pages)
  // `sneferu dev` (devLinks) also prefixes /ar when the theme's default language is English, so a click stays in the language
  const url = opts.devLinks ? (p: string) => { const s = defaultUrl(p, 'ar'); return s.startsWith('/') && !/^\/(en|ar)([/?#]|$)/.test(s) ? devUrl(s, locale, defaultLocale) : s; } : (p: string) => defaultUrl(p, locale);
  return {
    locale, dir: locale === 'ar' ? 'rtl' : 'ltr', currency: 'EGP',
    store: { name: STORE[locale] },
    settings: {}, data: {},
    collections: Object.fromEntries((Object.keys(COLLECTION) as (keyof typeof COLLECTION)[]).map((h) => [h, { title: COLLECTION[h][locale], products: MEMBERS[h].map((i) => products[i]!) }])),
    categories: CATEGORIES.map((h) => ({
      handle: h, title: COLLECTION[h][locale], url: `${locale === 'en' ? '/en' : ''}/category/${h}`,
      image: products[MEMBERS[h][0]!]!.image, count: MEMBERS[h].length, parent: null, children: [],
    })),
    products: Object.fromEntries(products.map((p) => [p.handle, p])),
    menus: sampleMenus(locale, url),
    translations: translations[locale] ?? {}, fallbackTranslations: translations[defaultLocale] ?? {},
    assetUrl: (p) => `/__assets/${p}`,
    url,
    imageUrl: (ref, w) => { if (srcsetOf(ref)) return pickVariant(ref, w); const u = typeof ref === 'string' ? ref : String((ref as { url?: string })?.url ?? ''); return w ? `${u}${u.includes('?') ? '&' : '?'}w=${w}` : u; },
  };
}

/**
 * Your own sample data for `sneferu dev`: `.sneferu-dev/data.json` in the theme
 * folder (dot-folders are never part of the theme or a push), or `--data <file>`.
 *
 *   { "store": { "name": "…" },
 *     "collections": { "courses": { "title": "…", "products": [ { "title", "url", "price", "compare_at", "image": { "url" } } ] } },
 *     "products": { "handle": { … } },
 *     "menus": { "main": { "title": "…", "items": [ { "title", "url", "children": [ … ] } ] } } }
 *
 * Any of the three keys may instead be split by locale: `{ "ar": { … }, "en": { … } }`
 * at the top level picks the block for the page's locale. Collections,
 * products and menus are added to (and override) the built-in sample catalogue.
 */
export interface SampleData {
  store?: Record<string, unknown>;
  collections?: Record<string, { title?: string; products: unknown[] }>;
  products?: Record<string, unknown>;
  /** Menus by handle, `{ title, items: [{ title, url, children? }] }`; they replace the sample `main` / `footer`. */
  menus?: Record<string, { handle: string; title: string; items: { title: string; url: string }[] }>;
}

const obj = (v: unknown): Record<string, unknown> | undefined => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined);
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
/** Own entries without the keys that could reach a prototype. */
const entries = (o: Record<string, unknown>) => Object.entries(o).filter(([k]) => !UNSAFE_KEYS.has(k));

/** Validates the parsed JSON loosely: anything malformed is dropped, never thrown. */
export function pickSampleData(raw: unknown, locale: 'ar' | 'en'): SampleData {
  const top = obj(raw) ?? {};
  const src = obj(top[locale]) ?? (('ar' in top || 'en' in top) ? {} : top);
  const out: SampleData = {};
  const store = obj(src.store); if (store) out.store = Object.fromEntries(entries(store));
  const cols = obj(src.collections);
  if (cols) {
    out.collections = {};
    for (const [h, c] of entries(cols)) {
      const co = obj(c); if (!co || !Array.isArray(co.products)) continue;
      out.collections[h] = { ...(typeof co.title === 'string' ? { title: co.title } : {}), products: co.products };
    }
  }
  const prods = obj(src.products); if (prods) out.products = Object.fromEntries(entries(prods));
  const menus = obj(src.menus);
  if (menus) {
    out.menus = {};
    for (const [h, m] of entries(menus)) {
      const mo = obj(m); if (!mo || !Array.isArray(mo.items)) continue;
      out.menus[h] = { handle: h, title: typeof mo.title === 'string' ? mo.title : '', items: mo.items as { title: string; url: string }[] };
    }
  }
  return out;
}

/**
 * Fills the gaps in a product from your own sample data so a product page can render it:
 * images, one default variant, no options, price range and purchase rules. Fields you wrote win.
 */
export function completeProduct(handle: string, raw: unknown): Record<string, unknown> {
  const p = { ...(obj(raw) ?? {}) };
  const image = obj(p.image) ?? null;
  const price = typeof p.price === 'number' ? p.price : 0;
  const variant = { id: `${handle}-v1`, title: 'Default', price, compare_at: p.compare_at ?? null, available: p.available !== false, options: [] as string[], image };
  const variants = Array.isArray(p.variants) ? p.variants : [variant];
  const prices = variants.map((v) => Number((v as { price?: unknown }).price)).filter(Number.isFinite);
  const fill: Record<string, unknown> = {
    id: handle, handle, title: '', url: devUrl(`/products/${handle}`, 'ar', 'ar'), price, compare_at: null,
    price_min: prices.length ? Math.min(...prices) : price, price_max: prices.length ? Math.max(...prices) : price,
    available: true, image, images: image ? [image] : [], description: '', excerpt: '', kind: 'physical', digital_kind: null,
    tags: [], category: null, options: [], variants, selected_variant: variants[0] ?? null, has_variants: variants.length > 1,
    min_quantity: 1, quantity_step: 1, max_quantity: 10,
  };
  for (const [k, v] of Object.entries(fill)) if (!Object.hasOwn(p, k) || p[k] === undefined) p[k] = v;
  return p;
}

export function withSampleData(ctx: RenderContext, data: SampleData): RenderContext {
  const products = Object.fromEntries(Object.entries(data.products ?? {}).map(([h, p]) => [h, completeProduct(h, p)]));
  return {
    ...ctx,
    store: { ...ctx.store, ...(data.store ?? {}) },
    collections: { ...ctx.collections, ...(data.collections ?? {}) },
    products: { ...ctx.products, ...products },
    menus: { ...(ctx.menus ?? {}), ...(data.menus ?? {}) },
  };
}
