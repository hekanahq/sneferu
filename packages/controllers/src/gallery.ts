import { EVENT_VARIANT_CHANGE } from './host';
import { all, join, listen, type Ctl } from './dom';

export const gallery: Ctl = (el, _host, root) => {
  const slides = all(el, '[data-hk-slide]');
  const thumbs = all(el, '[data-hk-thumb]');
  if (!slides.length) return;
  const show = (i: number) => {
    slides.forEach((s, n) => {
      s.classList.toggle('sn-active', n === i);
      if (n === i) s.removeAttribute('hidden');
      else s.setAttribute('hidden', '');
    });
    thumbs.forEach((t, n) => {
      if (n === i) t.setAttribute('aria-current', 'true');
      else t.removeAttribute('aria-current');
    });
  };
  const idx = (t: Element | null) => (t ? thumbs.indexOf(t as HTMLElement) : -1);
  // a stacked gallery shows every image; the thumbnails are plain anchors there
  if (el.classList.contains('sn-gallery-stacked')) return;
  show(0);

  const onClick = (e: Event) => {
    const i = idx((e.target as Element | null)?.closest?.('[data-hk-thumb]') ?? null);
    if (i < 0) return;
    e.preventDefault();
    show(i);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const i = idx((e.target as Element | null)?.closest?.('[data-hk-thumb]') ?? null);
    if (i < 0) return;
    const rtl = (el.closest('[dir]')?.getAttribute('dir') || document.documentElement.getAttribute('dir')) === 'rtl';
    const n = Math.min(thumbs.length - 1, Math.max(0, i + ((e.key === 'ArrowRight') !== rtl ? 1 : -1)));
    e.preventDefault();
    show(n);
    thumbs[n]?.focus();
  };
  const onVariant = (e: Event) => {
    const d = (e as CustomEvent).detail;
    const own = el.getAttribute('data-hk-product');
    if (own && d?.productId && String(d.productId) !== own) return;
    const src = d?.variant?.image;
    if (typeof src !== 'string') return;
    const i = slides.findIndex((s) => s.getAttribute('data-hk-src') === src);
    if (i >= 0) show(i);
  };
  return join(
    listen(el, 'click', onClick),
    listen(el, 'keydown', onKey),
    listen(root as unknown as EventTarget, EVENT_VARIANT_CHANGE, onVariant),
  );
};
