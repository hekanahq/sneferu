import { escapeText, type CheckoutPart, type CheckoutPresentation } from '@hekana/sneferu-core';
import { splitCheckout } from '@hekana/sneferu-runtime';

/**
 * `sneferu dev` has no checkout of its own: the real one is Hekana's and exists only on a store. The preview
 * shows labelled boxes where it will sit, laid out the way the layout's props ask, so a theme can be designed
 * around it. Nothing here is a form: no inputs, no prices, nothing that could be mistaken for a working page.
 */
const TITLES: Record<'ar' | 'en', Record<CheckoutPart, string>> = {
  en: { contact: 'Contact', shipping: 'Delivery address', summary: 'Order summary', payment: 'Payment' },
  ar: { contact: 'بيانات التواصل', shipping: 'عنوان التوصيل', summary: 'ملخص الطلب', payment: 'الدفع' },
};
const NOTE = {
  en: 'Preview only. Hekana places its own checkout here: fields, delivery rates, totals and payment.',
  ar: 'معاينة فقط. هيكانا بتحط صفحة الدفع بتاعتها هنا: الحقول والشحن والإجماليات والدفع.',
} as const;
const LINES: Record<'ar' | 'en', Record<CheckoutPart, string[]>> = {
  en: { contact: ['Full name', 'Phone', 'Email'], shipping: ['Governorate', 'City', 'Address'], summary: ['Item', 'Item', 'Shipping', 'Total'], payment: ['Cash on delivery', 'Online payment', 'Place order'] },
  ar: { contact: ['الاسم', 'رقم الموبايل', 'الإيميل'], shipping: ['المحافظة', 'المدينة', 'العنوان'], summary: ['منتج', 'منتج', 'الشحن', 'الإجمالي'], payment: ['الدفع عند الاستلام', 'دفع أونلاين', 'تأكيد الطلب'] },
};

export const DEV_CHECKOUT_CSS = [
  '.sn-dev-co{display:grid;gap:var(--sn-dev-gap,20px);align-items:start;grid-template-columns:minmax(0,1fr)}',
  '.sn-dev-co[data-density=compact]{--sn-dev-gap:12px}',
  '.sn-dev-co-main{display:grid;gap:var(--sn-dev-gap,20px);min-width:0}',
  '@media (min-width:900px){.sn-dev-co[data-columns=two][data-summary=end]{grid-template-columns:minmax(0,1fr) 380px}.sn-dev-co[data-columns=two][data-summary=start]{grid-template-columns:380px minmax(0,1fr)}.sn-dev-co[data-columns=two][data-summary=start] .sn-dev-co-main{order:2}.sn-dev-co[data-sticky=true][data-columns=two]:not([data-summary=top]) .sn-dev-co-summary{position:sticky;top:16px}}',
  '.sn-dev-co[data-summary=top] .sn-dev-co-summary{order:-1}',
  '.sn-dev-co-box{display:grid;gap:10px;padding:20px;border:1px dashed color-mix(in srgb,currentColor 40%,transparent);border-radius:var(--hk-radius,8px)}',
  '.sn-dev-co[data-card=outlined] .sn-dev-co-box{border-style:solid;border-color:color-mix(in srgb,currentColor 18%,transparent)}',
  '.sn-dev-co[data-card=flat] .sn-dev-co-box{border-color:transparent;background:color-mix(in srgb,currentColor 6%,transparent)}',
  '.sn-dev-co[data-card=raised] .sn-dev-co-box{border-style:solid;border-color:transparent;box-shadow:0 6px 20px rgb(0 0 0/.12)}',
  '.sn-dev-co[data-density=compact] .sn-dev-co-box{padding:14px}',
  '.sn-dev-co-box h2{margin:0;font-size:18px}',
  '.sn-dev-co-line{display:block;min-height:40px;padding:10px 12px;border:1px solid color-mix(in srgb,currentColor 20%,transparent);border-radius:var(--hk-radius-sm,6px);opacity:.65;font-size:14px}',
  '.sn-dev-co-note{margin:16px 0 0;font-size:13px;opacity:.7}',
].join('');

function stub(p: CheckoutPresentation, locale: 'ar' | 'en'): string {
  const box = (part: CheckoutPart) => `<section class="sn-dev-co-box" data-part="${part}"><h2>${escapeText(p.headings[part] ?? TITLES[locale][part])}</h2>`
    + LINES[locale][part].map((l) => `<span class="sn-dev-co-line">${escapeText(l)}</span>`).join('') + '</section>';
  const main = p.order.map(box).join('');
  return `<div class="sn-dev-co" data-columns="${p.columns}" data-summary="${p.summary}" data-sticky="${p.sticky}" data-density="${p.density}" data-card="${p.card}">`
    + `<div class="sn-dev-co-main">${main}</div><div class="sn-dev-co-summary">${box('summary')}</div></div><p class="sn-dev-co-note">${escapeText(NOTE[locale])}</p>`;
}

/**
 * The checkout page for `sneferu dev`: the theme's page with the stub where the platform's checkout goes. A page
 * that does not place a payment part inside a layout is shown as it is, with the message a store would give:
 * Hekana would render its own default checkout page instead.
 */
export function devCheckoutPage(html: string, locale: 'ar' | 'en'): { html: string; css: string } {
  const split = splitCheckout(html);
  if (!split) {
    const msg = locale === 'ar' ? 'الصفحة دي مفيهاش hk-checkout-layout ومعاه hk-checkout-payment، فالمتجر هيعرض صفحة الدفع الافتراضية.' : 'This page has no <hk-checkout-layout> holding <hk-checkout-payment>, so a store would show Hekana\'s default checkout page instead.';
    return { html: `${html}<p class="sn-dev-co-note">${escapeText(msg)}</p>`, css: DEV_CHECKOUT_CSS };
  }
  return { html: split.before + stub(split.presentation, locale) + split.after, css: DEV_CHECKOUT_CSS };
}
