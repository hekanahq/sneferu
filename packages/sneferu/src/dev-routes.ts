import { buildPaginate, type ThemeCollectionPage, type ThemeContentPage, type ThemePaginate } from '@hekana/sneferu-core';

type Locale = 'ar' | 'en';
type Product = { handle?: unknown; title?: unknown; image?: unknown; url?: unknown };

/** Products on one dev page (small, so the sample catalogue shows pagination). */
export const DEV_PER_PAGE = 8;

export interface DevRoute {
  template: string;
  /** 404 for an unknown path or handle; the page renders the theme's 404 template. */
  status: number;
  scope: Record<string, unknown>;
  /** The site-relative path the page was asked for, without the locale prefix. */
  path: string;
}

const ALL = { ar: { handle: 'all', title: 'كل المنتجات' }, en: { handle: 'all', title: 'All products' } } as const;
const PAGES: Record<string, Record<Locale, ThemeContentPage>> = {
  about: {
    ar: { handle: 'about', title: 'من نحن', body_html: '<p>متجر صغير بيبيع كروت الهدايا والاشتراكات الرقمية.</p><p>الكود بيوصلك على الإيميل بعد الدفع على طول.</p>', url: '/pages/about' },
    en: { handle: 'about', title: 'About us', body_html: '<h2>A small digital store</h2><p>We sell gift cards and subscriptions. Codes arrive by email right after you pay.</p><ul><li>Instant delivery</li><li>Support in Arabic and English</li></ul>', url: '/en/pages/about' },
  },
  shipping: {
    ar: { handle: 'shipping', title: 'التسليم', body_html: '<p>المنتجات الرقمية بتتسلم فورًا. المنتجات اللي بتتفعل بإيدينا بتاخد يوم.</p>', url: '/pages/shipping' },
    en: { handle: 'shipping', title: 'Delivery', body_html: '<p>Digital products are delivered instantly. Manually activated products take up to a day.</p>', url: '/en/pages/shipping' },
  },
};

/** `/en/cart` -> { locale: 'en', path: '/cart' }; `/ar/...` likewise; anything else has no locale of its own. */
export function splitLocale(pathname: string): { locale?: Locale; path: string } {
  const m = /^\/(ar|en)(\/.*)?$/.exec(pathname);
  if (!m) return { path: pathname };
  return { locale: m[1] as Locale, path: m[2] ?? '/' };
}

/** The link for `path` in `locale` the way `sneferu dev` serves it: `/en` and `/ar` prefixes, the default language unprefixed. */
export function devUrl(path: string, locale: Locale, defaultLocale: Locale): string {
  if (locale === 'ar' && defaultLocale === 'en') return path === '/' ? '/ar' : `/ar${path}`;
  if (locale === 'en') return path === '/' ? '/en' : `/en${path}`;
  return path;
}

const handleOf = (raw: string): string | undefined => {
  let h: string;
  try { h = decodeURIComponent(raw); } catch { return undefined; }
  return /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(h) ? h : undefined;
};

/** Which template and data a dev URL gets. Pure: the products and collections are the page's sample catalogue. */
export function resolveDevRoute(opts: {
  path: string; query: URLSearchParams; locale: Locale; defaultLocale: Locale;
  products: Record<string, unknown>; collections: Record<string, { title?: string; products: unknown[] }>;
}): DevRoute {
  const { path, query, locale } = opts;
  const here = (p: string) => devUrl(p, locale, opts.defaultLocale);
  const pageUrl = (base: string, extra: Record<string, string> = {}) => (n: number) => {
    const q = new URLSearchParams(extra);
    if (n > 1) q.set('page', String(n));
    const s = q.toString();
    return s ? `${base}?${s}` : base;
  };
  const missing = (): DevRoute => ({ template: '404', status: 404, scope: {}, path });
  const alt = (base: string): string => {
    const t = query.get('template');
    return t !== null && new RegExp(`^${base}\\.[a-z0-9-]{1,30}$`).test(t) ? t : base;
  };
  const slice = <T>(list: T[], p: ThemePaginate): T[] => list.slice((p.page - 1) * p.per_page, p.page * p.per_page);
  const collectionRoute = (handle: string, title: string, list: unknown[]): DevRoute => {
    const base = here(handle === 'all' ? '/products' : `/category/${handle}`);
    const paginate = buildPaginate({ page: query.get('page'), perPage: DEV_PER_PAGE, total: list.length, url: pageUrl(base) });
    const first = (list[0] ?? {}) as Product;
    const collection: ThemeCollectionPage = {
      handle, title, description: '', url: base, image: (first.image ?? null) as ThemeCollectionPage['image'],
      products: slice(list, paginate) as ThemeCollectionPage['products'], products_count: list.length,
    };
    return { template: alt('collection'), status: 200, scope: { collection, paginate }, path };
  };

  if (path === '/' || path === '') return { template: 'index', status: 200, scope: {}, path: '/' };
  let m = /^\/products\/([^/]+)\/?$/.exec(path);
  if (m) {
    const h = handleOf(m[1]!);
    const product = h !== undefined && Object.hasOwn(opts.products, h) ? opts.products[h] : undefined;
    return product ? { template: alt('product'), status: 200, scope: { product }, path } : missing();
  }
  if (/^\/products\/?$/.test(path)) return collectionRoute('all', ALL[locale].title, Object.values(opts.products));
  m = /^\/(?:category|collections)\/([^/]+)\/?$/.exec(path);
  if (m) {
    const h = handleOf(m[1]!);
    if (h === undefined || !Object.hasOwn(opts.collections, h)) return missing();
    const c = opts.collections[h]!;
    return collectionRoute(h, c.title ?? h, c.products);
  }
  if (/^\/search\/?$/.test(path)) {
    const terms = (query.get('q') ?? '').trim().slice(0, 100);
    const hits = terms === '' ? [] : Object.values(opts.products).filter((p) => String((p as Product).title ?? '').toLowerCase().includes(terms.toLowerCase()));
    const paginate = buildPaginate({ page: query.get('page'), perPage: DEV_PER_PAGE, total: hits.length, url: pageUrl(here('/search'), { q: terms }) });
    return { template: 'search', status: 200, scope: { search: { terms, results: slice(hits, paginate), results_count: hits.length }, paginate }, path };
  }
  if (/^\/cart\/?$/.test(path)) return { template: 'cart', status: 200, scope: {}, path };
  if (/^\/checkout\/?$/.test(path)) return { template: 'checkout', status: 200, scope: {}, path };
  m = /^\/pages\/([^/]+)\/?$/.exec(path);
  if (m) {
    const h = handleOf(m[1]!);
    const page = h !== undefined && Object.hasOwn(PAGES, h) ? PAGES[h]![locale] : undefined;
    return page ? { template: alt('page'), status: 200, scope: { page: { ...page, url: here(`/pages/${page.handle}`) } }, path } : missing();
  }
  return missing();
}

/** A miss on a theme without a `404` template (the default store normally fills it in) gets a plain text page. */
export const plainNotFound = (route: DevRoute, templates: object): boolean =>
  route.status === 404 && route.template === '404' && !Object.hasOwn(templates, '404');
