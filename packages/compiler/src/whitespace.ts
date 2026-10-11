import type { AstNode } from './ast';

/**
 * Whitespace model shared by the compiler and the Prettier plugin.
 *
 * HTML ignores most of the whitespace in a template: runs collapse to one space,
 * and whitespace next to a block-level box, at the start or end of a block, or
 * between the items of a flex or grid container is not rendered. The compiler
 * normalises exactly that whitespace away, so indentation and line breaks are
 * not part of the IR, and the formatter may only move whitespace where this
 * model says it is free. Both sides read the same tables below.
 */
export type WsContext = 'block' | 'flex' | 'inline' | 'raw';

/** HTML whitespace (not \s: a no-break space is content). */
export const WS_CHARS = /[ \t\n\r\f]+/g;
export const isWsOnly = (s: string): boolean => /^[ \t\n\r\f]*$/.test(s);

const BLOCK_LEVEL = new Set([
  'address', 'article', 'aside', 'blockquote', 'body', 'caption', 'col', 'colgroup', 'dd', 'details', 'dialog', 'div', 'dl', 'dt',
  'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr',
  'html', 'li', 'main', 'menu', 'nav', 'ol', 'p', 'pre', 'search', 'section', 'summary', 'table', 'tbody', 'td', 'tfoot', 'th',
  'thead', 'tr', 'ul',
  // Sneferu components whose rendered root is block-level
  'hk-section', 'hk-container', 'hk-stack', 'hk-grid', 'hk-heading', 'hk-text', 'hk-image', 'hk-card', 'hk-product-grid', 'hk-sections',
]);
/** Children are flex or grid items (or are never rendered as text). */
const FLEX_INNER = new Set(['hk-stack', 'hk-grid', 'hk-product-grid', 'html', 'head']);
/** Text inside is kept exactly as written. */
const RAW_INNER = new Set(['pre', 'textarea', 'script', 'style']);
/** Inline-block boxes: their own start and end trim like a block. */
const BLOCK_INNER_EXTRA = new Set(['button']);

/** True when whitespace next to this element is never rendered. */
export const isBlockLevel = (tag: string): boolean => BLOCK_LEVEL.has(tag.toLowerCase());

/** The whitespace context of an element's children. */
export function innerContext(tag: string, parent: WsContext): WsContext {
  const t = tag.toLowerCase();
  if (parent === 'raw' || RAW_INNER.has(t)) return 'raw';
  if (FLEX_INNER.has(t)) return 'flex';
  if (BLOCK_LEVEL.has(t) || BLOCK_INNER_EXTRA.has(t)) return 'block';
  return 'inline';
}

/** A neighbour of a whitespace gap: null at the edge of a list, an element (by tag), or other content. */
export type WsNeighbor = null | { el: string } | { other: true };

/**
 * Is whitespace on this side of `neighbor` dropped by the compiler?
 * `edges` is false inside {% if %} / {% for %} bodies, whose edges touch unknown content.
 */
export function freeBeside(neighbor: WsNeighbor, ctx: WsContext, edges: boolean): boolean {
  if (ctx === 'raw') return false;
  if (neighbor === null) return edges && (ctx === 'block' || ctx === 'flex');
  if ('el' in neighbor) return ctx === 'flex' || isBlockLevel(neighbor.el);
  return false;
}

const neighborOf = (n: AstNode | undefined): WsNeighbor => (n === undefined ? null : n.t === 'el' ? { el: n.tag } : { other: true });

/**
 * Normalises whitespace in place: merges adjacent text (split by comments or the
 * schema), collapses runs to one space and drops the whitespace HTML would not render.
 */
export function normalizeWhitespace(list: AstNode[], ctx: WsContext = 'block', edges = true): AstNode[] {
  for (const n of list) {
    if (n.t === 'el') normalizeWhitespace(n.children, innerContext(n.tag, ctx), true);
    else if (n.t === 'if') { for (const b of n.branches) normalizeWhitespace(b.body, ctx, false); if (n.else) normalizeWhitespace(n.else, ctx, false); }
    else if (n.t === 'for') normalizeWhitespace(n.body, ctx, false);
  }
  // merge adjacent text nodes
  for (let i = list.length - 1; i > 0; i--) {
    const a = list[i - 1]!; const b = list[i]!;
    if (a.t === 'text' && b.t === 'text') { a.v += b.v; list.splice(i, 1); }
  }
  if (ctx === 'raw') return list;
  for (let i = 0; i < list.length; i++) {
    const n = list[i]!;
    if (n.t !== 'text') continue;
    let v = n.v.replace(WS_CHARS, ' ');
    if (v.startsWith(' ') && freeBeside(neighborOf(list[i - 1]), ctx, edges)) v = v.slice(1);
    if (v.endsWith(' ') && freeBeside(neighborOf(list[i + 1]), ctx, edges)) v = v.slice(0, -1);
    if (v === '') { list.splice(i, 1); i--; } else n.v = v;
  }
  return list;
}
