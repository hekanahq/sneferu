export const ENGINE_VERSION = '2.0.0';
export const IR_VERSION = 'sneferu/ir@1';
export const MANIFEST_SCHEMA = 'sneferu/manifest@1';
export const LIMITS = {
  loopDefault: 50, loopMax: 250, includeDepth: 8,
  renderDepth: 64, renderNodes: 20_000, outputChars: 1_500_000, loopIterations: 2_000,
  files: 400, totalBytes: 25 * 1024 * 1024, assetBytes: 2 * 1024 * 1024, templateBytes: 300 * 1024,
} as const;
export const FILTERS = ['money', 'img', 'date', 't', 'escape', 'upcase', 'downcase', 'truncate', 'default', 'size', 'first', 'last', 'join', 'json_attr'] as const;
export const LOOKUPS = ['collection', 'product', 't', 'settings', 'asset_url', 'collections', 'url', 'menu'] as const;
export type FilterName = (typeof FILTERS)[number];
export type LookupName = (typeof LOOKUPS)[number];
/** Elements a theme may use. Anything not listed here is rejected (allow-list, not deny-list). */
export const ALLOWED_ELEMENTS = [
  // sectioning and grouping
  'address', 'article', 'aside', 'blockquote', 'dd', 'details', 'div', 'dl', 'dt', 'figcaption', 'figure', 'footer',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr', 'li', 'main', 'menu', 'nav', 'ol', 'p', 'pre', 'search',
  'section', 'summary', 'ul',
  // text-level
  'a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'code', 'data', 'del', 'dfn', 'em', 'i', 'ins', 'kbd', 'mark', 'meter',
  'progress', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'var', 'wbr',
  // media
  'audio', 'img', 'picture', 'source', 'track', 'video',
  // tables
  'caption', 'col', 'colgroup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr',
  // SVG presentation
  'svg', 'g', 'path', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'rect', 'text', 'tspan', 'defs',
  'lineargradient', 'radialgradient', 'stop', 'clippath', 'mask', 'pattern', 'symbol', 'use', 'title', 'desc', 'image',
] as const;
/** Kept for error messages: elements that are dangerous rather than merely unsupported. */
export const FORBIDDEN_ELEMENTS = [
  'script', 'style', 'iframe', 'object', 'embed', 'base', 'link', 'meta', 'form', 'animate', 'set', 'animatemotion',
  'animatetransform', 'foreignobject', 'plaintext', 'xmp', 'noembed', 'noscript', 'frameset', 'frame', 'template', 'slot', 'portal',
] as const;
export const FORBIDDEN_ATTRIBUTES = ['srcdoc', 'formaction', 'attributename', 'xml:base'] as const;
export const URL_ATTRIBUTES = ['href', 'src', 'action', 'poster', 'srcset', 'formaction', 'xlink:href'] as const;
