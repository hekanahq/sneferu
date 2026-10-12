import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

/** The controllers bundle, read from the installed package; undefined when it cannot be found. */
export function controllersBundle(): string | undefined {
  // the package's CommonJS entry sits next to its ES module build
  try { return readFileSync(createRequire(import.meta.url).resolve('@hekana/sneferu-controllers').replace(/index\.cjs$/, 'index.js'), 'utf8'); } catch { return undefined; }
}

/**
 * The dev page's host for the controllers: a cart kept in localStorage, no server. Product title and price
 * come from the page (the heading and the price on it), so the cart drawer and cart page work while you build.
 */
const STRINGS = {
  en: { add_to_cart: 'Add to cart', added: 'Added to the cart', sold_out: 'Sold out', money: 'EGP {n}', remove: 'Remove', subtotal: 'Subtotal', checkout: 'Checkout', empty: 'Your cart is empty', quantity: 'Quantity', close: 'Close' },
  ar: { add_to_cart: 'أضف للسلة', added: 'اتضاف للسلة', sold_out: 'نفد المخزون', money: '{n} ج.م', remove: 'حذف', subtotal: 'المجموع', checkout: 'إتمام الشراء', empty: 'سلتك فاضية', quantity: 'الكمية', close: 'إغلاق' },
} as const;
const HOST_BODY = `
import { startControllers } from '/__controllers.js';
const KEY = 'sneferu-dev-cart';
const read = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
let lines = read();
const subs = new Set();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch {} subs.forEach((f) => f(lines)); };
const lang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
const T = __T__;
const priceOnPage = () => { const t = document.querySelector('[data-hk-bind="price"] .sn-now, .sn-price .sn-now'); const m = t && /[\\d][\\d,]*(?:\\.\\d+)?/.exec(t.textContent || ''); return m ? Math.round(Number(m[0].replace(/,/g, '')) * 100) : 0; };
const host = {
  locale: lang, currency: 'EGP',
  format: (m) => T.money.replace('{n}', (m / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })),
  get: () => lines,
  add: async ({ productId, variantId, quantity }) => {
    const key = productId + ':' + (variantId || '');
    const hit = lines.find((l) => l.key === key);
    if (hit) hit.quantity += quantity;
    else lines = [...lines, { key, productId, variantId, title: (document.querySelector('h1') || {}).textContent || 'Product', unitPrice: priceOnPage(), quantity, url: location.pathname }];
    save(); return { ok: true };
  },
  update: (key, q) => { lines = lines.map((l) => (l.key === key ? { ...l, quantity: q } : l)); save(); },
  remove: (key) => { lines = lines.filter((l) => l.key !== key); save(); },
  subscribe: (fn) => { subs.add(fn); return () => subs.delete(fn); },
  checkoutUrl: '/cart', t: (k) => T[k] || k,
};
startControllers(document, host);
`;

/** The host script for one language: only that language's words, so an English page holds no Arabic. */
export const devHostScript = (locale: 'ar' | 'en'): string => HOST_BODY.replace('__T__', JSON.stringify(STRINGS[locale]));
