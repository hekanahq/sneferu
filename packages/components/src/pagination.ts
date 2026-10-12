import { escapeAttr, escapeText, safeUrl, toStr, type HkTag } from '@hekana/sneferu-core';
import { passthrough } from './attrs';
import { tagIcon } from './icon';
import { COMMERCE_STRINGS, str } from './strings';

const L = (ar: string, en: string) => ({ ar, en });
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const whole = (v: unknown): number => (typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 1_000_000 ? v : 0);
/** Links are the host's own (`paginate.parts[].url`): checked, never localised again. */
const href = (v: unknown): string => { const s = safeUrl(toStr(v).slice(0, 2000)); return s === '#' ? '' : s; };

export const PAGINATION_CSS = [
  '.sn-pagination{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;margin-block:24px}',
  '.sn-pagination ul{display:flex;flex-wrap:wrap;gap:8px;list-style:none;margin:0;padding:0}',
  '.sn-pagination a,.sn-pagination .sn-page-gap{display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;padding-inline:8px;border:1px solid color-mix(in srgb,var(--hk-color-text) 18%,transparent);border-radius:var(--hk-radius-sm,6px);color:inherit;text-decoration:none}',
  '.sn-pagination a[aria-current=page]{background:var(--hk-color-accent);border-color:var(--hk-color-accent);color:var(--hk-color-on-accent,var(--hk-color-background))}',
  '.sn-pagination a:focus-visible{outline:2px solid var(--hk-color-accent);outline-offset:2px}',
].join('');

export const hkPagination: HkTag = {
  name: 'hk-pagination', version: 1, category: 'ui',
  props: { paginate: { type: 'data', label: L('بيانات الصفحات', 'Pagination data') } },
  allowedParents: '*', allowedChildren: [], responsive: [], bindable: '*', strings: COMMERCE_STRINGS,
  editor: { label: L('ترقيم الصفحات', 'Pagination'), group: 'ui', insertable: false },
  a11y: { role: 'navigation', labelProp: 'pagination' },
  render(p, c) {
    if (!isObj(p.paginate)) return '';
    const pages = whole(p.paginate.pages);
    if (pages <= 1) return '';
    const parts = Array.isArray(p.paginate.parts) ? p.paginate.parts.slice(0, 9) : [];
    const items = parts.flatMap((x) => {
      if (!isObj(x)) return [];
      const n = whole(x.page); const u = href(x.url);
      if (!n || !u) return [];
      const label = `${str(c, 'page')} ${n}`;
      return [`<li><a href="${escapeAttr(u)}"${x.current === true ? ' aria-current="page"' : ''} aria-label="${escapeAttr(label)}">${n}</a></li>`];
    });
    if (items.length === 0) return '';
    (c.cssOnce ?? c.css)(PAGINATION_CSS);
    const arrow = (url: unknown, rel: 'prev' | 'next', icon: string, key: string) => {
      const u = href(url);
      return u ? `<a class="sn-page-${rel}" href="${escapeAttr(u)}" rel="${rel}" aria-label="${escapeAttr(str(c, key))}">${tagIcon(c, icon, 20, 2)}</a>` : '';
    };
    const x = passthrough(p);
    return `<nav class="sn-${c.id} sn-pagination${x.cls}"${x.attrs} aria-label="${escapeAttr(str(c, 'pagination'))}">`
      + `${arrow(p.paginate.prev_url, 'prev', 'chevron-left', 'previous_page')}<ul>${items.join('')}</ul>${arrow(p.paginate.next_url, 'next', 'chevron-right', 'next_page')}</nav>`;
  },
};

const NAMES = { ar: 'العربية', en: 'English' } as const;
/** The link to this page in the other language: `localization` from the page, label in the target language. */
export const hkLocaleSwitch: HkTag = {
  name: 'hk-locale-switch', version: 1, category: 'ui',
  props: {
    style: { type: 'select', label: L('الشكل', 'Style'), options: ['name', 'code'], default: 'name' },
    localization: { type: 'data', label: L('بيانات اللغة', 'Localization data') },
  },
  allowedParents: '*', allowedChildren: [], responsive: [], bindable: '*',
  editor: { label: L('تبديل اللغة', 'Language switch'), group: 'ui', insertable: true },
  render(p, c) {
    const loc = isObj(p.localization) ? p.localization : isObj(c.data.localization) ? c.data.localization : null;
    if (!loc) return '';
    const target = loc.alternate_locale === 'ar' || loc.alternate_locale === 'en' ? loc.alternate_locale : null;
    const u = href(loc.alternate_url);
    if (!target || !u) return '';
    const label = p.style === 'code' ? target.toUpperCase() : NAMES[target];
    (c.cssOnce ?? c.css)('.sn-locale-switch{display:inline-flex;align-items:center;min-height:44px;padding-inline:8px;color:inherit}');
    const x = passthrough(p);
    return `<a class="sn-${c.id} sn-locale-switch${x.cls}"${x.attrs} href="${escapeAttr(u)}" hreflang="${target}" lang="${target}" rel="alternate">${escapeText(label)}</a>`;
  },
};
