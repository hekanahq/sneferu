import type { HkTag } from '@hekana/sneferu-core';
import { colorVar, oneOf, px, responsiveCss } from './css';
import { passthrough } from './attrs';

const L = (ar: string, en: string) => ({ ar, en });
const editor = (ar: string, en: string, group = 'layout') => ({ label: L(ar, en), group, insertable: true });

export const hkSection: HkTag = {
  name: 'hk-section', version: 1, category: 'layout',
  props: {
    fullBleed: { type: 'boolean', label: L('بعرض الشاشة', 'Full bleed'), default: false },
    background: { type: 'color', label: L('الخلفية', 'Background') },
    paddingY: { type: 'number', label: L('المسافة الرأسية', 'Vertical padding'), min: 0, max: 240, default: 64, responsive: true },
  },
  allowedParents: '*', allowedChildren: '*', responsive: ['paddingY'], bindable: '*', editor: editor('قسم', 'Section'),
  render(p, c) {
    const s = `.sn-${c.id}`;
    const bg = colorVar(p.background);
    if (bg) c.css(`${s}{background:${bg}}`);
    if (p.fullBleed !== true) c.css(`${s}>.sn-inner{max-width:var(--hk-content-width,1280px);margin-inline:auto;padding-inline:var(--hk-gutter,16px)}`);
    responsiveCss(s, 'padding-block', p.paddingY ?? 64, (v) => px(v, 240)).forEach(c.css);
    const x = passthrough(p);
    return `<section class="sn-${c.id}${x.cls}"${x.attrs}><div class="sn-inner">${c.renderChildren()}</div></section>`;
  },
};

export const hkContainer: HkTag = {
  name: 'hk-container', version: 1, category: 'layout',
  props: {
    maxWidth: { type: 'number', label: L('أقصى عرض', 'Max width'), min: 200, max: 1920 },
    paddingX: { type: 'number', label: L('المسافة الأفقية', 'Horizontal padding'), min: 0, max: 120, default: 16, responsive: true },
  },
  allowedParents: '*', allowedChildren: '*', responsive: ['paddingX'], bindable: '*', editor: editor('حاوية', 'Container'),
  render(p, c) {
    const s = `.sn-${c.id}`;
    const mw = px(p.maxWidth, 1920);
    c.css(`${s}{margin-inline:auto;max-width:${mw ?? 'var(--hk-content-width,1280px)'}}`);
    responsiveCss(s, 'padding-inline', p.paddingX ?? 16, (v) => px(v, 120)).forEach(c.css);
    const x = passthrough(p);
    return `<div class="sn-${c.id}${x.cls}"${x.attrs}>${c.renderChildren()}</div>`;
  },
};

const DIR = oneOf(['row', 'column'] as const);
const ALIGN = oneOf(['start', 'center', 'end', 'stretch'] as const);
const JUSTIFY: Record<string, string> = { start: 'flex-start', center: 'center', end: 'flex-end', between: 'space-between' };

export const hkStack: HkTag = {
  name: 'hk-stack', version: 1, category: 'layout',
  props: {
    direction: { type: 'select', label: L('الاتجاه', 'Direction'), options: ['row', 'column'], default: 'column', responsive: true },
    gap: { type: 'number', label: L('المسافة', 'Gap'), min: 0, max: 160, default: 16, responsive: true },
    align: { type: 'select', label: L('المحاذاة', 'Align'), options: ['start', 'center', 'end', 'stretch'] },
    justify: { type: 'select', label: L('التوزيع', 'Justify'), options: ['start', 'center', 'end', 'between'] },
    wrap: { type: 'boolean', label: L('التفاف', 'Wrap'), default: false },
  },
  allowedParents: '*', allowedChildren: '*', responsive: ['direction', 'gap'], bindable: '*', editor: editor('صف/عمود', 'Stack'),
  render(p, c) {
    const s = `.sn-${c.id}`;
    c.css(`${s}{display:flex}`);
    responsiveCss(s, 'flex-direction', p.direction ?? 'column', DIR).forEach(c.css);
    responsiveCss(s, 'gap', p.gap ?? 16, (v) => px(v, 160)).forEach(c.css);
    const a = ALIGN(p.align); if (a) c.css(`${s}{align-items:${a === 'start' || a === 'end' ? `flex-${a}` : a}}`);
    const j = typeof p.justify === 'string' ? JUSTIFY[p.justify] : undefined; if (j) c.css(`${s}{justify-content:${j}}`);
    if (p.wrap === true) c.css(`${s}{flex-wrap:wrap}`);
    const x = passthrough(p);
    return `<div class="sn-${c.id}${x.cls}"${x.attrs}>${c.renderChildren()}</div>`;
  },
};

export const hkGrid: HkTag = {
  name: 'hk-grid', version: 1, category: 'layout',
  props: {
    columns: { type: 'range', label: L('الأعمدة', 'Columns'), min: 1, max: 12, default: 3, responsive: true },
    gap: { type: 'number', label: L('المسافة', 'Gap'), min: 0, max: 160, default: 24, responsive: true },
    minItem: { type: 'number', label: L('أقل عرض للعنصر', 'Min item width'), min: 80, max: 600 },
  },
  allowedParents: '*', allowedChildren: '*', responsive: ['columns', 'gap'], bindable: '*', editor: editor('شبكة', 'Grid'),
  render(p, c) {
    const s = `.sn-${c.id}`;
    const min = px(p.minItem, 600);
    if (min) c.css(`${s}{display:grid;grid-template-columns:repeat(auto-fill,minmax(${min},1fr))}`);
    else {
      const cols = (v: unknown) => { const n = typeof v === 'number' ? v : Number(v); return Number.isInteger(n) && n >= 1 && n <= 12 ? `repeat(${n},minmax(0,1fr))` : null; };
      // display:grid is its own rule so the grid holds even when only tablet/mobile columns are valid
      c.css(`${s}{display:grid}`);
      responsiveCss(s, 'grid-template-columns', p.columns ?? 3, cols).forEach(c.css);
    }
    responsiveCss(s, 'gap', p.gap ?? 24, (v) => px(v, 160)).forEach(c.css);
    const x = passthrough(p);
    return `<div class="sn-${c.id} sn-grid${x.cls}"${x.attrs}>${c.renderChildren()}</div>`;
  },
};
