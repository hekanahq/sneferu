import { escapeAttr, escapeText, safeUrl, toStr, type HkTag } from '@hekana/sneferu-core';
import { colorVar, oneOf, px, responsiveCss, safeImageSrc } from './css';
import { passthrough } from './attrs';
import { sanitizeRichText } from './sanitize';

const L = (ar: string, en: string) => ({ ar, en });
const ed = (ar: string, en: string, group = 'content') => ({ label: L(ar, en), group, insertable: true });
const ALIGN = oneOf(['start', 'center', 'end'] as const);
const LEVEL = oneOf(['h1', 'h2', 'h3', 'h4'] as const);

function textCss(sel: string, p: Record<string, unknown>, css: (r: string) => void, defSize?: number) {
  responsiveCss(sel, 'font-size', p.size ?? defSize, (v) => px(v, 160)).forEach(css);
  const col = colorVar(p.color); if (col) css(`${sel}{color:${col}}`);
  const a = ALIGN(p.align); if (a) css(`${sel}{text-align:${a}}`);
}

export const hkHeading: HkTag = {
  name: 'hk-heading', version: 1, category: 'typography',
  props: {
    text: { type: 'text', label: L('النص', 'Text'), default: '' },
    level: { type: 'select', label: L('المستوى', 'Level'), options: ['h1', 'h2', 'h3', 'h4'], default: 'h2' },
    size: { type: 'number', label: L('الحجم', 'Size'), min: 12, max: 160, responsive: true },
    align: { type: 'select', label: L('المحاذاة', 'Align'), options: ['start', 'center', 'end'] },
    color: { type: 'color', label: L('اللون', 'Colour') },
  },
  allowedParents: '*', allowedChildren: [], responsive: ['size'], bindable: '*', editor: ed('عنوان', 'Heading'),
  render(p, c) {
    const h = LEVEL(p.level) ?? 'h2';
    textCss(`.sn-${c.id}`, p, c.css);
    const x = passthrough(p);
    return `<${h} class="sn-${c.id}${x.cls}"${x.attrs}>${escapeText(toStr(p.text))}</${h}>`;
  },
};

export const hkText: HkTag = {
  name: 'hk-text', version: 1, category: 'typography',
  props: {
    text: { type: 'textarea', label: L('النص', 'Text'), default: '' },
    size: { type: 'number', label: L('الحجم', 'Size'), min: 10, max: 64, responsive: true },
    align: { type: 'select', label: L('المحاذاة', 'Align'), options: ['start', 'center', 'end'] },
    color: { type: 'color', label: L('اللون', 'Colour') },
  },
  allowedParents: '*', allowedChildren: [], responsive: ['size'], bindable: '*', editor: ed('نص', 'Text'),
  render(p, c) { textCss(`.sn-${c.id}`, p, c.css); const x = passthrough(p); return `<p class="sn-${c.id}${x.cls}"${x.attrs}>${escapeText(toStr(p.text))}</p>`; },
};

const ASPECT = oneOf(['1/1', '4/5', '3/4', '16/9', '21/9'] as const);
export const hkImage: HkTag = {
  name: 'hk-image', version: 1, category: 'media',
  props: {
    src: { type: 'image', label: L('الصورة', 'Image') },
    alt: { type: 'text', label: L('وصف الصورة', 'Alt text'), default: '' },
    width: { type: 'number', label: L('العرض', 'Width'), min: 16, max: 2400 },
    aspectRatio: { type: 'select', label: L('النسبة', 'Aspect ratio'), options: ['1/1', '4/5', '3/4', '16/9', '21/9'] },
    fit: { type: 'select', label: L('الملاءمة', 'Fit'), options: ['cover', 'contain'], default: 'cover' },
    loading: { type: 'select', label: L('التحميل', 'Loading'), options: ['lazy', 'eager'], default: 'lazy' },
    radius: { type: 'number', label: L('استدارة', 'Radius'), min: 0, max: 200 },
  },
  allowedParents: '*', allowedChildren: [], responsive: [], bindable: '*', editor: ed('صورة', 'Image', 'media'),
  render(p, c) {
    const raw = typeof p.src === 'string' ? p.src : typeof p.src === 'object' && p.src !== null ? toStr((p.src as { url?: unknown }).url) : '';
    if (!safeImageSrc(raw)) return '';
    const s = `.sn-${c.id}`;
    c.css(`${s}{display:block;width:100%;height:auto;object-fit:${p.fit === 'contain' ? 'contain' : 'cover'}}`);
    const ar = ASPECT(p.aspectRatio); if (ar) c.css(`${s}{aspect-ratio:${ar}}`);
    const w = px(p.width, 2400); if (w) c.css(`${s}{max-width:${w}}`);
    const r = px(p.radius, 200); if (r) c.css(`${s}{border-radius:${r}}`);
    const eager = p.loading === 'eager';
    const x = passthrough(p);
    return `<img class="sn-${c.id}${x.cls}"${x.attrs} src="${escapeAttr(raw)}" alt="${escapeAttr(toStr(p.alt))}" loading="${eager ? 'eager' : 'lazy'}" decoding="async"${eager ? ' fetchpriority="high"' : ''}>`;
  },
};

const VARIANT = oneOf(['solid', 'outline', 'ghost'] as const);
export const hkButton: HkTag = {
  name: 'hk-button', version: 1, category: 'ui',
  props: {
    label: { type: 'text', label: L('النص', 'Label'), default: '' },
    href: { type: 'link', label: L('الرابط', 'Link'), default: '#' },
    variant: { type: 'select', label: L('النمط', 'Style'), options: ['solid', 'outline', 'ghost'], default: 'solid' },
    size: { type: 'select', label: L('الحجم', 'Size'), options: ['sm', 'md', 'lg'], default: 'md' },
  },
  allowedParents: '*', allowedChildren: [], responsive: [], bindable: '*', editor: ed('زر', 'Button', 'ui'),
  render(p, c) {
    const v = VARIANT(p.variant) ?? 'solid';
    const x = passthrough(p);
    return `<a class="sn-${c.id} sn-btn sn-btn-${v}${x.cls}"${x.attrs} href="${escapeAttr(safeUrl(toStr(p.href) || '#'))}">${escapeText(toStr(p.label))}</a>`;
  },
};

const SHADOW: Record<string, string> = { sm: '0 1px 3px rgba(0,0,0,.12)', md: '0 6px 16px rgba(0,0,0,.16)', lg: '0 16px 40px rgba(0,0,0,.22)' };
export const hkCard: HkTag = {
  name: 'hk-card', version: 1, category: 'ui',
  props: {
    background: { type: 'color', label: L('الخلفية', 'Background') },
    radius: { type: 'number', label: L('استدارة', 'Radius'), min: 0, max: 64, default: 12 },
    padding: { type: 'number', label: L('الحشو', 'Padding'), min: 0, max: 96, default: 16, responsive: true },
    border: { type: 'boolean', label: L('حد', 'Border'), default: false },
    shadow: { type: 'select', label: L('ظل', 'Shadow'), options: ['none', 'sm', 'md', 'lg'], default: 'none' },
  },
  allowedParents: '*', allowedChildren: '*', responsive: ['padding'], bindable: '*', editor: ed('كارت', 'Card', 'ui'),
  render(p, c) {
    const s = `.sn-${c.id}`;
    const bg = colorVar(p.background); if (bg) c.css(`${s}{background:${bg}}`);
    c.css(`${s}{border-radius:${px(p.radius ?? 12, 64) ?? '12px'};position:relative;overflow:hidden}`);
    responsiveCss(s, 'padding', p.padding ?? 16, (v) => px(v, 96)).forEach(c.css);
    if (p.border === true) c.css(`${s}{border:1px solid color-mix(in srgb,var(--hk-color-text) 14%,transparent)}`);
    const sh = typeof p.shadow === 'string' ? SHADOW[p.shadow] : undefined; if (sh) c.css(`${s}{box-shadow:${sh}}`);
    const x = passthrough(p);
    return `<div class="sn-${c.id} sn-card${x.cls}"${x.attrs}>${c.renderChildren()}</div>`;
  },
};

const TONE = oneOf(['accent', 'neutral', 'success', 'warning'] as const);
export const hkBadge: HkTag = {
  name: 'hk-badge', version: 1, category: 'typography',
  props: { text: { type: 'text', label: L('النص', 'Text') }, tone: { type: 'select', label: L('اللون', 'Tone'), options: ['accent', 'neutral', 'success', 'warning'], default: 'accent' } },
  allowedParents: '*', allowedChildren: ['#text'], responsive: [], bindable: '*', editor: ed('شارة', 'Badge'),
  render(p, c) {
    const body = p.text !== undefined ? escapeText(toStr(p.text)) : c.renderChildren();
    const x = passthrough(p);
    return `<span class="sn-${c.id} sn-badge sn-badge-${TONE(p.tone) ?? 'accent'}${x.cls}"${x.attrs}>${body}</span>`;
  },
};

/** HTML from data (a product description, a rich_text setting), through the rich text sanitiser. */
export const hkRichText: HkTag = {
  name: 'hk-rich-text', version: 1, category: 'typography',
  props: { html: { type: 'rich_text', label: L('النص المنسق', 'Rich text'), default: '' } },
  allowedParents: '*', allowedChildren: [], responsive: [], bindable: '*', editor: ed('نص منسق', 'Rich text'),
  render(p, c) {
    const body = typeof p.html === 'string' ? sanitizeRichText(p.html) : '';
    if (body.trim() === '') return '';
    const x = passthrough(p);
    return `<div class="sn-${c.id} sn-rich-text${x.cls}"${x.attrs}>${body}</div>`;
  },
};
