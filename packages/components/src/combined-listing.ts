import { escapeAttr, escapeText, safeUrl, toStr, type HkTag, type TagRenderContext } from '@hekana/sneferu-core';
import { passthrough } from './attrs';
import { safeImageSrc } from './css';
import { COMMERCE_STRINGS, str } from './strings';

const L = (ar: string, en: string) => ({ ar, en });
const ed = (ar: string, en: string) => ({ label: L(ar, en), group: 'commerce', insertable: false });

const MAX_MEMBERS = 24;
const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const CL_CSS = [
  '.sn-combined-listing{margin:0 0 16px}',
  '.sn-cl-title{margin:0 0 8px;font-weight:600}',
  '.sn-cl-title span{font-weight:400;opacity:.75}',
  '.sn-cl-list{display:flex;flex-wrap:wrap;gap:8px;margin:0;padding:0;list-style:none}',
  '.sn-cl-item{position:relative;display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;padding:8px 16px;box-sizing:border-box;border:1px solid color-mix(in srgb,var(--hk-color-text) 25%,transparent);border-radius:var(--hk-radius-sm,6px);color:inherit;text-decoration:none;background:transparent}',
  '.sn-cl-item:hover{border-color:var(--hk-color-text)}',
  '.sn-cl-item:focus-visible{outline:2px solid var(--hk-color-accent);outline-offset:2px}',
  '.sn-cl-item[aria-current]{border-color:var(--hk-color-text);box-shadow:inset 0 0 0 1px var(--hk-color-text)}',
  '.sn-cl-buttons .sn-cl-item[aria-current]{background:var(--hk-color-text);color:var(--hk-color-background)}',
  '.sn-cl-tiles .sn-cl-item{padding:2px;width:56px;height:56px}',
  '.sn-cl-tiles img{display:block;width:100%;height:100%;object-fit:cover;border-radius:calc(var(--hk-radius-sm,6px) - 2px)}',
  '.sn-cl-dots .sn-cl-item{padding:0;border-radius:50%;width:44px;height:44px}',
  '.sn-cl-dot{display:block;width:28px;height:28px;border-radius:50%;border:1px solid color-mix(in srgb,var(--hk-color-text) 30%,transparent);background:color-mix(in srgb,var(--hk-color-text) 15%,transparent)}',
  '.sn-cl-item.sn-cl-out{opacity:.5}',
  '.sn-cl-buttons .sn-cl-out{text-decoration:line-through}',
  '.sn-cl-tiles .sn-cl-out::after,.sn-cl-dots .sn-cl-out::after{content:"";position:absolute;inset:50% 4px auto;border-top:1px solid var(--hk-color-text);transform:rotate(-30deg)}',
  '.sn-cl-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}',
  '.sn-cl-select{min-height:44px;font:inherit;padding-inline:12px;max-width:100%}',
].join('');

interface Member { label: string; url: string; image: string; swatchColor: string; swatchImage: string; available: boolean; current: boolean }
interface Listing { optionLabel: string; members: Member[] }

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown, max = 120): string => toStr(v).trim().slice(0, max);
const imageOf = (v: unknown): string => {
  const u = isObj(v) ? toStr(v.url) : toStr(v);
  return safeImageSrc(u) ? u : '';
};

function listingOf(product: unknown): Listing | null {
  if (!isObj(product)) return null;
  const cl = product.combined_listing;
  if (!isObj(cl) || !Array.isArray(cl.members)) return null;
  const members: Member[] = [];
  for (const m of cl.members.slice(0, MAX_MEMBERS)) {
    if (!isObj(m)) continue;
    const url = safeUrl(toStr(m.url));
    if (!url || url === '#') continue;
    const color = text(m.swatch_color, 9);
    members.push({
      label: text(m.label) || text(m.title),
      url,
      image: imageOf(m.image),
      swatchColor: HEX.test(color) ? color : '',
      swatchImage: imageOf(m.swatch_image),
      available: m.available !== false,
      current: m.current === true,
    });
  }
  if (members.length < 2) return null;
  return { optionLabel: text(cl.option_label, 60), members };
}

export const hkCombinedListing: HkTag = {
  name: 'hk-combined-listing', version: 1, category: 'commerce',
  props: {
    product: { type: 'data', label: L('المنتج', 'Product') },
    display: { type: 'select', label: L('شكل العرض', 'Display'), options: ['auto', 'swatches', 'buttons', 'select'], default: 'auto' },
  },
  allowedParents: '*', allowedChildren: [], responsive: [], bindable: '*', controller: 'combined-listing', strings: COMMERCE_STRINGS,
  editor: ed('منتجات مجمّعة', 'Combined listing'),
  render(p, c: TagRenderContext) {
    const listing = listingOf(p.product ?? c.data.product);
    if (!listing) return '';
    (c.cssOnce ?? c.css)(CL_CSS);
    const { members, optionLabel } = listing;
    const wanted = p.display === 'swatches' || p.display === 'buttons' || p.display === 'select' ? p.display : 'auto';
    const hasImages = members.some((m) => m.swatchImage || m.image);
    const hasColors = members.some((m) => m.swatchColor);
    let mode: 'tiles' | 'dots' | 'buttons' | 'select';
    if (wanted === 'buttons' || wanted === 'select') mode = wanted;
    else mode = hasImages ? 'tiles' : hasColors ? 'dots' : 'buttons';
    const current = members.find((m) => m.current);
    const x = passthrough(p);
    const out = str(c, 'sold_out');
    const title = `<p class="sn-cl-title">${escapeText(optionLabel || str(c, 'variant'))}${current && current.label ? ` <span>${escapeText(current.label)}</span>` : ''}</p>`;
    const dotCss: string[] = [];
    const items = members.map((m, i) => {
      const cls = `sn-cl-item${m.available ? '' : ' sn-cl-out'}`;
      const attrs = `${m.current ? ' aria-current="true"' : ''}${m.available ? '' : ' data-hk-unavailable="true"'}${m.image ? ` data-hk-image="${escapeAttr(m.image)}"` : ''}`;
      const sr = m.available ? '' : `<span class="sn-cl-sr"> (${escapeText(out)})</span>`;
      const label = escapeText(m.label);
      let inner: string;
      const tile = mode === 'tiles' ? m.swatchImage || m.image : '';
      if (tile) {
        inner = `<img src="${escapeAttr(tile)}" alt="" loading="lazy" decoding="async"><span class="sn-cl-sr">${label}</span>${sr}`;
      } else if (mode !== 'buttons' && m.swatchColor) {
        dotCss.push(`.sn-${c.id} .sn-cl-c${i}{background:${m.swatchColor}}`);
        inner = `<span class="sn-cl-dot sn-cl-c${i}"></span><span class="sn-cl-sr">${label}</span>${sr}`;
      } else {
        inner = `<span>${label}</span>${sr}`;
      }
      return `<li><a class="${cls}" href="${escapeAttr(m.url)}"${attrs} title="${escapeAttr(m.label)}">${inner}</a></li>`;
    }).join('');
    if (dotCss.length) c.css(dotCss.join(''));
    const cls = `sn-${c.id} sn-combined-listing sn-cl-${mode === 'select' ? 'buttons' : mode}${x.cls}`;
    const open = `<div class="${cls}"${x.attrs} data-hk-controller="combined-listing" data-hk-display="${mode}">`;
    if (mode === 'select') {
      const opts = members.map((m) => `<option value="${escapeAttr(m.url)}"${m.current ? ' selected' : ''}>${escapeText(m.label)}${m.available ? '' : ` (${escapeText(out)})`}</option>`).join('');
      const links = members.map((m) => `<li><a href="${escapeAttr(m.url)}"${m.current ? ' aria-current="true"' : ''}>${escapeText(m.label)}</a></li>`).join('');
      return `${open}<label>${title}<select class="sn-cl-select">${opts}</select></label><noscript><ul class="sn-cl-list">${links}</ul></noscript></div>`;
    }
    return `${open}${title}<ul class="sn-cl-list">${items}</ul></div>`;
  },
};
