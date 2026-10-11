import { LIMITS } from '@hekana/sneferu-core';
import type { ArtifactLike, PageNode } from './page';

/** At most this many collections are preloaded for one page. */
export const MAX_PAGE_COLLECTIONS = 8;
const HANDLE = /^[a-z0-9][a-z0-9-]{0,99}$/;

export interface PageDependencies { collections: string[]; categories: boolean }
export interface PageDependencyOptions {
  template: string;
  /** The page's saved sections; without them the template's default sections are used. */
  sections?: PageNode[] | null;
  /** Stored theme settings (the values `settings.*` reads). */
  settings?: Record<string, unknown>;
}

type Rec = Record<string, unknown>;
const rec = (v: unknown): Rec => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Rec) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const own = (o: Rec, k: string): unknown => (Object.hasOwn(o, k) ? o[k] : undefined);

class Acc {
  handles = new Set<string>();
  categories = false;
  get full() { return this.handles.size >= MAX_PAGE_COLLECTIONS; }
  get done() { return this.full && this.categories; }
  add(h: unknown) { if (typeof h === 'string' && HANDLE.test(h) && !this.full) this.handles.add(h); }
}

function fromExpr(e: unknown, out: Acc, d: number): void {
  if (d > LIMITS.renderDepth || out.done) return;
  const x = rec(e);
  switch (x.k) {
    case 'lookup': {
      const args = arr(x.args);
      if (x.fn === 'collections') out.categories = true;
      if (x.fn === 'collection' && rec(args[0]).k === 'lit') out.add(rec(args[0]).v);
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

/** The value of every `collection` field: the stored string, else the default (as the renderer coerces it). */
function fromSettings(schema: unknown, stored: unknown, out: Acc): void {
  const fields = rec(schema);
  const values = rec(stored);
  for (const k of Object.keys(fields)) {
    if (out.full) return;
    const f = rec(fields[k]);
    if (f.type !== 'collection') continue;
    const v = own(values, k);
    out.add(typeof v === 'string' ? v : f.default);
  }
}

/**
 * Everything a page needs fetched BEFORE it renders (no fetches inside loops):
 * the collection handles it can ask for and whether it lists the store's
 * categories (`collections()`). Walks the layout, the template, every snippet
 * (a snippet can be rendered from anywhere), and the sections and blocks the
 * page uses (or the template's defaults); adds the value of every
 * `collection`-typed theme, section and block setting, defaults included.
 *
 * The artifact is untrusted: only own properties are read, the walk is
 * depth-limited, handles must match /^[a-z0-9][a-z0-9-]{0,99}$/, at most 8 are
 * returned, and any failure yields an empty result instead of throwing.
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
    for (const ir of Object.values(rec(a.snippets))) fromNodes(ir, out, 0);
    fromSettings(rec(a.manifest).settings, rec(opts).settings, out);

    const saved = rec(opts).sections;
    const used = Array.isArray(saved) ? saved : arr(own(rec(a.templateSections), template)).map((s) => {
      const r = rec(s);
      return { type: r.type, props: r.settings, children: arr(r.blocks).map((b) => ({ type: rec(b).type, props: rec(b).settings })) };
    });
    for (const node of used) {
      if (out.done) break;
      const n = rec(node);
      if (typeof n.type !== 'string' || n.hidden) continue;
      const def = rec(own(sectionDefs, n.type));
      fromNodes(def.ir, out, 0);
      fromSettings(rec(def.schema).settings, n.props, out);
      for (const child of arr(n.children)) {
        const c = rec(child);
        if (typeof c.type !== 'string' || c.hidden) continue;
        const bdef = rec(own(blockDefs, c.type));
        fromNodes(bdef.ir, out, 0);
        fromSettings(rec(bdef.schema).settings, c.props, out);
      }
    }
    return { collections: [...out.handles], categories: out.categories };
  } catch {
    return { collections: [], categories: false };
  }
}
