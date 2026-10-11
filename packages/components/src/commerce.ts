import { escapeAttr, escapeText, formatAmount, isMoneyFormat, moneyText, safeUrl, toStr, type HkTag, type MoneyFormat, type TagRenderContext } from '@hekana/sneferu-core';
import { px, responsiveCss, safeImageSrc } from './css';
import { passthrough } from './attrs';
import { srcsetOf } from './image-src';

type Extra = { cls: string; attrs: string };
const NONE: Extra = { cls: '', attrs: '' };

const L = (ar: string, en: string) => ({ ar, en });
const ed = (ar: string, en: string) => ({ label: L(ar, en), group: 'commerce', insertable: true });

export function formatMoney(minor: unknown, locale: 'ar' | 'en', currency = 'EGP', format: MoneyFormat = 'decimal'): string {
  const n = typeof minor === 'number' ? minor : Number(minor);
  if (!Number.isFinite(n)) return '';
  return moneyText(formatAmount(n, format), locale, currency);
}

/** Escaped price text; with 'whole' the number is isolated in <bdi> (the decimal default keeps 0.2's markup). */
const moneyHtml = (minor: unknown, locale: 'ar' | 'en', format: MoneyFormat): string => {
  if (format !== 'whole') return escapeText(formatMoney(minor, locale));
  const n = typeof minor === 'number' ? minor : Number(minor);
  if (!Number.isFinite(n)) return '';
  return moneyText(escapeText(formatAmount(n, 'whole')), locale, 'EGP', (s) => `<bdi>${s}</bdi>`);
};

const priceHtml = (id: string, amount: unknown, compareAt: unknown, c: TagRenderContext, x: Extra = NONE, format?: unknown) => {
  const f: MoneyFormat = isMoneyFormat(format) ? format : isMoneyFormat(c.money) ? c.money : 'decimal';
  const now = moneyHtml(amount, c.locale, f);
  const was = typeof compareAt === 'number' && typeof amount === 'number' && compareAt > amount ? ` <s class="sn-was">${moneyHtml(compareAt, c.locale, f)}</s>` : '';
  return `<span class="sn-${id} sn-price${x.cls}"${x.attrs}><span class="sn-now">${now}</span>${was}</span>`;
};

export const hkPrice: HkTag = {
  name: 'hk-price', version: 1, category: 'commerce',
  props: {
    amount: { type: 'number', label: L('السعر', 'Price') },
    compareAt: { type: 'number', label: L('السعر قبل الخصم', 'Compare at') },
    format: { type: 'select', label: L('شكل الرقم', 'Number format'), options: ['decimal', 'whole'] },
  },
  allowedParents: '*', allowedChildren: [], responsive: [], bindable: '*', editor: ed('السعر', 'Price'),
  render: (p, c) => priceHtml(c.id, p.amount, p.compareAt, c, passthrough(p), p.format),
};

type ProductView = { title?: unknown; url?: unknown; price?: unknown; compare_at?: unknown; image?: { url?: unknown } | unknown };
/** Template-rendered part content; whitespace-only counts as empty. */
type Parts = { badge: string; actions: string };
const NO_PARTS: Parts = { badge: '', actions: '' };
const filled = (s: string) => (s.trim() === '' ? '' : s);

/**
 * One product card. Without parts the markup is exactly 0.2's. `badge` goes inside
 * the link, before the image; `actions` after the link, and the card is then
 * wrapped in <div class="sn-product-card-wrap"> (which takes the pass-through attributes).
 */
const card = (prod: ProductView, id: string, c: TagRenderContext, x: Extra = NONE, parts: Parts = NO_PARTS) => {
  const url = safeUrl(toStr(prod.url) || '#');
  const img = typeof prod.image === 'object' && prod.image !== null ? toStr((prod.image as { url?: unknown }).url) : toStr(prod.image);
  const srcset = srcsetOf(prod.image);
  const set = srcset === '' ? '' : ` srcset="${escapeAttr(srcset)}" sizes="(max-width:639px) 50vw, 25vw"`;
  const imgHtml = safeImageSrc(img) ? `<img src="${escapeAttr(img)}"${set} alt="${escapeAttr(toStr(prod.title))}" loading="lazy" decoding="async">` : '';
  const inner = `${parts.badge}${imgHtml}<span class="sn-title">${escapeText(toStr(prod.title))}</span>${priceHtml(`${id}-p`, prod.price, prod.compare_at, c)}</a>`;
  if (parts.actions === '') return `<a class="sn-product-card${x.cls}"${x.attrs} href="${escapeAttr(url)}">${inner}`;
  return `<div class="sn-product-card-wrap${x.cls}"${x.attrs}><a class="sn-product-card" href="${escapeAttr(url)}">${inner}${parts.actions}</div>`;
};

export const hkProductCard: HkTag = {
  name: 'hk-product-card', version: 1, category: 'commerce',
  props: { product: { type: 'product', label: L('المنتج', 'Product') } },
  allowedParents: '*', allowedChildren: ['hk-part'], parts: ['badge', 'actions'], responsive: [], bindable: '*', editor: ed('كارت منتج', 'Product card'),
  render: (p, c) => (typeof p.product === 'object' && p.product !== null
    ? card(p.product as ProductView, c.id, c, passthrough(p), { badge: filled(c.renderChildren('badge')), actions: filled(c.renderChildren('actions')) })
    : ''),
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
    c.css(`${s}{display:grid;gap:${px(16)}}`);
    responsiveCss(s, 'grid-template-columns', p.columns ?? 4, cols).forEach(c.css);
    const x = passthrough(p);
    return `<div class="sn-${c.id}${x.cls}"${x.attrs}>${list.slice(0, limit).map((x, i) => card(x as ProductView, `${c.id}-${i}`, c)).join('')}</div>`;
  },
};
