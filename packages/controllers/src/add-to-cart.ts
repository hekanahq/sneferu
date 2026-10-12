import { EVENT_CART_ADDED, EVENT_VARIANT_APPLY } from './host';
import { listen, join, readConfig, setHidden, type Ctl } from './dom';

const num = (x: unknown, d: number) => {
  const n = Number(x);
  return x != null && x !== '' && Number.isFinite(n) ? n : d;
};

export const addToCart: Ctl = (el, host) => {
  const c = readConfig(el);
  if (!c) return;
  const productId = String(c.productId ?? el.getAttribute('data-hk-product') ?? '');
  const min = Math.max(1, Math.floor(num(c.min, 1)));
  const step = Math.max(1, Math.floor(num(c.step, 1)));
  const max = c.max == null ? null : Math.floor(num(c.max, NaN));
  const maxOk = max !== null && Number.isFinite(max) ? max : null;
  const input = el.querySelector<HTMLInputElement>('input[name=quantity]');
  const btn = el.querySelector<HTMLButtonElement>('button[type=submit], .sn-atc-button');
  const msg = el.querySelector<HTMLElement>('.sn-atc-message');
  const label = () => btn?.getAttribute('data-hk-label') || host.t('add_to_cart');
  const soldLabel = () => btn?.getAttribute('data-hk-soldout') || host.t('sold_out');
  let available = c.available !== false;
  let pending = false;

  const clamp = (raw: unknown) => {
    let n = Math.max(min, num(raw, min));
    n = min + Math.round((n - min) / step) * step;
    if (maxOk !== null && n > maxOk) n = min + Math.floor((maxOk - min) / step) * step;
    return Math.max(min, n);
  };
  const render = () => {
    if (!btn) return;
    btn.disabled = pending || !available;
    if (pending) btn.setAttribute('aria-busy', 'true');
    else btn.removeAttribute('aria-busy');
    btn.textContent = available ? label() : soldLabel();
  };
  const say = (t: string) => {
    if (!msg) return;
    msg.textContent = t;
    setHidden(msg, false);
  };
  if (input) input.value = String(min);
  render();

  const onClick = (e: Event) => {
    const b = (e.target as Element | null)?.closest?.('[data-hk-qty]');
    if (!b || !input || !el.contains(b)) return;
    const dir = b.getAttribute('data-hk-qty') === 'dec' ? -1 : 1;
    input.value = String(clamp(clamp(input.value) + dir * step));
  };
  const onNorm = () => {
    if (input) input.value = String(clamp(input.value));
  };
  const onApply = (e: Event) => {
    available = !!(e as CustomEvent).detail?.available;
    render();
  };
  const onSubmit = async (e: Event) => {
    e.preventDefault();
    if (pending || !available) return;
    const quantity = clamp(input?.value);
    if (input) input.value = String(quantity);
    const variantId = el.querySelector<HTMLInputElement>('input[name=variant]')?.value || (c.variantId ? String(c.variantId) : undefined);
    pending = true;
    render();
    try {
      const r = await host.add({ productId, variantId, quantity });
      if (r && r.ok) {
        say(host.t('added'));
        el.dispatchEvent(new CustomEvent(EVENT_CART_ADDED, { bubbles: true, detail: { productId, variantId, quantity } }));
      } else say((r && typeof r.message === 'string' && r.message) || host.t('add_failed'));
    } catch (err) {
      // an exception is for the developer, not the shopper
      console.warn('hk-add-to-cart: host.add failed', err);
      say(host.t('add_failed'));
    } finally {
      pending = false;
      render();
    }
  };
  return join(
    listen(el, 'click', onClick),
    listen(el, 'change', onNorm),
    listen(el, 'focusout', onNorm),
    listen(el, EVENT_VARIANT_APPLY, onApply),
    listen(el, 'submit', onSubmit),
  );
};
