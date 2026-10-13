import { LIMITS } from '@hekana/sneferu-core';
import type { ArtifactLike, PageNode } from './page';

/** At most this many collections are preloaded for one page. */
export const MAX_PAGE_COLLECTIONS = 8;
/** At most this many products named by `product(…)` are preloaded for one page. */
export const MAX_PAGE_PRODUCTS = 12;
/** At most this many menus named by `menu(…)` (literals and `menu` settings) are preloaded for one page. */
export const MAX_PAGE_MENUS = 8;
const HANDLE = /^[a-z0-9][a-z0-9-]{0,99}$/;

export interface PageDependencies { collections: string[]; products: string[]; categories: boolean; menus: string[] }
export interface PageDependencyOptions {
  template: string;
  /** The page's saved sections; without them the template's default sections are used. */
  sections?: PageNode[] | null;
  /** Stored theme settings (the values `settings.*` reads). */
  settings?: Record<string, unknown>;
  /** The merchant's shared groups; groups not given here count with the theme's defaults (artifact.groups). */
  groups?: Partial<Record<string, PageNode[]>> | null;
}

type Rec = Record<string, unknown>;
const rec = (v: unknown): Rec => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Rec) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const own = (o: Rec, k: string): unknown => (Object.hasOwn(o, k) ? o[k] : undefined);

class Acc {
  handles = new Set<string>();
  productHandles = new Set<string>();
  menuHandles = new Set<string>();
  categories = false;
  get full() { return this.handles.size >= MAX_PAGE_COLLECTIONS; }
  get fullProducts() { return this.productHandles.size >= MAX_PAGE_PRODUCTS; }
  get fullMenus() { return this.menuHandles.size >= MAX_PAGE_MENUS; }
  get done() { return this.full && this.fullProducts && this.fullMenus && this.categories; }
  add(h: unknown) { if (typeof h === 'string' && HANDLE.test(h) && !this.full) this.handles.add(h); }
  addProduct(h: unknown) { if (typeof h === 'string' && HANDLE.test(h) && !this.fullProducts) this.productHandles.add(h); }
  addMenu(h: unknown) { if (typeof h === 'string' && HANDLE.test(h) && !this.fullMenus) this.menuHandles.add(h); }
}

function fromExpr(e: unknown, out: Acc, d: number): void {
  if (d > LIMITS.renderDepth || out.done) return;
  const x = rec(e);
  switch (x.k) {
    case 'lookup': {
      const args = arr(x.args);
      if (x.fn === 'collections') out.categories = true;
      if (x.fn === 'collection' && rec(args[0]).k === 'lit') out.add(rec(args[0]).v);
      if (x.fn === 'product' && rec(args[0]).k === 'lit') out.addProduct(rec(args[0]).v);
      if (x.fn === 'menu' && rec(args[0]).k === 'lit') out.addMenu(rec(args[0]).v);
      for (const a of args) fromExpr(a, out, d + 1);
      return;
    }
    case 'path': fromExpr(x.from, out, d + 1); return;
    case 'cmp': case 'and': case 'or': fromExpr(x.a, out, d + 1); fromExpr(x.b, out, d + 1); return;
    case 'not': fromExpr(x.a, out, d + 1); return;
    case 'filter': fromExpr(x.input, out, d + 1); for (const a of arr(x.args)) fromExpr(a, out, d + 1); return;
    default: return;
  }
}

function fromValue(v: unknown, out: Acc, d: number): void {
  if (d > LIMITS.renderDepth || out.done) return;
  const x = rec(v);
  if (x.k === 'expr') fromExpr(x.e, out, d + 1);
  else if (x.k === 'responsive') for (const bp of ['base', 'tablet', 'mobile']) fromValue(own(x, bp), out, d + 1);
}

function fromNodes(nodes: unknown, out: Acc, d: number): void {
  if (d > LIMITS.renderDepth) return;
  for (const n of arr(nodes)) {
    if (out.done) return;
    const x = rec(n);
    switch (x.k) {
      case 'text': fromExpr(x.e, out, d + 1); break;
      case 'el':
        for (const a of arr(x.attrs)) for (const p of arr(rec(a).parts)) if (typeof p !== 'string') fromExpr(p, out, d + 1);
        fromNodes(x.children, out, d + 1);
        break;
      case 'if':
        for (const b of arr(x.branches)) { fromExpr(rec(b).test, out, d + 1); fromNodes(rec(b).body, out, d + 1); }
        fromNodes(x.else, out, d + 1);
        break;
      case 'loop': fromExpr(x.src, out, d + 1); fromNodes(x.body, out, d + 1); break;
      case 'comp': for (const v of Object.values(rec(x.props))) fromValue(v, out, d + 1); fromNodes(x.children, out, d + 1); break;
      case 'render': for (const e of Object.values(rec(x.args))) fromExpr(e, out, d + 1); break;
      default: break;
    }
  }
}

/** The value of every `collection`, `product` and `menu` field: the stored string, else the default (as the renderer coerces it). */
function fromSettings(schema: unknown, stored: unknown, out: Acc): void {
  const fields = rec(schema);
  const values = rec(stored);
  for (const k of Object.keys(fields)) {
    if (out.full && out.fullProducts && out.fullMenus) return;
    const f = rec(fields[k]);
    if (f.type !== 'collection' && f.type !== 'product' && f.type !== 'menu') continue;
    const v = own(values, k);
    const handle = typeof v === 'string' ? v : f.default;
    if (f.type === 'collection') out.add(handle); else if (f.type === 'menu') out.addMenu(handle); else out.addProduct(handle);
  }
}

/**
 * Everything a page needs fetched BEFORE it renders (no fetches inside loops):
 * the collection, product and menu handles it can ask for and whether it lists
 * the store's categories (`collections()`). Walks the layout, the template, the theme
 * settings, the sections and blocks the page uses (or the template's
 * defaults), then every snippet (a snippet can be rendered from anywhere);
 * adds the value of every `collection`, `product` and `menu` typed theme, section and block setting,
 * defaults included. Snippets come last so the cap never crowds out a
 * merchant's pick.
 *
 * The artifact is untrusted: only own properties are read, the walk is
 * depth-limited, handles must match /^[a-z0-9][a-z0-9-]{0,99}$/, at most 8
 * collections, 12 products and 8 menus are returned, and any failure yields an empty result instead of throwing.
 */
export function pageDependencies(artifact: ArtifactLike, opts: PageDependencyOptions): PageDependencies {
  try {
    const out = new Acc();
    const a = rec(artifact);
    const template = String(rec(opts).template);
    const sectionDefs = rec(a.sections);
    const blockDefs = rec(a.blocks);
    fromNodes(a.layout, out, 0);
    fromNodes(own(rec(a.templates), template), out, 0);
    fromSettings(rec(a.manifest).settings, rec(opts).settings, out);

    const saved = rec(opts).sections;
    const used = Array.isArray(saved) ? saved : arr(own(rec(a.templateSections), template)).map((s) => {
      const r = rec(s);
      return { type: r.type, props: r.settings, children: arr(r.blocks).map((b) => ({ type: rec(b).type, props: rec(b).settings })) };
    });
    const visit = (node: unknown, depth: number): void => {
      if (out.done || depth > 3) return;
      const n = rec(node);
      if (typeof n.type !== 'string' || n.hidden) return;
      const def = rec(own(depth === 0 ? sectionDefs : blockDefs, n.type));
      fromNodes(def.ir, out, 0);
      fromSettings(rec(def.schema).settings, n.props, out);
      for (const child of arr(n.children)) visit(child, depth + 1);
    };
    for (const node of used) visit(node, 0);
    // shared groups: the merchant's tree for a group, else the theme's default for it
    const given = rec(rec(opts).groups);
    const defaults = rec(a.groups);
    for (const g of ['header', 'footer', 'announcement']) {
      const tree = own(given, g) !== undefined ? own(given, g) : own(defaults, g);
      for (const node of arr(tree)) visit(node, 0);
    }
    // snippets last: the merchant's picks above must not be crowded out by the cap
    for (const ir of Object.values(rec(a.snippets))) fromNodes(ir, out, 0);
    return { collections: [...out.handles], products: [...out.productHandles], categories: out.categories, menus: [...out.menuHandles] };
  } catch {
    return { collections: [], products: [], categories: false, menus: [] };
  }
}
