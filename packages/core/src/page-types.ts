/**
 * The page types a Sneferu theme can render, the shared section groups, and the keys a host
 * stores their trees under. Templates are `templates/<type>.sneferu`; `product`, `collection`
 * and `page` also take alternates (`product.codes`).
 */
export const PAGE_TYPES = ['index', 'product', 'collection', 'search', 'cart', 'page', '404'] as const;
export type PageType = (typeof PAGE_TYPES)[number];
/** Page types that accept alternate templates (`product.<alt>`). */
export const ALTERNATE_PAGE_TYPES = ['product', 'collection', 'page'] as const;
/** Shared section groups: one tree per group per installation, rendered on every page. */
export const GROUP_NAMES = ['header', 'footer', 'announcement'] as const;
export type GroupName = (typeof GROUP_NAMES)[number];

export const TEMPLATE_NAME = /^(index|product|collection|search|cart|page|404)(\.[a-z0-9-]{1,30})?$/;

export const isPageType = (v: unknown): v is PageType => typeof v === 'string' && (PAGE_TYPES as readonly string[]).includes(v);
export const isGroupName = (v: unknown): v is GroupName => typeof v === 'string' && (GROUP_NAMES as readonly string[]).includes(v);

/** `product.codes` -> { type: 'product', alternate: 'codes' }; undefined for any name that is not a template name. */
export function parseTemplateName(name: unknown): { type: PageType; alternate?: string } | undefined {
  if (typeof name !== 'string') return undefined;
  const m = TEMPLATE_NAME.exec(name);
  if (!m) return undefined;
  const type = m[1] as PageType;
  const alternate = m[2]?.slice(1);
  if (alternate !== undefined && !(ALTERNATE_PAGE_TYPES as readonly string[]).includes(type)) return undefined;
  return alternate === undefined ? { type } : { type, alternate };
}

/** The key a host stores a page's section list under: the home page is `/`, every other template its own name. */
export const pageKeyOf = (template: string): string => (template === 'index' ? '/' : template);
/** The inverse of pageKeyOf. */
export const templateOfPageKey = (key: string): string => (key === '/' ? 'index' : key);
