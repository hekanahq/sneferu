import { escapeAttr, type HkTag } from '@hekana/sneferu-core';
import { passthrough } from './attrs';
import { pickVariant, srcsetOf } from './image-src';
import { COMMERCE_STRINGS, str } from './strings';
import { imagesOf, productId, productObject } from './product-view';

const L = (ar: string, en: string) => ({ ar, en });
const LAYOUTS = ['thumbs-below', 'thumbs-side', 'stacked'] as const;

export const GALLERY_CSS = [
  '.sn-gallery-slide{margin:0}',
  '.sn-gallery-slide img{display:block;width:100%;height:auto}',
  // without JS only the targeted slide shows; the first one when nothing is targeted
  '.sn-gallery:not(.sn-gallery-stacked) .sn-gallery-slide:not(:first-child){display:none}',
  '.sn-gallery:not(.sn-gallery-stacked) .sn-gallery-main:has(.sn-gallery-slide:target) .sn-gallery-slide:first-child:not(:target){display:none}',
  '.sn-gallery:not(.sn-gallery-stacked) .sn-gallery-slide:target{display:block}',
  '.sn-gallery:not(.sn-gallery-stacked) .sn-gallery-main .sn-gallery-slide.sn-active:not([hidden]){display:block}',
  '.sn-gallery-thumbs{display:flex;flex-wrap:wrap;gap:8px;list-style:none;margin:8px 0 0;padding:0}',
  '.sn-gallery-thumbs a{display:block;min-width:44px;min-height:44px;line-height:0;border:2px solid transparent;border-radius:var(--hk-radius-sm,6px);overflow:hidden}',
  '.sn-gallery-thumbs a[aria-current=true]{border-color:var(--hk-color-accent,currentColor)}',
  '.sn-gallery-thumbs a:focus-visible{outline:2px solid var(--hk-color-accent,currentColor);outline-offset:2px}',
  '.sn-gallery-thumbs-side{display:flex;flex-direction:row-reverse;gap:12px}',
  '.sn-gallery-thumbs-side .sn-gallery-main{flex:1;min-width:0}',
  '.sn-gallery-thumbs-side .sn-gallery-thumbs{flex-direction:column;margin:0}',
  '.sn-gallery-stacked .sn-gallery-main{display:grid;gap:12px}',
].join('');

export const hkProductGallery: HkTag = {
  name: 'hk-product-gallery', version: 1, category: 'commerce',
  props: {
    product: { type: 'data', label: L('المنتج', 'Product') },
    layout: { type: 'select', label: L('شكل المعرض', 'Gallery layout'), options: [...LAYOUTS], default: 'thumbs-below' },
    thumbnails: { type: 'boolean', label: L('الصور المصغرة', 'Thumbnails'), default: true },
    sizes: { type: 'text', label: L('أحجام الصورة', 'Image sizes'), default: '(min-width:1024px) 50vw, 100vw' },
  },
  allowedParents: '*', allowedChildren: [], responsive: [], bindable: '*', controller: 'gallery', strings: COMMERCE_STRINGS,
  editor: { label: L('معرض صور المنتج', 'Product gallery'), group: 'commerce', insertable: false },
  render(p, c) {
    const prod = productObject(p.product);
    if (!prod) return '';
    const images = imagesOf(prod);
    if (images.length === 0) return '';
    (c.cssOnce ?? c.css)(GALLERY_CSS);
    const layout = (LAYOUTS as readonly string[]).includes(String(p.layout)) ? String(p.layout) : 'thumbs-below';
    const sizes = typeof p.sizes === 'string' && /^[\w\s,()%.:+-]{1,200}$/.test(p.sizes) ? p.sizes : '(min-width:1024px) 50vw, 100vw';
    const title = typeof prod.title === 'string' ? prod.title : '';
    const gid = `hk-g-${c.id}`;
    const slides = images.map((im, n) => {
      const set = srcsetOf(im.ref);
      const dims = `${im.width ? ` width="${im.width}"` : ''}${im.height ? ` height="${im.height}"` : ''}`;
      const first = n === 0;
      return `<figure class="sn-gallery-slide${first ? ' sn-active' : ''}" id="${gid}-${n}" data-hk-slide="${n}" data-hk-src="${escapeAttr(im.url)}">`
        + `<img src="${escapeAttr(im.url)}"${set ? ` srcset="${escapeAttr(set)}" sizes="${escapeAttr(sizes)}"` : ''}${dims} alt="${escapeAttr(im.alt || title)}" decoding="async"${first ? ' fetchpriority="high"' : ' loading="lazy"'}></figure>`;
    }).join('');
    const label = str(c, 'image');
    const thumbs = images.length > 1 && p.thumbnails !== false
      ? `<ul class="sn-gallery-thumbs">${images.map((im, n) => `<li><a href="#${gid}-${n}" data-hk-thumb="${n}" aria-label="${escapeAttr(`${label} ${n + 1}`)}"${n === 0 ? ' aria-current="true"' : ''}>`
        + `<img src="${escapeAttr(pickVariant(im.ref, 160))}" width="80" height="80" alt="" loading="lazy" decoding="async"></a></li>`).join('')}</ul>`
      : '';
    const x = passthrough(p);
    return `<div class="sn-${c.id} sn-gallery sn-gallery-${layout}${x.cls}"${x.attrs} data-hk-controller="gallery" data-hk-product="${escapeAttr(productId(prod))}"><div class="sn-gallery-main">${slides}</div>${thumbs}</div>`;
  },
};
