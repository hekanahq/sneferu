import { escapeAttr, escapeText, safeToken, toStr, type HkTag, type TagRenderContext } from '@hekana/sneferu-core';
import { passthrough } from './attrs';
import { VISUALLY_HIDDEN_CSS } from './search';

const L = (ar: string, en: string) => ({ ar, en });

const BUILTIN = {
  label: L('البريد الإلكتروني', 'Email address'),
  button: L('اشترك', 'Subscribe'),
  success: L('تم الاشتراك. شكراً لك.', 'You are subscribed. Thank you.'),
  invalid: L('اكتب بريداً إلكترونياً صحيحاً.', 'Enter a valid email address.'),
  failed: L('تعذّر الاشتراك. حاول مرة أخرى.', 'Could not subscribe. Try again.'),
};

const text = (v: unknown): string => toStr(v).trim().slice(0, 200);
const pick = (p: Record<string, unknown>, key: string, c: TagRenderContext, fallback: { ar: string; en: string }): string =>
  text(p[key]) || fallback[c.locale];

/**
 * An email signup form. The platform submits it to the store's own subscriber list, so a theme only
 * styles it. Without the platform's script the button stays disabled, so the form never sends the
 * address anywhere by accident.
 */
export const hkNewsletterForm: HkTag = {
  name: 'hk-newsletter-form',
  version: 1,
  category: 'ui',
  props: {
    label: { type: 'text', label: L('وصف الخانة', 'Field label') },
    placeholder: { type: 'text', label: L('النص داخل الخانة', 'Placeholder') },
    buttonLabel: { type: 'text', label: L('نص الزر', 'Button text') },
    successMessage: { type: 'text', label: L('رسالة النجاح', 'Success message') },
    showLabel: { type: 'boolean', label: L('إظهار الوصف', 'Show label'), default: false },
  },
  allowedParents: '*',
  allowedChildren: [],
  responsive: [],
  bindable: '*',
  controller: 'newsletter',
  editor: { label: L('نموذج الاشتراك', 'Newsletter signup'), group: 'ui', insertable: true },
  a11y: { labelProp: 'label' },
  render(p, c) {
    const s = `.sn-${c.id}`;
    c.css(`${s}{display:flex;flex-wrap:wrap;align-items:stretch;gap:8px}`);
    c.css(`${s} .sn-newsletter-label{flex-basis:100%}`);
    c.css(`${s} input{flex:1 1 14em;min-width:0;min-height:44px;font:inherit}`);
    c.css(`${s} .sn-newsletter-button{min-width:44px;min-height:44px;font:inherit;cursor:pointer}`);
    c.css(`${s} .sn-newsletter-button[disabled]{cursor:not-allowed;opacity:.6}`);
    c.css(`${s} .sn-newsletter-status{flex-basis:100%;margin:0}`);
    const show = p.showLabel === true;
    if (!show) (c.cssOnce ?? c.css)(VISUALLY_HIDDEN_CSS);
    const label = pick(p, 'label', c, BUILTIN.label);
    const id = `${safeToken(c.id).replace(/ /g, '-')}-email`;
    const placeholder = text(p.placeholder);
    const config = JSON.stringify({
      success: pick(p, 'successMessage', c, BUILTIN.success),
      invalid: BUILTIN.invalid[c.locale],
      failed: BUILTIN.failed[c.locale],
    });
    const x = passthrough(p, true);
    return `<form class="sn-${c.id} sn-newsletter${x.cls}"${x.attrs} data-hk-controller="newsletter" data-hk-config="${escapeAttr(config)}" novalidate>`
      + `<label class="sn-newsletter-label${show ? '' : ' sn-visually-hidden'}" for="${escapeAttr(id)}">${escapeText(label)}</label>`
      + `<input id="${escapeAttr(id)}" type="email" name="email" required maxlength="254" autocomplete="email" inputmode="email"${placeholder ? ` placeholder="${escapeAttr(placeholder)}"` : ''}>`
      + `<button type="submit" class="sn-btn sn-btn-solid sn-newsletter-button" disabled>${escapeText(pick(p, 'buttonLabel', c, BUILTIN.button))}</button>`
      + `<p class="sn-newsletter-status" role="status" aria-live="polite" hidden></p>`
      + '</form>';
  },
};
