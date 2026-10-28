import { addToCart } from './add-to-cart';
import { cartCount } from './cart-count';
import { cartDrawer } from './cart-drawer';
import { cartItems } from './cart-items';
import { cartSummary } from './cart-summary';
import { all, type Ctl } from './dom';
import { gallery } from './gallery';
import { inlineCheckout } from './inline-checkout';
import { appBlock } from './app-block';
import type { CartHost } from './host';
import { variantPicker } from './variant-picker';

export type { CartHost, CartLine, CartText } from './host';
export { EVENT_CART_ADDED, EVENT_VARIANT_CHANGE } from './host';
export { MSG_CHECKOUT_HEIGHT, MSG_CHECKOUT_LINE, MSG_CHECKOUT_READY } from './inline-checkout';
export { MSG_APP_BLOCK_HEIGHT, MSG_APP_BLOCK_UNAVAILABLE } from './app-block';

const controllers: Array<[string, Ctl]> = [
  ['variant-picker', variantPicker],
  ['add-to-cart', addToCart],
  ['cart-count', cartCount],
  ['cart-items', cartItems],
  ['cart-summary', cartSummary],
  ['cart-drawer', cartDrawer],
  ['gallery', gallery],
  ['inline-checkout', inlineCheckout],
  ['app-block', appBlock],
];

const started = new WeakMap<object, () => void>();

export function startControllers(root: ParentNode, host: CartHost): () => void {
  const existing = started.get(root);
  if (existing) return existing;
  const downs: Array<() => void> = [];
  for (const [name, init] of controllers) {
    for (const el of all(root, `[data-hk-controller="${name}"]`)) {
      try {
        const d = init(el, host, root);
        if (d) downs.push(d);
      } catch {
        /* one broken element never stops the others */
      }
    }
  }
  const teardown = () => {
    started.delete(root);
    for (const d of downs.splice(0)) {
      try {
        d();
      } catch {
        /* ignore */
      }
    }
  };
  started.set(root, teardown);
  return teardown;
}
