import { all, join, listen, safeUrl, type Ctl } from './dom';

const hasHover = (): boolean => {
  try { return typeof matchMedia === 'function' && matchMedia('(hover: hover) and (pointer: fine)').matches; } catch { return false; }
};

/** Desktop hover previews a member's image in the product gallery; a tap just follows the link. */
export const combinedListing: Ctl = (el, _host, root) => {
  const downs: Array<() => void> = [];
  const select = el.querySelector('select');
  if (select) {
    downs.push(listen(select, 'change', () => {
      const u = safeUrl(select.value);
      if (u) window.location.assign(u);
    }));
  }
  if (!hasHover()) return join(...downs);

  let saved: { img: HTMLImageElement; src: string | null; srcset: string | null; sizes: string | null } | null = null;
  const mainImg = (): HTMLImageElement | null => {
    const g = root.querySelector('[data-hk-controller="gallery"]');
    if (!g) return null;
    return g.querySelector<HTMLImageElement>('[data-hk-slide].sn-active img') ?? g.querySelector<HTMLImageElement>('[data-hk-slide] img');
  };
  const restore = () => {
    if (!saved) return;
    const { img, src, srcset, sizes } = saved;
    for (const [k, v] of [['src', src], ['srcset', srcset], ['sizes', sizes]] as const) {
      if (v === null) img.removeAttribute(k); else img.setAttribute(k, v);
    }
    saved = null;
  };
  const preview = (url: string) => {
    const img = saved?.img ?? mainImg();
    if (!img) return;
    if (!saved) saved = { img, src: img.getAttribute('src'), srcset: img.getAttribute('srcset'), sizes: img.getAttribute('sizes') };
    img.setAttribute('src', url);
    img.removeAttribute('srcset');
  };
  for (const a of all(el, 'a[data-hk-image]')) {
    const url = safeUrl(a.getAttribute('data-hk-image'));
    if (!url) continue;
    downs.push(listen(a, 'mouseenter', () => preview(url)));
    downs.push(listen(a, 'mouseleave', restore));
  }
  downs.push(restore);
  return join(...downs);
};
