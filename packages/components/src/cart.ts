import { escapeAttr, escapeText, jsonAttr, toStr, type HkTag, type TagRenderContext } from '@hekana/sneferu-core';
import { passthrough } from './attrs';
import { link } from './content';
import { tagIcon } from './icon';
import { COMMERCE_STRINGS, str } from './strings';
import { imagesOf, optionsOf, productId, productObject, qtyRules, selectedVariant, variantsOf } from './product-view';

const L = (ar: string, en: string) => ({ ar, en });
const ed = (ar: string, en: string, insertable = false) => ({ label: L(ar, en), group: 'commerce', insertable });
const text = (v: unknown, max = 80): string => toStr(v).trim().slice(0, max);
const label = (c: TagRenderContext, v: unknown, key: string): string => text(v) || str(c, key);

const VP_CSS = [
  '.sn-vp-option{border:0;margin:0 0 16px;padding:0;min-width:0}',
  '.sn-vp-option legend{padding:0;margin-bottom:8px;font-weight:600}',
  '.sn-vp-option .sn-vp-values{display:flex;flex-wrap:wrap;gap:8px}',
  '.sn-vp-value{position:relative;display:inline-flex}',
  '.sn-vp-value input{position:absolute;inset:0;opacity:0;margin:0;cursor:pointer}',
  '.sn-vp-value span{display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;padding:8px 16px;border:1px solid color-mix(in srgb,var(--hk-color-text) 25%,transparent);border-radius:var(--hk-radius-sm,6px)}',
  '.sn-vp-value input:checked+span{background:var(--hk-color-text);border-color:var(--hk-color-text);color:var(--hk-color-background)}',
  '.sn-vp-value input:focus-visible+span{outline:2px solid var(--hk-color-accent);outline-offset:2px}',
  'label.sn-vp-option{display:grid;gap:6px;margin-bottom:16px}',
  'label.sn-vp-option select{min-height:44px;font:inherit;padding-inline:12px}',
].join('');

export const hkVariantPicker: HkTag = {
  name: 'hk-variant-picker', version: 1, category: 'commerce',
  props: {
    product: { type: 'data', label: L('المنتج', 'Product') },
    display: { type: 'select', label: L('شكل الاختيار', 'Picker style'), options: ['buttons', 'select'], default: 'buttons' },
  },
  allowedParents: '*', allowedChildren: [], responsive: [], bindable: '*', controller: 'variant-picker', strings: COMMERCE_STRINGS,
  editor: ed('اختيار النوع', 'Variant picker'),
  render(p, c) {
    const prod = productObject(p.product);
    if (!prod) return '';
    const variants = variantsOf(prod);
    const options = optionsOf(prod, variants);
    // one variant and no options to choose: nothing to pick
    if (variants.length === 0 || (variants.length <= 1 && (options === null || options.every((o) => o.values.length <= 1)))) return '';
    (c.cssOnce ?? c.css)(VP_CSS);
    const select = p.display === 'select';
    const sel = selectedVariant(prod, variants);
    const pid = productId(prod);
    const groups = options ?? [{ name: str(c, 'variant'), values: variants.map((v) => v.id), titles: variants.map((v, k) => v.title.trim() || `${str(c, 'option')} ${k + 1}`) }];
    const checked = (i: number, value: string): boolean => (options ? sel?.options[i] === value : sel?.id === value);
    const html = groups.map((g, i) => {
      const name = `hk-${c.id}-${i}`;
      const titles = (g as { titles?: string[] }).titles ?? g.values;
      if (select) {
        const opts = g.values.map((v, k) => `<option value="${escapeAttr(v)}"${checked(i, v) ? ' selected' : ''}>${escapeText(titles[k] ?? v)}</option>`).join('');
        return `<label class="sn-vp-option" data-hk-option="${i}"><span>${escapeText(g.name)}</span><select name="${name}">${opts}</select></label>`;
      }
      const inputs = g.values.map((v, k) => `<label class="sn-vp-value"><input type="radio" name="${name}" value="${escapeAttr(v)}"${checked(i, v) ? ' checked' : ''}><span>${escapeText(titles[k] ?? v)}</span></label>`).join('');
      return `<fieldset class="sn-vp-option" data-hk-option="${i}"><legend>${escapeText(g.name)}</legend><div class="sn-vp-values">${inputs}</div></fieldset>`;
    }).join('');
    const config = {
      productId: pid, options: options ?? [], selected: sel?.id ?? null, style: select ? 'select' : 'buttons',
      variants: variants.map((v) => ({ id: v.id, options: v.options, price: v.price, compare_at: v.compare_at, available: v.available, image: v.image })),
    };
    const x = passthrough(p);
    return `<div class="sn-${c.id} sn-variant-picker${x.cls}"${x.attrs} data-hk-controller="variant-picker" data-hk-product="${escapeAttr(pid)}" data-hk-config="${jsonAttr(config)}">${html}</div>`;
  },
};

const ATC_CSS = [
  '.sn-add-to-cart{display:flex;flex-wrap:wrap;align-items:center;gap:12px}',
  '.sn-qty{display:inline-flex;align-items:stretch;border:1px solid color-mix(in srgb,var(--hk-color-text) 25%,transparent);border-radius:var(--hk-radius-sm,6px);overflow:hidden}',
  '.sn-qty-btn{min-width:44px;min-height:44px;border:0;background:transparent;color:inherit;font:inherit;cursor:pointer}',
  '.sn-qty-input{width:64px;min-height:44px;border:0;text-align:center;font:inherit;background:transparent;color:inherit;-moz-appearance:textfield}',
  '.sn-qty-input::-webkit-outer-spin-button,.sn-qty-input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}',
  '.sn-add-to-cart .sn-btn{cursor:pointer;font:inherit}',
  '.sn-add-to-cart .sn-btn[disabled]{opacity:.5;cursor:not-allowed}',
  '.sn-atc-message{flex-basis:100%;margin:0}',
].join('');

export const hkAddToCart: HkTag = {
  name: 'hk-add-to-cart', version: 1, category: 'commerce',
  props: {
    product: { type: 'data', label: L('المنتج', 'Product') },
    label: { type: 'text', label: L('نص الزر', 'Button label') },
    chooseLabel: { type: 'text', label: L('نص اختيار الخيارات', 'Choose options label') },
    soldOutLabel: { type: 'text', label: L('نص نفاد المخزون', 'Sold out label') },
    quantity: { type: 'boolean', label: L('اختيار الكمية', 'Quantity picker'), default: true },
    variant: { type: 'select', label: L('نمط الزر', 'Button style'), options: ['solid', 'outline'], default: 'solid' },
  },
  allowedParents: '*', allowedChildren: [], responsive: [], bindable: '*', controller: 'add-to-cart', strings: COMMERCE_STRINGS,
  editor: ed('أضف للسلة', 'Add to cart'),
  render(p, c) {
    const prod = productObject(p.product);
    if (!prod) return '';
    (c.cssOnce ?? c.css)(ATC_CSS);
    const variants = variantsOf(prod);
    const sel = selectedVariant(prod, variants);
    const rules = qtyRules(prod);
    const available = prod.available !== false && (sel ? sel.available : true);
    const pid = productId(prod);
    const add = label(c, p.label, 'add_to_cart');
    const out = label(c, p.soldOutLabel, 'sold_out');
    const style = p.variant === 'outline' ? 'outline' : 'solid';
    const x = passthrough(p);
    const target = typeof prod.url === 'string' && prod.url ? link(c, prod.url) : '#';
    // no safe product page to post to: a plain link to the cart page, never a form that submits to the current page
    if (target === '#') {
      return `<div class="sn-${c.id} sn-add-to-cart${x.cls}"${x.attrs}>`
        + (available ? `<a class="sn-btn sn-btn-${style} sn-atc-button" href="${escapeAttr(link(c, '/cart'))}">${escapeText(str(c, 'view_cart'))}</a>`
          : `<button type="button" class="sn-btn sn-btn-${style} sn-atc-button" disabled>${escapeText(out)}</button>`)
        + '</div>';
    }
    // a list card for a product with variants and none picked: the host needs a variant id, so link to the product page
    if (prod.has_variants === true && !(typeof prod.selected_variant === 'object' && prod.selected_variant !== null)) {
      return `<div class="sn-${c.id} sn-add-to-cart${x.cls}"${x.attrs}>`
        + (available ? `<a class="sn-btn sn-btn-${style} sn-atc-button" href="${escapeAttr(target)}">${escapeText(label(c, p.chooseLabel, 'choose_options'))}</a>`
          : `<button type="button" class="sn-btn sn-btn-${style} sn-atc-button" disabled>${escapeText(out)}</button>`)
        + '</div>';
    }
    const qty = p.quantity === false
      ? `<input type="hidden" name="quantity" value="${rules.min}">`
      : `<div class="sn-qty"><button type="button" class="sn-qty-btn" data-hk-qty="dec" aria-label="${escapeAttr(str(c, 'quantity_decrease'))}">${tagIcon(c, 'minus', 16, 2)}</button>`
        + `<input type="number" class="sn-qty-input" name="quantity" value="${rules.min}" min="${rules.min}" step="${rules.step}"${rules.max !== null ? ` max="${rules.max}"` : ''} inputmode="numeric" aria-label="${escapeAttr(str(c, 'quantity'))}">`
        + `<button type="button" class="sn-qty-btn" data-hk-qty="inc" aria-label="${escapeAttr(str(c, 'quantity_increase'))}">${tagIcon(c, 'plus', 16, 2)}</button></div>`;
    const config = { productId: pid, variantId: sel?.id ?? null, min: rules.min, step: rules.step, max: rules.max, available };
    return `<form class="sn-${c.id} sn-add-to-cart${x.cls}"${x.attrs} action="${escapeAttr(target)}" method="get" data-hk-controller="add-to-cart" data-hk-product="${escapeAttr(pid)}" data-hk-config="${jsonAttr(config)}">`
      + qty
      + `<input type="hidden" name="variant" value="${escapeAttr(sel?.id ?? '')}">`
      + `<button type="submit" class="sn-btn sn-btn-${style} sn-atc-button" data-hk-label="${escapeAttr(add)}" data-hk-soldout="${escapeAttr(out)}"${available ? '' : ' disabled'}>${escapeText(available ? add : out)}</button>`
      + `<p class="sn-atc-message" role="status" aria-live="polite" hidden></p></form>`;
  },
};

export const hkCartCount: HkTag = {
  name: 'hk-cart-count', version: 1, category: 'commerce',
  props: {},
  allowedParents: '*', allowedChildren: [], responsive: [], bindable: [], controller: 'cart-count',
  editor: ed('عدد السلة', 'Cart count', true),
  render(p, c) {
    (c.cssOnce ?? c.css)('.sn-cart-count{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding-inline:6px;border-radius:999px;background:var(--hk-color-accent);color:var(--hk-color-on-accent,var(--hk-color-background));font-size:12px;font-weight:700}.sn-cart-count[hidden]{display:none}');
    const x = passthrough(p);
    return `<span class="sn-${c.id} sn-cart-count${x.cls}"${x.attrs} data-hk-controller="cart-count" aria-live="polite" hidden></span>`;
  },
};

const ITEMS_CSS = [
  '.sn-cart-list{list-style:none;margin:0;padding:0;display:grid;gap:16px}',
  '.sn-cart-item{display:grid;grid-template-columns:72px 1fr auto;gap:12px;align-items:center}',
  '.sn-cart-item-image img{display:block;width:72px;height:72px;object-fit:cover;border-radius:var(--hk-radius-sm,6px)}',
  '.sn-cart-item-title{color:inherit;font-weight:600;text-decoration:none}',
  '.sn-cart-item-variant{display:block;opacity:.7;font-size:.9em}',
  '.sn-cart-item-qty{display:inline-flex;align-items:center;gap:4px}',
  '.sn-cart-item-qty button,.sn-cart-item-remove{min-width:44px;min-height:44px;border:0;background:transparent;color:inherit;font:inherit;cursor:pointer}',
  '.sn-cart-item-qty button[aria-disabled=true]{opacity:.4}',
  '.sn-cart-item-qty-value{min-width:2ch;text-align:center}',
  '.sn-cart-items [hidden]{display:none!important}',
].join('');

export const hkCartItems: HkTag = {
  name: 'hk-cart-items', version: 1, category: 'commerce',
  props: { checkoutLabel: { type: 'text', label: L('نص رابط السلة (بدون جافاسكريبت)', 'Cart link label (no JavaScript)') } },
  allowedParents: '*', allowedChildren: ['hk-part'], parts: ['empty'], responsive: [], bindable: '*', controller: 'cart-items', strings: COMMERCE_STRINGS,
  editor: ed('بنود السلة', 'Cart items'),
  render(p, c) {
    (c.cssOnce ?? c.css)(ITEMS_CSS);
    const filled = c.renderChildren('empty');
    const empty = filled.trim() === '' ? `<p>${escapeText(str(c, 'cart_empty'))}</p>` : filled;
    const x = passthrough(p);
    // the fallback link is what a visitor sees when the controller bundle never runs
    return `<div class="sn-${c.id} sn-cart-items${x.cls}"${x.attrs} data-hk-controller="cart-items"><ul class="sn-cart-list" data-hk-list hidden></ul>`
      + `<div class="sn-cart-empty" data-hk-empty>${empty}</div>`
      + `<a class="sn-cart-fallback" data-hk-fallback href="${escapeAttr(link(c, '/cart'))}">${escapeText(label(c, p.checkoutLabel, 'view_cart'))}</a></div>`;
  },
};

export const hkCartSummary: HkTag = {
  name: 'hk-cart-summary', version: 1, category: 'commerce',
  props: {
    subtotalLabel: { type: 'text', label: L('نص المجموع', 'Subtotal label') },
    checkoutLabel: { type: 'text', label: L('نص زر الدفع', 'Checkout button label') },
  },
  allowedParents: '*', allowedChildren: [], responsive: [], bindable: '*', controller: 'cart-summary', strings: COMMERCE_STRINGS,
  editor: ed('ملخص السلة', 'Cart summary'),
  render(p, c) {
    (c.cssOnce ?? c.css)('.sn-cart-subtotal{display:flex;justify-content:space-between;gap:12px;margin-bottom:16px;font-weight:600}.sn-cart-summary[hidden]{display:none}.sn-cart-checkout{display:flex;width:100%;text-align:center}');
    const x = passthrough(p);
    return `<div class="sn-${c.id} sn-cart-summary${x.cls}"${x.attrs} data-hk-controller="cart-summary"><div class="sn-cart-subtotal"><span class="sn-cart-subtotal-label">${escapeText(label(c, p.subtotalLabel, 'subtotal'))}</span>`
      + `<span class="sn-cart-subtotal-value" data-hk-bind="subtotal"></span></div>`
      + `<a class="sn-btn sn-btn-solid sn-cart-checkout" href="${escapeAttr(link(c, '/checkout'))}">${escapeText(label(c, p.checkoutLabel, 'checkout'))}</a></div>`;
  },
};

const DRAWER_CSS = [
  '.sn-cart-drawer{position:fixed;inset-block:0;inset-inline-start:auto;inset-inline-end:0;margin:0;margin-inline-start:auto;width:min(420px,100vw);max-width:100vw;height:100dvh;max-height:100dvh;padding:0;border:0;background:var(--hk-color-background);color:var(--hk-color-text)}',
  '.sn-cart-drawer::backdrop{background:rgb(0 0 0/.5)}',
  '.sn-cart-drawer:not([open]){display:none}',
  '.sn-drawer-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px;border-bottom:1px solid color-mix(in srgb,var(--hk-color-text) 14%,transparent)}',
  '.sn-drawer-title{margin:0;font-size:1.125rem}',
  '.sn-drawer-close{min-width:44px;min-height:44px;border:0;background:transparent;color:inherit;cursor:pointer}',
  '.sn-drawer-body{display:grid;gap:16px;padding:16px;overflow-y:auto;max-height:calc(100dvh - 76px)}',
  '@media (prefers-reduced-motion:no-preference){.sn-cart-drawer[open]{animation:sn-drawer-in .2s ease-out}}',
  '@keyframes sn-drawer-in{from{transform:translateX(24px);opacity:0}to{transform:none;opacity:1}}',
  '[dir=rtl] .sn-cart-drawer{inset-inline-end:auto;inset-inline-start:0;margin-inline-start:0;margin-inline-end:auto}',
].join('');

export const hkCartDrawer: HkTag = {
  name: 'hk-cart-drawer', version: 1, category: 'commerce',
  props: {
    title: { type: 'text', label: L('عنوان السلة', 'Drawer title') },
    openOnAdd: { type: 'boolean', label: L('فتح عند الإضافة', 'Open when an item is added'), default: true },
  },
  allowedParents: '*', allowedChildren: '*', responsive: [], bindable: '*', controller: 'cart-drawer', strings: COMMERCE_STRINGS,
  editor: ed('درج السلة', 'Cart drawer'),
  render(p, c) {
    (c.cssOnce ?? c.css)(DRAWER_CSS);
    const title = label(c, p.title, 'cart');
    const x = passthrough(p);
    return `<dialog class="sn-${c.id} sn-cart-drawer${x.cls}"${x.attrs} data-hk-controller="cart-drawer" aria-label="${escapeAttr(title)}" data-hk-config="${jsonAttr({ openOnAdd: p.openOnAdd !== false })}">`
      + `<div class="sn-drawer-head"><h2 class="sn-drawer-title">${escapeText(title)}</h2>`
      + `<button type="button" class="sn-drawer-close" data-hk-close aria-label="${escapeAttr(str(c, 'close'))}">${tagIcon(c, 'x', 20, 2)}</button></div>`
      + `<div class="sn-drawer-body">${c.renderChildren()}</div></dialog>`;
  },
};
