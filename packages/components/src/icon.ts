import { escapeAttr, toStr, type HkTag, type TagRenderContext } from '@hekana/sneferu-core';
import { FLIP_ICONS, ICONS, ICON_NAMES } from './icons';
import { passthrough } from './attrs';
import { safeImageSrc } from './css';

const L = (ar: string, en: string) => ({ ar, en });
export const FLIP_CSS = '[dir=rtl] .sn-flip{transform:scaleX(-1)}';

const num = (v: unknown): number => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN);
/** 12–96 px, whole pixels; anything else 20. */
export const iconSize = (v: unknown): number => { const n = num(v); return Number.isFinite(n) ? Math.round(Math.min(96, Math.max(12, n))) : 20; };
/** 1–3 in steps of 0.5; anything else 2. */
export const iconStroke = (v: unknown): number => { const n = num(v); return Number.isFinite(n) ? Math.round(Math.min(3, Math.max(1, n)) * 2) / 2 : 2; };

export const isIconName = (name: unknown): name is string => typeof name === 'string' && Object.hasOwn(ICONS, name);

/**
 * An inline Lucide icon, '' for an unknown name. Decorative (aria-hidden) unless it has
 * a label, then role="img" + aria-label. `extra` is class tokens and attributes for the root.
 */
export function iconSvg(name: string, size: number, stroke: number, label?: string, opts: { flip?: boolean; cls?: string; attrs?: string } = {}): string {
  if (!isIconName(name)) return '';
  const s = iconSize(size);
  const w = iconStroke(stroke);
  const text = typeof label === 'string' ? label.trim() : '';
  const a11y = text ? `role="img" aria-label="${escapeAttr(text)}"` : 'aria-hidden="true"';
  return `<svg class="sn-icon${opts.flip ? ' sn-flip' : ''}${opts.cls ?? ''}"${opts.attrs ?? ''} xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${a11y}>${ICONS[name]}</svg>`;
}

/** iconSvg for a tag: mirrors direction-bearing icons on RTL pages and emits the rule for that. */
/** Uploaded icons are plain images from the media library. They are only ever emitted as an <img>, never inlined, so an uploaded SVG cannot run script. */
export const isMediaIcon = (v: unknown): v is string => typeof v === 'string' && v.length <= 2048 && safeImageSrc(v.trim());
export const MEDIA_ICON_CSS = '.sn-icon-img{display:inline-block;flex:none;object-fit:contain;max-width:100%;vertical-align:middle}';
export function mediaIconHtml(src: string, size: number, label?: string, opts: { cls?: string; attrs?: string } = {}): string {
  const s = iconSize(size);
  const text = typeof label === 'string' ? label.trim() : '';
  return `<img class="sn-icon-img${opts.cls ?? ''}"${opts.attrs ?? ''} src="${escapeAttr(src.trim())}" width="${s}" height="${s}" alt="${escapeAttr(text)}"${text ? '' : ' aria-hidden="true"'} loading="lazy" decoding="async">`;
}
export function tagIcon(c: TagRenderContext, name: unknown, size: unknown, stroke: unknown, label?: string, extra: { cls?: string; attrs?: string } = {}): string {
  if (isMediaIcon(name) && !isIconName(name)) {
    (c.cssOnce ?? c.css)(MEDIA_ICON_CSS);
    return mediaIconHtml(name, iconSize(size), label, extra);
  }
  if (!isIconName(name)) return '';
  const flip = c.dir === 'rtl' && FLIP_ICONS.has(name);
  if (flip) (c.cssOnce ?? c.css)(FLIP_CSS);
  return iconSvg(name, iconSize(size), iconStroke(stroke), label, { flip, ...extra });
}

export const hkIcon: HkTag = {
  name: 'hk-icon', version: 1, category: 'media',
  props: {
    name: { type: 'select', label: L('الأيقونة', 'Icon'), options: ICON_NAMES, required: true },
    size: { type: 'range', label: L('الحجم', 'Size'), min: 12, max: 96, default: 20 },
    stroke: { type: 'range', label: L('سمك الخط', 'Stroke'), min: 1, max: 3, step: 0.5, default: 2 },
    label: { type: 'text', label: L('وصف للقارئ', 'Label') },
  },
  allowedParents: '*', allowedChildren: [], responsive: [], bindable: '*',
  editor: { label: L('أيقونة', 'Icon'), group: 'media', insertable: true },
  a11y: { labelProp: 'label' },
  render(p, c) {
    const x = passthrough(p, true);
    return tagIcon(c, p.name, p.size ?? 20, p.stroke ?? 2, toStr(p.label), x);
  },
};

