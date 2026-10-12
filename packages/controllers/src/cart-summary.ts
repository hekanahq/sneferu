import { safeUrl, setHidden, total, type Ctl } from './dom';
import type { CartLine } from './host';

export const cartSummary: Ctl = (el, host) => {
  const val = el.querySelector('[data-hk-bind="subtotal"]');
  const link = el.querySelector('a.sn-cart-checkout');
  const href = safeUrl(host.checkoutUrl);
  if (link && href) link.setAttribute('href', href);
  const render = (lines: CartLine[]) => {
    if (val) val.textContent = host.format(total(lines));
    setHidden(el, lines.length === 0);
  };
  render(host.get());
  return host.subscribe(render);
};
