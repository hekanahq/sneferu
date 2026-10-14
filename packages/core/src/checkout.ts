/**
 * The checkout boundary, shared by the components, the compiler and the runtime.
 *
 * A theme designs the page AROUND the money path; it never contains it. `templates/checkout.snf` and the
 * sections that list `checkout` in their `templates` may hold layout, typography, images, plain copy and the
 * five privileged `hk-checkout-*` tags. The tags print placeholders; the host mounts its own checkout
 * components where they sit and owns every total, rate, rule and payment field.
 */

/** The page type's template name. */
export const CHECKOUT_TEMPLATE = 'checkout';
/** The wrapper tag: it places the host's checkout and carries the presentation. */
export const CHECKOUT_LAYOUT_TAG = 'hk-checkout-layout';
/** The parts of the checkout the theme can title and order, and the privileged tag of each. */
export const CHECKOUT_PARTS = ['contact', 'shipping', 'summary', 'payment'] as const;
export type CheckoutPart = (typeof CHECKOUT_PARTS)[number];
export const CHECKOUT_PART_TAGS: Readonly<Record<CheckoutPart, string>> = Object.freeze({
  contact: 'hk-checkout-contact', shipping: 'hk-checkout-shipping', summary: 'hk-checkout-summary', payment: 'hk-checkout-payment',
});
/** Every privileged tag: the wrapper and the four parts. Each may appear once on the page; `hk-checkout-payment` is required. */
export const CHECKOUT_TAGS: readonly string[] = Object.freeze([CHECKOUT_LAYOUT_TAG, ...CHECKOUT_PARTS.map((p) => CHECKOUT_PART_TAGS[p])]);
export const isCheckoutTag = (name: string): boolean => CHECKOUT_TAGS.includes(name);
/** The form parts the order of the tags applies to (the summary has its own `summary` position). */
export const CHECKOUT_FLOW = ['contact', 'shipping', 'payment'] as const;
export type CheckoutFlowPart = (typeof CHECKOUT_FLOW)[number];

export const CHECKOUT_COLUMNS = ['two', 'stacked'] as const;
export const CHECKOUT_SUMMARY_POSITIONS = ['end', 'start', 'top'] as const;
export const CHECKOUT_DENSITIES = ['comfortable', 'compact'] as const;
export const CHECKOUT_CARD_STYLES = ['outlined', 'flat', 'raised'] as const;
export const CHECKOUT_HEADING_MAX = 60;
export const CHECKOUT_CTA_MAX = 40;

/** What the theme decides about the checkout. Presentation only; the host validates it again. */
export interface CheckoutPresentation {
  columns: (typeof CHECKOUT_COLUMNS)[number];
  /** Where the order summary sits: the end side (right in English, left in Arabic), the start side, or above the form. */
  summary: (typeof CHECKOUT_SUMMARY_POSITIONS)[number];
  /** The summary stays in view while the form scrolls (two columns, wide screens). */
  sticky: boolean;
  density: (typeof CHECKOUT_DENSITIES)[number];
  card: (typeof CHECKOUT_CARD_STYLES)[number];
  /** The order of contact, shipping and payment: the order their tags appear in the layout. */
  order: CheckoutFlowPart[];
  /** Plain-text titles; a part without one keeps the platform's title. */
  headings: Partial<Record<CheckoutPart, string>>;
  /** The text of the pay button when the platform allows a custom one (never for a payment method that names itself). */
  cta?: string;
}
export const DEFAULT_CHECKOUT_PRESENTATION: Readonly<CheckoutPresentation> = Object.freeze({
  columns: 'two', summary: 'end', sticky: true, density: 'comfortable', card: 'outlined', order: ['contact', 'shipping', 'payment'], headings: {},
} as CheckoutPresentation);

/**
 * `hk-*` tags (besides the privileged ones, `hk-block` and `hk-part`) the checkout page's own content may use:
 * layout, typography, images and links. Nothing that reads the catalogue or the cart, and nothing that submits.
 */
export const CHECKOUT_ALLOWED_TAGS: readonly string[] = Object.freeze([
  'hk-section', 'hk-container', 'hk-stack', 'hk-grid', 'hk-heading', 'hk-text', 'hk-rich-text', 'hk-image', 'hk-button', 'hk-card', 'hk-badge', 'hk-icon',
]);
/** The top-level names an expression on the checkout page may start from. There is no cart, product, order or customer data. */
export const CHECKOUT_DATA_HEADS: readonly string[] = Object.freeze(['settings', 'section', 'block', 'store', 'request', 'localization', 'locale', 'dir', 'forloop']);
/** Lookups and filters that read catalogue data or print prices; the checkout page has none of either. */
export const CHECKOUT_DENIED_LOOKUPS: readonly string[] = Object.freeze(['collection', 'product', 'collections']);
export const CHECKOUT_DENIED_FILTERS: readonly string[] = Object.freeze(['money']);
