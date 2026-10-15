import { escapeAttr, jsonAttr, toStr, type HkTag } from '@hekana/sneferu-core';
import { passthrough } from './attrs';
import { COMMERCE_STRINGS, str } from './strings';
import { productId, productObject, selectedVariant, variantsOf } from './product-view';

const L = (ar: string, en: string) => ({ ar, en });
/** A product handle as the platform issues it: letters (any script), digits, '-' and '_'. */
const HANDLE = /^[\p{L}\p{N}_-]{1,120}$/u;
export const CHECKOUT_EMBED_PATH = '/checkout/embed';

const IC_CSS = [
  '.sn-inline-checkout{position:relative;z-index:2;width:100%}',
  '.sn-inline-checkout iframe{display:block;width:100%;height:640px;min-height:320px;border:0;background:transparent}',
].join('');

/**
 * The store's own checkout, placed in a themed page. The tag prints a same-origin frame of the
 * platform page and nothing else: no field, no total, no button. The theme decides where it sits;
 * what it asks, charges and collects stays Hekana's (owner rule 2026-10-14). Branding reaches the
 * frame only through the theme's `checkout` settings.
 */
export const hkInlineCheckout: HkTag = {
  name: 'hk-inline-checkout', version: 1, category: 'commerce',
  props: {
    product: { type: 'data', label: L('المنتج', 'Product') },
    label: { type: 'text', label: L('اسم النموذج لقارئ الشاشة', 'Form name for screen readers'), default: '' },
  },
  allowedParents: '*', allowedChildren: [], responsive: [], bindable: '*', controller: 'inline-checkout', strings: COMMERCE_STRINGS,
  editor: { label: L('نموذج الطلب', 'Order form'), group: 'commerce', insertable: true },
  render(p, c) {
    const prod = productObject(p.product);
    if (!prod) return '';
    const pid = productId(prod);
    const handle = toStr(prod.handle).trim();
    if (!pid || !HANDLE.test(handle)) return '';
    const sel = selectedVariant(prod, variantsOf(prod));
    // Built by hand: the tags compile without DOM or Node libs, so no URLSearchParams.
    const q = `product=${encodeURIComponent(handle)}${sel ? `&variant=${encodeURIComponent(sel.id)}` : ''}`;
    (c.cssOnce ?? c.css)(IC_CSS);
    const x = passthrough(p);
    const label = toStr(p.label).trim().slice(0, 80) || str(c, 'order_form');
    const config = { productId: pid, variantId: sel?.id ?? null };
    return `<div class="sn-${c.id} sn-inline-checkout${x.cls}"${x.attrs} data-hk-controller="inline-checkout" data-hk-product="${escapeAttr(pid)}" data-hk-config="${jsonAttr(config)}">`
      + `<iframe src="${escapeAttr(c.url(`${CHECKOUT_EMBED_PATH}?${q}`))}" title="${escapeAttr(label)}" loading="lazy" referrerpolicy="same-origin"></iframe></div>`;
  },
};
