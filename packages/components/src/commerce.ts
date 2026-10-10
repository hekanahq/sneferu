import { escapeAttr, escapeText, safeUrl, toStr, type HkTag, type TagRenderContext } from '@hekana/sneferu-core';
import { px, responsiveCss } from './css';

const L = (ar: string, en: string) => ({ ar, en });
const ed = (ar: string, en: string) => ({ label: L(ar, en), group: 'commerce', insertable: true });

export function formatMoney(minor: unknown, locale: 'ar' | 'en', currency = 'EGP'): string {
  const n = typeof minor === 'number' ? minor : Number(minor);
  if (!Number.isFinite(n)) return '';
  const s = (n / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (currency === 'EGP') return locale === 'ar' ? `${s} ج.م` : `EGP ${s}`;
  return locale === 'ar' ? `${s} ${currency}` : `${currency} ${s}`;
}

const priceHtml = (id: string, amount: unknown, compareAt: unknown, c: TagRenderContext) => {
  const now = formatMoney(amount, c.locale);
  const was = typeof compareAt === 'number' && typeof amount === 'number' && compareAt > amount ? ` <s class="sn-was">${escapeText(formatMoney(compareAt, c.locale))}</s>` : '';
  return `<span class="sn-${id} sn-price"><span class="sn-now">${escapeText(now)}</span>${was}</span>`;
};

export const hkPrice: HkTag = {
  name: 'hk-price', version: 1, category: 'commerce',
  props: { amount: { type: 'number', label: L('السعر', 'Price') }, compareAt: { type: 'number', label: L('السعر قبل الخصم', 'Compare at') } },
  allowedParents: '*', allowedChildren: [], responsive: [], bindable: '*', editor: ed('السعر', 'Price'),
  render: (p, c) => priceHtml(c.id, p.amount, p.compareAt, c),
};

type ProductView = { title?: unknown; url?: unknown; price?: unknown; compare_at?: unknown; image?: { url?: unknown } | unknown };
const card = (prod: ProductView, id: string, c: TagRenderContext) => {
  const url = safeUrl(toStr(prod.url) || '#');
  const img = typeof prod.image === 'object' && prod.image !== null ? toStr((prod.image as { url?: unknown }).url) : toStr(prod.image);
  const imgHtml = img.startsWith('https://') || img.startsWith('/') ? `<img src="${escapeAttr(img)}" alt="${escapeAttr(toStr(prod.title))}" loading="lazy" decoding="async">` : '';
  return `<a class="sn-product-card" href="${escapeAttr(url)}">${imgHtml}<span class="sn-title">${escapeText(toStr(prod.title))}</span>${priceHtml(`${id}-p`, prod.price, prod.compare_at, c)}</a>`;
};

export const hkProductCard: HkTag = {
  name: 'hk-product-card', version: 1, category: 'commerce',
  props: { product: { type: 'product', label: L('المنتج', 'Product') } },
  allowedParents: '*', allowedChildren: [], responsive: [], bindable: '*', editor: ed('كارت منتج', 'Product card'),
  render: (p, c) => (typeof p.product === 'object' && p.product !== null ? card(p.product as ProductView, c.id, c) : ''),
};

export const hkProductGrid: HkTag = {
  name: 'hk-product-grid', version: 1, category: 'commerce',
  props: {
    products: { type: 'collection', label: L('المنتجات', 'Products') },
    limit: { type: 'range', label: L('العدد', 'Count'), min: 1, max: 48, default: 8 },
    columns: { type: 'range', label: L('الأعمدة', 'Columns'), min: 1, max: 6, default: 4, responsive: true },
  },
  allowedParents: '*', allowedChildren: [], responsive: ['columns'], bindable: '*', editor: ed('شبكة منتجات', 'Product grid'),
  render(p, c) {
    const list = Array.isArray(p.products) ? p.products : Array.isArray((p.products as { products?: unknown[] })?.products) ? (p.products as { products: unknown[] }).products : [];
    const limit = Math.min(48, Math.max(1, Number(p.limit) || 8));
    const s = `.sn-${c.id}`;
    const cols = (v: unknown) => { const n = Number(v); return Number.isInteger(n) && n >= 1 && n <= 6 ? `repeat(${n},minmax(0,1fr))` : null; };
    const rules = responsiveCss(s, 'grid-template-columns', p.columns ?? 4, cols);
    if (rules[0]) rules[0] = rules[0].replace(`${s}{`, `${s}{display:grid;gap:${px(16)};`);
    rules.forEach(c.css);
    return `<div class="sn-${c.id}">${list.slice(0, limit).map((x, i) => card(x as ProductView, `${c.id}-${i}`, c)).join('')}</div>`;
  },
};
