import { CHECKOUT_CARD_STYLES, CHECKOUT_COLUMNS, CHECKOUT_CTA_MAX, CHECKOUT_DENSITIES, CHECKOUT_HEADING_MAX, CHECKOUT_PART_TAGS, CHECKOUT_SUMMARY_POSITIONS, escapeAttr, toStr, type CheckoutPart, type HkTag } from '@hekana/sneferu-core';
import { passthrough } from './attrs';

const L = (ar: string, en: string) => ({ ar, en });
const ed = (ar: string, en: string) => ({ label: L(ar, en), group: 'checkout', insertable: false, privileged: true });
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g;
/** Plain one-line text: controls and runs of white space collapsed, cut to `max`. */
const line = (v: unknown, max: number): string => toStr(v).replace(CONTROL, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const pick = <T extends string>(v: unknown, options: readonly T[], d: T): T => (options as readonly string[]).includes(toStr(v)) ? (v as T) : d;

/**
 * The checkout tags are PLACEHOLDERS. They print an empty mount point and the presentation choices the theme
 * made; the store's own checkout (contact, delivery, summary, payment) is mounted there by the host, and every
 * price, rule and payment field stays the host's. They render only on the checkout page (the runtime skips them
 * anywhere else) and the host reads them with `splitCheckout` from @hekana/sneferu-runtime.
 */
export const hkCheckoutLayout: HkTag = {
  name: 'hk-checkout-layout', version: 1, category: 'checkout',
  props: {
    columns: { type: 'select', label: L('الأعمدة', 'Columns'), options: [...CHECKOUT_COLUMNS], default: 'two' },
    summary: { type: 'select', label: L('مكان الملخص', 'Summary position'), options: [...CHECKOUT_SUMMARY_POSITIONS], default: 'end' },
    sticky: { type: 'boolean', label: L('ملخص ثابت', 'Sticky summary'), default: true },
    density: { type: 'select', label: L('الكثافة', 'Density'), options: [...CHECKOUT_DENSITIES], default: 'comfortable' },
    card: { type: 'select', label: L('شكل البطاقات', 'Card style'), options: [...CHECKOUT_CARD_STYLES], default: 'outlined' },
  },
  allowedParents: '*',
  allowedChildren: Object.values(CHECKOUT_PART_TAGS),
  responsive: [], bindable: '*',
  editor: ed('تخطيط إتمام الشراء', 'Checkout layout'),
  render(p, c) {
    const x = passthrough(p);
    const a = (k: string, v: string) => ` data-hk-${k}="${escapeAttr(v)}"`;
    return `<div class="sn-${c.id} sn-checkout${x.cls}"${x.attrs} data-hk-checkout="layout"${a('columns', pick(p.columns, CHECKOUT_COLUMNS, 'two'))}${a('summary', pick(p.summary, CHECKOUT_SUMMARY_POSITIONS, 'end'))}`
      + `${a('sticky', p.sticky === false ? 'false' : 'true')}${a('density', pick(p.density, CHECKOUT_DENSITIES, 'comfortable'))}${a('card', pick(p.card, CHECKOUT_CARD_STYLES, 'outlined'))}>${c.renderChildren()}</div>`;
  },
};

function part(part: CheckoutPart, ar: string, en: string, extra: HkTag['props'] = {}, cta = false): HkTag {
  return {
    name: CHECKOUT_PART_TAGS[part] as `hk-${string}`, version: 1, category: 'checkout',
    props: {
      heading: { type: 'text', label: L('العنوان', 'Heading'), maxLength: CHECKOUT_HEADING_MAX },
      ...extra,
    },
    allowedParents: ['hk-checkout-layout'], allowedChildren: [], responsive: [], bindable: '*',
    editor: ed(ar, en),
    render(p) {
      const heading = line(p.heading, CHECKOUT_HEADING_MAX);
      const label = cta ? line(p.ctaLabel, CHECKOUT_CTA_MAX) : '';
      return `<div data-hk-checkout="${part}"${heading ? ` data-hk-heading="${escapeAttr(heading)}"` : ''}${label ? ` data-hk-cta="${escapeAttr(label)}"` : ''}></div>`;
    },
  };
}

export const hkCheckoutContact = part('contact', 'بيانات التواصل', 'Checkout contact');
export const hkCheckoutShipping = part('shipping', 'الشحن والعنوان', 'Checkout shipping');
export const hkCheckoutSummary = part('summary', 'ملخص الطلب', 'Checkout summary');
export const hkCheckoutPayment = part('payment', 'الدفع', 'Checkout payment', {
  ctaLabel: { type: 'text', label: L('نص زر التأكيد', 'Confirm button label'), maxLength: CHECKOUT_CTA_MAX },
}, true);

export const CHECKOUT_TAG_LIST: HkTag[] = [hkCheckoutLayout, hkCheckoutContact, hkCheckoutShipping, hkCheckoutSummary, hkCheckoutPayment];
