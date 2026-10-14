import { isCheckoutLinkAllowed, CHECKOUT_CARD_STYLES, CHECKOUT_COLUMNS, CHECKOUT_CTA_MAX, CHECKOUT_DENSITIES, CHECKOUT_FLOW, CHECKOUT_HEADING_MAX, CHECKOUT_PARTS, CHECKOUT_SUMMARY_POSITIONS, type CheckoutFlowPart, type CheckoutPart, type CheckoutPresentation } from '@hekana/sneferu-core';

/** The checkout page cut around the placeholder the host fills with its own checkout. */
export interface CheckoutSplit {
  /** Everything up to and including the opening tag of the layout wrapper. */
  before: string;
  /** From the wrapper's closing tag to the end of the page. */
  after: string;
  presentation: CheckoutPresentation;
}

const unescape = (s: string): string => s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
// A real tag only: text and attribute values never hold a raw `<`, so a literal sentinel inside them cannot match.
const LAYOUT = /<div [^<>]*?data-hk-checkout="layout"[^<>]*>/g;
const ANY = /<[a-zA-Z][^<>]*\sdata-hk-checkout="/g;
const PART = /\s*<div data-hk-checkout="([a-z]+)"(?: data-hk-heading="([^"<>]*)")?(?: data-hk-cta="([^"<>]*)")?><\/div>/y;
const attr = (tag: string, name: string): string | undefined => new RegExp(`\\sdata-hk-${name}="([^"<>]*)"`).exec(tag)?.[1];
const oneOf = <T extends string>(v: string | undefined, list: readonly T[]): T | undefined => (list as readonly string[]).includes(v ?? '') ? (v as T) : undefined;

/**
 * Finds the checkout the theme placed in a rendered checkout page. A host calls this on the HTML of the
 * `checkout` template and mounts its own checkout between `before` and `after`. Returns null (render the
 * platform's own checkout page instead) unless the page holds exactly one layout wrapper, holding only part
 * placeholders, each at most once, with the payment part present. The text it returns is plain: headings are
 * cut to 60 characters and the button label to 40, whatever the page held.
 */
export function splitCheckout(html: string): CheckoutSplit | null {
  if (typeof html !== 'string') return null;
  const found = [...html.matchAll(LAYOUT)];
  if (found.length !== 1) return null;
  const open = found[0]!;
  const tag = open[0];
  const start = open.index!;
  const columns = oneOf(attr(tag, 'columns'), CHECKOUT_COLUMNS);
  const summary = oneOf(attr(tag, 'summary'), CHECKOUT_SUMMARY_POSITIONS);
  const density = oneOf(attr(tag, 'density'), CHECKOUT_DENSITIES);
  const card = oneOf(attr(tag, 'card'), CHECKOUT_CARD_STYLES);
  const sticky = attr(tag, 'sticky');
  if (!columns || !summary || !density || !card || (sticky !== 'true' && sticky !== 'false')) return null;

  let i = start + tag.length;
  const parts: CheckoutPart[] = [];
  const headings: Partial<Record<CheckoutPart, string>> = {};
  let cta: string | undefined;
  for (;;) {
    PART.lastIndex = i;
    const m = PART.exec(html);
    if (!m) break;
    const name = oneOf(m[1], CHECKOUT_PARTS);
    if (!name || parts.includes(name)) return null;
    parts.push(name);
    if (m[2] !== undefined) headings[name] = unescape(m[2]).slice(0, CHECKOUT_HEADING_MAX);
    if (m[3] !== undefined) { if (name !== 'payment') return null; cta = unescape(m[3]).slice(0, CHECKOUT_CTA_MAX); }
    i = PART.lastIndex;
  }
  // (white space between the placeholders is the template's own)
  while (/\s/.test(html[i] ?? '')) i++;
  if (!html.startsWith('</div>', i)) return null;
  if (!parts.includes('payment')) return null;
  // no placeholder anywhere else on the page
  if ([...html.matchAll(ANY)].length !== 1 + parts.length) return null;
  // the host's checkout is mounted inside the wrapper: nothing open around it may be a link, a toggle, a button or a figure
  if (openTags(html.slice(0, start)).some((t) => !CONTAINERS.has(t))) return null;

  const order: CheckoutFlowPart[] = [...parts.filter((p): p is CheckoutFlowPart => (CHECKOUT_FLOW as readonly string[]).includes(p)),
    ...CHECKOUT_FLOW.filter((p) => !parts.includes(p))];
  return {
    before: html.slice(0, start + tag.length),
    after: html.slice(i),
    presentation: { columns, summary, sticky: sticky === 'true', density, card, order, headings, ...(cta ? { cta } : {}) },
  };
}

/**
 * The checkout page's own content with every link that may not leave the store (see isCheckoutLinkAllowed) turned into `#`.
 * The runtime prints attributes only as `href="…"` with the value escaped, so one pass over that shape covers them all.
 */
export function restrictCheckoutLinks(html: string): string {
  return html.replace(/(\s(?:[a-z][\w-]*:)?href\s*=\s*")([^"]*)(")/gi, (m, a: string, v: string, z: string) => (isCheckoutLinkAllowed(unescape(v)) ? m : `${a}#${z}`));
}

/**
 * The whole checkout page, header and footer included: off-store links become `#` and inline `style` attributes are dropped
 * (a fixed, transparent link laid over the pay button is the classic overlay; no Sneferu tag prints inline styles, so only
 * hand-written markup loses anything). Theme CSS files are not touched here.
 */
export function restrictCheckoutPage(html: string): string {
  return restrictCheckoutLinks(html).replace(/\sstyle\s*=\s*"[^"]*"/gi, '');
}

/** Containers a layout may sit inside: the theme's page structure, never something a click or a toggle can capture. */
const CONTAINERS = new Set(['div', 'section', 'main', 'article', 'aside', 'header', 'footer', 'nav']);
const VOID = new Set(['area', 'br', 'col', 'hr', 'img', 'input', 'source', 'track', 'wbr']);
/** The tags still open at the end of `html` (a prefix of a page), innermost last. */
function openTags(html: string): string[] {
  const stack: string[] = [];
  for (const m of html.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9-]*)[^<>]*?(\/?)>/g)) {
    const name = m[2]!.toLowerCase();
    if (m[3] === '/' || VOID.has(name)) continue;
    if (m[1] === '/') { const i = stack.lastIndexOf(name); if (i >= 0) stack.length = i; } else stack.push(name);
  }
  return stack;
}
