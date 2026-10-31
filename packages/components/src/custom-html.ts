import { type HkTag } from '@hekana/sneferu-core';
import { passthrough } from './attrs';
import { sanitizeScopedCss } from './sanitize-css';
import { sanitizeCustomHtml } from './sanitize-custom';

const L = (ar: string, en: string) => ({ ar, en });

export const CUSTOM_HTML_MAX = 30_000;
export const CUSTOM_CSS_MAX = 10_000;

/**
 * Merchant-written HTML and CSS. The markup goes through the custom-HTML allow-list and the CSS through the
 * scoper, so neither can run script, load anything but https images and the allow-listed video embeds, or style
 * anything outside this block. The CSS reaches the page through the same `ctx.css` channel as every other tag.
 */
export const hkCustomHtml: HkTag = {
  name: 'hk-custom-html', version: 1, category: 'ui',
  props: {
    html: { type: 'textarea', label: L('كود HTML', 'HTML'), maxLength: CUSTOM_HTML_MAX, default: '' },
    css: { type: 'textarea', label: L('كود CSS', 'CSS'), maxLength: CUSTOM_CSS_MAX, default: '' },
  },
  allowedParents: '*', allowedChildren: [], responsive: [], bindable: '*',
  editor: { label: L('كود مخصص', 'Custom HTML'), group: 'content', insertable: true },
  render(p, c) {
    const prefix = /^[A-Za-z][A-Za-z0-9_-]{0,30}$/.test(c.id) ? `${c.id}-` : 'cx-';
    const body = sanitizeCustomHtml(typeof p.html === 'string' ? p.html : '', { idPrefix: prefix });
    if (body.trim() === '') return '';
    const scope = `.sn-${c.id}`;
    for (const rule of sanitizeScopedCss(typeof p.css === 'string' ? p.css : '', { scope, key: c.id, idPrefix: prefix })) c.css(rule);
    // last, and !important: the block stays its own positioning and paint context whatever its CSS says
    c.css(`${scope}{position:relative!important;isolation:isolate!important;contain:layout paint!important}`);
    const x = passthrough(p);
    return `<div class="sn-${c.id} sn-custom-html${x.cls}"${x.attrs}>${body}</div>`;
  },
};
