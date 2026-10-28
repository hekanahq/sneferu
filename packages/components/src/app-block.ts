import {
  appBlockApps,
  appBlockFrameQuery,
  appBlockIds,
  appBlockSettings,
  escapeAttr,
  findAppBlock,
  toStr,
  type HkTag,
} from '@hekana/sneferu-core';
import { passthrough } from './attrs';
import { productObject } from './product-view';

const L = (ar: string, en: string) => ({ ar, en });
const HANDLE = /^[\p{L}\p{N}_-]{1,120}$/u;

const AB_CSS = [
  '.sn-app-block{position:relative;width:100%}',
  '.sn-app-block iframe{display:block;width:100%;height:200px;border:0;background:transparent}',
].join('');

/**
 * Places an app's block: a same-origin frame of a page the platform serves for an installed app.
 * The `app` and `block` must be a pair on the closed list (`APP_BLOCKS` in core); anything else
 * prints nothing, so a theme cannot point the frame at an address of its own.
 */
export const hkAppBlock: HkTag = {
  name: 'hk-app-block',
  version: 1,
  category: 'commerce',
  props: {
    app: { type: 'select', label: L('التطبيق', 'App'), options: appBlockApps(), required: true },
    block: { type: 'select', label: L('البلوك', 'Block'), options: appBlockIds(), required: true },
    product: { type: 'data', label: L('المنتج', 'Product') },
    settings: { type: 'data', label: L('الإعدادات', 'Settings') },
    label: { type: 'text', label: L('اسم البلوك لقارئ الشاشة', 'Block name for screen readers'), maxLength: 80, default: '' },
  },
  allowedParents: '*',
  allowedChildren: [],
  responsive: [],
  bindable: '*',
  controller: 'app-block',
  editor: { label: L('بلوك تطبيق', 'App block'), group: 'commerce', insertable: false },
  render(p, c) {
    const def = findAppBlock(p.app, p.block);
    if (!def) return '';
    const params: string[] = [];
    if (def.context === 'product') {
      const prod = productObject(p.product);
      const handle = prod ? toStr(prod.handle).trim() : '';
      if (!HANDLE.test(handle)) return '';
      params.push(`product=${encodeURIComponent(handle)}`);
    }
    const frameQuery = appBlockFrameQuery(def, appBlockSettings(def, p.settings, c.locale));
    if (frameQuery) params.push(frameQuery);
    (c.cssOnce ?? c.css)(AB_CSS);
    const x = passthrough(p);
    const label = toStr(p.label).trim().slice(0, 80) || def.name[c.locale];
    const src = c.url(`${def.path}${params.length ? `?${params.join('&')}` : ''}`);
    return (
      `<div class="sn-${c.id} sn-app-block${x.cls}"${x.attrs} data-hk-controller="app-block" data-hk-app="${escapeAttr(def.app)}" data-hk-block="${escapeAttr(def.block)}">` +
      `<iframe src="${escapeAttr(src)}" title="${escapeAttr(label)}" loading="lazy" referrerpolicy="same-origin"></iframe></div>`
    );
  },
};
