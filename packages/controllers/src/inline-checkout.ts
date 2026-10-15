import { EVENT_VARIANT_CHANGE } from './host';
import { join, listen, readConfig, type Ctl } from './dom';

/** Frame → page: `{ type, height }`, the checkout's document height in px. */
export const MSG_CHECKOUT_HEIGHT = 'hk:checkout-height';
/** Page → frame: `{ type, variantId }`, the variant the shopper picked on the page. */
export const MSG_CHECKOUT_LINE = 'hk:checkout-line';
/** Frame → page: the checkout is listening; answer with the current variant. */
export const MSG_CHECKOUT_READY = 'hk:checkout-ready';

const MIN_H = 320;
const MAX_H = 6000;

/**
 * Keeps the platform checkout frame the right height and on the variant the shopper picked.
 * Talks only to its own frame and only on this origin; never changes `src`, so whatever the
 * shopper typed in the form stays.
 */
export const inlineCheckout: Ctl = (el, _host, root) => {
  const c = readConfig(el);
  // Only the frame the tag printed as its own child: a wrapper that claims this controller
  // (plain elements may carry data-hk-*) never gets hold of the real frame.
  const frame = el.firstElementChild;
  if (!c || !(frame instanceof HTMLIFrameElement)) return;
  const productId = String(c.productId ?? el.getAttribute('data-hk-product') ?? '');
  let variantId: string | null = typeof c.variantId === 'string' && c.variantId !== '' ? c.variantId : null;
  const send = () => {
    if (variantId) frame.contentWindow?.postMessage({ type: MSG_CHECKOUT_LINE, variantId }, location.origin);
  };
  const onMessage = (e: MessageEvent) => {
    if (e.origin !== location.origin || e.source !== frame.contentWindow) return;
    const d = e.data as { type?: unknown; height?: unknown } | null;
    if (!d || typeof d !== 'object') return;
    if (d.type === MSG_CHECKOUT_READY) send();
    else if (d.type === MSG_CHECKOUT_HEIGHT && typeof d.height === 'number' && Number.isFinite(d.height)) {
      frame.style.height = `${Math.min(MAX_H, Math.max(MIN_H, Math.round(d.height)))}px`;
    }
  };
  const onVariant = (e: Event) => {
    const det = (e as CustomEvent).detail as { productId?: unknown; variant?: { id?: unknown } } | undefined;
    if (!det || String(det.productId) !== productId || det.variant?.id == null) return;
    variantId = String(det.variant.id);
    send();
  };
  return join(listen(window, 'message', onMessage), listen(root as unknown as EventTarget, EVENT_VARIANT_CHANGE, onVariant));
};
