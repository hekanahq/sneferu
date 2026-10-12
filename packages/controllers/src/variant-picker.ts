import { EVENT_VARIANT_APPLY, EVENT_VARIANT_CHANGE } from './host';
import { all, listen, readConfig, sameProduct, type Ctl } from './dom';

interface V {
  id: string;
  options: string[];
  price?: number;
  compare_at?: number;
  available?: boolean;
  image?: string;
}

export const variantPicker: Ctl = (el, host, root) => {
  const c = readConfig(el);
  if (!c) return;
  const productId = String(c.productId ?? el.getAttribute('data-hk-product') ?? '');
  const variants: V[] = (Array.isArray(c.variants) ? c.variants : [])
    .filter((v: any) => v && typeof v === 'object' && v.id != null)
    .map((v: any) => ({ ...v, id: String(v.id), options: Array.isArray(v.options) ? v.options.map(String) : [] }));
  const flat = !Array.isArray(c.options) || c.options.length === 0;
  const groups = all(el, '[data-hk-option]').sort((a, b) => Number(a.dataset.hkOption) - Number(b.dataset.hkOption));

  const valueOf = (g: HTMLElement): string | undefined => {
    const s = g.querySelector('select');
    if (s) return s.value;
    return Array.from(g.querySelectorAll('input')).find((i) => i.checked)?.value;
  };
  const mark = () => {
    for (const i of Array.from(el.querySelectorAll('input[type=radio]'))) {
      const l = i.closest('label');
      if (!l) continue;
      if ((i as HTMLInputElement).checked) l.setAttribute('data-checked', 'true');
      else l.removeAttribute('data-checked');
    }
  };

  const apply = (v: V | undefined) => {
    for (const f of all(root, '[data-hk-controller="add-to-cart"]').filter((x) => sameProduct(x, productId))) {
      if (v) {
        const inp = f.querySelector<HTMLInputElement>('input[name=variant]');
        if (inp) inp.value = v.id;
      }
      f.dispatchEvent(new CustomEvent(EVENT_VARIANT_APPLY, { detail: { available: !!v && v.available !== false } }));
    }
    if (!v) return;
    for (const b of all(root, '[data-hk-bind="price"]').filter((x) => sameProduct(x, productId))) {
      if (typeof v.price !== 'number' || !Number.isFinite(v.price)) continue;
      const now = b.querySelector('.sn-now');
      if (now) now.textContent = host.format(v.price);
      let was = b.querySelector('.sn-was');
      if (typeof v.compare_at === 'number' && v.compare_at > v.price) {
        if (!was) {
          was = document.createElement('s');
          was.className = 'sn-was';
          b.appendChild(was);
        }
        was.textContent = host.format(v.compare_at);
      } else if (was) was.remove();
    }
    try {
      const u = new URL(location.href);
      if (u.origin === location.origin) {
        u.searchParams.set('variant', v.id);
        history.replaceState(history.state, '', u.pathname + u.search + u.hash);
      }
    } catch {
      /* unsafe or unsupported URL: leave it */
    }
    el.dispatchEvent(new CustomEvent(EVENT_VARIANT_CHANGE, { bubbles: true, detail: { productId, variant: v } }));
  };

  const onChange = () => {
    mark();
    const vals = (flat ? groups.slice(0, 1) : groups).map(valueOf);
    if (!vals.length || vals.some((x) => x === undefined)) return;
    apply(
      flat
        ? variants.find((v) => v.id === vals[0])
        : variants.find((v) => v.options.length === vals.length && v.options.every((o, i) => o === vals[i])),
    );
  };
  mark();
  return listen(el, 'change', onChange);
};
