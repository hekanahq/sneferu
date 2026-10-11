import { escapeAttr, escapeText, safeToken, toStr, type HkTag, type TagRenderContext } from '@hekana/sneferu-core';
import { passthrough } from './attrs';
import { iconSvg } from './icon';
import { link } from './content';

const L = (ar: string, en: string) => ({ ar, en });
/** Used when neither the `label` prop nor a `search` translation exists. */
const BUILTIN = L('بحث', 'Search');
export const VISUALLY_HIDDEN_CSS = '.sn-visually-hidden{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}';

/** Merchant/template text: trimmed, at most 200 characters. */
const text = (v: unknown): string => toStr(v).trim().slice(0, 200);
const searchLabel = (p: Record<string, unknown>, c: TagRenderContext): string => {
  const own = text(p.label);
  if (own) return own;
  const t = text(c.t('search'));
  return t && t !== 'search' ? t : BUILTIN[c.locale];
};

/**
 * The only form a theme can render: GET to the store's /search with one `q` field.
 * Nothing about the form is configurable from a template except its words: no action,
 * method, extra fields or hidden inputs (form, input and button stay off the element
 * allow-list).
 */
export const hkSearchForm: HkTag = {
  name: 'hk-search-form', version: 1, category: 'ui',
  props: {
    placeholder: { type: 'text', label: L('النص داخل الخانة', 'Placeholder') },
    label: { type: 'text', label: L('الوصف', 'Label'), default: '' },
    buttonLabel: { type: 'text', label: L('نص الزر', 'Button text') },
    showLabel: { type: 'boolean', label: L('إظهار الوصف', 'Show label'), default: false },
    icon: { type: 'boolean', label: L('أيقونة البحث', 'Search icon'), default: true },
  },
  allowedParents: '*', allowedChildren: [], responsive: [], bindable: '*',
  editor: { label: L('خانة بحث', 'Search form'), group: 'ui', insertable: true },
  a11y: { role: 'search', labelProp: 'label' },
  render(p, c) {
    const s = `.sn-${c.id}`;
    c.css(`${s}{display:flex;flex-wrap:wrap;align-items:stretch;gap:8px}`);
    c.css(`${s} .sn-search-label{flex-basis:100%}`);
    c.css(`${s} input{flex:1 1 12em;min-width:0;min-height:44px;font:inherit}`);
    c.css(`${s} .sn-search-button{display:inline-flex;align-items:center;justify-content:center;gap:.5em;min-width:44px;min-height:44px;font:inherit;cursor:pointer}`);
    const show = p.showLabel === true;
    if (!show) (c.cssOnce ?? c.css)(VISUALLY_HIDDEN_CSS);
    const label = searchLabel(p, c);
    const qid = `${safeToken(c.id).replace(/ /g, '-')}-q`;
    const placeholder = text(p.placeholder);
    const icon = p.icon === false ? '' : iconSvg('search', 20, 2);
    const btnText = text(p.buttonLabel) || (icon === '' ? label : '');
    const x = passthrough(p, true);
    return `<form class="sn-${c.id} sn-search${x.cls}"${x.attrs} role="search" method="get" action="${escapeAttr(link(c, '/search'))}">`
      + `<label class="sn-search-label${show ? '' : ' sn-visually-hidden'}" for="${escapeAttr(qid)}">${escapeText(label)}</label>`
      + `<input id="${escapeAttr(qid)}" type="search" name="q" maxlength="100" autocomplete="off" enterkeyhint="search"${placeholder ? ` placeholder="${escapeAttr(placeholder)}"` : ''}>`
      // visible button text is the accessible name; aria-label only for an icon-only button
      + `<button type="submit" class="sn-search-button"${btnText ? '' : ` aria-label="${escapeAttr(label)}"`}>${icon}${escapeText(btnText)}</button></form>`;
  },
};
