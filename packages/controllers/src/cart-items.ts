import { listen, mk, safeUrl, setHidden, type Ctl } from './dom';
import type { CartLine } from './host';

/** A whole number of at least 1 from a host value, else 1. */
const whole = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) && x >= 1 ? Math.floor(x) : 1);
/** The quantity after one step up, or null when that would pass maxQuantity. */
const up = (l: CartLine) => {
  const n = l.quantity + whole(l.quantityStep);
  return l.maxQuantity != null && n > l.maxQuantity ? null : n;
};

export const cartItems: Ctl = (el, host) => {
  const list = el.querySelector<HTMLElement>('[data-hk-list]');
  const empty = el.querySelector<HTMLElement>('[data-hk-empty]');
  const fallback = el.querySelector<HTMLElement>('[data-hk-fallback]');
  if (!list) return;
  let lines: CartLine[] = [];

  const build = (l: CartLine) => {
    const li = mk('li', 'sn-cart-item');
    li.setAttribute('data-key', l.key);
    const url = safeUrl(l.url);
    const img = safeUrl(l.image);
    if (img) {
      const a = mk('a', 'sn-cart-item-image');
      if (url) a.setAttribute('href', url);
      const i = mk('img');
      i.setAttribute('alt', '');
      i.setAttribute('loading', 'lazy');
      i.setAttribute('src', img);
      a.appendChild(i);
      li.appendChild(a);
    }
    const title = url ? mk('a', 'sn-cart-item-title', l.title) : mk('span', 'sn-cart-item-title', l.title);
    if (url) title.setAttribute('href', url);
    li.appendChild(title);
    if (l.variantTitle) li.appendChild(mk('span', 'sn-cart-item-variant', l.variantTitle));
    li.appendChild(mk('span', 'sn-cart-item-price', host.format(l.unitPrice * l.quantity)));
    const q = mk('div', 'sn-cart-item-qty');
    const btn = (act: string, cls: string, text: string, label: string) => {
      const b = mk('button', cls, text);
      b.setAttribute('type', 'button');
      b.setAttribute('data-hk-act', act);
      b.setAttribute('aria-label', label);
      return b;
    };
    const inc = btn('inc', 'sn-cart-item-qty-btn', '+', host.t('increase'));
    if (up(l) === null) inc.setAttribute('aria-disabled', 'true');
    q.append(btn('dec', 'sn-cart-item-qty-btn', '-', host.t('decrease')), mk('span', 'sn-cart-item-qty-value', String(l.quantity)), inc);
    li.appendChild(q);
    li.appendChild(btn('remove', 'sn-cart-item-remove', '×', host.t('remove')));
    return li;
  };

  const render = (next: CartLine[]) => {
    lines = next;
    const a = document.activeElement as HTMLElement | null;
    const keyed = a && list.contains(a) ? a.closest('li') : null;
    const fKey = keyed?.getAttribute('data-key');
    const fAct = a?.getAttribute('data-hk-act');
    list.textContent = '';
    for (const l of next) list.appendChild(build(l));
    setHidden(list, next.length === 0);
    if (empty) setHidden(empty, next.length > 0);
    if (fallback) setHidden(fallback, true);
    if (fKey != null && fAct) {
      const li = Array.from(list.children).find((x) => x.getAttribute('data-key') === fKey);
      (li?.querySelector(`[data-hk-act="${fAct}"]`) as HTMLElement | null)?.focus();
    }
  };

  const onClick = (e: Event) => {
    const b = (e.target as Element | null)?.closest?.('[data-hk-act]');
    const key = b?.closest('li')?.getAttribute('data-key');
    const l = lines.find((x) => x.key === key);
    if (!b || !l) return;
    const act = b.getAttribute('data-hk-act');
    const down = l.quantity - whole(l.quantityStep);
    if (act === 'remove' || (act === 'dec' && down < whole(l.minQuantity))) host.remove(l.key);
    else if (act === 'dec') host.update(l.key, down);
    else if (act === 'inc') { const n = up(l); if (n !== null) host.update(l.key, n); }
  };

  render(host.get());
  const un = host.subscribe(render);
  const off = listen(list, 'click', onClick);
  return () => {
    un();
    off();
  };
};
