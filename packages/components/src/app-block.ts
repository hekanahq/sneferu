import { escapeAttr, toStr, type HkTag } from '@hekana/sneferu-core';
import { passthrough } from './attrs';
import { productObject } from './product-view';

const L = (ar: string, en: string) => ({ ar, en });
/** A product handle as the platform issues it: letters (any script), digits, '-' and '_'. */
const HANDLE = /^[\p{L}\p{N}_-]{1,120}$/u;
export const APP_BLOCK_PATH = '/hk2/app-block';

/**
 * The blocks an app can put in a themed page. A closed list kept by the platform: a theme
 * names one of these and cannot invent a path, so the frame it prints can only ever be a
 * Hekana page for an app the platform knows.
 */
export const APP_BLOCKS: Readonly<Record<string, readonly string[]>> = {
  subscriptions: ['subscribe', 'portal'],
};

/** Blocks that are about one product and so need `product`. */
const PRODUCT_BLOCKS = new Set(['subscriptions:subscribe']);

const AB_CSS = [
  '.sn-app-block{position:relative;z-index:2;width:100%}',
  '.sn-app-block iframe{display:block;width:100%;height:320px;min-height:120px;border:0;background:transparent}',
].join('');

/**
 * A block from an app the store has installed, placed in a themed page (the subscribe
 * button on a product page, the shopper's subscriptions page). Like `hk-inline-checkout`
 * the tag prints a same-origin frame of a platform page and nothing else: no field, no
 * button, no script. What the block asks and does stays the app's and Hekana's; the theme
 * decides only where it sits. If the store has not installed the app, the frame tells its
 * controller and the block disappears.
 */
export const hkAppBlock: HkTag = {
  name: 'hk-app-block', version: 1, category: 'commerce',
  props: {
    app: { type: 'select', label: L('التطبيق', 'App'), options: Object.keys(APP_BLOCKS), default: 'subscriptions' },
    block: { type: 'select', label: L('البلوك', 'Block'), options: ['subscribe', 'portal'], default: 'subscribe' },
    product: { type: 'data', label: L('المنتج', 'Product') },
    label: { type: 'text', label: L('اسم البلوك لقارئ الشاشة', 'Block name for screen readers'), default: '' },
  },
  allowedParents: '*', allowedChildren: [], responsive: [], bindable: '*', controller: 'app-block',
  editor: { label: L('بلوك تطبيق', 'App block'), group: 'commerce', insertable: true },
  render(p, c) {
    const app = toStr(p.app).trim();
    const block = toStr(p.block).trim();
    if (!APP_BLOCKS[app]?.includes(block)) return '';
    let query = '';
    if (PRODUCT_BLOCKS.has(`${app}:${block}`)) {
      const prod = productObject(p.product);
      const handle = prod ? toStr(prod.handle).trim() : '';
      if (!HANDLE.test(handle)) return '';
      query = `?product=${encodeURIComponent(handle)}`;
    }
    (c.cssOnce ?? c.css)(AB_CSS);
    const x = passthrough(p);
    const label = toStr(p.label).trim().slice(0, 80);
    return `<div class="sn-${c.id} sn-app-block${x.cls}"${x.attrs} data-hk-controller="app-block">`
      + `<iframe src="${escapeAttr(c.url(`${APP_BLOCK_PATH}/${app}/${block}${query}`))}" title="${escapeAttr(label || `${app} ${block}`)}" loading="lazy" referrerpolicy="same-origin"></iframe></div>`;
  },
};
