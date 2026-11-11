import { escapeAttr, escapeText, toStr, type HkTag } from '@hekana/sneferu-core';
import { colorVar, oneOf } from './css';
import { passthrough } from './attrs';
import { link } from './content';

const L = (ar: string, en: string) => ({ ar, en });
const MOTION = oneOf(['static', 'rotate', 'marquee'] as const);

/** How many message slots the editor offers. */
export const ANNOUNCEMENT_SLOTS = 6;

/**
 * The announcement bar: up to six short messages, each with an optional link, shown still,
 * fading one after another, or scrolling. Motion is CSS only (no script ever runs) and every
 * animation is switched off for visitors who ask for reduced motion, leaving the first message.
 */
export const hkAnnouncement: HkTag = {
  name: 'hk-announcement', version: 1, category: 'ui',
  props: {
    ...Object.fromEntries(
      Array.from({ length: ANNOUNCEMENT_SLOTS }, (_, i) => [
        [`m${i + 1}`, { type: 'text', label: L(`الرسالة ${i + 1}`, `Message ${i + 1}`), default: '', maxLength: 160 }],
        [`l${i + 1}`, { type: 'link', label: L(`رابط الرسالة ${i + 1}`, `Message ${i + 1} link`), default: '' }],
      ]).flat(),
    ),
    motion: { type: 'select', label: L('الحركة', 'Motion'), options: ['static', 'rotate', 'marquee'], default: 'static' },
    speed: { type: 'number', label: L('السرعة', 'Speed'), min: 1, max: 10, default: 5 },
    color: { type: 'color', label: L('لون النص', 'Text colour') },
    dismissible: { type: 'boolean', label: L('زر إغلاق', 'Close button'), default: false },
  },
  allowedParents: '*', allowedChildren: [], responsive: [], bindable: '*',
  editor: { label: L('شريط إعلانات', 'Announcement bar'), group: 'content', insertable: true },
  render(p, c) {
    const items: string[] = [];
    let chars = 0;
    for (let i = 1; i <= ANNOUNCEMENT_SLOTS; i++) {
      const text = toStr(p[`m${i}`]).trim();
      if (text === '') continue;
      chars += text.length;
      const href = toStr(p[`l${i}`]).trim() === '' ? '#' : link(c, p[`l${i}`]);
      const body = escapeText(text);
      items.push(href === '#' ? `<span class="sn-ann-i">${body}</span>` : `<a class="sn-ann-i" href="${escapeAttr(href)}">${body}</a>`);
    }
    if (items.length === 0) return '';
    const s = `.sn-${c.id}`;
    const speed = Math.min(10, Math.max(1, Number(p.speed) || 5));
    let motion = MOTION(p.motion) ?? 'static';
    if (motion === 'rotate' && items.length < 2) motion = 'static';
    const col = colorVar(p.color);
    c.css(`${s}{position:relative;display:block;overflow:hidden;font-size:.875rem;line-height:1.4;padding-block:.5rem;${col ? `color:${col};` : ''}text-align:center}`);
    c.css(`${s} .sn-ann-i{color:inherit;text-decoration:none}${s} a.sn-ann-i{text-decoration:underline;text-underline-offset:3px}`);
    let inner: string;
    if (motion === 'static') {
      c.css(`${s} .sn-ann-line{display:flex;flex-wrap:wrap;justify-content:center;gap:.25rem 1.5rem}`);
      inner = `<div class="sn-ann-line">${items.join('')}</div>`;
    } else if (motion === 'rotate') {
      const dwell = Math.round((8 - speed * 0.6) * 10) / 10;
      const total = Math.round(dwell * items.length * 10) / 10;
      const share = Math.round((100 / items.length) * 100) / 100;
      const fade = Math.min(8, share / 4);
      c.css(`${s} .sn-ann-stack{display:grid}${s} .sn-ann-stack>.sn-ann-i{grid-area:1/1;opacity:0;animation:sn-ann-${c.id} ${total}s linear infinite both}`);
      items.forEach((_, i) => c.css(`${s} .sn-ann-stack>.sn-ann-i:nth-child(${i + 1}){animation-delay:${Math.round(dwell * i * 10) / 10}s}`));
      c.css(`@keyframes sn-ann-${c.id}{0%{opacity:0}${fade}%{opacity:1}${Math.round((share - fade) * 100) / 100}%{opacity:1}${share}%{opacity:0}100%{opacity:0}}`);
      c.css(`@media (prefers-reduced-motion:reduce){${s} .sn-ann-stack>.sn-ann-i{animation:none}${s} .sn-ann-stack>.sn-ann-i:first-child{opacity:1}}`);
      inner = `<div class="sn-ann-stack">${items.join('')}</div>`;
    } else {
      const rtl = c.dir === 'rtl';
      const velocity = 20 + speed * 10;
      const secs = Math.max(8, Math.round((chars * 9 + items.length * 48) / velocity));
      c.css(`${s} .sn-ann-track{display:flex;width:max-content;animation:sn-ann-${c.id} ${secs}s linear infinite}${s}:hover .sn-ann-track{animation-play-state:paused}`);
      c.css(`${s} .sn-ann-group{display:flex;flex:none;gap:3rem;padding-inline-end:3rem}`);
      c.css(`@keyframes sn-ann-${c.id}{from{transform:translateX(0)}to{transform:translateX(${rtl ? '50%' : '-50%'})}}`);
      c.css(`@media (prefers-reduced-motion:reduce){${s} .sn-ann-track{animation:none;width:auto;justify-content:center}${s} .sn-ann-group[aria-hidden]{display:none}}`);
      inner = `<div class="sn-ann-track"><div class="sn-ann-group">${items.join('')}</div><div class="sn-ann-group" aria-hidden="true">${items.join('')}</div></div>`;
    }
    let close = '';
    if (p.dismissible === true) {
      const label = c.locale === 'ar' ? 'إغلاق' : 'Close';
      c.css(`${s}:has(>.sn-ann-x:checked){display:none}${s}{padding-inline:2.75rem}`);
      c.css(`${s} .sn-ann-x{appearance:none;-webkit-appearance:none;position:absolute;inset-inline-end:.25rem;top:50%;transform:translateY(-50%);width:2.75rem;height:2.75rem;margin:0;background:transparent;color:inherit;cursor:pointer;border:0;z-index:1}`);
      c.css(`${s} .sn-ann-x::before{content:"\\00d7";font-size:1.25rem;line-height:2.75rem;display:block;text-align:center}`);
      close = `<input type="checkbox" class="sn-ann-x" aria-label="${escapeAttr(label)}">`;
    }
    const x = passthrough(p);
    return `<div class="sn-${c.id} sn-announcement sn-ann-${motion}${x.cls}"${x.attrs}>${close ? close : ''}${inner}</div>`;
  },
};
